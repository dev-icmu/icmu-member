#!/usr/bin/env node
/**
 * Automated Requirement-Driven E2E Test Suite for UI Migration
 * 
 * Tiers:
 *  - Tier 1: Feature Coverage (Static AST tag audit: zero raw HTML form/table tags)
 *  - Tier 2: Boundary & Corner Cases (Path alias, exports, input types, disabled states, theme tokens)
 *  - Tier 3: Cross-Feature Combinations (Event and prop integrity, submit types, mutations, tabs)
 *  - Tier 4: Real-World Scenarios (npm run build, npm run lint, Vite/jsconfig bundle verification)
 * 
 * Usage:
 *  node scripts/verify-ui-migration.mjs                  # Run all tiers
 *  node scripts/verify-ui-migration.mjs --tier 1         # Run Tier 1 only
 *  node scripts/verify-ui-migration.mjs --tier 2         # Run Tier 2 only
 *  node scripts/verify-ui-migration.mjs --tier 3         # Run Tier 3 only
 *  node scripts/verify-ui-migration.mjs --tier 4         # Run Tier 4 only
 *  node scripts/verify-ui-migration.mjs --milestone M1   # Run M1 tests (primitives & tokens)
 *  node scripts/verify-ui-migration.mjs --milestone M2   # Run M1 + M2 tests (Auth migration)
 *  node scripts/verify-ui-migration.mjs --milestone M3   # Run M1 + M2 + M3 tests (Admin migration)
 *  node scripts/verify-ui-migration.mjs --milestone M4   # Run all tests (Tiers 1-4)
 *  node scripts/verify-ui-migration.mjs --json           # Output machine-readable JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { parse } from '@babel/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ANSI formatting helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

function log(msg = '') {
  console.log(msg);
}

// AST Utilities
function readAndParse(relativeFilePath) {
  const fullPath = path.join(ROOT_DIR, relativeFilePath);
  if (!fs.existsSync(fullPath)) {
    return { exists: false, fullPath, code: null, ast: null, error: `File not found: ${relativeFilePath}` };
  }
  const code = fs.readFileSync(fullPath, 'utf-8');
  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
    });
    return { exists: true, fullPath, code, ast, error: null };
  } catch (err) {
    return { exists: true, fullPath, code, ast: null, error: `Parse error in ${relativeFilePath}: ${err.message}` };
  }
}

function walkAST(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'comments' || key === 'leadingComments' || key === 'trailingComments') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) {
          walkAST(item, visitor);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      walkAST(child, visitor);
    }
  }
}

function getJSXElements(ast) {
  const elements = [];
  if (!ast) return elements;
  walkAST(ast, (node) => {
    if (node.type === 'JSXOpeningElement') {
      let tagName = '';
      if (node.name.type === 'JSXIdentifier') {
        tagName = node.name.name;
      } else if (node.name.type === 'JSXMemberExpression') {
        tagName = `${node.name.object.name}.${node.name.property.name}`;
      }
      
      const attributes = {};
      (node.attributes || []).forEach((attr) => {
        if (attr.type === 'JSXAttribute') {
          const attrName = attr.name.name;
          let attrVal = true;
          if (attr.value) {
            if (attr.value.type === 'StringLiteral') {
              attrVal = attr.value.value;
            } else if (attr.value.type === 'JSXExpressionContainer') {
              if (attr.value.expression.type === 'StringLiteral') {
                attrVal = attr.value.expression.value;
              } else if (attr.value.expression.type === 'BooleanLiteral') {
                attrVal = attr.value.expression.value;
              } else {
                attrVal = attr.value.expression;
              }
            }
          }
          attributes[attrName] = attrVal;
        }
      });

      elements.push({
        tagName,
        attributes,
        loc: node.loc,
        node,
      });
    }
  });
  return elements;
}

function getImports(ast) {
  const imports = [];
  if (!ast) return imports;
  walkAST(ast, (node) => {
    if (node.type === 'ImportDeclaration') {
      const source = node.source.value;
      const specifiers = (node.specifiers || []).map((s) => ({
        local: s.local ? s.local.name : null,
        imported: s.imported ? s.imported.name : (s.type === 'ImportDefaultSpecifier' ? 'default' : null),
        isDefault: s.type === 'ImportDefaultSpecifier',
      }));
      imports.push({ source, specifiers, loc: node.loc });
    }
  });
  return imports;
}

function getExports(ast) {
  const exports = [];
  if (!ast) return exports;
  walkAST(ast, (node) => {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (node.declaration.declarations) {
          node.declaration.declarations.forEach(d => exports.push(d.id.name));
        } else if (node.declaration.id) {
          exports.push(node.declaration.id.name);
        }
      }
      if (node.specifiers) {
        node.specifiers.forEach(s => exports.push(s.exported ? s.exported.name : s.local.name));
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      exports.push('default');
    }
  });
  return exports;
}

// Test Runner Class
class TestRunner {
  constructor(options = {}) {
    this.options = options;
    this.results = [];
    this.startTime = Date.now();
  }

  test(id, name, tier, milestone, fn) {
    // Filter check
    if (this.options.tier && this.options.tier !== tier) return;
    if (this.options.milestone) {
      const allowed = {
        M1: [1],
        M2: [1, 2],
        M3: [1, 2, 3],
        M4: [1, 2, 3, 4],
      }[this.options.milestone] || [1, 2, 3, 4];
      const mTier = parseInt(tier.replace('Tier ', ''), 10);
      if (!allowed.includes(mTier)) return;
    }

    try {
      fn();
      this.results.push({ id, name, tier, milestone, passed: true, error: null });
    } catch (err) {
      this.results.push({ id, name, tier, milestone, passed: false, error: err.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}: expected '${expected}', got '${actual}'`);
    }
  }

  printSummary() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    if (this.options.json) {
      console.log(JSON.stringify({
        summary: {
          total,
          passed,
          failed,
          durationSeconds: parseFloat(elapsed),
          success: failed === 0,
        },
        results: this.results,
      }, null, 2));
      return failed === 0 ? 0 : 1;
    }

    log('\n================================================================================');
    log(`${colors.bold}UI MIGRATION VERIFICATION SUITE RESULTS${colors.reset}`);
    log('================================================================================\n');

    const byTier = {};
    for (const r of this.results) {
      byTier[r.tier] = byTier[r.tier] || [];
      byTier[r.tier].push(r);
    }

    for (const [tier, list] of Object.entries(byTier)) {
      const tPassed = list.filter(r => r.passed).length;
      const tFailed = list.filter(r => !r.passed).length;
      const tColor = tFailed === 0 ? colors.green : colors.red;
      log(`${colors.bold}${colors.cyan}[${tier}]${colors.reset} ${tColor}${tPassed}/${list.length} passed${colors.reset}`);
      
      for (const r of list) {
        const symbol = r.passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
        log(`  ${symbol} [${r.id}] ${r.name}`);
        if (!r.passed) {
          log(`    ${colors.yellow}Issue:${colors.reset} ${r.error}`);
        }
      }
      log();
    }

    log('--------------------------------------------------------------------------------');
    log(`${colors.bold}Execution Summary:${colors.reset}`);
    log(`  Total Tests:    ${total}`);
    log(`  Passed:         ${colors.green}${passed}${colors.reset}`);
    log(`  Failed:         ${failed > 0 ? colors.red + failed + colors.reset : '0'}`);
    log(`  Duration:       ${elapsed}s`);
    log('--------------------------------------------------------------------------------');

    if (failed === 0) {
      log(`${colors.bgGreen}${colors.bold} ALL CHECKS PASSED! UI MIGRATION SPECIFICATIONS SATISFIED. ${colors.reset}\n`);
      return 0;
    } else {
      log(`${colors.bgRed}${colors.bold} ${failed} CHECK(S) FAILED. REMEDIATE OUTSTANDING ISSUES. ${colors.reset}\n`);
      return 1;
    }
  }
}

// Build and execute test suite
export function runSuite(argv = process.argv.slice(2)) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tier' && argv[i + 1]) {
      options.tier = `Tier ${argv[++i]}`;
    } else if (argv[i] === '--milestone' && argv[i + 1]) {
      options.milestone = argv[++i].toUpperCase();
    } else if (argv[i] === '--json') {
      options.json = true;
    } else if (argv[i] === '--help' || argv[i] === '-h') {
      log(`Usage: node scripts/verify-ui-migration.mjs [options]`);
      log(`Options:`);
      log(`  --tier <1|2|3|4>          Run a specific tier`);
      log(`  --milestone <M1|M2|M3|M4> Run tests through a milestone`);
      log(`  --json                    Output results in JSON format`);
      log(`  --help, -h                Show help`);
      process.exit(0);
    }
  }

  const runner = new TestRunner(options);

  // ============================================================================
  // TIER 1: FEATURE COVERAGE (Static AST Tag Audit: Zero raw HTML elements)
  // Target: src/features/auth, src/features/admin, and src/pages
  // In JSX, raw HTML elements are lowercase ('input', 'button', 'table', etc.)
  // whereas UI library components are PascalCase ('Input', 'Button', 'Table', etc.)
  // ============================================================================
  const FORBIDDEN_FORM_TAGS = ['input', 'button'];
  const FORBIDDEN_TABLE_TAGS = ['table', 'thead', 'tbody', 'tr', 'th', 'td'];

  // --- Feature: PersonalInfoStep ---
  runner.test('T1-AUTH-01', 'PersonalInfoStep - Zero raw <input> elements', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawInputs = elements.filter(el => el.tagName === 'input');
    runner.assert(
      rawInputs.length === 0,
      `Found ${rawInputs.length} raw <input> tags at lines: ${rawInputs.map(el => el.loc.start.line).join(', ')}. Replace with motion Input.`
    );
  });

  runner.test('T1-AUTH-02', 'PersonalInfoStep - Zero raw <button> elements', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags at lines: ${rawButtons.map(el => el.loc.start.line).join(', ')}. Replace with motion Button.`
    );
  });

  runner.test('T1-AUTH-03', 'PersonalInfoStep - Imports motion Input component', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const imports = getImports(res.ast);
    const hasInputImport = imports.some(imp => 
      imp.source.includes('components/motion/input') || imp.source.includes('@/components/motion/input')
    );
    runner.assert(hasInputImport, 'Missing import from @/components/motion/input');
  });

  runner.test('T1-AUTH-04', 'PersonalInfoStep - Imports motion Button component', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const imports = getImports(res.ast);
    const hasButtonImport = imports.some(imp => 
      imp.source.includes('components/motion/button') || imp.source.includes('@/components/motion/button/base')
    );
    runner.assert(hasButtonImport, 'Missing import from @/components/motion/button/base');
  });

  runner.test('T1-AUTH-05', 'PersonalInfoStep - All 7 personal fields use motion Input', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const motionInputs = elements.filter(el => el.tagName === 'Input');
    runner.assert(
      motionInputs.length >= 7,
      `Expected at least 7 motion Input components (index_number, date_of_birth, full_name, name_with_initials, whatsapp_number, email_address, city), found ${motionInputs.length}`
    );
  });

  // --- Feature: GuardianStep ---
  runner.test('T1-AUTH-06', 'GuardianStep - Zero raw <input> elements', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/GuardianStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawInputs = elements.filter(el => el.tagName === 'input');
    runner.assert(
      rawInputs.length === 0,
      `Found ${rawInputs.length} raw <input> tags at lines: ${rawInputs.map(el => el.loc.start.line).join(', ')}. Replace with motion Input.`
    );
  });

  runner.test('T1-AUTH-07', 'GuardianStep - Zero raw <button> elements', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/GuardianStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags at lines: ${rawButtons.map(el => el.loc.start.line).join(', ')}. Replace with motion Button.`
    );
  });

  runner.test('T1-AUTH-08', 'GuardianStep - Imports motion Input and Button', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/GuardianStep.jsx');
    runner.assert(res.exists, res.error);
    const imports = getImports(res.ast);
    const hasInput = imports.some(imp => imp.source.includes('components/motion/input'));
    const hasButton = imports.some(imp => imp.source.includes('components/motion/button'));
    runner.assert(hasInput, 'Missing import from @/components/motion/input in GuardianStep');
    runner.assert(hasButton, 'Missing import from @/components/motion/button/base in GuardianStep');
  });

  runner.test('T1-AUTH-09', 'GuardianStep - All 3 guardian fields use motion Input', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/GuardianStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const motionInputs = elements.filter(el => el.tagName === 'Input');
    runner.assert(
      motionInputs.length >= 3,
      `Expected at least 3 motion Input components (guardian_name, guardian_contact, guardian_occupation), found ${motionInputs.length}`
    );
  });

  runner.test('T1-AUTH-10', 'GuardianStep - Navigation uses motion Button', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/GuardianStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const motionButtons = elements.filter(el => el.tagName === 'Button');
    runner.assert(
      motionButtons.length >= 2,
      `Expected at least 2 motion Button components (Back and Continue), found ${motionButtons.length}`
    );
  });

  // --- Feature: SkillsStep ---
  runner.test('T1-AUTH-11', 'SkillsStep - Zero raw <input> elements', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/SkillsStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawInputs = elements.filter(el => el.tagName === 'input');
    runner.assert(rawInputs.length === 0, `Found ${rawInputs.length} raw <input> tags in SkillsStep.`);
  });

  runner.test('T1-AUTH-12', 'SkillsStep - Zero raw <button> elements', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/SkillsStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags at lines: ${rawButtons.map(el => el.loc.start.line).join(', ')}. Replace skill toggles and navigation with motion components.`
    );
  });

  runner.test('T1-AUTH-13', 'SkillsStep - Navigation uses motion Button', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/SkillsStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const motionButtons = elements.filter(el => el.tagName === 'Button');
    runner.assert(motionButtons.length >= 2, `Expected at least 2 motion Button components, found ${motionButtons.length}`);
  });

  runner.test('T1-AUTH-14', 'SkillsStep - Submit registration button has type="submit"', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/SkillsStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const submitBtn = elements.find(el => (el.tagName === 'Button' || el.tagName === 'button') && el.attributes.type === 'submit');
    runner.assert(Boolean(submitBtn), 'Submit Registration button must explicitly specify type="submit"');
  });

  runner.test('T1-AUTH-15', 'SkillsStep - Back button has type="button"', 'Tier 1', 'M2', () => {
    const res = readAndParse('src/features/auth/components/SkillsStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const backBtn = elements.find(el => (el.tagName === 'Button' || el.tagName === 'button') && el.attributes.type === 'button');
    runner.assert(Boolean(backBtn), 'Back navigation button must specify type="button" to prevent accidental submission');
  });

  // --- Feature: MembersTable ---
  runner.test('T1-ADMIN-01', 'MembersTable - Zero raw HTML <table> tags', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/MembersTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawTableTags = elements.filter(el => FORBIDDEN_TABLE_TAGS.includes(el.tagName));
    runner.assert(
      rawTableTags.length === 0,
      `Found ${rawTableTags.length} raw table tags: ${rawTableTags.map(el => `${el.tagName}@L${el.loc.start.line}`).join(', ')}. Replace with shadcn Table components.`
    );
  });

  runner.test('T1-ADMIN-02', 'MembersTable - Zero raw <button> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/MembersTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags in MembersTable. Replace approve/reject with motion Button.`
    );
  });

  runner.test('T1-ADMIN-03', 'MembersTable - Uses shadcn Table primitives', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/MembersTable.jsx');
    runner.assert(res.exists, res.error);
    const imports = getImports(res.ast);
    const hasTableImport = imports.some(imp => imp.source.includes('components/ui/table') || imp.source.includes('@/components/ui/table'));
    runner.assert(hasTableImport, 'Missing import from @/components/ui/table in MembersTable');
  });

  runner.test('T1-ADMIN-04', 'MembersTable - Uses motion Button for actions', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/MembersTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const motionButtons = elements.filter(el => el.tagName === 'Button');
    runner.assert(motionButtons.length >= 2, `Expected at least 2 motion Button actions (Approve/Reject), found ${motionButtons.length}`);
  });

  runner.test('T1-ADMIN-05', 'MembersTable - Uses AnimatedBadge for status display', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/MembersTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const hasBadge = elements.some(el => el.tagName === 'AnimatedBadge');
    const imports = getImports(res.ast);
    const hasBadgeImport = imports.some(imp => imp.source.includes('components/motion/animated-badge'));
    runner.assert(
      hasBadge && hasBadgeImport,
      'MembersTable must import and use AnimatedBadge from @/components/motion/animated-badge for status tags'
    );
  });

  // --- Feature: SkillsTable ---
  runner.test('T1-ADMIN-06', 'SkillsTable - Zero raw HTML <table> tags', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawTableTags = elements.filter(el => FORBIDDEN_TABLE_TAGS.includes(el.tagName));
    runner.assert(
      rawTableTags.length === 0,
      `Found ${rawTableTags.length} raw table tags in SkillsTable. Replace with shadcn Table components.`
    );
  });

  runner.test('T1-ADMIN-07', 'SkillsTable - Zero raw <input> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawInputs = elements.filter(el => el.tagName === 'input');
    runner.assert(
      rawInputs.length === 0,
      `Found ${rawInputs.length} raw <input> tags in SkillsTable. Replace with motion Input.`
    );
  });

  runner.test('T1-ADMIN-08', 'SkillsTable - Zero raw <button> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags in SkillsTable. Replace with motion Button.`
    );
  });

  runner.test('T1-ADMIN-09', 'SkillsTable - Uses shadcn Table primitives', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    const imports = getImports(res.ast);
    const hasTable = imports.some(imp => imp.source.includes('components/ui/table'));
    runner.assert(hasTable, 'Missing import from @/components/ui/table in SkillsTable');
  });

  runner.test('T1-ADMIN-10', 'SkillsTable - Uses motion Input and Button for skill creation', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const hasMotionInput = elements.some(el => el.tagName === 'Input');
    const hasMotionButton = elements.some(el => el.tagName === 'Button');
    runner.assert(hasMotionInput && hasMotionButton, 'SkillsTable must use motion Input and Button for skill addition');
  });

  // --- Feature: TeamsTable ---
  runner.test('T1-ADMIN-11', 'TeamsTable - Zero raw HTML <table> tags', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawTableTags = elements.filter(el => FORBIDDEN_TABLE_TAGS.includes(el.tagName));
    runner.assert(
      rawTableTags.length === 0,
      `Found ${rawTableTags.length} raw table tags in TeamsTable. Replace with shadcn Table components.`
    );
  });

  runner.test('T1-ADMIN-12', 'TeamsTable - Zero raw <input> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawInputs = elements.filter(el => el.tagName === 'input');
    runner.assert(
      rawInputs.length === 0,
      `Found ${rawInputs.length} raw <input> tags in TeamsTable. Replace with motion Input.`
    );
  });

  runner.test('T1-ADMIN-13', 'TeamsTable - Zero raw <button> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags in TeamsTable. Replace with motion Button.`
    );
  });

  runner.test('T1-ADMIN-14', 'TeamsTable - Uses shadcn Table primitives', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    const imports = getImports(res.ast);
    const hasTable = imports.some(imp => imp.source.includes('components/ui/table'));
    runner.assert(hasTable, 'Missing import from @/components/ui/table in TeamsTable');
  });

  runner.test('T1-ADMIN-15', 'TeamsTable - Uses motion Input and Button for team creation', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const hasMotionInput = elements.some(el => el.tagName === 'Input');
    const hasMotionButton = elements.some(el => el.tagName === 'Button');
    runner.assert(hasMotionInput && hasMotionButton, 'TeamsTable must use motion Input and Button for team addition');
  });

  // --- Feature: AdminPage and LoginPage ---
  runner.test('T1-PAGE-01', 'AdminPage - Zero raw <button> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/pages/AdminPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags in AdminPage. Use @beui/tabs for navigation and motion Button for actions.`
    );
  });

  runner.test('T1-PAGE-02', 'AdminPage - Uses @beui/tabs for navigation', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/pages/AdminPage.jsx');
    runner.assert(res.exists, res.error);
    const imports = getImports(res.ast);
    const hasTabsImport = imports.some(imp => imp.source.includes('components/motion/tabs'));
    runner.assert(hasTabsImport, 'AdminPage must import Tabs primitives from @/components/motion/tabs');
  });

  runner.test('T1-PAGE-03', 'LoginPage - Zero raw <input> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/pages/LoginPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawInputs = elements.filter(el => el.tagName === 'input');
    runner.assert(
      rawInputs.length === 0,
      `Found ${rawInputs.length} raw <input> tags in LoginPage. Replace with motion Input.`
    );
  });

  runner.test('T1-PAGE-04', 'LoginPage - Zero raw <button> elements', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/pages/LoginPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const rawButtons = elements.filter(el => el.tagName === 'button');
    runner.assert(
      rawButtons.length === 0,
      `Found ${rawButtons.length} raw <button> tags in LoginPage. Replace with motion Button.`
    );
  });

  runner.test('T1-PAGE-05', 'LoginPage - Uses motion Input and Button with type="submit"', 'Tier 1', 'M3', () => {
    const res = readAndParse('src/pages/LoginPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const motionInputs = elements.filter(el => el.tagName === 'Input');
    const submitBtn = elements.find(el => el.tagName === 'Button' && el.attributes.type === 'submit');
    runner.assert(motionInputs.length >= 2, `Expected at least 2 motion Input components in LoginPage, found ${motionInputs.length}`);
    runner.assert(Boolean(submitBtn), 'LoginPage must use motion Button with type="submit" for login action');
  });


  // ============================================================================
  // TIER 2: BOUNDARY & CORNER CASES (Path alias, exports, input types, disabled states, theme tokens)
  // ============================================================================
  runner.test('T2-ALIAS-01', 'components.json exists and contains valid JSON', 'Tier 2', 'M1', () => {
    const p = path.join(ROOT_DIR, 'components.json');
    runner.assert(fs.existsSync(p), 'components.json is missing');
    const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
    runner.assert(content.aliases, 'components.json missing "aliases" configuration');
  });

  runner.test('T2-ALIAS-02', 'components.json maps "ui" to "@/components/ui"', 'Tier 2', 'M1', () => {
    const p = path.join(ROOT_DIR, 'components.json');
    const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
    runner.assertEqual(content.aliases?.ui, '@/components/ui', 'components.json aliases.ui mismatch');
  });

  runner.test('T2-ALIAS-03', 'components.json maps "components" to "@/components"', 'Tier 2', 'M1', () => {
    const p = path.join(ROOT_DIR, 'components.json');
    const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
    runner.assertEqual(content.aliases?.components, '@/components', 'components.json aliases.components mismatch');
  });

  runner.test('T2-ALIAS-04', 'components.json maps "utils" to "@/lib/utils"', 'Tier 2', 'M1', () => {
    const p = path.join(ROOT_DIR, 'components.json');
    const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
    runner.assertEqual(content.aliases?.utils, '@/lib/utils', 'components.json aliases.utils mismatch');
  });

  runner.test('T2-ALIAS-05', 'components.json configures @beui registry', 'Tier 2', 'M1', () => {
    const p = path.join(ROOT_DIR, 'components.json');
    const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
    runner.assert(content.registries?.['@beui'], 'components.json missing registries["@beui"] definition');
    runner.assert(
      content.registries['@beui'].includes('beui.dev'),
      'components.json @beui registry must point to beui.dev schema'
    );
  });

  runner.test('T2-EXPORT-01', 'shadcn Table primitive exists at src/components/ui/table.jsx', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/ui/table.jsx');
    runner.assert(res.exists, 'src/components/ui/table.jsx does not exist');
  });

  runner.test('T2-EXPORT-02', 'shadcn Table exports Table, TableHeader, TableBody, TableHead, TableRow, TableCell', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/ui/table.jsx');
    runner.assert(res.exists, res.error);
    const exports = getExports(res.ast);
    const required = ['Table', 'TableHeader', 'TableBody', 'TableHead', 'TableRow', 'TableCell'];
    for (const exp of required) {
      runner.assert(exports.includes(exp), `src/components/ui/table.jsx missing export '${exp}'`);
    }
  });

  runner.test('T2-EXPORT-03', 'Motion Input primitive exists and exports Input', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/motion/input.jsx');
    runner.assert(res.exists, 'src/components/motion/input.jsx does not exist');
    const exports = getExports(res.ast);
    runner.assert(exports.includes('Input') || exports.includes('default'), 'src/components/motion/input.jsx must export Input');
  });

  runner.test('T2-EXPORT-04', 'Motion Button primitive exists and exports Button', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/motion/button/base.jsx');
    runner.assert(res.exists, 'src/components/motion/button/base.jsx does not exist');
    const exports = getExports(res.ast);
    runner.assert(exports.includes('Button') || exports.includes('default'), 'src/components/motion/button/base.jsx must export Button');
  });

  runner.test('T2-EXPORT-05', 'Motion Tabs primitive exists and exports Tabs, TabsList, TabsTrigger, TabsContent', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/motion/tabs.jsx');
    runner.assert(res.exists, 'src/components/motion/tabs.jsx does not exist');
    const exports = getExports(res.ast);
    const required = ['Tabs', 'TabsList', 'TabsTrigger', 'TabsContent'];
    for (const exp of required) {
      runner.assert(exports.includes(exp) || exports.includes('default'), `src/components/motion/tabs.jsx missing export '${exp}'`);
    }
  });

  runner.test('T2-EXPORT-06', 'Motion AnimatedBadge primitive exists and exports AnimatedBadge', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/motion/animated-badge.jsx');
    runner.assert(res.exists, 'src/components/motion/animated-badge.jsx does not exist');
    const exports = getExports(res.ast);
    runner.assert(exports.includes('AnimatedBadge') || exports.includes('default'), 'src/components/motion/animated-badge.jsx must export AnimatedBadge');
  });

  runner.test('T2-EXPORT-07', 'Motion Checkbox primitive exists and exports Checkbox', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/motion/checkbox.jsx');
    runner.assert(res.exists, 'src/components/motion/checkbox.jsx does not exist');
    const exports = getExports(res.ast);
    runner.assert(exports.includes('Checkbox') || exports.includes('default'), 'src/components/motion/checkbox.jsx must export Checkbox');
  });

  runner.test('T2-BOUND-01', 'Input component handles type="date" attribute', 'Tier 2', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const dateInput = elements.find(el => el.tagName === 'Input' && el.attributes.type === 'date');
    runner.assert(Boolean(dateInput), 'PersonalInfoStep must have a motion Input with type="date" for date_of_birth');
  });

  runner.test('T2-BOUND-02', 'Input component handles type="tel" attribute', 'Tier 2', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const telInput = elements.find(el => el.tagName === 'Input' && el.attributes.type === 'tel');
    runner.assert(Boolean(telInput), 'PersonalInfoStep must have a motion Input with type="tel" for whatsapp_number');
  });

  runner.test('T2-BOUND-03', 'Input component handles type="email" attribute', 'Tier 2', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const emailInput = elements.find(el => el.tagName === 'Input' && el.attributes.type === 'email');
    runner.assert(Boolean(emailInput), 'PersonalInfoStep must have a motion Input with type="email" for email_address');
  });

  runner.test('T2-BOUND-04', 'Input component handles type="password" attribute in LoginPage', 'Tier 2', 'M3', () => {
    const res = readAndParse('src/pages/LoginPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const pwdInput = elements.find(el => el.tagName === 'Input' && el.attributes.type === 'password');
    runner.assert(Boolean(pwdInput), 'LoginPage must have a motion Input with type="password"');
  });

  runner.test('T2-BOUND-05', 'Input component handles error prop propagation', 'Tier 2', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const inputWithError = elements.find(el => el.tagName === 'Input' && el.attributes.error !== undefined);
    runner.assert(Boolean(inputWithError), 'PersonalInfoStep Inputs must pass error prop for validation feedback');
  });

  runner.test('T2-BOUND-06', 'Button component handles disabled state propagation', 'Tier 2', 'M2', () => {
    const res = readAndParse('src/features/auth/components/SkillsStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const submitBtn = elements.find(el => el.tagName === 'Button' && el.attributes.type === 'submit');
    runner.assert(
      submitBtn && submitBtn.attributes.disabled !== undefined,
      'Submit button in SkillsStep must pass disabled prop bound to isPending'
    );
  });

  runner.test('T2-BOUND-07', 'Button component variant props match contract', 'Tier 2', 'M1', () => {
    const res = readAndParse('src/components/motion/button/base.jsx');
    runner.assert(res.exists, res.error);
    runner.assert(
      res.code.includes('primary') && res.code.includes('secondary') && res.code.includes('outline'),
      'Motion Button base must support primary, secondary, outline variants'
    );
  });

  runner.test('T2-THEME-01', 'CSS Theme Tokens - index.css defines --background', 'Tier 2', 'M1', () => {
    const cssPath = path.join(ROOT_DIR, 'src/index.css');
    runner.assert(fs.existsSync(cssPath), 'src/index.css missing');
    const content = fs.readFileSync(cssPath, 'utf-8');
    runner.assert(content.includes('--background'), 'src/index.css missing --background token');
  });

  runner.test('T2-THEME-02', 'CSS Theme Tokens - index.css defines --foreground', 'Tier 2', 'M1', () => {
    const content = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');
    runner.assert(content.includes('--foreground'), 'src/index.css missing --foreground token');
  });

  runner.test('T2-THEME-03', 'CSS Theme Tokens - index.css defines --border', 'Tier 2', 'M1', () => {
    const content = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');
    runner.assert(content.includes('--border'), 'src/index.css missing --border token');
  });

  runner.test('T2-THEME-04', 'CSS Theme Tokens - index.css defines --muted', 'Tier 2', 'M1', () => {
    const content = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');
    runner.assert(content.includes('--muted'), 'src/index.css missing --muted token');
  });

  runner.test('T2-THEME-05', 'CSS Theme Tokens - index.css defines --ring', 'Tier 2', 'M1', () => {
    const content = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');
    runner.assert(content.includes('--ring'), 'src/index.css missing --ring token');
  });

  runner.test('T2-THEME-06', 'CSS Theme Tokens - index.css defines --primary', 'Tier 2', 'M1', () => {
    const content = fs.readFileSync(path.join(ROOT_DIR, 'src/index.css'), 'utf-8');
    runner.assert(content.includes('--primary'), 'src/index.css missing --primary token');
  });

  // ============================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS (Event and Prop Integrity)
  // ============================================================================
  runner.test('T3-EVENT-01', '@beui/input onChange string value contract in PersonalInfoStep', 'Tier 3', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const inputs = elements.filter(el => el.tagName === 'Input');
    runner.assert(inputs.length > 0, 'No motion Input components found in PersonalInfoStep');
    for (const inp of inputs) {
      runner.assert(inp.attributes.onChange !== undefined, `Input missing onChange attribute at line ${inp.loc.start.line}`);
    }
  });

  runner.test('T3-EVENT-02', '@beui/input onChange string value contract in GuardianStep', 'Tier 3', 'M2', () => {
    const res = readAndParse('src/features/auth/components/GuardianStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const inputs = elements.filter(el => el.tagName === 'Input');
    runner.assert(inputs.length > 0, 'No motion Input components found in GuardianStep');
    for (const inp of inputs) {
      runner.assert(inp.attributes.onChange !== undefined, `GuardianStep Input missing onChange attribute at line ${inp.loc.start.line}`);
    }
  });

  runner.test('T3-EVENT-03', 'onBlur sanitization contract bound for text inputs in PersonalInfoStep', 'Tier 3', 'M2', () => {
    const res = readAndParse('src/features/auth/components/PersonalInfoStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const fullNameInput = elements.find(el => el.tagName === 'Input' && el.attributes.placeholder?.includes('Sunil Perera'));
    runner.assert(
      fullNameInput && fullNameInput.attributes.onBlur !== undefined,
      'Full Name Input must bind onBlur handler for trimming/sanitization'
    );
  });

  runner.test('T3-EVENT-04', 'onBlur sanitization contract bound in GuardianStep', 'Tier 3', 'M2', () => {
    const res = readAndParse('src/features/auth/components/GuardianStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const guardianInput = elements.find(el => el.tagName === 'Input' && el.attributes.placeholder?.includes('Sunil Perera'));
    runner.assert(
      guardianInput && guardianInput.attributes.onBlur !== undefined,
      'Guardian Full Name Input must bind onBlur handler'
    );
  });

  runner.test('T3-EVENT-05', '@beui/input onChange string value contract in SkillsTable', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const inputs = elements.filter(el => el.tagName === 'Input');
    runner.assert(inputs.length >= 1, 'Expected motion Input in SkillsTable for newSkillName');
    for (const inp of inputs) {
      runner.assert(inp.attributes.onChange !== undefined, 'SkillsTable Input must bind onChange');
    }
  });

  runner.test('T3-EVENT-06', '@beui/input onChange string value contract in TeamsTable', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const inputs = elements.filter(el => el.tagName === 'Input');
    runner.assert(inputs.length >= 1, 'Expected motion Input in TeamsTable for newTeamName');
    for (const inp of inputs) {
      runner.assert(inp.attributes.onChange !== undefined, 'TeamsTable Input must bind onChange');
    }
  });

  runner.test('T3-EVENT-07', '@beui/input onChange string value contract in LoginPage', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/pages/LoginPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const inputs = elements.filter(el => el.tagName === 'Input');
    runner.assert(inputs.length >= 2, 'Expected motion Inputs in LoginPage for email and password');
    for (const inp of inputs) {
      runner.assert(inp.attributes.onChange !== undefined, 'LoginPage Input must bind onChange');
    }
  });

  runner.test('T3-SUBMIT-01', 'Form submission contract: SkillsStep submit button has type="submit"', 'Tier 3', 'M2', () => {
    const res = readAndParse('src/features/auth/components/SkillsStep.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const submitBtn = elements.find(el => el.tagName === 'Button' && el.attributes.type === 'submit');
    runner.assert(Boolean(submitBtn), 'SkillsStep registration submit Button must have type="submit" because @beui/button-base defaults to type="button"');
  });

  runner.test('T3-SUBMIT-02', 'Form submission contract: SkillsTable add button has type="submit"', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const submitBtn = elements.find(el => el.tagName === 'Button' && el.attributes.type === 'submit');
    runner.assert(Boolean(submitBtn), 'SkillsTable Add Skill Button must have type="submit"');
  });

  runner.test('T3-SUBMIT-03', 'Form submission contract: TeamsTable add button has type="submit"', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const submitBtn = elements.find(el => el.tagName === 'Button' && el.attributes.type === 'submit');
    runner.assert(Boolean(submitBtn), 'TeamsTable Add Team Button must have type="submit"');
  });

  runner.test('T3-SUBMIT-04', 'Form submission contract: LoginPage login button has type="submit"', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/pages/LoginPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const submitBtn = elements.find(el => el.tagName === 'Button' && el.attributes.type === 'submit');
    runner.assert(Boolean(submitBtn), 'LoginPage Secure Login Button must have type="submit"');
  });

  runner.test('T3-ACTION-01', 'Row action contract: MembersTable binds approveMutation.mutateAsync', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/MembersTable.jsx');
    runner.assert(res.exists, res.error);
    runner.assert(
      res.code.includes('approveMutation.mutateAsync'),
      'MembersTable must bind approveMutation.mutateAsync to Approve button'
    );
  });

  runner.test('T3-ACTION-02', 'Row action contract: MembersTable binds rejectMutation.mutateAsync', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/MembersTable.jsx');
    runner.assert(res.exists, res.error);
    runner.assert(
      res.code.includes('rejectMutation.mutateAsync'),
      'MembersTable must bind rejectMutation.mutateAsync to Reject button'
    );
  });

  runner.test('T3-ACTION-03', 'Row action contract: SkillsTable binds updateSkillMutation.mutateAsync', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/SkillsTable.jsx');
    runner.assert(res.exists, res.error);
    runner.assert(
      res.code.includes('updateSkillMutation.mutateAsync'),
      'SkillsTable must bind updateSkillMutation.mutateAsync to status toggle button'
    );
  });

  runner.test('T3-ACTION-04', 'Row action contract: TeamsTable binds updateTeamMutation.mutateAsync', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/features/admin/components/TeamsTable.jsx');
    runner.assert(res.exists, res.error);
    runner.assert(
      res.code.includes('updateTeamMutation.mutateAsync'),
      'TeamsTable must bind updateTeamMutation.mutateAsync to status toggle button'
    );
  });

  runner.test('T3-TABS-01', 'AdminPage Tabs binds value and onValueChange for navigation', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/pages/AdminPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const tabs = elements.find(el => el.tagName === 'Tabs');
    runner.assert(
      tabs && (tabs.attributes.value !== undefined || tabs.attributes.defaultValue !== undefined),
      'AdminPage Tabs component must bind active tab value'
    );
    runner.assert(
      tabs && (tabs.attributes.onValueChange !== undefined || tabs.attributes.onChange !== undefined),
      'AdminPage Tabs component must bind onValueChange handler'
    );
  });

  runner.test('T3-TABS-02', 'AdminPage TabsTrigger components cover applications, skills, teams', 'Tier 3', 'M3', () => {
    const res = readAndParse('src/pages/AdminPage.jsx');
    runner.assert(res.exists, res.error);
    const elements = getJSXElements(res.ast);
    const triggers = elements.filter(el => el.tagName === 'TabsTrigger');
    runner.assert(triggers.length >= 3, `Expected 3 TabsTrigger elements in AdminPage, found ${triggers.length}`);
  });

  runner.test('T3-FLOW-01', 'SignUpPage orchestrates multi-step form state across components', 'Tier 3', 'M2', () => {
    const res = readAndParse('src/pages/SignUpPage.jsx');
    runner.assert(res.exists, res.error);
    runner.assert(
      res.code.includes('PersonalInfoStep') && res.code.includes('GuardianStep') && res.code.includes('SkillsStep'),
      'SignUpPage must orchestrate PersonalInfoStep, GuardianStep, and SkillsStep'
    );
    runner.assert(
      res.code.includes('formData') && res.code.includes('handleChange'),
      'SignUpPage must pass formData and handleChange to step components'
    );
  });

  // ============================================================================
  // TIER 4: REAL-WORLD SCENARIOS (npm run build, npm run lint, Vite/bundle check)
  // ============================================================================
  runner.test('T4-CONFIG-01', 'Vite configuration defines "@" path alias mapping to "./src"', 'Tier 4', 'M1', () => {
    const viteConfigPath = path.join(ROOT_DIR, 'vite.config.js');
    runner.assert(fs.existsSync(viteConfigPath), 'vite.config.js is missing');
    const content = fs.readFileSync(viteConfigPath, 'utf-8');
    const hasAlias = (content.includes('"@"') || content.includes("'@'")) && content.includes('./src');
    runner.assert(hasAlias, 'vite.config.js missing alias @ -> ./src');
  });

  runner.test('T4-CONFIG-02', 'jsconfig.json defines "@/*" path alias mapping to ["src/*"]', 'Tier 4', 'M1', () => {
    const jsconfigPath = path.join(ROOT_DIR, 'jsconfig.json');
    runner.assert(fs.existsSync(jsconfigPath), 'jsconfig.json is missing');
    const content = JSON.parse(fs.readFileSync(jsconfigPath, 'utf-8'));
    runner.assert(content.compilerOptions?.paths?.['@/*'], 'jsconfig.json missing paths["@/*"] mapping');
  });

  runner.test('T4-BUILD-01', 'Production build: "npm run build" completes with exit code 0', 'Tier 4', 'M4', () => {
    const proc = spawnSync('npm', ['run', 'build'], {
      cwd: ROOT_DIR,
      shell: true,
      encoding: 'utf-8',
    });
    runner.assert(
      proc.status === 0,
      `npm run build failed with exit code ${proc.status}:\n${proc.stderr || proc.stdout}`
    );
  });

  runner.test('T4-BUILD-02', 'Production build generates dist/index.html and assets', 'Tier 4', 'M4', () => {
    const distHtml = path.join(ROOT_DIR, 'dist', 'index.html');
    const distAssets = path.join(ROOT_DIR, 'dist', 'assets');
    runner.assert(fs.existsSync(distHtml), 'dist/index.html was not generated by production build');
    runner.assert(fs.existsSync(distAssets), 'dist/assets directory was not generated');
    const assetFiles = fs.readdirSync(distAssets);
    runner.assert(assetFiles.length > 0, 'dist/assets is empty');
  });

  runner.test('T4-LINT-01', 'Linter check: "npm run lint" passes with 0 fatal errors', 'Tier 4', 'M4', () => {
    const proc = spawnSync('npm', ['run', 'lint'], {
      cwd: ROOT_DIR,
      shell: true,
      encoding: 'utf-8',
    });
    runner.assert(
      proc.status === 0,
      `npm run lint reported fatal errors (exit code ${proc.status}):\n${proc.stderr || proc.stdout}`
    );
  });

  return runner.printSummary();
}

// Direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const exitCode = runSuite();
  process.exit(exitCode);
}

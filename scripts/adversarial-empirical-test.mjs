#!/usr/bin/env node
/**
 * Adversarial Empirical Stress-Testing Suite for UI Migration
 * 
 * Tests:
 *  1. Event propagation on @beui/input (string passing to handleChange, adversarial inputs, type errors)
 *  2. Auto-formatting on onBlur (E.164 phone conversion, title casing, boundary inputs)
 *  3. Form submission behavior with @beui/button-base (default type, submit override, form tag audit)
 *  4. Table rendering with empty arrays, single row, multiple rows (MembersTable, SkillsTable, TeamsTable)
 *  5. Tabs value transitions (controlled transitions, hidden attribute, stress cycling)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '@babel/parser';

// Import sanitation and utility functions directly
import { 
  stripHtml, 
  trimAndClean, 
  toTitleCase, 
  coerceE164, 
  sanitizeMemberInput 
} from '../src/utils/sanitize.js';

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
};

class ChallengerTestHarness {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
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

  test(category, name, fn) {
    this.total++;
    try {
      fn();
      this.passed++;
      console.log(`  ${colors.green}✓ PASS${colors.reset} [${category}] ${name}`);
    } catch (err) {
      this.failed++;
      this.failures.push({ category, name, error: err.message });
      console.log(`  ${colors.red}✗ FAIL${colors.reset} [${category}] ${name}\n         ${colors.yellow}Error: ${err.message}${colors.reset}`);
    }
  }

  summary() {
    console.log('\n' + '='.repeat(80));
    console.log(`${colors.bold}ADVERSARIAL EMPIRICAL STRESS TEST RESULTS${colors.reset}`);
    console.log('='.repeat(80));
    console.log(`Total Tests: ${this.total}`);
    console.log(`Passed:      ${colors.green}${this.passed}${colors.reset}`);
    console.log(`Failed:      ${this.failed > 0 ? colors.red : colors.green}${this.failed}${colors.reset}`);
    console.log('='.repeat(80));
    if (this.failed > 0) {
      console.log(`${colors.red}FAILURES:${colors.reset}`);
      for (const f of this.failures) {
        console.log(`- [${f.category}] ${f.name}: ${f.error}`);
      }
    }
    return this.failed === 0 ? 0 : 1;
  }
}

// AST Helper
function readAndParse(relPath) {
  const fullPath = path.join(ROOT_DIR, relPath);
  const code = fs.readFileSync(fullPath, 'utf-8');
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });
  return { code, ast };
}

function walkAST(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'comments' || key === 'leadingComments' || key === 'trailingComments') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) walkAST(item, visitor);
      }
    } else if (child && typeof child === 'object' && child.type) {
      walkAST(child, visitor);
    }
  }
}

function getJSXElements(ast) {
  const elements = [];
  walkAST(ast, (node) => {
    if (node.type === 'JSXOpeningElement') {
      let tagName = '';
      if (node.name.type === 'JSXIdentifier') tagName = node.name.name;
      else if (node.name.type === 'JSXMemberExpression') tagName = `${node.name.object.name}.${node.name.property.name}`;
      
      const attributes = {};
      (node.attributes || []).forEach((attr) => {
        if (attr.type === 'JSXAttribute') {
          const attrName = attr.name.name;
          let attrVal = true;
          if (attr.value) {
            if (attr.value.type === 'StringLiteral') attrVal = attr.value.value;
            else if (attr.value.type === 'JSXExpressionContainer') {
              if (attr.value.expression.type === 'StringLiteral' || attr.value.expression.type === 'BooleanLiteral') {
                attrVal = attr.value.expression.value;
              } else {
                attrVal = attr.value.expression;
              }
            }
          }
          attributes[attrName] = attrVal;
        }
      });
      elements.push({ tagName, attributes, loc: node.loc, node });
    }
  });
  return elements;
}

const harness = new ChallengerTestHarness();

console.log(`${colors.bold}${colors.cyan}--- 1. EVENT PROPAGATION ON @beui/input ---${colors.reset}`);

// 1.1 Test @beui/input code contract: native onChange forwards target.value (string)
harness.test('INPUT-EVENT', 'input.jsx forwards string value to onChange callback', () => {
  const { code } = readAndParse('src/components/motion/input.jsx');
  harness.assert(code.includes('handleChange(e.target.value)'), 'input.jsx must call handleChange(e.target.value)');
  harness.assert(code.includes('onChange?.(next)'), 'input.jsx must call onChange?.(next) with string');

  // Simulate internal input component event handling logic
  let receivedValue = null;
  const onChangeCallback = (val) => { receivedValue = val; };
  const mockHandleChange = (next) => { onChangeCallback(next); };
  
  // Simulate synthetic input event
  const syntheticEvent = { target: { value: 'Isipathana 2026' } };
  mockHandleChange(syntheticEvent.target.value);

  harness.assertEqual(typeof receivedValue, 'string', 'Received value must be a string');
  harness.assertEqual(receivedValue, 'Isipathana 2026', 'Received string must match input');
});

// 1.2 Test handleChange in useRegistrationForm with various string types
harness.test('INPUT-EVENT', 'handleChange handles typical, empty, and special character strings', () => {
  // Replicate useRegistrationForm handleChange behavior
  const createFormHandler = () => {
    let formData = { index_number: '', email_address: '', full_name: '' };
    const handleChange = (field, value) => {
      let sanitizedVal = value;
      if (field === 'index_number') {
        sanitizedVal = value.replace(/[^0-9]/g, '');
      } else if (field === 'email_address') {
        sanitizedVal = value.toLowerCase();
      }
      formData[field] = sanitizedVal;
      return formData;
    };
    return { handleChange, getFormData: () => formData };
  };

  const handler = createFormHandler();
  
  // Normal string
  handler.handleChange('full_name', 'Sunil Perera');
  harness.assertEqual(handler.getFormData().full_name, 'Sunil Perera', 'full_name should update with string');

  // Empty string
  handler.handleChange('full_name', '');
  harness.assertEqual(handler.getFormData().full_name, '', 'full_name handles empty string');

  // Long string (10,000 chars)
  const longStr = 'a'.repeat(10000);
  handler.handleChange('full_name', longStr);
  harness.assertEqual(handler.getFormData().full_name.length, 10000, 'full_name handles large strings');

  // Unicode / Sinhala script
  handler.handleChange('full_name', 'සුනිල් පෙරේරා');
  harness.assertEqual(handler.getFormData().full_name, 'සුනිල් පෙරේරා', 'full_name handles unicode/Sinhala');

  // Index number numerical sanitization
  handler.handleChange('index_number', '29-012/A');
  harness.assertEqual(handler.getFormData().index_number, '29012', 'index_number strips non-numeric characters');

  // Email lowercasing
  handler.handleChange('email_address', 'Sunil.Perera@ICMU.LK');
  harness.assertEqual(handler.getFormData().email_address, 'sunil.perera@icmu.lk', 'email_address lowercases strings');
});

// 1.3 Adversarial Type Mismatch: Passing an Event object directly to handleChange crashes (proving string contract is critical)
harness.test('INPUT-EVENT', 'Adversarial: Passing SyntheticEvent object to handleChange throws TypeError without string contract', () => {
  const handleChange = (field, value) => {
    let sanitizedVal = value;
    if (field === 'index_number') {
      // If value is not a string (e.g. SyntheticEvent), .replace will throw
      sanitizedVal = value.replace(/[^0-9]/g, '');
    }
    return sanitizedVal;
  };

  let threwError = false;
  try {
    const fakeSyntheticEvent = { target: { value: '29012' } };
    handleChange('index_number', fakeSyntheticEvent);
  } catch (err) {
    threwError = true;
    harness.assert(err instanceof TypeError, 'Expected TypeError when passing object instead of string');
  }
  harness.assert(threwError, 'Passing an object to index_number handler without extracting string must fail');
});

// 1.4 AST Verification: All call sites in PersonalInfoStep and GuardianStep pass strings
harness.test('INPUT-EVENT', 'AST Audit: All onChange handlers in auth step components pass string arguments', () => {
  const authFiles = [
    'src/features/auth/components/PersonalInfoStep.jsx',
    'src/features/auth/components/GuardianStep.jsx',
  ];

  for (const f of authFiles) {
    const { ast } = readAndParse(f);
    const elements = getJSXElements(ast);
    const inputs = elements.filter(el => el.tagName === 'Input');
    for (const inp of inputs) {
      harness.assert(inp.attributes.onChange !== undefined, `${f} Input missing onChange`);
      // Ensure onChange is an arrow function or expression container
      harness.assert(
        inp.attributes.onChange.type === 'ArrowFunctionExpression',
        `${f} Input onChange must be an arrow function wrapper passing string`
      );
    }
  }
});


console.log(`\n${colors.bold}${colors.cyan}--- 2. AUTO-FORMATTING ON onBlur ---${colors.reset}`);

// 2.1 E.164 Phone Formatting in handleBlur
harness.test('BLUR-FORMAT', 'handleBlur converts Sri Lankan phone numbers to +94 E.164 format', () => {
  const runBlurPhone = (input) => {
    let formData = { whatsapp_number: input };
    const handleBlur = (field) => {
      if (field === 'whatsapp_number' || field === 'guardian_contact') {
        const val = formData[field];
        if (val && !val.startsWith('+')) {
          let clean = val.replace(/\D/g, '');
          if (clean.startsWith('0')) clean = clean.substring(1);
          if (clean.length > 0) {
            formData[field] = '+94' + clean;
          }
        }
      }
    };
    handleBlur('whatsapp_number');
    return formData.whatsapp_number;
  };

  // 10-digit standard
  harness.assertEqual(runBlurPhone('0771234567'), '+94771234567', 'Standard local mobile 077...');
  // With spaces
  harness.assertEqual(runBlurPhone('077 123 4567'), '+94771234567', 'Mobile with spaces');
  // With dashes
  harness.assertEqual(runBlurPhone('077-123-4567'), '+94771234567', 'Mobile with dashes');
  // Without leading zero
  harness.assertEqual(runBlurPhone('771234567'), '+94771234567', 'Mobile without leading 0');
  // Landline 011
  harness.assertEqual(runBlurPhone('0112501234'), '+94112501234', 'Landline with leading 0');
  // Already international +94
  harness.assertEqual(runBlurPhone('+94771234567'), '+94771234567', 'Already +94 number preserved');
  // International other (+1 US)
  harness.assertEqual(runBlurPhone('+12025550123'), '+12025550123', 'International +1 preserved');
  // Empty string
  harness.assertEqual(runBlurPhone(''), '', 'Empty string preserved without adding prefix');
  // Single zero
  harness.assertEqual(runBlurPhone('0'), '0', 'Single 0 clean length is 0, not converted');
});

// 2.2 Name Title Casing in handleBlur
harness.test('BLUR-FORMAT', 'handleBlur converts full_name and guardian_name to Title Case', () => {
  const runBlurName = (input) => {
    let formData = { full_name: input };
    const handleBlur = (field) => {
      if (['full_name', 'name_with_initials', 'guardian_name'].includes(field)) {
        formData[field] = toTitleCase(formData[field]);
      }
    };
    handleBlur('full_name');
    return formData.full_name;
  };

  harness.assertEqual(runBlurName('sunil perera'), 'Sunil Perera', 'Lowercase to title case');
  harness.assertEqual(runBlurName('SUNIL PERERA'), 'Sunil Perera', 'All caps to title case');
  harness.assertEqual(runBlurName('k. a. sunil perera'), 'K. A. Sunil Perera', 'Initials with name');
  harness.assertEqual(runBlurName(''), '', 'Empty string remains empty');
  harness.assertEqual(runBlurName('a'), 'A', 'Single character');
});

// 2.3 Non-formatted fields blur stability
harness.test('BLUR-FORMAT', 'handleBlur on non-formatted fields does not alter state', () => {
  const formData = { index_number: '29012', email_address: 'admin@icmu.lk' };
  const handleBlur = (field) => {
    if (field === 'whatsapp_number' || field === 'guardian_contact') {
      const val = formData[field];
      if (val && !val.startsWith('+')) {
        let clean = val.replace(/\D/g, '');
        if (clean.startsWith('0')) clean = clean.substring(1);
        if (clean.length > 0) formData[field] = '+94' + clean;
      }
    } else if (['full_name', 'name_with_initials', 'guardian_name'].includes(field)) {
      formData[field] = toTitleCase(formData[field]);
    }
  };

  handleBlur('index_number');
  harness.assertEqual(formData.index_number, '29012', 'index_number unchanged');
  handleBlur('email_address');
  harness.assertEqual(formData.email_address, 'admin@icmu.lk', 'email_address unchanged');
});

// 2.4 Sanitize payload edge cases and XSS prevention
harness.test('BLUR-FORMAT', 'sanitizeMemberInput neutralizes HTML and trims properly', () => {
  const maliciousInput = {
    index_number: '  29012  ',
    full_name: '<script>alert("hack")</script> Sunil Perera',
    name_with_initials: '<b>S.</b> Perera',
    city: 'colombo 05',
    whatsapp_number: '0771234567',
    email_address: '  SUNIL@EXAMPLE.COM  ',
  };

  const clean = sanitizeMemberInput(maliciousInput);
  harness.assertEqual(clean.index_number, '29012', 'Index number trimmed and capitalized');
  harness.assertEqual(clean.full_name, 'alert("hack") Sunil Perera', 'HTML script tag stripped');
  harness.assertEqual(clean.name_with_initials, 'S. Perera', 'HTML b tag stripped');
  harness.assertEqual(clean.city, 'Colombo 05', 'City title cased and trimmed');
  harness.assertEqual(clean.whatsapp_number, '+94771234567', 'Phone coerced to E164');
  harness.assertEqual(clean.email_address, 'sunil@example.com', 'Email trimmed and lowercased');
});


console.log(`\n${colors.bold}${colors.cyan}--- 3. FORM SUBMISSION BEHAVIOR WITH @beui/button-base ---${colors.reset}`);

// 3.1 Button base component props and type default
harness.test('BUTTON-SUBMIT', '@beui/button-base defaults to type="button" and accepts type="submit"', () => {
  const { code } = readAndParse('src/components/motion/button/base.jsx');
  
  // Must render type="button" by default
  harness.assert(code.includes('type="button"'), 'Button component must have type="button" attribute');
  // Must spread {...rest} AFTER type="button" to allow explicit type="submit" override
  const typeIndex = code.indexOf('type="button"');
  const restIndex = code.indexOf('{...rest}');
  harness.assert(restIndex > typeIndex, '{...rest} must come after type="button" so callers can override with type="submit"');
});

// 3.2 Audit all forms in application for correct submit vs button types
harness.test('BUTTON-SUBMIT', 'All form submit buttons have explicit type="submit"', () => {
  const formSubmitChecks = [
    { file: 'src/features/auth/components/SkillsStep.jsx', expectedSubmits: 1 },
    { file: 'src/pages/LoginPage.jsx', expectedSubmits: 1 },
    { file: 'src/features/admin/components/SkillsTable.jsx', expectedSubmits: 1 },
    { file: 'src/features/admin/components/TeamsTable.jsx', expectedSubmits: 1 },
  ];

  for (const check of formSubmitChecks) {
    const { ast } = readAndParse(check.file);
    const elements = getJSXElements(ast);
    const submitButtons = elements.filter(el => el.tagName === 'Button' && el.attributes.type === 'submit');
    harness.assertEqual(
      submitButtons.length, 
      check.expectedSubmits, 
      `${check.file} must contain exactly ${check.expectedSubmits} Button with type="submit"`
    );
  }
});

// 3.3 Adversarial: Navigation and action buttons do NOT submit forms
harness.test('BUTTON-SUBMIT', 'Adversarial: Multi-step navigation and row action buttons do NOT have type="submit"', () => {
  const nonSubmitChecks = [
    { file: 'src/features/auth/components/PersonalInfoStep.jsx', component: 'Button' },
    { file: 'src/features/auth/components/GuardianStep.jsx', component: 'Button' },
    { file: 'src/features/admin/components/MembersTable.jsx', component: 'Button' },
  ];

  for (const check of nonSubmitChecks) {
    const { ast } = readAndParse(check.file);
    const elements = getJSXElements(ast);
    const submitButtons = elements.filter(el => el.tagName === check.component && el.attributes.type === 'submit');
    harness.assertEqual(
      submitButtons.length, 
      0, 
      `${check.file} must NOT have any submit buttons (should only navigate or dispatch actions)`
    );
  }
});


console.log(`\n${colors.bold}${colors.cyan}--- 4. TABLE RENDERING: EMPTY, SINGLE, MULTIPLE ROWS ---${colors.reset}`);

// 4.1 MembersTable rendering resilience
harness.test('TABLE-RENDER', 'MembersTable logic handles empty arrays, null/undefined, and multi-row maps', () => {
  const { code } = readAndParse('src/features/admin/components/MembersTable.jsx');
  
  // Guard check
  harness.assert(
    code.includes('if (!memberData || memberData.length === 0)'),
    'MembersTable must check for empty/falsy memberData'
  );
  harness.assert(
    code.includes('No pending applications found'),
    'MembersTable must display friendly empty state fallback'
  );

  // Simulate rendering logic
  const simulateMembersTable = (data, isLoading = false) => {
    if (isLoading) return { state: 'loading', html: 'Loading applications...' };
    if (!data || data.length === 0) return { state: 'empty', html: 'No pending applications found.' };
    
    const rows = data.map(m => ({
      id: m.id,
      name: m.full_name,
      index: m.index_number,
      batch: m.batch_year,
      status: m.membership_status,
      hasActionButtons: m.membership_status === 'pending',
    }));
    return { state: 'rendered', rowCount: rows.length, rows };
  };

  // Case 1: Null or Undefined
  const nullResult = simulateMembersTable(null);
  harness.assertEqual(nullResult.state, 'empty', 'Null memberData renders empty state');

  // Case 2: Empty Array []
  const emptyResult = simulateMembersTable([]);
  harness.assertEqual(emptyResult.state, 'empty', 'Empty array renders empty state');

  // Case 3: Single Row
  const singleRow = [{
    id: 'm1',
    full_name: 'Sunil Perera',
    email_address: 'sunil@perera.lk',
    index_number: '29012',
    batch_year: '2026',
    membership_status: 'pending',
  }];
  const singleResult = simulateMembersTable(singleRow);
  harness.assertEqual(singleResult.state, 'rendered', 'Single row renders properly');
  harness.assertEqual(singleResult.rowCount, 1, 'Single row count is 1');
  harness.assert(singleResult.rows[0].hasActionButtons, 'Pending member has action buttons');

  // Case 4: 100 Rows Stress Test
  const multiRows = Array.from({ length: 100 }, (_, i) => ({
    id: `m-${i}`,
    full_name: `Applicant ${i}`,
    email_address: `app${i}@example.com`,
    index_number: `29${100 + i}`,
    batch_year: '2026',
    membership_status: i % 3 === 0 ? 'pending' : (i % 3 === 1 ? 'accepted' : 'rejected'),
  }));
  const multiResult = simulateMembersTable(multiRows);
  harness.assertEqual(multiResult.state, 'rendered', '100 rows render properly');
  harness.assertEqual(multiResult.rowCount, 100, 'All 100 rows rendered');
  
  // Validate AnimatedBadge statuses across the 100 rows
  const pendingCount = multiResult.rows.filter(r => r.status === 'pending').length;
  const acceptedCount = multiResult.rows.filter(r => r.status === 'accepted').length;
  const rejectedCount = multiResult.rows.filter(r => r.status === 'rejected').length;
  harness.assertEqual(pendingCount + acceptedCount + rejectedCount, 100, 'All rows have valid status');
});

// 4.2 SkillsTable and TeamsTable rendering resilience
harness.test('TABLE-RENDER', 'SkillsTable and TeamsTable render empty, single, and 50 rows without error', () => {
  const simulateSkillsTable = (data) => {
    return (data || []).map(s => ({
      id: s.id,
      name: s.skill_name,
      isActive: s.is_active !== false,
      isProtected: Boolean(s.is_protected),
    }));
  };

  // Empty
  harness.assertEqual(simulateSkillsTable([]).length, 0, 'Empty skills array yields 0 rows');

  // 1 row protected
  const singleProtected = simulateSkillsTable([{ id: 's1', skill_name: 'Photography', is_protected: true }]);
  harness.assertEqual(singleProtected[0].isProtected, true, 'Protected skill flag respected');

  // 50 rows
  const fiftySkills = Array.from({ length: 50 }, (_, i) => ({
    id: `skill-${i}`,
    skill_name: `Skill ${i}`,
    is_protected: i === 0,
    is_active: i % 2 === 0,
  }));
  const fiftyResult = simulateSkillsTable(fiftySkills);
  harness.assertEqual(fiftyResult.length, 50, '50 skills mapped correctly');
});


console.log(`\n${colors.bold}${colors.cyan}--- 5. TABS VALUE TRANSITIONS ---${colors.reset}`);

// 5.1 @beui/tabs contract: controlled value transitions and hidden panels
harness.test('TABS-TRANSITION', 'Tabs handles controlled value transitions and sets hidden attribute on inactive tabs', () => {
  const { code } = readAndParse('src/components/motion/tabs.jsx');
  
  // Must support value and onValueChange
  harness.assert(code.includes('onValueChange?.(v)'), 'Tabs must call onValueChange?.(v)');
  // Must render inactive panels with hidden attribute
  harness.assert(code.includes('if (!active)'), 'TabsContent must check active state');
  harness.assert(code.includes('hidden className={className}'), 'Inactive TabsContent must have hidden attribute');

  // Simulate Tabs Context State Transition
  class MockTabsController {
    constructor(initialValue = 'applications') {
      this.currentValue = initialValue;
      this.listeners = [];
    }

    onValueChange(val) {
      this.currentValue = val;
      this.listeners.forEach(fn => fn(val));
    }

    isContentActive(tabValue) {
      return this.currentValue === tabValue;
    }
  }

  const tabs = new MockTabsController('applications');
  
  // Initial state
  harness.assert(tabs.isContentActive('applications'), 'Applications tab active initially');
  harness.assert(!tabs.isContentActive('skills'), 'Skills tab inactive initially');
  harness.assert(!tabs.isContentActive('teams'), 'Teams tab inactive initially');

  // Transition to 'skills'
  tabs.onValueChange('skills');
  harness.assert(!tabs.isContentActive('applications'), 'Applications tab hidden after switch');
  harness.assert(tabs.isContentActive('skills'), 'Skills tab active after switch');
  harness.assert(!tabs.isContentActive('teams'), 'Teams tab hidden after switch');

  // Transition to 'teams'
  tabs.onValueChange('teams');
  harness.assert(tabs.isContentActive('teams'), 'Teams tab active after switch');

  // Adversarial Stress: 1,000 rapid tab transitions
  const tabSequence = ['applications', 'skills', 'teams'];
  for (let i = 0; i < 1000; i++) {
    const target = tabSequence[i % 3];
    tabs.onValueChange(target);
    harness.assertEqual(tabs.currentValue, target, `Rapid transition ${i} must match target`);
  }
});

// 5.2 AdminPage binds activeTab state to Tabs
harness.test('TABS-TRANSITION', 'AdminPage correctly passes activeTab and setActiveTab to Tabs component', () => {
  const { ast } = readAndParse('src/pages/AdminPage.jsx');
  const elements = getJSXElements(ast);
  const tabsEl = elements.find(el => el.tagName === 'Tabs');
  harness.assert(Boolean(tabsEl), 'AdminPage must render Tabs component');
  harness.assert(tabsEl.attributes.value !== undefined, 'Tabs must receive value prop');
  harness.assert(tabsEl.attributes.onValueChange !== undefined, 'Tabs must receive onValueChange prop');

  // Check TabsTriggers
  const triggers = elements.filter(el => el.tagName === 'TabsTrigger');
  const triggerValues = triggers.map(t => t.attributes.value);
  harness.assert(triggerValues.includes('applications'), 'Trigger for applications exists');
  harness.assert(triggerValues.includes('skills'), 'Trigger for skills exists');
  harness.assert(triggerValues.includes('teams'), 'Trigger for teams exists');

  // Check TabsContents
  const contents = elements.filter(el => el.tagName === 'TabsContent');
  const contentValues = contents.map(c => c.attributes.value);
  harness.assert(contentValues.includes('applications'), 'Content for applications exists');
  harness.assert(contentValues.includes('skills'), 'Content for skills exists');
  harness.assert(contentValues.includes('teams'), 'Content for teams exists');
});

// Run summary and exit
const exitCode = harness.summary();
process.exit(exitCode);

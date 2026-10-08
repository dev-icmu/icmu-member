# TEST_INFRA — Automated UI Migration Test Infrastructure

## Overview
This document defines the architecture, methodology, authoritative sources, and execution protocol for the automated requirement-driven E2E verification test suite covering the UI component migration to `shadcn` and `@beui`.

## Architecture & Design Principles

### 1. Dual Track Testing & Independent Verification
The verification test suite operates independently from the UI implementation. The test runner uses AST-level syntax and token traversal (via `@babel/parser`) to perform deterministic verification without relying on runtime DOM mocking or fragile string pattern matching.

### 2. No Facade Guarantee
Tests inspect genuine JSX AST nodes (`JSXOpeningElement`), component declarations, prop bindings, and module import/export structures. No assertions are trivialized or mocked out.

### 3. Progressive Milestone Support
The test runner supports targeted execution per milestone or tier, allowing progressive validation throughout the development lifecycle:
- `--tier <1|2|3|4>`: Run specific tier assertions.
- `--milestone <M1|M2|M3|M4>`: Run cumulative milestone assertions.
- Default: Executes all 4 tiers (83 automated test cases) returning exit code 0 only when all pass.

---

## 4-Tier Test Matrix

| Tier | Focus | Test Count | Key Verification Objectives |
|------|-------|------------|-----------------------------|
| **Tier 1: Feature Coverage** | Static AST Tag Audit | 35 | Verifies zero raw `<input>`, `<button>`, `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` tags in `src/features/auth`, `src/features/admin`, and `src/pages`. Verifies replacement with motion and shadcn primitives. |
| **Tier 2: Boundary & Corner Cases** | Path Aliases & Exports | 25 | Validates `components.json` alias integrity, `@beui` registry endpoints, component export presence, input types (`date`, `tel`, `email`, `password`), disabled states, and CSS theme tokens. |
| **Tier 3: Cross-Feature Combinations** | Event & Prop Contracts | 18 | Validates `@beui/input` `onChange` string value contracts, `onBlur` sanitization bindings, explicit `type="submit"` on form buttons, row action mutations, and navigation tab state sync. |
| **Tier 4: Real-World Scenarios** | Build & Lint Validation | 5 | Runs full `npm run build` production bundling, asset bundle checks, `npm run lint` verification with zero fatal errors, and Vite/jsconfig alias resolution. |

---

## Detailed Test Inventory

### Tier 1: Feature Coverage (35 Tests)
- `T1-AUTH-01`: `PersonalInfoStep` — Zero raw `<input>` elements.
- `T1-AUTH-02`: `PersonalInfoStep` — Zero raw `<button>` elements.
- `T1-AUTH-03`: `PersonalInfoStep` — Imports motion `Input` component from `@/components/motion/input`.
- `T1-AUTH-04`: `PersonalInfoStep` — Imports motion `Button` component from `@/components/motion/button/base`.
- `T1-AUTH-05`: `PersonalInfoStep` — All 7 personal fields use motion `Input`.
- `T1-AUTH-06`: `GuardianStep` — Zero raw `<input>` elements.
- `T1-AUTH-07`: `GuardianStep` — Zero raw `<button>` elements.
- `T1-AUTH-08`: `GuardianStep` — Imports motion `Input` and `Button`.
- `T1-AUTH-09`: `GuardianStep` — All 3 guardian fields use motion `Input`.
- `T1-AUTH-10`: `GuardianStep` — Navigation uses motion `Button`.
- `T1-AUTH-11`: `SkillsStep` — Zero raw `<input>` elements.
- `T1-AUTH-12`: `SkillsStep` — Zero raw `<button>` elements.
- `T1-AUTH-13`: `SkillsStep` — Navigation uses motion `Button`.
- `T1-AUTH-14`: `SkillsStep` — Submit registration button has `type="submit"`.
- `T1-AUTH-15`: `SkillsStep` — Back button has `type="button"`.
- `T1-ADMIN-01`: `MembersTable` — Zero raw HTML `<table>` tags.
- `T1-ADMIN-02`: `MembersTable` — Zero raw `<button>` elements.
- `T1-ADMIN-03`: `MembersTable` — Uses shadcn `Table` primitives (`Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`).
- `T1-ADMIN-04`: `MembersTable` — Uses motion `Button` for approve and reject actions.
- `T1-ADMIN-05`: `MembersTable` — Uses `AnimatedBadge` for status display.
- `T1-ADMIN-06`: `SkillsTable` — Zero raw HTML `<table>` tags.
- `T1-ADMIN-07`: `SkillsTable` — Zero raw `<input>` elements.
- `T1-ADMIN-08`: `SkillsTable` — Zero raw `<button>` elements.
- `T1-ADMIN-09`: `SkillsTable` — Uses shadcn `Table` primitives.
- `T1-ADMIN-10`: `SkillsTable` — Uses motion `Input` and `Button` for skill creation.
- `T1-ADMIN-11`: `TeamsTable` — Zero raw HTML `<table>` tags.
- `T1-ADMIN-12`: `TeamsTable` — Zero raw `<input>` elements.
- `T1-ADMIN-13`: `TeamsTable` — Zero raw `<button>` elements.
- `T1-ADMIN-14`: `TeamsTable` — Uses shadcn `Table` primitives.
- `T1-ADMIN-15`: `TeamsTable` — Uses motion `Input` and `Button` for team creation.
- `T1-PAGE-01`: `AdminPage` — Zero raw `<button>` elements.
- `T1-PAGE-02`: `AdminPage` — Uses `@beui/tabs` for navigation.
- `T1-PAGE-03`: `LoginPage` — Zero raw `<input>` elements.
- `T1-PAGE-04`: `LoginPage` — Zero raw `<button>` elements.
- `T1-PAGE-05`: `LoginPage` — Uses motion `Input` and `Button` with `type="submit"`.

### Tier 2: Boundary & Corner Cases (25 Tests)
- `T2-ALIAS-01`: `components.json` exists and contains valid JSON.
- `T2-ALIAS-02`: `components.json` maps `ui` to `@/components/ui`.
- `T2-ALIAS-03`: `components.json` maps `components` to `@/components`.
- `T2-ALIAS-04`: `components.json` maps `utils` to `@/lib/utils`.
- `T2-ALIAS-05`: `components.json` configures `@beui` registry (`https://beui.dev/r/{name}.json`).
- `T2-EXPORT-01`: shadcn `Table` primitive exists at `src/components/ui/table.jsx`.
- `T2-EXPORT-02`: shadcn `Table` exports `Table`, `TableHeader`, `TableBody`, `TableHead`, `TableRow`, `TableCell`.
- `T2-EXPORT-03`: Motion `Input` primitive exists and exports `Input`.
- `T2-EXPORT-04`: Motion `Button` primitive exists and exports `Button`.
- `T2-EXPORT-05`: Motion `Tabs` primitive exists and exports `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- `T2-EXPORT-06`: Motion `AnimatedBadge` primitive exists and exports `AnimatedBadge`.
- `T2-EXPORT-07`: Motion `Checkbox` primitive exists and exports `Checkbox`.
- `T2-BOUND-01`: `Input` component handles `type="date"` attribute.
- `T2-BOUND-02`: `Input` component handles `type="tel"` attribute.
- `T2-BOUND-03`: `Input` component handles `type="email"` attribute.
- `T2-BOUND-04`: `Input` component handles `type="password"` attribute in `LoginPage`.
- `T2-BOUND-05`: `Input` component handles `error` prop propagation.
- `T2-BOUND-06`: `Button` component handles `disabled` state propagation.
- `T2-BOUND-07`: `Button` component variant props match contract (`primary`, `secondary`, `outline`).
- `T2-THEME-01`: `src/index.css` defines `--background` token.
- `T2-THEME-02`: `src/index.css` defines `--foreground` token.
- `T2-THEME-03`: `src/index.css` defines `--border` token.
- `T2-THEME-04`: `src/index.css` defines `--muted` token.
- `T2-THEME-05`: `src/index.css` defines `--ring` token.
- `T2-THEME-06`: `src/index.css` defines `--primary` token.

### Tier 3: Cross-Feature Combinations (18 Tests)
- `T3-EVENT-01`: `@beui/input` `onChange` string value contract in `PersonalInfoStep`.
- `T3-EVENT-02`: `@beui/input` `onChange` string value contract in `GuardianStep`.
- `T3-EVENT-03`: `onBlur` sanitization contract bound for text inputs in `PersonalInfoStep`.
- `T3-EVENT-04`: `onBlur` sanitization contract bound in `GuardianStep`.
- `T3-EVENT-05`: `@beui/input` `onChange` string value contract in `SkillsTable`.
- `T3-EVENT-06`: `@beui/input` `onChange` string value contract in `TeamsTable`.
- `T3-EVENT-07`: `@beui/input` `onChange` string value contract in `LoginPage`.
- `T3-SUBMIT-01`: Form submission contract: `SkillsStep` submit button has `type="submit"`.
- `T3-SUBMIT-02`: Form submission contract: `SkillsTable` add button has `type="submit"`.
- `T3-SUBMIT-03`: Form submission contract: `TeamsTable` add button has `type="submit"`.
- `T3-SUBMIT-04`: Form submission contract: `LoginPage` login button has `type="submit"`.
- `T3-ACTION-01`: Row action contract: `MembersTable` binds `approveMutation.mutateAsync`.
- `T3-ACTION-02`: Row action contract: `MembersTable` binds `rejectMutation.mutateAsync`.
- `T3-ACTION-03`: Row action contract: `SkillsTable` binds `updateSkillMutation.mutateAsync`.
- `T3-ACTION-04`: Row action contract: `TeamsTable` binds `updateTeamMutation.mutateAsync`.
- `T3-TABS-01`: `AdminPage` `Tabs` binds `value` and `onValueChange` for navigation.
- `T3-TABS-02`: `AdminPage` `TabsTrigger` components cover `applications`, `skills`, `teams`.
- `T3-FLOW-01`: `SignUpPage` orchestrates multi-step form state across components.

### Tier 4: Real-World Scenarios (5 Tests)
- `T4-CONFIG-01`: Vite configuration defines `@` path alias mapping to `./src`.
- `T4-CONFIG-02`: `jsconfig.json` defines `@/*` path alias mapping to `src/*`.
- `T4-BUILD-01`: Production build `npm run build` completes with exit code 0.
- `T4-BUILD-02`: Production build generates `dist/index.html` and assets.
- `T4-LINT-01`: Linter check `npm run lint` passes with 0 fatal errors.

---

## Execution Guide

### Run Full Suite (All 83 Tests)
```bash
node scripts/verify-ui-migration.mjs
```

### Run by Tier
```bash
# Tier 1: Static AST Tag Audit
node scripts/verify-ui-migration.mjs --tier 1

# Tier 2: Boundary & Corner Cases
node scripts/verify-ui-migration.mjs --tier 2

# Tier 3: Cross-Feature Combinations
node scripts/verify-ui-migration.mjs --tier 3

# Tier 4: Real-World Scenarios (Build & Lint)
node scripts/verify-ui-migration.mjs --tier 4
```

### Run by Milestone
```bash
# Milestone 1: Primitives & Theme Tokens
node scripts/verify-ui-migration.mjs --milestone M1

# Milestone 2: Auth Migration
node scripts/verify-ui-migration.mjs --milestone M2

# Milestone 3: Admin Migration
node scripts/verify-ui-migration.mjs --milestone M3

# Milestone 4: Full Validation
node scripts/verify-ui-migration.mjs --milestone M4
```

### Machine-Readable JSON Output
```bash
node scripts/verify-ui-migration.mjs --json
```

# Project: Frontend UI Migration to shadcn and @beui

## Architecture
The ICMU Member portal is a React 19 application built with Vite and Tailwind CSS v4.
- State management: TanStack Query (v5) for server cache/mutations, Redux Toolkit, React state/custom hooks.
- Styling: Tailwind CSS v4 via `@tailwindcss/vite`, global stylesheet `src/index.css`.
- Motion & Animation: Framer Motion v13 (`motion/react`).
- Design System: `shadcn` CLI component registry targeting `@/components/ui` and `@beui` registry targeting `@/components/motion`.
- Path Aliases: `@/*` mapped to `./src/*` via `vite.config.js` and `jsconfig.json`.

## Code Layout
- `src/components/ui/`: Standard shadcn UI primitives (e.g. `table.jsx`).
- `src/components/motion/`: `@beui` animated motion primitives (e.g. `input.jsx`, `button/base.jsx`, `tabs.jsx`, `checkbox.jsx`, `animated-badge.jsx`).
- `src/lib/`: Shared utilities (`utils.js`, `ease.js`, `touch.js`, hooks).
- `src/features/auth/`:
  - `components/PersonalInfoStep.jsx`
  - `components/GuardianStep.jsx`
  - `components/SkillsStep.jsx`
  - `hooks/useRegistrationForm.js`
- `src/features/admin/`:
  - `components/MembersTable.jsx`
  - `components/SkillsTable.jsx`
  - `components/TeamsTable.jsx`
- `src/pages/`:
  - `AdminPage.jsx`
  - `LoginPage.jsx`
  - `SignUpPage.jsx`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | UI Primitive Installation | Install `@beui/input`, `@beui/button-base`, `@beui/tabs`, `@beui/checkbox`, `@beui/animated-badge`, and `table` via shadcn CLI | M1 | Survey (Explorer 2, Spec Miner 3) |
| 2 | CSS Theme Tokens Configuration | Configure CSS variables in `src/index.css` for background, foreground, border, muted, ring, primary | M1 | Survey (Explorer 2) |
| 3 | PersonalInfoStep Input & Button Migration | Replace 7 raw `<input>` and 1 raw `<button>` in `PersonalInfoStep.jsx` with `@beui/input` and `@beui/button-base` | M2 | Survey (Explorer 1) |
| 4 | GuardianStep Input & Button Migration | Replace 3 raw `<input>` and 2 raw `<button>` in `GuardianStep.jsx` with `@beui/input` and `@beui/button-base` | M2 | Survey (Explorer 1) |
| 5 | SkillsStep Selection & Action Migration | Replace dynamic skill toggle buttons and 2 navigation buttons in `SkillsStep.jsx` with `@beui/button-base` and `@beui/checkbox` | M2 | Survey (Explorer 1, Spec Miner 3) |
| 6 | MembersTable Table & Action Migration | Replace raw `<table>` elements (table, thead, tbody, tr, th, td) with shadcn `Table` primitives, action buttons with `@beui/button-base`, and badges with `@beui/animated-badge` | M3 | Survey (Explorer 1, Spec Miner 3) |
| 7 | SkillsTable Table, Form & Action Migration | Replace 2 raw `<input>`, 1 submit `<button>`, raw `<table>` elements, and row action buttons with `@beui` and shadcn primitives | M3 | Survey (Explorer 1, Spec Miner 3) |
| 8 | TeamsTable Table, Form & Action Migration | Replace 1 raw `<input>`, 1 submit `<button>`, raw `<table>` elements, and row action buttons with `@beui` and shadcn primitives | M3 | Survey (Explorer 1, Spec Miner 3) |
| 9 | AdminPage & LoginPage UI Migration | Replace raw navigation tabs, filter buttons, sign-out button, and login inputs/buttons with `@beui/tabs`, `@beui/button-base`, and `@beui/input` | M3 | Survey (Explorer 1, Spec Miner 3) |
| 10 | Static Tag Audit & Build/Lint Validation | Verify zero raw `<input>`, `<button>`, `<table>` in features, 0 build errors, 0 fatal lint errors | M4 | Survey (Explorer 1, 2) |
| 11 | Knowledge Graph Update | Run `graphify update .` to update the AST and architecture knowledge graph | M4 | Survey (Explorer 2, Codebase rule) |
| 12 | Adversarial Hardening & Integrity Forensic Audit | Stress-test event handlers and verify genuine implementation (no dummy facades or cheating) | M5 | Survey (Orchestrator Protocol) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Primitive Installation & Theme Setup | Install `@beui` and `shadcn` primitives via CLI, setup CSS theme tokens | none | DONE |
| M2 | Auth Feature UI Migration | Refactor `PersonalInfoStep.jsx`, `GuardianStep.jsx`, `SkillsStep.jsx` | M1 | DONE |
| M3 | Admin Feature UI Migration | Refactor `MembersTable.jsx`, `SkillsTable.jsx`, `TeamsTable.jsx`, `AdminPage.jsx`, `LoginPage.jsx` | M1 | DONE |
| M4 | Build, Lint & E2E Validation | Run static tag audits, `npm run build`, `npm run lint`, `graphify update .` | M2, M3 | DONE |
| M5 | Adversarial Hardening & Forensic Audit | Challengers test edge cases; Forensic Auditor verifies authenticity | M4 | DONE |

## Interface Contracts
### `@beui/input` (`@/components/motion/input`)
- Exports: `Input`
- Props: `label` (string), `value` (string), `defaultValue` (string), `onChange` ((val: string) => void), `onBlur` (() => void), `placeholder` (string), `type` (string), `error` (string | boolean), `className` (string), `leftIcon`, `rightIcon`
- Note: `onChange` receives the string value directly (`val`), not `e.target.value`.

### `@beui/button-base` (`@/components/motion/button/base`)
- Exports: `Button`
- Props: `variant` ("primary" | "secondary" | "outline" | "ghost"), `size` ("sm" | "md" | "lg" | "icon"), `type` ("button" | "submit" | "reset" - default is "button"), `disabled` (boolean), `onClick` (function), `className` (string), `children`
- Note: Must explicitly pass `type="submit"` when used as form submit button.

### `@beui/tabs` (`@/components/motion/tabs`)
- Exports: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Props: `Tabs` accepts `value` (string), `onValueChange` ((val: string) => void), `variant` ("underline" | "pill" | "segment")

### `@beui/animated-badge` (`@/components/motion/animated-badge`)
- Exports: `AnimatedBadge`
- Props: `status` ("neutral" | "info" | "success" | "warning" | "danger" | "loading"), `size` ("sm" | "md"), `children`

### `table` (`@/components/ui/table`)
- Exports: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`
- Directly maps to standard HTML table semantics with styling.

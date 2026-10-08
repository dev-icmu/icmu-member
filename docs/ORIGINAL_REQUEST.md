# Original User Request

## 2026-09-12T22:42:43Z

Refactor the current React frontend to exclusively use the `shadcn` and `@beui` component libraries, establishing a single, unified design system and removing all raw HTML form/UI elements.

Working directory: C:\Users\User\Documents\DEV PROJECTS\icmu-member
Integrity mode: demo

## Requirements

### R1. UI Component Migration
Replace all custom HTML inputs, buttons, tables, checkboxes, and tabs in the `src/features/auth` and `src/features/admin` directories with components from the `shadcn` and `@beui` ecosystems. Maintain the existing application state and data fetching logic.

### R2. Component Installation
Fetch and install the necessary UI primitives using the shadcn CLI (e.g., `npx shadcn@latest add @beui/input`, `@beui/table`, `@beui/tabs`, etc.) rather than building components from scratch. Ensure you read the live registry at `https://beui.dev/r/registry.json` if you need to map component names.

## Acceptance Criteria

### Component Integration
- [ ] No raw `<input>`, `<button>`, or `<table>` tags remain in the refactored feature files (Auth and Admin).
- [ ] The `components.json` is respected and all added UI components are placed in the correct alias path (e.g., `src/components/ui` or `src/components/motion`).

### Build Verification
- [ ] `npm run build` completes with 0 module resolution errors or syntax errors.
- [ ] `npm run lint` passes without any fatal React hook or undefined variable errors.

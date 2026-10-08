# Graph Report - icmu-member  (2026-09-13)

## Corpus Check
- 168 files · ~104,180 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1154 nodes · 1279 edges · 112 communities (89 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- dependencies
- Home.jsx
- useMembers.js
- devDependencies
- components.json
- 3. Forms & Inputs
- 1.2 Exact Inventory of Raw HTML Form and UI Elements
- adversarial-empirical-test.mjs
- Design Process
- Specification Mining Report: Registry & UI Primitive Specification
- 1. Observation
- table.json
- compilerOptions
- ease.js
- animated-badge.json
- animated-toast-stack.json
- button-stateful.json
- center-morph-modal.json
- select.json
- button-base.json
- checkbox.json
- morphing-modal.json
- otp-input.json
- switch.json
- tabs.json
- tilt-card.json
- tooltip.json
- BRIEFING — 2026-09-13T04:38:15+05:30
- BRIEFING — 2026-09-12T23:01:30Z
- Interface Contracts
- BRIEFING — 2026-09-12T23:07:00Z
- Antigravity React & shadcn/ui System
- BRIEFING — 2026-09-12T22:50:00Z
- BRIEFING — 2026-09-13T04:20:00+05:30
- Project Plan: Frontend UI Migration to shadcn and @beui
- Original User Request
- BRIEFING — 2026-09-12T22:42:43Z
- spec_miner_survey_3/BRIEFING.md
- Original User Request
- shadcn_badge.json
- shadcn_button.json
- shadcn_checkbox.json
- shadcn_dialog.json
- shadcn_label.json
- shadcn_tabs.json
- Dispatch: Worker M1 (Primitive Installation & Theme Setup)
- Dispatch: E2E Test Writer (Dual Track Testing)
- Dispatch: Explorer Survey 1 (Codebase Investigation)
- beUI
- Dispatch: Spec Miner Survey 3 (Registry & UI Primitive Specification)
- shadcn_card.json
- shadcn_input.json
- shadcn_table.json
- beUI
- beUI
- Dispatch: Explorer Survey 2 (Environment & Project Config Investigation)
- Progress Tracker
- fetch_shadcn.cjs
- fetch_specs.cjs
- parse_components.cjs
- beUI
- Progress: Explorer Survey 1
- Dispatch History
- Progress — E2E Test Writer
- Progress: Worker M1 (Primitive Installation & Theme Setup)
- explorer_survey_2/progress.md
- rules/graphify.md
- generate_handoff.cjs
- teamwork_preview_test_writer_e2e_1/skills/beui/SKILL.md
- workflows/graphify.md
- verify-ui-migration.mjs
- BRIEFING — 2026-09-13T04:32:00Z
- Milestone M1 Handoff Report: Primitive Installation & Theme Setup
- teamwork_preview_worker_m2_1/BRIEFING.md
- Dispatch: Worker M2 (Auth Feature UI Migration)
- Dispatch: Worker M3 (Admin Feature UI Migration)
- beUI
- Progress — Worker M3 (Admin Feature UI Migration)
- teamwork_preview_worker_m2_1/progress.md
- TEST_INFRA — Automated UI Migration Test Infrastructure
- Independent Architecture, Styling & Robustness Review Handoff
- AdminPage.jsx
- Handoff Report: Reviewer 1 (Independent Code & Interface Review)
- cn
- base.jsx
- BRIEFING — 2026-09-12T23:12:00Z
- audit.mjs
- Forensic Integrity Audit & Anti-Cheating Verification Report
- BRIEFING — 2026-09-12T23:08:00Z
- BRIEFING — 2026-09-12T23:10:45Z
- BRIEFING — 2026-09-12T23:08:00Z
- TEST_READY — UI Component Migration E2E Test Suite
- teamwork_preview_challenger_2/BRIEFING.md
- tabs.jsx
- Handoff Report: E2E Test Suite Creation & Verification
- Handoff Report: Worker M3 (Admin Feature UI Migration)
- Dispatch: Forensic Auditor (Integrity Forensics & Anti-Cheating Verification)
- Dispatch: Challenger 1 (Adversarial Empirical Verification)
- Dispatch: Challenger 2 (Adversarial Static & Edge Case Verification)
- Dispatch: Reviewer 1 (Independent Code & Interface Review)
- Dispatch: Reviewer 2 (Independent Architecture & Robustness Review)
- teamwork_preview_worker_m2_1/handoff.md
- Gate Status — Iteration 1
- Progress — Challenger 1
- teamwork_preview_auditor_1/progress.md
- beui_skill.md
- teamwork_preview_challenger_2/progress.md
- teamwork_preview_reviewer_1/progress.md
- teamwork_preview_reviewer_2/progress.md

## God Nodes (most connected - your core abstractions)
1. `cn()` - 23 edges
2. `runSuite()` - 11 edges
3. `Button` - 11 edges
4. `AdminPage()` - 11 edges
5. `BRIEFING — 2026-09-13T04:38:15+05:30` - 11 edges
6. `BRIEFING — 2026-09-12T23:12:00Z` - 11 edges
7. `BRIEFING — 2026-09-12T23:01:30Z` - 11 edges
8. `BRIEFING — 2026-09-13T04:32:00Z` - 11 edges
9. `Specification Mining Report: Registry & UI Primitive Specification` - 10 edges
10. `BRIEFING — 2026-09-12T23:08:00Z` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Checkbox()` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/checkbox.jsx → src/lib/utils.js
- `Button` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/button/base.jsx → src/lib/utils.js
- `ButtonLink` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/button/base.jsx → src/lib/utils.js
- `Input` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/input.jsx → src/lib/utils.js
- `TabsList()` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/tabs.jsx → src/lib/utils.js

## Import Cycles
- None detected.

## Communities (112 total, 20 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (39): class-variance-authority, clsx, lucide-react, motion, dependencies, class-variance-authority, clsx, lucide-react (+31 more)

### Community 1 - "Home.jsx"
Cohesion: 0.05
Nodes (41): App(), IcmuEmblem(), IcmuSmallLogo(), PageLoader(), ScrollToAnchor(), HeroSection(), Footer(), Navbar() (+33 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (30): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+22 more)

### Community 4 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 5 - "3. Forms & Inputs"
Cohesion: 0.08
Nodes (23): 1. Buttons & Interactions, 2. Badges & Data Display, 3. Forms & Inputs, 4. Overlays & Context, 5. Advanced / Compound Components, Animated Badge, Base Button, Checkbox (+15 more)

### Community 6 - "1.2 Exact Inventory of Raw HTML Form and UI Elements"
Cohesion: 0.09
Nodes (21): 1.1 Feature Directory Inventory, 1.2 Exact Inventory of Raw HTML Form and UI Elements, 1.3 Total Element Count Summary in Feature Directories, 1.4 Consuming Pages & Tab Elements, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion & Complete Checklist (+13 more)

### Community 7 - "adversarial-empirical-test.mjs"
Cohesion: 0.08
Nodes (25): ChallengerTestHarness, colors, __dirname, exitCode, __filename, getJSXElements(), harness, MockTabsController (+17 more)

### Community 8 - "Design Process"
Cohesion: 0.09
Nodes (21): Anti-Patterns to Avoid, Category Screens, Color System (60/30/10 Rule), Core Philosophy, Design Process, Implementation Notes, Mobile App UI/UX Design Skill, Order/Status Tracking (+13 more)

### Community 9 - "Specification Mining Report: Registry & UI Primitive Specification"
Cohesion: 0.09
Nodes (21): 1.1 Live Registry & Project Configuration, 1. Observation, 2. Logic Chain, 3. Features Discovered, 4. Edge Cases, 5.1 Primary Installation Command (Single Batch), 5.2 Optional Supporting Primitives (if modal or card wrappers are desired), 5.3 Generated File Locations (+13 more)

### Community 10 - "1. Observation"
Cohesion: 0.12
Nodes (16): 1.1 Project Configuration Files, 1.2 Current UI Directory Structure & Existing Components, 1.3 Feature Files Containing Raw HTML Elements, 1.4 Baseline Build & Lint Execution, 1.5 Dry Run CLI Verification, 1.6 Graphify Setup, 1. Observation, 2. Logic Chain (+8 more)

### Community 11 - "table.json"
Cohesion: 0.13
Nodes (14): author, dependencies, description, files, clsx, lucide-react, motion, tailwind-merge (+6 more)

### Community 12 - "compilerOptions"
Cohesion: 0.50
Nodes (3): compilerOptions, baseUrl, paths

### Community 13 - "ease.js"
Cohesion: 0.11
Nodes (17): ICON_CLASS, ICON_ROLL_VARIANTS, ICONS, SIZE_CLASS, STATUS_CLASS, TEXT_ROLL_VARIANTS, Checkbox(), EASE_DRAWER (+9 more)

### Community 16 - "animated-badge.json"
Cohesion: 0.14
Nodes (13): author, dependencies, description, files, clsx, lucide-react, motion, tailwind-merge (+5 more)

### Community 17 - "animated-toast-stack.json"
Cohesion: 0.14
Nodes (13): author, dependencies, description, files, clsx, lucide-react, motion, tailwind-merge (+5 more)

### Community 18 - "button-stateful.json"
Cohesion: 0.14
Nodes (13): author, dependencies, description, files, clsx, lucide-react, motion, tailwind-merge (+5 more)

### Community 19 - "center-morph-modal.json"
Cohesion: 0.14
Nodes (13): author, dependencies, description, files, clsx, lucide-react, motion, tailwind-merge (+5 more)

### Community 20 - "select.json"
Cohesion: 0.14
Nodes (13): author, dependencies, description, files, clsx, lucide-react, motion, tailwind-merge (+5 more)

### Community 21 - "button-base.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 22 - "checkbox.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 23 - "morphing-modal.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 24 - "otp-input.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 25 - "switch.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 26 - "tabs.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 27 - "tilt-card.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 28 - "tooltip.json"
Cohesion: 0.15
Nodes (12): author, dependencies, description, files, clsx, motion, tailwind-merge, name (+4 more)

### Community 29 - "BRIEFING — 2026-09-13T04:38:15+05:30"
Cohesion: 0.17
Nodes (11): Active Timers, Artifact Index, BRIEFING — 2026-09-13T04:38:15+05:30, Current Parent, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity (+3 more)

### Community 30 - "BRIEFING — 2026-09-12T23:01:30Z"
Cohesion: 0.17
Nodes (11): Artifact Index, BRIEFING — 2026-09-12T23:01:30Z, Change Tracker, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission (+3 more)

### Community 31 - "Interface Contracts"
Cohesion: 0.17
Nodes (11): Architecture, `@beui/animated-badge` (`@/components/motion/animated-badge`), `@beui/button-base` (`@/components/motion/button/base`), `@beui/input` (`@/components/motion/input`), `@beui/tabs` (`@/components/motion/tabs`), Code Layout, Feature Inventory, Interface Contracts (+3 more)

### Community 32 - "BRIEFING — 2026-09-12T23:07:00Z"
Cohesion: 0.18
Nodes (10): Artifact Index, BRIEFING — 2026-09-12T23:07:00Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission, 🔒 My Identity (+2 more)

### Community 33 - "Antigravity React & shadcn/ui System"
Cohesion: 0.20
Nodes (9): 1. Core Visual Tokens & Tailwind Integration, 2. React Component Patterns & Prop Composition, 3. shadcn/ui Customization Blueprint, Antigravity Card Component Example, Antigravity React & shadcn/ui System, Designing for Reusability, Elevation Layers & Depth Steps, Inner Component Pairing Example (Concentric Rounding Strategy) (+1 more)

### Community 34 - "BRIEFING — 2026-09-12T22:50:00Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-09-12T22:50:00Z, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 35 - "BRIEFING — 2026-09-13T04:20:00+05:30"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-09-13T04:20:00+05:30, Current Parent, Investigation State, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity

### Community 36 - "Project Plan: Frontend UI Migration to shadcn and @beui"
Cohesion: 0.22
Nodes (8): Objective, Phase 0: Survey & Scope Mapping, Phase 1: Primitives Installation & Configuration Setup, Phase 2: Auth Feature UI Migration, Phase 3: Admin Feature UI Migration, Phase 4: Review, Challenge & Forensic Audit, Phase 5: Final Acceptance & Graphify Update, Project Plan: Frontend UI Migration to shadcn and @beui

### Community 37 - "Original User Request"
Cohesion: 0.22
Nodes (8): 2026-09-12T22:42:43Z, Acceptance Criteria, Build Verification, Component Integration, Original User Request, R1. UI Component Migration, R2. Component Installation, Requirements

### Community 38 - "BRIEFING — 2026-09-12T22:42:43Z"
Cohesion: 0.22
Nodes (8): Artifact Index, BRIEFING — 2026-09-12T22:42:43Z, 🔒 Key Constraints, Mission, 🔒 My Identity, Project Status, User Context, Victory Audit Status

### Community 39 - "spec_miner_survey_3/BRIEFING.md"
Cohesion: 0.22
Nodes (8): Artifact Index, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission, 🔒 My Identity, Task Summary

### Community 40 - "Original User Request"
Cohesion: 0.22
Nodes (8): 2026-09-12T22:42:43Z, Acceptance Criteria, Build Verification, Component Integration, Original User Request, R1. UI Component Migration, R2. Component Installation, Requirements

### Community 41 - "shadcn_badge.json"
Cohesion: 0.25
Nodes (7): author, dependencies, files, @radix-ui/react-slot, name, $schema, type

### Community 42 - "shadcn_button.json"
Cohesion: 0.25
Nodes (7): author, dependencies, files, @radix-ui/react-slot, name, $schema, type

### Community 43 - "shadcn_checkbox.json"
Cohesion: 0.25
Nodes (7): author, dependencies, files, name, $schema, type, @radix-ui/react-checkbox

### Community 44 - "shadcn_dialog.json"
Cohesion: 0.25
Nodes (7): author, dependencies, files, name, $schema, type, @radix-ui/react-dialog

### Community 45 - "shadcn_label.json"
Cohesion: 0.25
Nodes (7): author, dependencies, files, name, $schema, type, @radix-ui/react-label

### Community 46 - "shadcn_tabs.json"
Cohesion: 0.25
Nodes (7): author, dependencies, files, name, $schema, type, @radix-ui/react-tabs

### Community 47 - "Dispatch: Worker M1 (Primitive Installation & Theme Setup)"
Cohesion: 0.25
Nodes (7): 2026-09-12T22:57:40Z, Dispatch: Worker M1 (Primitive Installation & Theme Setup), File Ownership, Mandatory Warning, Objective, References, Tasks

### Community 48 - "Dispatch: E2E Test Writer (Dual Track Testing)"
Cohesion: 0.29
Nodes (6): 2026-09-12T22:57:40Z, Dispatch: E2E Test Writer (Dual Track Testing), File Ownership, Objective, References, Requirements

### Community 49 - "Dispatch: Explorer Survey 1 (Codebase Investigation)"
Cohesion: 0.33
Nodes (5): 2026-09-12T22:45:00Z, Dispatch: Explorer Survey 1 (Codebase Investigation), Mission, Output, References

### Community 50 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 51 - "Dispatch: Spec Miner Survey 3 (Registry & UI Primitive Specification)"
Cohesion: 0.33
Nodes (5): 2026-09-12T22:45:00Z, Dispatch: Spec Miner Survey 3 (Registry & UI Primitive Specification), Mission, Output, References

### Community 52 - "shadcn_card.json"
Cohesion: 0.33
Nodes (5): author, files, name, $schema, type

### Community 53 - "shadcn_input.json"
Cohesion: 0.33
Nodes (5): author, files, name, $schema, type

### Community 54 - "shadcn_table.json"
Cohesion: 0.33
Nodes (5): author, files, name, $schema, type

### Community 55 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 56 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 57 - "Dispatch: Explorer Survey 2 (Environment & Project Config Investigation)"
Cohesion: 0.40
Nodes (4): Dispatch: Explorer Survey 2 (Environment & Project Config Investigation), Mission, Output, References

### Community 58 - "Progress Tracker"
Cohesion: 0.50
Nodes (3): Current Status, Iteration Status, Progress Tracker

### Community 61 - "parse_components.cjs"
Cohesion: 0.50
Nodes (3): analysis, fs, slugs

### Community 62 - "beUI"
Cohesion: 0.50
Nodes (3): beUI, Composition rules, Workflow

### Community 73 - "verify-ui-migration.mjs"
Cohesion: 0.20
Nodes (12): colors, __dirname, __filename, getExports(), getImports(), getJSXElements(), log(), readAndParse() (+4 more)

### Community 74 - "BRIEFING — 2026-09-13T04:32:00Z"
Cohesion: 0.17
Nodes (11): Artifact Index, BRIEFING — 2026-09-13T04:32:00Z, Change Tracker, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission (+3 more)

### Community 75 - "Milestone M1 Handoff Report: Primitive Installation & Theme Setup"
Cohesion: 0.18
Nodes (10): 1.1 CLI Execution & Primitive Installation, 1.2 File Verification, 1.3 Global Theme Tokens Configuration (`src/index.css`), 1.4 Build & Lint Verification, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion (+2 more)

### Community 76 - "teamwork_preview_worker_m2_1/BRIEFING.md"
Cohesion: 0.18
Nodes (10): Artifact Index, Change Tracker, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission, 🔒 My Identity (+2 more)

### Community 77 - "Dispatch: Worker M2 (Auth Feature UI Migration)"
Cohesion: 0.25
Nodes (7): 2026-09-12T23:01:33Z, Dispatch: Worker M2 (Auth Feature UI Migration), File Ownership, Implementation Details & Contracts, Mandatory Warning, Objective, References

### Community 78 - "Dispatch: Worker M3 (Admin Feature UI Migration)"
Cohesion: 0.25
Nodes (7): 2026-09-13T04:31:33Z, Dispatch: Worker M3 (Admin Feature UI Migration), File Ownership, Implementation Details & Contracts, Mandatory Warning, Objective, References

### Community 79 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 82 - "TEST_INFRA — Automated UI Migration Test Infrastructure"
Cohesion: 0.11
Nodes (17): 1. Dual Track Testing & Independent Verification, 2. No Facade Guarantee, 3. Progressive Milestone Support, 4-Tier Test Matrix, Architecture & Design Principles, Detailed Test Inventory, Execution Guide, Machine-Readable JSON Output (+9 more)

### Community 83 - "Independent Architecture, Styling & Robustness Review Handoff"
Cohesion: 0.12
Nodes (16): 1.1 Automated Verification Suite Execution, 1.2 Independent Production Build Execution, 1.3 Independent Linter Execution, 1.4 Raw HTML Form/Table Tag Audit, 1.5 Tailwind v4 Theme Variables & Dark Emerald Styling, 1.6 Keyboard Navigation, Accessibility & Reduced Motion, 1. Observation, 2. Logic Chain (+8 more)

### Community 84 - "AdminPage.jsx"
Cohesion: 0.21
Nodes (12): MembersTable(), SkillsTable(), TeamsTable(), useApproveMember(), useMembers(), useRejectMember(), useCreateSkill(), useUpdateSkill() (+4 more)

### Community 85 - "Handoff Report: Reviewer 1 (Independent Code & Interface Review)"
Cohesion: 0.14
Nodes (13): 1.1 Scope Files Inspected, 1.2 Tag Audit & Component Imports, 1.3 Event Handling and Button Type Verification, 1.4 Command Execution Results, 1. Observation, 2. Logic Chain, 3.1 Caveats, 3.2 Minor Finding (Advisory / Non-blocking) (+5 more)

### Community 86 - "cn"
Cohesion: 0.44
Nodes (10): AnimatedBadge(), Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader (+2 more)

### Community 87 - "base.jsx"
Cohesion: 0.27
Nodes (8): Button, ButtonLink, SIZE_CLASS, VARIANT_CLASS, Input, useAuth(), useHoverCapable(), LoginPage()

### Community 88 - "BRIEFING — 2026-09-12T23:12:00Z"
Cohesion: 0.17
Nodes (11): Artifact Index, Attack Surface, Audit Progress, Audit Scope, BRIEFING — 2026-09-12T23:12:00Z, Current Parent, 🔒 Key Constraints, Key Decisions Made (+3 more)

### Community 89 - "audit.mjs"
Cohesion: 0.17
Nodes (9): allFindings, allSrcFiles, nonTargetFindings, nonTargetGrouped, rawTags, ROOT_DIR, targetFiles, targetFindings (+1 more)

### Community 90 - "Forensic Integrity Audit & Anti-Cheating Verification Report"
Cohesion: 0.18
Nodes (10): 1.1 UI Primitive Installation & Registry Authenticity, 1.2 Feature Implementation Authenticity, 1.3 Verification Test Suite Authenticity (`scripts/verify-ui-migration.mjs`), 1.4 Empirical Execution Results, 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion (+2 more)

### Community 91 - "BRIEFING — 2026-09-12T23:08:00Z"
Cohesion: 0.18
Nodes (10): Artifact Index, Attack Surface, BRIEFING — 2026-09-12T23:08:00Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission (+2 more)

### Community 92 - "BRIEFING — 2026-09-12T23:10:45Z"
Cohesion: 0.18
Nodes (10): Artifact Index, Attack Surface, BRIEFING — 2026-09-12T23:10:45Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity (+2 more)

### Community 93 - "BRIEFING — 2026-09-12T23:08:00Z"
Cohesion: 0.18
Nodes (10): Artifact Index, Attack Surface, BRIEFING — 2026-09-12T23:08:00Z, Current Parent, 🔒 Key Constraints, Key Decisions Made, Mission, 🔒 My Identity (+2 more)

### Community 94 - "TEST_READY — UI Component Migration E2E Test Suite"
Cohesion: 0.18
Nodes (10): 1. Full Test Suite (Default), 2. Targeted Tier Runs, 3. Progressive Milestone Execution, 4. CI/CD Machine-Readable JSON Output, Documentation Reference, Execution Commands, Status: READY TO RUN, Suite Summary (+2 more)

### Community 95 - "teamwork_preview_challenger_2/BRIEFING.md"
Cohesion: 0.20
Nodes (9): Artifact Index, Attack Surface, Current Parent, 🔒 Key Constraints, Key Decisions Made, Loaded Skills, Mission, 🔒 My Identity (+1 more)

### Community 96 - "tabs.jsx"
Cohesion: 0.31
Nodes (8): listClasses, Tabs(), TabsContent(), TabsCtx, TabsList(), TabsTrigger(), transition, useTabs()

### Community 97 - "Handoff Report: E2E Test Suite Creation & Verification"
Cohesion: 0.29
Nodes (6): 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion, 5. Verification Method, Handoff Report: E2E Test Suite Creation & Verification

### Community 98 - "Handoff Report: Worker M3 (Admin Feature UI Migration)"
Cohesion: 0.29
Nodes (6): 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion, 5. Verification Method, Handoff Report: Worker M3 (Admin Feature UI Migration)

### Community 99 - "Dispatch: Forensic Auditor (Integrity Forensics & Anti-Cheating Verification)"
Cohesion: 0.33
Nodes (5): 2026-09-12T23:08:00Z, Dispatch: Forensic Auditor (Integrity Forensics & Anti-Cheating Verification), Forensic Audit Protocol, Objective, References

### Community 100 - "Dispatch: Challenger 1 (Adversarial Empirical Verification)"
Cohesion: 0.33
Nodes (5): 2026-09-12T23:08:00Z, Dispatch: Challenger 1 (Adversarial Empirical Verification), Objective, References, Verification Scope

### Community 101 - "Dispatch: Challenger 2 (Adversarial Static & Edge Case Verification)"
Cohesion: 0.33
Nodes (5): 2026-09-12T23:08:00Z, Dispatch: Challenger 2 (Adversarial Static & Edge Case Verification), Objective, References, Verification Scope

### Community 102 - "Dispatch: Reviewer 1 (Independent Code & Interface Review)"
Cohesion: 0.33
Nodes (5): 2026-09-12T23:08:00Z, Dispatch: Reviewer 1 (Independent Code & Interface Review), Objective, References, Verification Scope

### Community 103 - "Dispatch: Reviewer 2 (Independent Architecture & Robustness Review)"
Cohesion: 0.33
Nodes (5): 2026-09-12T23:08:00Z, Dispatch: Reviewer 2 (Independent Architecture & Robustness Review), Objective, References, Verification Scope

### Community 104 - "teamwork_preview_worker_m2_1/handoff.md"
Cohesion: 0.33
Nodes (5): 1. Observation, 2. Logic Chain, 3. Caveats, 4. Conclusion, 5. Verification Method

### Community 105 - "Gate Status — Iteration 1"
Cohesion: 0.40
Nodes (4): Gate Result, Gate Status — Iteration 1, Pass Criteria Checklist, Verification Panel Status

## Knowledge Gaps
- **731 isolated node(s):** `$schema`, `name`, `type`, `title`, `description` (+726 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 829 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `tabs.jsx`, `ease.js`, `base.jsx`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `useRegistrationForm()` connect `adversarial-empirical-test.mjs` to `Home.jsx`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `$schema`, `name`, `type` to the rest of the system?**
  _731 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `Home.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Should `useMembers.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
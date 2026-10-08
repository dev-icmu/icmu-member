# Graph Report - icmu-member  (2026-09-21)

## Corpus Check
- 86 files · ~41,143 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 528 nodes · 884 edges · 28 communities (23 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- dependencies
- index.jsx
- AdminPage.jsx
- devDependencies
- components.json
- Home.jsx
- sri-lankan-cities.js
- SignUpPage.jsx
- 3. Forms & Inputs
- cn
- schemas.js
- Design Process
- compilerOptions
- TEST_INFRA — Automated UI Migration Test Infrastructure
- Interface Contracts
- TEST_READY — UI Component Migration E2E Test Suite
- Antigravity UI & Motion Design Expert
- Antigravity React & shadcn/ui System
- Original User Request
- ChallengerTestHarness
- beUI
- beUI
- rules/graphify.md
- workflows/graphify.md
- verify-ui-migration.mjs
- PersonalInfoStep.jsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 55 edges
2. `Button` - 13 edges
3. `useComboboxContext()` - 12 edges
4. `AdminPage()` - 12 edges
5. `runSuite()` - 11 edges
6. `IcmuSmallLogo()` - 9 edges
7. `Antigravity UI & Motion Design Expert` - 9 edges
8. `Input` - 8 edges
9. `useRegistrationForm()` - 8 edges
10. `EASE_OUT` - 8 edges

## Surprising Connections (you probably didn't know these)
- `ToastItem` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/animated-toast-stack.jsx → src/lib/utils.js
- `AnimatedToastStack()` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/animated-toast-stack.jsx → src/lib/utils.js
- `ComboboxContent()` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/combobox/content.jsx → src/lib/utils.js
- `Combobox()` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/combobox/context.jsx → src/lib/utils.js
- `ComboboxList()` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/combobox/list.jsx → src/lib/utils.js

## Import Cycles
- None detected.

## Communities (28 total, 3 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (41): class-variance-authority, clsx, @fontsource/montserrat, lucide-react, motion, dependencies, class-variance-authority, clsx (+33 more)

### Community 1 - "index.jsx"
Cohesion: 0.07
Nodes (30): App(), PageLoader(), ScrollToAnchor(), AnimatedToastStack(), CONTENT_TRANSITION, createToast(), POSITION_CLASS, STACK_SPRING (+22 more)

### Community 2 - "AdminPage.jsx"
Cohesion: 0.08
Nodes (26): listClasses, Tabs(), TabsContent(), TabsCtx, TabsList(), TabsTrigger(), transition, useTabs() (+18 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (30): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+22 more)

### Community 4 - "components.json"
Cohesion: 0.10
Nodes (19): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+11 more)

### Community 5 - "Home.jsx"
Cohesion: 0.12
Nodes (16): IcmuEmblem(), IcmuSmallLogo(), HeroSection(), Footer(), Navbar(), CompetitionNetworkSection(), CtaBannerSection(), EligibilityMatrix() (+8 more)

### Community 6 - "sri-lankan-cities.js"
Cohesion: 0.09
Nodes (22): CENTRAL_KANDY, CENTRAL_MATALE, CENTRAL_NUWARA_ELIYA, EASTERN_AMPARA, EASTERN_BATTICALOA, EASTERN_TRINCOMALEE, NORTH_CENTRAL, NORTH_WESTERN_KURUNEGALA (+14 more)

### Community 7 - "SignUpPage.jsx"
Cohesion: 0.11
Nodes (24): colors, __dirname, exitCode, __filename, getJSXElements(), harness, MockTabsController, ROOT_DIR (+16 more)

### Community 8 - "3. Forms & Inputs"
Cohesion: 0.08
Nodes (23): 1. Buttons & Interactions, 2. Badges & Data Display, 3. Forms & Inputs, 4. Overlays & Context, 5. Advanced / Compound Components, Animated Badge, Base Button, Checkbox (+15 more)

### Community 9 - "cn"
Cohesion: 0.10
Nodes (39): AnimatedBadge(), ICON_CLASS, ICON_ROLL_VARIANTS, ICONS, SIZE_CLASS, STATUS_CLASS, TEXT_ROLL_VARIANTS, Button (+31 more)

### Community 10 - "schemas.js"
Cohesion: 0.22
Nodes (9): MAX_INDEX_NUMBER, MIN_INDEX_NUMBER, assignmentSchema, e164Phone, guardianSchema, isoDate, memberRegistrationSchema, productionTeamSchema (+1 more)

### Community 11 - "Design Process"
Cohesion: 0.09
Nodes (21): Anti-Patterns to Avoid, Category Screens, Color System (60/30/10 Rule), Core Philosophy, Design Process, Implementation Notes, Mobile App UI/UX Design Skill, Order/Status Tracking (+13 more)

### Community 12 - "compilerOptions"
Cohesion: 0.50
Nodes (3): compilerOptions, baseUrl, paths

### Community 13 - "TEST_INFRA — Automated UI Migration Test Infrastructure"
Cohesion: 0.11
Nodes (17): 1. Dual Track Testing & Independent Verification, 2. No Facade Guarantee, 3. Progressive Milestone Support, 4-Tier Test Matrix, Architecture & Design Principles, Detailed Test Inventory, Execution Guide, Machine-Readable JSON Output (+9 more)

### Community 16 - "Interface Contracts"
Cohesion: 0.17
Nodes (11): Architecture, `@beui/animated-badge` (`@/components/motion/animated-badge`), `@beui/button-base` (`@/components/motion/button/base`), `@beui/input` (`@/components/motion/input`), `@beui/tabs` (`@/components/motion/tabs`), Code Layout, Feature Inventory, Interface Contracts (+3 more)

### Community 17 - "TEST_READY — UI Component Migration E2E Test Suite"
Cohesion: 0.18
Nodes (10): 1. Full Test Suite (Default), 2. Targeted Tier Runs, 3. Progressive Milestone Execution, 4. CI/CD Machine-Readable JSON Output, Documentation Reference, Execution Commands, Status: READY TO RUN, Suite Summary (+2 more)

### Community 18 - "Antigravity UI & Motion Design Expert"
Cohesion: 0.20
Nodes (9): Antigravity UI & Motion Design Expert, 📐 Design Principles (The "Antigravity" Vibe), Example, 🚧 Execution Constraints, Limitations, 🎬 Motion & Animation Rules, 🛠️ Preferred Tech Stack, 🎯 Role Overview (+1 more)

### Community 19 - "Antigravity React & shadcn/ui System"
Cohesion: 0.20
Nodes (9): 1. Core Visual Tokens & Tailwind Integration, 2. React Component Patterns & Prop Composition, 3. shadcn/ui Customization Blueprint, Antigravity Card Component Example, Antigravity React & shadcn/ui System, Designing for Reusability, Elevation Layers & Depth Steps, Inner Component Pairing Example (Concentric Rounding Strategy) (+1 more)

### Community 20 - "Original User Request"
Cohesion: 0.22
Nodes (8): 2026-09-12T22:42:43Z, Acceptance Criteria, Build Verification, Component Integration, Original User Request, R1. UI Component Migration, R2. Component Installation, Requirements

### Community 50 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 56 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 73 - "verify-ui-migration.mjs"
Cohesion: 0.20
Nodes (12): colors, __dirname, __filename, getExports(), getImports(), getJSXElements(), log(), readAndParse() (+4 more)

### Community 87 - "PersonalInfoStep.jsx"
Cohesion: 0.16
Nodes (23): COMBOBOX_MORPH, ComboboxContent(), Combobox(), ComboboxContext, ComboboxGroupContext, mergeRefs(), useComboboxContext(), ComboboxEmpty() (+15 more)

## Knowledge Gaps
- **219 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+214 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 260 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `index.jsx`, `AdminPage.jsx`, `SignUpPage.jsx`, `PersonalInfoStep.jsx`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _219 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `index.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06504065040650407 - nodes in this community are weakly interconnected._
- **Should `AdminPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
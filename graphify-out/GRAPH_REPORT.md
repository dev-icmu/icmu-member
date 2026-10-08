# Graph Report - icmu-member  (2026-09-24)

## Corpus Check
- 99 files · ~61,877 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 627 nodes · 1051 edges · 34 communities (27 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- dependencies
- AdminPage.jsx
- TeamDetailPanel.jsx
- devDependencies
- components.json
- base.jsx
- sri-lankan-cities.js
- SignUpPage.jsx
- 3. Forms & Inputs
- ease.js
- src/constants.js
- Design Process
- compilerOptions
- TEST_INFRA — Automated UI Migration Test Infrastructure
- Interface Contracts
- TEST_READY — UI Component Migration E2E Test Suite
- Antigravity UI & Motion Design Expert
- Antigravity React & shadcn/ui System
- Original User Request
- AeroShards.jsx
- Humanizer - Remove AI Writing Traces
- Ponytail
- ICMU landing page
- use-active-option.js
- LICENSE.reactbits.md
- beUI
- beUI
- rules/graphify.md
- workflows/graphify.md
- verify-ui-migration.mjs
- cn

## God Nodes (most connected - your core abstractions)
1. `cn()` - 54 edges
2. `AeroShards()` - 22 edges
3. `Button` - 18 edges
4. `useComboboxContext()` - 12 edges
5. `runSuite()` - 11 edges
6. `Humanizer - Remove AI Writing Traces` - 10 edges
7. `ButtonLink` - 9 edges
8. `useToast()` - 9 edges
9. `Antigravity UI & Motion Design Expert` - 9 edges
10. `Input` - 8 edges

## Surprising Connections (you probably didn't know these)
- `ToastItem` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/animated-toast-stack.jsx → src/lib/utils.js
- `AnimatedToastStack()` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/animated-toast-stack.jsx → src/lib/utils.js
- `Button` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/button/base.jsx → src/lib/utils.js
- `ButtonLink` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/button/base.jsx → src/lib/utils.js
- `Combobox()` --calls--> `useActiveOption()`  [EXTRACTED]
  src/components/motion/combobox/context.jsx → src/components/motion/combobox/use-active-option.js

## Import Cycles
- None detected.

## Communities (34 total, 4 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (43): class-variance-authority, clsx, @fontsource/montserrat, gsap, @gsap/react, lenis, lucide-react, motion (+35 more)

### Community 1 - "AdminPage.jsx"
Cohesion: 0.09
Nodes (29): App(), IcmuEmblem(), IcmuSmallLogo(), PageLoader(), ScrollToAnchor(), listClasses, Tabs(), TabsContent() (+21 more)

### Community 2 - "TeamDetailPanel.jsx"
Cohesion: 0.09
Nodes (21): useToast(), useApproveMember(), useMembers(), useRejectMember(), DEFAULT_SKILLS, useCreateSkill(), useSeedDefaultSkills(), useSkills() (+13 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (30): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+22 more)

### Community 4 - "components.json"
Cohesion: 0.10
Nodes (20): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+12 more)

### Community 5 - "base.jsx"
Cohesion: 0.08
Nodes (33): columnFactor(), cx(), DEFAULT_ITEMS, DriftWall(), prefersReducedMotion(), driftItems, HeroSection(), Footer() (+25 more)

### Community 6 - "sri-lankan-cities.js"
Cohesion: 0.09
Nodes (22): CENTRAL_KANDY, CENTRAL_MATALE, CENTRAL_NUWARA_ELIYA, EASTERN_AMPARA, EASTERN_BATTICALOA, EASTERN_TRINCOMALEE, NORTH_CENTRAL, NORTH_WESTERN_KURUNEGALA (+14 more)

### Community 7 - "SignUpPage.jsx"
Cohesion: 0.09
Nodes (25): ChallengerTestHarness, colors, __dirname, exitCode, __filename, getJSXElements(), harness, MockTabsController (+17 more)

### Community 8 - "3. Forms & Inputs"
Cohesion: 0.08
Nodes (23): 1. Buttons & Interactions, 2. Badges & Data Display, 3. Forms & Inputs, 4. Overlays & Context, 5. Advanced / Compound Components, Animated Badge, Base Button, Checkbox (+15 more)

### Community 9 - "ease.js"
Cohesion: 0.07
Nodes (29): ICON_CLASS, ICON_ROLL_VARIANTS, ICONS, SIZE_CLASS, STATUS_CLASS, TEXT_ROLL_VARIANTS, AnimatedToastStack(), CONTENT_TRANSITION (+21 more)

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

### Community 21 - "AeroShards.jsx"
Cohesion: 0.09
Nodes (37): advanceFormation(), advanceFrameDeadline(), advanceHold(), advancePointer(), advanceRipples(), AeroShards(), ASCII_GLYPHS, ASCII_SAMPLES (+29 more)

### Community 22 - "Humanizer - Remove AI Writing Traces"
Cohesion: 0.10
Nodes (19): Adding Soul, Content Indicators, Detection Protocols, Formatting Indicators, Humanizer - Remove AI Writing Traces, Humanizing Techniques, Language Indicators, Output Format (+11 more)

### Community 23 - "Ponytail"
Cohesion: 0.22
Nodes (8): Boundaries, Intensity, Output, Persistence, Ponytail, Rules, The ladder, When NOT to be lazy

### Community 24 - "ICMU landing page"
Cohesion: 0.33
Nodes (5): Design and motion, ICMU landing page, Placeholder sources, Replace images and videos, Your logo

### Community 25 - "use-active-option.js"
Cohesion: 0.80
Nodes (5): fallbackActive(), isEnabled(), liveCursorValue(), resolveActive(), useActiveOption()

### Community 50 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 56 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 73 - "verify-ui-migration.mjs"
Cohesion: 0.20
Nodes (12): colors, __dirname, __filename, getExports(), getImports(), getJSXElements(), log(), readAndParse() (+4 more)

### Community 87 - "cn"
Cohesion: 0.13
Nodes (33): AnimatedBadge(), Checkbox(), COMBOBOX_MORPH, ComboboxContent(), Combobox(), ComboboxContext, ComboboxGroupContext, mergeRefs() (+25 more)

## Knowledge Gaps
- **262 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+257 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 310 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `AdminPage.jsx`, `TeamDetailPanel.jsx`, `base.jsx`, `SignUpPage.jsx`, `ease.js`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Button` connect `base.jsx` to `AdminPage.jsx`, `TeamDetailPanel.jsx`, `SignUpPage.jsx`, `cn`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _262 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Should `AdminPage.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08748615725359911 - nodes in this community are weakly interconnected._
- **Should `TeamDetailPanel.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
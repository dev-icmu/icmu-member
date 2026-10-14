# Graph Report - icmu-member  (2026-10-14)

## Corpus Check
- 197 files · ~158,859 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1401 nodes · 2361 edges · 92 communities (80 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ffc0969`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- router/index.jsx
- useTeams.js
- devDependencies
- components.json
- Home.jsx
- MemberEditor.jsx
- adversarial-empirical-test.mjs
- 3. Forms & Inputs
- animated-toast-stack.jsx
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
- MemberDirectory.jsx
- HeroSection.jsx
- table/index.jsx
- animated-sidebar.jsx
- Expo Animation Recipes
- PART B — Visual system
- Animation Recipes
- Animation Standards Reference
- Animation Audit Playbook
- loader.jsx
- Write Swift
- ease.js
- Apple Design
- The Fixes
- Prototyping Variants
- Release record: 14 October 2026
- cn
- Glossary
- createAdminAuthController
- Finding Animation Opportunities
- whatsapp-delivery.test.mjs
- animated-badge.jsx
- beUI
- admin-preview.jsx
- Working With Sonner
- CatalogPanel.jsx
- morphing-search.jsx
- The list
- beUI
- MemberDashboard.jsx
- shared-admin-login/index.ts
- Design Engineering
- ICMU member workspace
- tabs.jsx
- Component Building Principles
- SignUpPage.jsx
- The Animation Decision Framework
- clip-path for Animation
- Performance Rules
- Gesture and Drag Interactions
- rules/graphify.md
- Admin accounts and access
- RootLayout.jsx
- workflows/graphify.md
- CSS Transform Mastery
- verify-ui-migration.mjs
- The Sonner Principles (Building Loved Components)
- Spring Animations
- Shared-login prerequisite: ICMU website account boundary
- deployment-smoke.mjs
- Core Philosophy
- Debugging Animations
- upstream-auth-boundary.test.mjs
- skills/constants.js
- adaptive-stepper.jsx
- base.jsx
- morphing-modal.jsx
- PersonalInfoStep.jsx
- AuthContext.jsx
- SkillsTab.jsx
- table-header.jsx
- DriftWall.jsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 110 edges
2. `Button` - 28 edges
3. `AeroShards()` - 22 edges
4. `Apple Design` - 21 edges
5. `Write Swift` - 19 edges
6. `EASE_OUT` - 18 edges
7. `titleCase()` - 17 edges
8. `Design Engineering` - 16 edges
9. `Animation Standards Reference` - 16 edges
10. `MemberForm()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `harness()` --calls--> `createAdminAuthController()`  [EXTRACTED]
  scripts/admin-auth.test.mjs → src/lib/adminAuth.js
- `configured()` --calls--> `readConfig()`  [EXTRACTED]
  scripts/whatsapp-delivery.test.mjs → supabase/functions/whatsapp-approval/delivery.mjs
- `AnimatedSidebarGroup` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/animated-sidebar.jsx → src/lib/utils.js
- `AnimatedSidebarGroupContent` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/animated-sidebar.jsx → src/lib/utils.js
- `AnimatedSidebarMenuSubItem` --calls--> `cn()`  [EXTRACTED]
  src/components/motion/animated-sidebar.jsx → src/lib/utils.js

## Import Cycles
- None detected.

## Communities (92 total, 7 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.04
Nodes (47): class-variance-authority, clsx, @fontsource/montserrat, gsap, @gsap/react, lenis, lucide-react, motion (+39 more)

### Community 1 - "router/index.jsx"
Cohesion: 0.22
Nodes (8): App(), queryClient, AdminPage, ErrorPage, Home, LoginPage, router, routes

### Community 2 - "useTeams.js"
Cohesion: 0.37
Nodes (11): invalidateTeams(), teamPayload(), useAssignMemberToTeam(), useCreateTeam(), useRemoveMemberFromTeam(), useTeamMembers(), useTeams(), useUpdateTeam() (+3 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (32): @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, @electric-sql/pglite (+24 more)

### Community 4 - "components.json"
Cohesion: 0.10
Nodes (20): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+12 more)

### Community 5 - "Home.jsx"
Cohesion: 0.14
Nodes (13): Footer(), links, Navbar(), IcmuLogo(), LogoPreloader(), SplitText(), CtaBannerSection(), EligibilityMatrix() (+5 more)

### Community 6 - "MemberEditor.jsx"
Cohesion: 0.06
Nodes (50): applicationFieldError(), applicationSteps, colomboToday(), dateDigits(), dateFromDigits(), fieldValue(), localPhone(), stepFields (+42 more)

### Community 7 - "adversarial-empirical-test.mjs"
Cohesion: 0.12
Nodes (16): ChallengerTestHarness, colors, __dirname, exitCode, __filename, getJSXElements(), harness, MockTabsController (+8 more)

### Community 8 - "3. Forms & Inputs"
Cohesion: 0.08
Nodes (23): 1. Buttons & Interactions, 2. Badges & Data Display, 3. Forms & Inputs, 4. Overlays & Context, 5. Advanced / Compound Components, Animated Badge, Base Button, Checkbox (+15 more)

### Community 9 - "animated-toast-stack.jsx"
Cohesion: 0.21
Nodes (11): AnimatedToastStack(), CONTENT_TRANSITION, createToast(), POSITION_CLASS, STACK_SPRING, STATUS_CLASS, STATUS_ICON, ToastItem (+3 more)

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

### Community 28 - "MemberDirectory.jsx"
Cohesion: 0.05
Nodes (74): Collapsible(), CollapsibleContent(), CollapsibleContext, CollapsibleIndicator(), CollapsibleTrigger(), mergeRefs(), useCollapsible(), useCollapsibleContext() (+66 more)

### Community 29 - "HeroSection.jsx"
Cohesion: 0.20
Nodes (11): driftItems, HeroSection(), ButtonLink, creativeTeams, portfolioImages, productionScenes, PortfolioMedia(), TeamDialog() (+3 more)

### Community 30 - "table/index.jsx"
Cohesion: 0.13
Nodes (22): EditableCell(), resolveColumnWidth(), Table(), useRootFontSize(), SkeletonRows(), TableHeader(), useColumnReorder(), useColumnResize() (+14 more)

### Community 31 - "animated-sidebar.jsx"
Cohesion: 0.08
Nodes (38): AnimatedSidebar, AnimatedSidebarClose, AnimatedSidebarContent, AnimatedSidebarContext, AnimatedSidebarFooter, AnimatedSidebarGroup, AnimatedSidebarGroupContent, AnimatedSidebarGroupLabel (+30 more)

### Community 32 - "Expo Animation Recipes"
Cohesion: 0.06
Nodes (33): Bottom sheet you can drag to dismiss, Collapsing header on scroll, Expo Animation Recipes, Firing something once at a threshold, Keyboard-synced UI, List entrances, Press feedback, Screen transitions (Expo Router) (+25 more)

### Community 33 - "PART B — Visual system"
Cohesion: 0.06
Nodes (34): A1. Intake, A2. Page structure, A3. Layout selection, A4. Conversion rules, A5. Copywriting, A6. Build order, A7. SEO and AEO, A8. Pitfalls (+26 more)

### Community 34 - "Animation Recipes"
Cohesion: 0.06
Nodes (31): Accordion / collapse, Animation Recipes, Button press, Drag to dismiss, Drawer / sheet, Dropdown, popover, menu, select, Hold to confirm, Masking a crossfade that won't settle (+23 more)

### Community 35 - "Animation Standards Reference"
Cohesion: 0.07
Nodes (26): Aggressive Escalation Triggers, Guidelines, Initial Response, Operating Posture, Part 1 — Findings table (REQUIRED), Part 2 — Verdict (REQUIRED), Remedial Preference Hierarchy, Required Output Format (+18 more)

### Community 36 - "Animation Audit Playbook"
Cohesion: 0.08
Nodes (22): 1. Purpose & frequency, 2. Easing & duration, 3. Physicality & origin, 4. Interruptibility, 5. Performance, 6. Accessibility, 7. Cohesion & tokens, 8. Missed opportunities (+14 more)

### Community 37 - "loader.jsx"
Cohesion: 0.08
Nodes (10): ASCII_SETS, BAYER_4, COMET_TRAIL, Loader(), MORPH_PATHS, MORPH_ROT, MORPH_SCALE, MORPH_SEQ (+2 more)

### Community 38 - "Write Swift"
Cohesion: 0.09
Nodes (22): 10. ARC and object lifetime, 11. Testing — Swift Testing by default, 12. Macros, 13. Logging and debugging, 14. Unsafe code and interop, 15. Modern syntax you should be using, 16. Migrating an existing codebase to Swift 6, 1. Model data with value types (+14 more)

### Community 39 - "ease.js"
Cohesion: 0.14
Nodes (13): reducedVariants, SharedLayoutBg, variants, RowHandle(), TableMenu(), EASE_DRAWER, EASE_IN_OUT, EASE_OUT_CSS (+5 more)

### Community 40 - "Apple Design"
Cohesion: 0.09
Nodes (21): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+13 more)

### Community 41 - "The Fixes"
Cohesion: 0.09
Nodes (21): 10. Status bar color doesn't match, 11. Right in Chrome, wrong on phone, 1. Hover state stuck after tap, 2. Gray/blue flash on tap, 3. Layout has the wrong height, 4. Page zooms into the input, 5. Tap feels laggy, 6. Pull-to-refresh hijacks scroll (+13 more)

### Community 42 - "Prototyping Variants"
Cohesion: 0.10
Nodes (19): Behavior contract, Markup, Reference wiring, Rules, Styles, The Picker, Hard Rules, Initial Response (+11 more)

### Community 43 - "Release record: 14 October 2026"
Cohesion: 0.10
Nodes (19): Admin refinements and notification preparation, Existing advisories outside this release, Manual WhatsApp mode prepared locally, Mobile chrome and membership revenue, Published applications, Release record: 14 October 2026, Supabase, Verification (+11 more)

### Community 44 - "cn"
Cohesion: 0.18
Nodes (17): AnimatedBadge(), Digit(), DIGITS, NumberTicker(), OTPInput(), Table, TableBody, TableCaption (+9 more)

### Community 45 - "Glossary"
Cohesion: 0.11
Nodes (18): Animation Vocabulary, Easing — how speed changes over an animation, Entrances & Exits — how elements appear and disappear, Examples, Feedback & Interaction — responding to the user's actions, Glossary, Initial Response, Instructions (+10 more)

### Community 46 - "createAdminAuthController"
Cohesion: 0.22
Nodes (11): harness(), user, createAdminAuthController(), apply(), clearCache(), emit(), refreshAccess(), invokeAdminBridge() (+3 more)

### Community 47 - "Finding Animation Opportunities"
Cohesion: 0.12
Nodes (16): 1. Frequency — how often will a user see this?, 2. Purpose — why does this animate?, 3. Speed — can it stay inside budget?, 4. Function — does motion help or hinder here?, Finding Animation Opportunities, Hard Rules, Initial Response, Operating Posture (+8 more)

### Community 48 - "whatsapp-delivery.test.mjs"
Cohesion: 0.24
Nodes (10): config, configured(), job, settings, workingSession, checkSession(), deliver(), headers() (+2 more)

### Community 49 - "animated-badge.jsx"
Cohesion: 0.29
Nodes (6): ICON_CLASS, ICON_ROLL_VARIANTS, ICONS, SIZE_CLASS, STATUS_CLASS, TEXT_ROLL_VARIANTS

### Community 50 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 51 - "admin-preview.jsx"
Cohesion: 0.18
Nodes (9): client, members, originalFetch, previewOptions, PreviewSession(), requestedDelay, skills, teams (+1 more)

### Community 52 - "Working With Sonner"
Cohesion: 0.15
Nodes (11): Functions, Sonner API Reference, `toast()` options, `<Toaster />`, Initial Response, Picking the right call, Recipes, Setup (+3 more)

### Community 53 - "CatalogPanel.jsx"
Cohesion: 0.20
Nodes (12): StatefulButton, useTeamRoster(), ActivityDialog(), confirm(), AddTeamMember(), add(), CatalogEditor(), save() (+4 more)

### Community 54 - "morphing-search.jsx"
Cohesion: 0.27
Nodes (10): clientMounted(), isEditableTarget(), MorphingSearch(), SEARCH_CLIP_TRANSITION, SEARCH_MORPH, serverMounted(), subscribeMounted(), useOnOpen() (+2 more)

### Community 55 - "The list"
Cohesion: 0.18
Nodes (10): Charts, Common mismatches to catch, How to use this, Initial Response, Interaction & performance, Motion & visuals, Picking The Right Library, State & styling (+2 more)

### Community 56 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 57 - "MemberDashboard.jsx"
Cohesion: 0.22
Nodes (6): useAuth(), AdminPage(), AdminWorkspace(), LoginPage(), MemberDashboard(), MemberDashboard

### Community 58 - "shared-admin-login/index.ts"
Cohesion: 0.29
Nodes (6): cors, readMappedUser(), RequestError, requiredEnv(), sessionId(), webRpc()

### Community 59 - "Design Engineering"
Cohesion: 0.22
Nodes (8): Accessibility, Design Engineering, Initial Response, prefers-reduced-motion, Review Checklist, Review Format (Required), Stagger Animations, Touch device hover states

### Community 60 - "ICMU member workspace"
Cohesion: 0.22
Nodes (8): Account and notification refinements, Current delivery status, Database and shared account release, ICMU member workspace, Local verification, Membership fee analytics, Pages and actions, Paper membership process

### Community 61 - "tabs.jsx"
Cohesion: 0.31
Nodes (7): listClasses, TabsContent(), TabsCtx, TabsList(), TabsTrigger(), transition, useTabs()

### Community 62 - "Component Building Principles"
Cohesion: 0.25
Nodes (8): Animate enter states with @starting-style, Buttons must feel responsive, Component Building Principles, Make popovers origin-aware, Never animate from scale(0), Tooltips: skip delay on subsequent hovers, Use blur to mask imperfect transitions, Use CSS transitions over keyframes for interruptible UI

### Community 63 - "SignUpPage.jsx"
Cohesion: 0.24
Nodes (8): IcmuEmblem(), IcmuSmallLogo(), useToast(), SkillsStep(), SignUpPage(), SignUpPage, getBatchYear(), getBatchYearSuffix()

### Community 64 - "The Animation Decision Framework"
Cohesion: 0.33
Nodes (6): 1. Should this animate at all?, 2. What is the purpose?, 3. What easing should it use?, 4. How fast should it be?, Perceived performance, The Animation Decision Framework

### Community 65 - "clip-path for Animation"
Cohesion: 0.33
Nodes (6): clip-path for Animation, Comparison sliders, Hold-to-delete pattern, Image reveals on scroll, Tabs with perfect color transitions, The inset shape

### Community 66 - "Performance Rules"
Cohesion: 0.33
Nodes (6): CSS animations beat JS under load, CSS variables are inheritable, Framer Motion hardware acceleration caveat, Only animate transform and opacity, Performance Rules, Use WAAPI for programmatic CSS animations

### Community 67 - "Gesture and Drag Interactions"
Cohesion: 0.33
Nodes (6): Damping at boundaries, Friction instead of hard stops, Gesture and Drag Interactions, Momentum-based dismissal, Multi-touch protection, Pointer capture for drag

### Community 69 - "Admin accounts and access"
Cohesion: 0.33
Nodes (5): Access and revocation, Admin accounts and access, Edge Function configuration, Recovery and verification, Sign-in flow

### Community 70 - "RootLayout.jsx"
Cohesion: 0.38
Nodes (4): PageLoader(), ScrollToAnchor(), AuthProvider(), RootLayout()

### Community 72 - "CSS Transform Mastery"
Cohesion: 0.40
Nodes (5): 3D transforms for depth, CSS Transform Mastery, scale() scales children too, transform-origin, translateY with percentages

### Community 73 - "verify-ui-migration.mjs"
Cohesion: 0.20
Nodes (12): colors, __dirname, __filename, getExports(), getImports(), getJSXElements(), log(), readAndParse() (+4 more)

### Community 74 - "The Sonner Principles (Building Loved Components)"
Cohesion: 0.40
Nodes (5): Asymmetric enter/exit timing, Cohesion matters, Review your work the next day, The opacity + height combination, The Sonner Principles (Building Loved Components)

### Community 75 - "Spring Animations"
Cohesion: 0.40
Nodes (5): Interruptibility advantage, Spring Animations, Spring-based mouse interactions, Spring configuration, When to use springs

### Community 76 - "Shared-login prerequisite: ICMU website account boundary"
Cohesion: 0.40
Nodes (4): Prepared companion changes in icmu-web, Proposed database changes, Review and release checks, Shared-login prerequisite: ICMU website account boundary

### Community 78 - "Core Philosophy"
Cohesion: 0.50
Nodes (4): Beauty is leverage, Core Philosophy, Taste is trained, not innate, Unseen details compound

### Community 79 - "Debugging Animations"
Cohesion: 0.50
Nodes (4): Debugging Animations, Frame-by-frame inspection, Slow motion testing, Test on real devices

### Community 80 - "upstream-auth-boundary.test.mjs"
Cohesion: 0.50
Nodes (3): { pgcrypto }, { PGlite }, requireWeb

### Community 84 - "adaptive-stepper.jsx"
Cohesion: 0.24
Nodes (12): AdaptiveStepper(), AdaptiveStepperContext, AdaptiveStepperDecrement(), AdaptiveStepperIncrement(), AdaptiveStepperValue(), clamp(), cleanNumber(), mergeRefs() (+4 more)

### Community 85 - "base.jsx"
Cohesion: 0.29
Nodes (7): Button, SIZE_CLASS, VARIANT_CLASS, Input, GuardianStep(), useHoverCapable(), formatSLPhone()

### Community 86 - "morphing-modal.jsx"
Cohesion: 0.27
Nodes (4): ModalView, MorphingModal(), AdminDialog(), PresenceGate()

### Community 87 - "PersonalInfoStep.jsx"
Cohesion: 0.17
Nodes (20): COMBOBOX_MORPH, ComboboxContent(), Combobox(), ComboboxContext, ComboboxGroupContext, mergeRefs(), useComboboxContext(), ComboboxEmpty() (+12 more)

### Community 89 - "SkillsTab.jsx"
Cohesion: 0.54
Nodes (6): skillPayload(), useCreateSkill(), useSkills(), useUpdateSkill(), CatalogPanel(), SkillsTab()

### Community 90 - "table-header.jsx"
Cohesion: 0.48
Nodes (5): Checkbox(), ColumnHandle(), columnMenuItems(), EASE_OUT, SPRING_PRESS

### Community 91 - "DriftWall.jsx"
Cohesion: 0.53
Nodes (5): columnFactor(), cx(), DEFAULT_ITEMS, DriftWall(), prefersReducedMotion()

## Knowledge Gaps
- **650 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+645 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 751 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `loader.jsx`, `ease.js`, `animated-toast-stack.jsx`, `animated-badge.jsx`, `SignUpPage.jsx`, `tabs.jsx`, `adaptive-stepper.jsx`, `base.jsx`, `morphing-modal.jsx`, `PersonalInfoStep.jsx`, `morphing-search.jsx`, `table-header.jsx`, `MemberDirectory.jsx`, `HeroSection.jsx`, `table/index.jsx`, `animated-sidebar.jsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Button` connect `base.jsx` to `useTeams.js`, `Home.jsx`, `MemberEditor.jsx`, `cn`, `animated-sidebar.jsx`, `MemberDashboard.jsx`, `CatalogPanel.jsx`, `morphing-modal.jsx`, `PersonalInfoStep.jsx`, `SkillsTab.jsx`, `MemberDirectory.jsx`, `HeroSection.jsx`, `SignUpPage.jsx`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `createAdminAuthController()` connect `createAdminAuthController` to `AuthContext.jsx`, `RootLayout.jsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _650 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
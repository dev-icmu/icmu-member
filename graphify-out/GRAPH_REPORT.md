# Graph Report - icmu-member  (2026-10-20)

## Corpus Check
- 219 files · ~184,726 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1477 nodes · 2648 edges · 110 communities (76 shown, 29 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8dca3f47`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- router/index.jsx
- sri-lankan-cities.js
- devDependencies
- components.json
- base.jsx
- WithdrawalsTab.jsx
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
- animated-badge.jsx
- LICENSE.reactbits.md
- use-active-option.js
- morphing-modal.jsx
- table/index.jsx
- AdminPage.jsx
- Expo Animation Recipes
- PART B — Visual system
- Animation Recipes
- Animation Standards Reference
- Animation Audit Playbook
- loader.jsx
- Write Swift
- adaptive-stepper.jsx
- Apple Design
- The Fixes
- Prototyping Variants
- Release record: 14 October 2026
- App.jsx
- Glossary
- AuthContext.jsx
- Finding Animation Opportunities
- whatsapp-delivery.test.mjs
- withdrawals-smoke.mjs
- beUI
- admin-preview.jsx
- Working With Sonner
- AdminAccountMenu.jsx
- morphing-search.jsx
- The list
- beUI
- shared-admin-login/index.ts
- Design Engineering
- ICMU member workspace
- cn
- Component Building Principles
- The Animation Decision Framework
- clip-path for Animation
- Performance Rules
- Gesture and Drag Interactions
- rules/graphify.md
- Admin accounts and access
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
- SignUpPage.jsx
- @fontsource/montserrat
- gsap
- PersonalInfoStep.jsx
- @gsap/react
- lenis
- lucide-react
- tabs.jsx
- mathjs
- motion
- @radix-ui/react-avatar
- @radix-ui/react-dropdown-menu
- @radix-ui/react-slot
- react
- react-dom
- react-router-dom
- @supabase/supabase-js
- tailwind-merge
- tailwindcss
- @tailwindcss/vite
- @tanstack/react-query
- @tanstack/react-table
- @tanstack/react-virtual
- tw-colors
- vgpu
- ease.js
- MemberDirectory.jsx
- useMembers.js
- RootLayout.jsx

## God Nodes (most connected - your core abstractions)
1. `cn()` - 114 edges
2. `Button` - 31 edges
3. `titleCase()` - 25 edges
4. `AeroShards()` - 22 edges
5. `displayDate()` - 22 edges
6. `nameWithInitials()` - 21 edges
7. `Apple Design` - 21 edges
8. `useToast()` - 20 edges
9. `useAppConfig()` - 20 edges
10. `Write Swift` - 19 edges

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

## Communities (110 total, 29 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.29
Nodes (7): class-variance-authority, clsx, dependencies, class-variance-authority, clsx, recharts, recharts

### Community 1 - "router/index.jsx"
Cohesion: 0.16
Nodes (13): IcmuEmblem(), IcmuSmallLogo(), useAuth(), AdminPage(), LoginPage(), MemberDashboard(), AdminPage, ErrorPage (+5 more)

### Community 2 - "sri-lankan-cities.js"
Cohesion: 0.09
Nodes (22): CENTRAL_KANDY, CENTRAL_MATALE, CENTRAL_NUWARA_ELIYA, EASTERN_AMPARA, EASTERN_BATTICALOA, EASTERN_TRINCOMALEE, NORTH_CENTRAL, NORTH_WESTERN_KURUNEGALA (+14 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (32): @electric-sql/pglite, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, @electric-sql/pglite (+24 more)

### Community 4 - "components.json"
Cohesion: 0.10
Nodes (20): aliases, components, hooks, lib, ui, utils, iconLibrary, registries (+12 more)

### Community 5 - "base.jsx"
Cohesion: 0.08
Nodes (32): columnFactor(), cx(), DEFAULT_ITEMS, DriftWall(), prefersReducedMotion(), driftItems, HeroSection(), Footer() (+24 more)

### Community 6 - "WithdrawalsTab.jsx"
Cohesion: 0.17
Nodes (11): dateTime(), emptyForm, money(), PURPOSE_PRESETS, receiptExtensions, validateReceipt(), WithdrawalsTab(), attachLater() (+3 more)

### Community 7 - "adversarial-empirical-test.mjs"
Cohesion: 0.12
Nodes (17): ChallengerTestHarness, colors, __dirname, exitCode, __filename, getJSXElements(), harness, MockTabsController (+9 more)

### Community 8 - "3. Forms & Inputs"
Cohesion: 0.08
Nodes (23): 1. Buttons & Interactions, 2. Badges & Data Display, 3. Forms & Inputs, 4. Overlays & Context, 5. Advanced / Compound Components, Animated Badge, Base Button, Checkbox (+15 more)

### Community 9 - "animated-toast-stack.jsx"
Cohesion: 0.25
Nodes (7): AnimatedToastStack(), CONTENT_TRANSITION, POSITION_CLASS, STACK_SPRING, STATUS_CLASS, STATUS_ICON, ToastItem

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

### Community 25 - "animated-badge.jsx"
Cohesion: 0.29
Nodes (6): ICON_CLASS, ICON_ROLL_VARIANTS, ICONS, SIZE_CLASS, STATUS_CLASS, TEXT_ROLL_VARIANTS

### Community 28 - "use-active-option.js"
Cohesion: 0.80
Nodes (5): fallbackActive(), isEnabled(), liveCursorValue(), resolveActive(), useActiveOption()

### Community 29 - "morphing-modal.jsx"
Cohesion: 0.32
Nodes (5): ModalView, MorphingModal(), ApplicationDialog(), SPRING_PANEL, PresenceGate()

### Community 30 - "table/index.jsx"
Cohesion: 0.11
Nodes (27): EditableCell(), resolveColumnWidth(), Table(), useRootFontSize(), RowHandle(), SkeletonRows(), ColumnHandle(), columnMenuItems() (+19 more)

### Community 31 - "AdminPage.jsx"
Cohesion: 0.06
Nodes (48): AnimatedSidebar, AnimatedSidebarClose, AnimatedSidebarContent, AnimatedSidebarContext, AnimatedSidebarFooter, AnimatedSidebarGroup, AnimatedSidebarGroupContent, AnimatedSidebarGroupLabel (+40 more)

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

### Community 39 - "adaptive-stepper.jsx"
Cohesion: 0.24
Nodes (12): AdaptiveStepper(), AdaptiveStepperContext, AdaptiveStepperDecrement(), AdaptiveStepperIncrement(), AdaptiveStepperValue(), clamp(), cleanNumber(), mergeRefs() (+4 more)

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

### Community 44 - "App.jsx"
Cohesion: 0.50
Nodes (3): App(), queryClient, router

### Community 45 - "Glossary"
Cohesion: 0.11
Nodes (18): Animation Vocabulary, Easing — how speed changes over an animation, Entrances & Exits — how elements appear and disappear, Examples, Feedback & Interaction — responding to the user's actions, Glossary, Initial Response, Instructions (+10 more)

### Community 46 - "AuthContext.jsx"
Cohesion: 0.19
Nodes (13): harness(), user, AuthContext, AuthProvider(), createAdminAuthController(), apply(), clearCache(), emit() (+5 more)

### Community 47 - "Finding Animation Opportunities"
Cohesion: 0.12
Nodes (16): 1. Frequency — how often will a user see this?, 2. Purpose — why does this animate?, 3. Speed — can it stay inside budget?, 4. Function — does motion help or hinder here?, Finding Animation Opportunities, Hard Rules, Initial Response, Operating Posture (+8 more)

### Community 48 - "whatsapp-delivery.test.mjs"
Cohesion: 0.24
Nodes (10): config, configured(), job, settings, workingSession, checkSession(), deliver(), headers() (+2 more)

### Community 50 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 51 - "admin-preview.jsx"
Cohesion: 0.11
Nodes (13): AdminWorkspace(), client, configs, members, membershipFees, originalFetch, previewOptions, PreviewSession() (+5 more)

### Community 52 - "Working With Sonner"
Cohesion: 0.15
Nodes (11): Functions, Sonner API Reference, `toast()` options, `<Toaster />`, Initial Response, Picking the right call, Recipes, Setup (+3 more)

### Community 53 - "AdminAccountMenu.jsx"
Cohesion: 0.29
Nodes (6): Avatar, AvatarFallback, AvatarImage, AdminAccountMenu(), formatRole(), resolveSupabaseAvatarUrl()

### Community 54 - "morphing-search.jsx"
Cohesion: 0.27
Nodes (10): clientMounted(), isEditableTarget(), MorphingSearch(), SEARCH_CLIP_TRANSITION, SEARCH_MORPH, serverMounted(), subscribeMounted(), useOnOpen() (+2 more)

### Community 55 - "The list"
Cohesion: 0.18
Nodes (10): Charts, Common mismatches to catch, How to use this, Initial Response, Interaction & performance, Motion & visuals, Picking The Right Library, State & styling (+2 more)

### Community 56 - "beUI"
Cohesion: 0.33
Nodes (5): beUI, Composition rules, In this repo, Picker, Workflow

### Community 58 - "shared-admin-login/index.ts"
Cohesion: 0.29
Nodes (6): cors, readMappedUser(), RequestError, requiredEnv(), sessionId(), webRpc()

### Community 59 - "Design Engineering"
Cohesion: 0.22
Nodes (8): Accessibility, Design Engineering, Initial Response, prefers-reduced-motion, Review Checklist, Review Format (Required), Stagger Animations, Touch device hover states

### Community 60 - "ICMU member workspace"
Cohesion: 0.22
Nodes (8): Account and notification refinements, Current delivery status, Database and shared account release, ICMU member workspace, Local verification, Membership fee analytics, Pages and actions, Paper membership process

### Community 61 - "cn"
Cohesion: 0.20
Nodes (19): AnimatedBadge(), Checkbox(), Input, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuShortcut(), DropdownMenuSubContent, DropdownMenuSubTrigger (+11 more)

### Community 62 - "Component Building Principles"
Cohesion: 0.25
Nodes (8): Animate enter states with @starting-style, Buttons must feel responsive, Component Building Principles, Make popovers origin-aware, Never animate from scale(0), Tooltips: skip delay on subsequent hovers, Use blur to mask imperfect transitions, Use CSS transitions over keyframes for interruptible UI

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

### Community 84 - "SignUpPage.jsx"
Cohesion: 0.09
Nodes (27): skillPayload(), useCreateSkill(), useSkills(), useUpdateSkill(), invalidateTeams(), teamPayload(), useAssignMemberToTeam(), useCreateTeam() (+19 more)

### Community 87 - "PersonalInfoStep.jsx"
Cohesion: 0.19
Nodes (18): COMBOBOX_MORPH, ComboboxContent(), Combobox(), ComboboxContext, ComboboxGroupContext, mergeRefs(), useComboboxContext(), ComboboxEmpty() (+10 more)

### Community 91 - "tabs.jsx"
Cohesion: 0.31
Nodes (8): listClasses, Tabs(), TabsContent(), TabsCtx, TabsList(), TabsTrigger(), transition, useTabs()

### Community 109 - "ease.js"
Cohesion: 0.11
Nodes (15): Digit(), DIGITS, NumberTicker(), OTPInput(), reducedVariants, SharedLayoutBg, variants, EASE_DRAWER (+7 more)

### Community 110 - "MemberDirectory.jsx"
Cohesion: 0.05
Nodes (91): Button, StatefulButton, Collapsible(), CollapsibleContent(), CollapsibleContext, CollapsibleIndicator(), CollapsibleTrigger(), mergeRefs() (+83 more)

### Community 111 - "useMembers.js"
Cohesion: 0.10
Nodes (39): callMemberRpc(), useAdminCreateMember(), useApproveMember(), useAssignTeam(), useCreateMember(), useMemberMutation(), useRejectMember(), useRemoveTeam() (+31 more)

### Community 113 - "RootLayout.jsx"
Cohesion: 0.28
Nodes (6): PageLoader(), ScrollToAnchor(), createToast(), useAnimatedToastStack(), ToastProvider(), RootLayout()

## Knowledge Gaps
- **663 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+658 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 774 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `base.jsx`, `loader.jsx`, `adaptive-stepper.jsx`, `animated-toast-stack.jsx`, `ease.js`, `MemberDirectory.jsx`, `SignUpPage.jsx`, `AdminAccountMenu.jsx`, `morphing-search.jsx`, `PersonalInfoStep.jsx`, `animated-badge.jsx`, `tabs.jsx`, `morphing-modal.jsx`, `table/index.jsx`, `AdminPage.jsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `Button` connect `MemberDirectory.jsx` to `router/index.jsx`, `base.jsx`, `useMembers.js`, `cn`, `SignUpPage.jsx`, `PersonalInfoStep.jsx`, `morphing-modal.jsx`, `AdminPage.jsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `WithdrawalsTab()` connect `WithdrawalsTab.jsx` to `router/index.jsx`, `MemberDirectory.jsx`, `AdminPage.jsx`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _663 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `sri-lankan-cities.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `components.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
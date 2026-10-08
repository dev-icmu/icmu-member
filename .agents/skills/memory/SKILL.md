# UI Components Memory & Cheatsheet

This document serves as a fast-retrieval guide for all custom motion/UI components currently available in the project (`src/components/motion/`). Use this as a reference for imports and basic usage.

> **Crucial Theme Note (Dark Mode Only)**: We ALWAYS use Dark Mode UI, not light mode. The dark mode is globally enabled via the `class="dark"` tag on the root `<html>` element in `index.html`. All designs and components must be built and optimized primarily for dark mode.

> **Component Theme Adaptation Guidelines**: Every custom component must strictly adapt to the global theme colors. Follow these rules:
>
> 1. **Primary Usage (Dark Text)**: Primary color backgrounds (e.g. `bg-primary` which is bright green) MUST be paired with dark text for contrast (`text-primary-foreground` mapped to `--primary-50`). Never use white text on the bright primary color.
> 2. **Secondary Usage**: For secondary interactions (e.g. `bg-secondary`), always pair it with `text-secondary-foreground`. Avoid using `secondary` for large background containers where it might clash with `bg-background`; it's meant for elements like buttons or chips.
> 3. **Destructive Usage (Error States)**: The `--destructive` color in dark mode MUST be a bright, legible red (e.g., `0.65 0.25 25`) to ensure `text-destructive` and `border-destructive` are clearly visible against dark backgrounds. Consequently, `--destructive-foreground` MUST be a dark red/black (e.g., `0.15 0.05 25`) so that buttons using `bg-destructive` have dark, legible text.
> 4. **Borders & Separators**: Border colors must NOT be too high contrast or too visible. Use subtle borders like `border-border` (which maps to a dark `--background-200`) or use opacity (e.g., `border-white/10` or `border-primary/10`).
> 5. **Shadows**: Shadows must adapt to dark mode. Do not use harsh pure black or bright shadows on colored backgrounds. ALWAYS use the theme-provided `shadow-[var(--shadow-ultimate)]` (or `shadow-ultimate`) on popovers, tooltips, drawers, and overlay components. It adapts automatically to the `.dark` environment with deeper opacity steps. (Note: use standard shadows like `shadow-2xl` for bottom-sliding drawers where deep inset shadows look unnatural).
> 6. **Primary vs Solid Buttons**:
>    - `primary` buttons (gradient) MUST use `bg-[image:var(--linearPrimaryAccent)]` with `text-white` for legibility.
>    - `solid` buttons (flat green) MUST use `bg-primary` with `text-primary-foreground` (black text). Both get `shadow-ultimate`.
> 7. **Avoid Hardcoding**: Never use Tailwind's default palette (e.g., `text-green-500` or `bg-slate-200`) inside custom components. Always use semantic theme classes (`bg-muted`, `text-muted-foreground`, `border-border`, etc.).
> 8. **Component Reusability**: Components MUST be built to be completely reusable. Do not hardcode specific layout margins or inverted ad-hoc colors (like `bg-foreground text-background`) inside generic component shells. Always rely on standard system variants (e.g., `variant="solid"`) and check the component's reusability across different contexts every time you modify it.
> 9. **Accessible Fluid Typography**: NEVER use viewport units (`vw`, `vh`) alone in `font-size` or `clamp()` formulas, as this breaks browser zoom functionality for visually impaired users. Always add a relative unit like `rem` (e.g., `clamp(1rem, 2.5vw + 0.5rem, 2.5rem)`). Global fluid typography is already handled in `index.css`.
> 10. **UI Control Typography**: Because our `--text-base` is fluid and scales up to `20px` on desktop, NEVER use `text-base` inside standard UI controls like `Input`, `Select`, or `Tabs` unless explicitly designed to be massive. Always use `text-sm` (which scales around `14px`) for form fields and control surfaces so they don't become oversized on large monitors.

> **External UI References**: Always refer to the geometric and mobile design rules in `@[.agents/skills/icmu-skills/MOBILE-SKILL.md]` and `@[.agents/skills/icmu-skills/UI-GUIDE.md]` when building layouts. Pay special attention to concentric child rounding formulas (`R_inner = R_outer - Padding`) and soft, intentional mobile interaction patterns.

### Custom Utilities

- `shadow-ultimate`: A deeply carved, 3D inset/outset layered shadow (`rgba(0, 0, 0, 0.17) 0px -23px 25px 0px inset...`). Great for skeuomorphic buttons or deeply inset cards.
- Background Gradients:
  - `bg-background-image-linear-primary-secondary`
  - `bg-background-image-radial-primary-accent`

## 1. Buttons & Interactions

> **Customization Note**: The default font weight for buttons (`src/components/motion/button/base.jsx`) has been refined to `font-semibold` for a modern, balanced feel.
>
> **Icons**: The showcase components utilize `lucide-react` for SVG icons (`import { ChevronRight } from 'lucide-react'`).

### Base Button

```jsx
import { Button } from "@/components/motion/button/base";
// Usage
<Button variant="primary" size="md" ripple={true}>
  Click Me
</Button>;
// variants: primary, secondary, ghost, outline
// sizes: sm, md, lg, icon
```

### Magnetic Button

```jsx
import { MagneticButton } from "@/components/motion/button/magnetic";
// Usage
<MagneticButton variant="secondary">Hover Me</MagneticButton>;
```

### Metallic Button

```jsx
import { MetallicButton } from "@/components/motion/button/metallic";
// Usage
<MetallicButton>Shiny Button</MetallicButton>;
```

### Magnetic Wrapper (for any element)

```jsx
import { Magnetic } from "@/components/motion/magnetic";
// Usage
<Magnetic intensity={0.5}>
  <div>Drag me slightly</div>
</Magnetic>;
```

## 2. Badges & Data Display

### Animated Badge

```jsx
import { AnimatedBadge } from "@/components/motion/animated-badge";
// Usage
<AnimatedBadge status="success" size="md">
  Active
</AnimatedBadge>;
// statuses: neutral, info, success, warning, danger, loading
```

### Number Ticker

```jsx
import { NumberTicker } from "@/components/motion/number-ticker";
// Usage
<NumberTicker value={1234} />;
```

## 3. Forms & Inputs

### Input

```jsx
import { Input } from "@/components/motion/input";
// Usage
<Input placeholder="Type here..." />;
```

### Switch

```jsx
import { Switch } from "@/components/motion/switch";
// Usage (controlled)
const [on, setOn] = useState(false);
<Switch checked={on} onCheckedChange={setOn} />;
```

### Checkbox

```jsx
import { Checkbox } from "@/components/motion/checkbox";
// Usage
<Checkbox id="terms" />;
```

### Range Slider

```jsx
import { RangeSlider } from "@/components/motion/range-slider";
// Usage (controlled)
const [val, setVal] = useState([50]);
<RangeSlider value={val} onValueChange={setVal} max={100} step={1} />;
```

### Select (Dropdown)

```jsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/motion/select";
// Usage
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>;
```

### Combobox

```jsx
import { Combobox } from "@/components/motion/combobox";
// Usage (searchable select installed via shadcn)
<Combobox
  items={[{ value: "1", label: "Option 1" }]}
  value={val}
  onValueChange={setVal}
  placeholder="Search options..."
/>;
```

## 4. Overlays & Context

### Tooltip

```jsx
import { Tooltip } from "@/components/motion/tooltip";
// Usage
<Tooltip content="Helper text" side="top">
  <span>Hover me</span>
</Tooltip>;
```

### Popover

```jsx
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/motion/popover";
// Usage
<Popover>
  <PopoverTrigger>
    <Button>Open</Button>
  </PopoverTrigger>
  <PopoverContent>Content goes here</PopoverContent>
</Popover>;
```

_Note: Popover inner blobs use `border border-border bg-background` to ensure they seamlessly match the theme._

### Context Menu

```jsx
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/motion/context-menu";
// Usage
<ContextMenu>
  <ContextMenuTrigger>Right click here</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>Action 1</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>;
```

### Drawer (Bottom Sheet)

```jsx
import { Drawer } from "@/components/motion/drawer"; // specific exports may vary
// Generally used for mobile-friendly bottom sheets
```

## 5. Advanced / Compound Components

- **AnimatedSidebar**: Navigation sidebar (`src/components/motion/animated-sidebar.jsx`). Uses `h-px` for separators.
- **ExpandableTabs**: Advanced tabbed navigation with internal menus (`src/components/motion/expandable-tabs.jsx`).
- **FeedbackWidget**: Floating feedback form (`src/components/motion/feedback-widget.jsx`).
- **NotificationStack**: Toast notifications (`src/components/motion/notification-stack.jsx`).
- **AnimatedToastStack**: Rich animated toast stack (`src/components/motion/animated-toast-stack.jsx` installed via beUI registry).
- **ActionSwap / ActionSwapCascade**: Content swappers (`src/components/motion/action-swap.jsx`).
- **Table**: Fully featured virtualized table (`src/components/motion/table/index.jsx`).
  - _Crucial_: Column definitions MUST use `key` (not `id`), `header` (not `name`), and `width` (not `size`).
- **AvailabilityScheduler**: Time picking grid (`src/components/motion/availability-scheduler/index.jsx`).

---

_Note: To resolve import paths correctly, ensure your Vite config has `@` aliased to `./src`._

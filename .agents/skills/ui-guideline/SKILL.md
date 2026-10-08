---
name: UI Guideline
description: Rules for building React and shadcn/ui components with 3xl rounding baseline and geometric layout guidelines.
---

# Antigravity React & shadcn/ui System

## 1. Core Visual Tokens & Tailwind Integration

Integrate your antigravity mechanics cleanly with shadcn's design tokens and the `cn()` utility. Avoid hardcoding specific colors, and instead leverage semantic CSS variables.

### The Rounding & Spacing Architecture

To prevent visual clipping, internal padding, nested children rounding, and structural layout grids must scale geometrically with your default `rounded-3xl` constraint.

- **Main Containers**: Enforce `rounded-3xl` for cards, sections, and primary modules.
- **Component Padding**: Minimum `p-6` scaling up to `p-8` for outer boundaries so text content flows nicely without bumping into deep corner sweeps.
- **The Concentric Child Formula**: Reusable components must dynamically calculate or explicitly assign nested rounding to maintain symmetric borders: `R_inner = R_outer - Padding`.
  - If a parent card is `rounded-3xl` and uses `p-6` (24px) padding, nested items (like buttons, image containers, or input inputs) must use `rounded-xl` or `rounded-2xl`.
- **Component Gutters**: Match margins and structural layout spacing to your inner padding scales using `gap-6` or `space-y-6`.

### Elevation Layers & Depth Steps

- **Base Layer**: The underlying page canvas (`bg-background`).
- **Float Level 1 (Cards, Modules)**: Elevated elements using `bg-card text-card-foreground shadow-xl shadow-muted/20 backdrop-blur-md`.
- **Float Level 2 (Modals, Dialogs, Popovers)**: Highest elevation layers using `bg-popover text-popover-foreground shadow-2xl shadow-black/10 dark:shadow-black/40`.
- **Anti-Gravity Micro-interactions**: Interactive surfaces mimic a floating sensation via smooth transformations: `transition-all duration-300 ease-out hover:-translate-y-1 active:translate-y-0`.

## 2. React Component Patterns & Prop Composition

When building or extending components, pass down structural configuration logically. Ensure your layout overrides mesh correctly with shadcn's composable primitives.

### Designing for Reusability

- **Prop Merging**: Always use shadcn's `cn()` utility to allow conditional overrides without breaking the structural layout defaults.
- **Mobile-First Layout Primitives**: Layout wrappers should always initialize as a single-column layout stack (`grid-cols-1`) and step up to multi-column blocks sequentially at intermediate break targets (`md:` or higher).
- **Responsive Rounding Rule**: On compact mobile screens, space is tight. Conditionally downscale container corners to `rounded-2xl` on small viewports if the deep `3xl` sweep pinches layout grids, then restore to the full desktop scale: `rounded-2xl md:rounded-3xl`.
- **Touch Footprints**: Interactive elements must follow structural hardware guidelines. Enforce a minimum height profile of `h-12` or `py-3` on mobile layout sweeps, combined with a `gap-4` layout configuration to prevent accidental actions.

## 3. shadcn/ui Customization Blueprint

When overriding default shadcn templates (like `Card`, `Dialog`, or `Button`), follow this implementation standard to lock down the antigravity layout structure:

### Antigravity Card Component Example

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface AntigravityCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, AntigravityCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Antigravity baseline structure & floating physics
          "group relative rounded-2xl md:rounded-3xl p-6 bg-card text-card-foreground",
          "shadow-xl shadow-muted/10 border border-border/50 backdrop-blur-md",
          "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-muted/20",
          className,
        )}
        {...props}
      >
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    );
  },
);
Card.displayName = "Card";
```

### Inner Component Pairing Example (Concentric Rounding Strategy)

```tsx
// Using the Card component with a nested button inside a React feature section
export function ProfileModule() {
  return (
    <Card className="w-full max-w-md">
      <div className="space-y-2">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Floating Layer Instance
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Structural blueprint optimized for React codebases and shadcn style
          systems.
        </p>
      </div>

      {/* Nested Interactive item satisfying Concentric Rounding Formula (3xl outer - p-6 = xl inner) */}
      <button
        className={cn(
          "mt-2 w-full h-12 rounded-xl font-medium shadow-sm transition-all",
          "bg-primary text-primary-foreground hover:opacity-95",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        )}
      >
        Interact
      </button>
    </Card>
  );
}
```

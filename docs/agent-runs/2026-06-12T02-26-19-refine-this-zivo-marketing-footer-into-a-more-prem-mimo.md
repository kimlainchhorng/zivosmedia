# MiMo run — 2026-06-12T02:26:19.927Z

- model: mimo-v2.5-pro
- task: Refine this ZIVO marketing Footer into a more PREMIUM version while keeping its dark-navy (#0f1629) identity and IG-gradient accent. Focus on: (1) premium two-line app-store badge buttons (Download on the App Store / Get it on Google Play) reusing the existing 'coming soon' toast; (2) subtle scroll-in motion using framer-motion — the file already imports 'motion' but does not use it — respect prefers-reduced-motion; (3) refined column headings (uppercase, letter-spacing, a small gradient accent); (4) tasteful link hover; (5) more spacious vertical rhythm. Keep it additive and type-safe (must pass 'npm run update'); do NOT change routes or add dependencies. Give concrete Tailwind classNames and a minimal diff.
- files: src/components/Footer.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
The user wants me to refine the Footer component into a more premium version. Let me analyze what they want:

1. **Premium two-line app-store badge buttons** - "Download on the App Store" / "Get it on Google Play" with the existing toast
2. **Subtle scroll-in motion using framer-motion** - the file imports `motion` but doesn't use it; respect `prefers-reduced-motion`
3. **Refined column headings** - uppercase, letter-spacing, small gradient accent
4. **Tasteful link hover** - more refined hover states
5. **More spacious vertical rhythm** - more padding/spacing
6. Keep it additive, type-safe, no new deps, no route changes

Let me craft a premium diff for `src/components/Footer.tsx`.

Key changes:
1. App store buttons: two-line layout with "Download on the" / "App Store" and "Get it on" / "Google Play", larger, more premium feel
2. Use `motion.footer` or `motion.div` for scroll-in with `whileInView` and `prefers-reduced-motion` check via `useReducedMotion` from framer-motion
3. Column headings: `uppercase tracking-widest text-xs` with a gradient underline accent
4. Link hover: subtle gradient text or underline animation on hover
5. More spacious: increase padding, gaps

Let me write the diff carefully.

For framer-motion `prefers-reduced-motion`, I should use the `useReducedMotion` hook from framer-motion. The file already imports `motion` but I need to also import `useReducedMotion`.

Wait, let me check what's already imported: `import { motion } from "framer-motion";` - so I just need to add `useReducedMotion` to the import.

Actually, looking at the existing code more carefully:

- The file already imports `motion` but never uses it
- It imports various icons but not `useReducedMotion`

For the scroll-in motion, I'll wrap key sections in `motion.div` with `whileInView` and adjust for reduced motion.

Let me draft the changes:

### App Store badges - two-line premium style
```jsx
<button type="button"
  onClick={() => handleAppStore("App Store")}
  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary-foreground/[0.08] border border-primary-foreground/10 hover:bg-primary-foreground/15 hover:border-primary-foreground/20 active:scale-[0.97] transition-all text-left touch-manipulation min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1629]"
>
  <svg className="w-7 h-7 text-primary-foreground/80" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
  <div className="flex flex-col">
    <span className="text-[10px] text-primary-foreground/40 leading-none">Download on the</span>
    <span className="text-sm font-semibold text-primary-foreground/90 leading-tight">App Store</span>
  </div>
</button>
```

### Column headings - uppercase with gradient accent
```jsx
<h4 className="text-[11px] font-bold uppercase tracking-[0.2em] mb-5 text-primary-foreground/60 flex items-center gap-2">
  <span className="inline-block h-px w-4 bg-gradient-to-r from-emerald-400 to-sky-400 rounded-full" />
  {section.title}
</h4>
```

Wait, the existing headings also have an icon. Let me keep the icon but add the gradient accent line.

Actually, looking at this more carefully, I want to make it feel premium without being too different. Let me think about what changes matter most:

1. **App Store buttons** - the biggest visual upgrade. Two-line with larger icons, bordered glass feel.
2. **Scroll-in motion** - subtle fade-up on sections
3. **Column headings** - remove the small icon, replace with gradient accent bar, uppercase tracking
4. **Link hover** - add a subtle gradient text effect on hover
5. **Spacing** - more generous padding

Let me write the complete diff now. I'll use precise before/after blocks.

For `useReducedMotion` - framer-motion exports this hook. When reduced motion is preferred, I'll skip the animation by not applying the `motion` props.

Actually, I can use `whileInView` with `viewport={{ once: true }}` and conditionally apply variants based on reduced motion. Or simpler: use CSS `@media (prefers-reduced-motion: reduce)` with the motion component - framer-motion respects this natively when you use `useReducedMotion()`.

Let me structure the motion wrapper:

```tsx
const prefersReducedMotion = useReducedMotion();
const fadeUp = prefersReducedMotion ? {} : {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};
```

Then apply `<motion.div {...fadeUp}>` around the brand column, link columns grid, legal bar, and bottom bar.

Now let me also think about the column headings. The current ones use:
```jsx
<h4 className="font-semibold text-sm mb-4 text-primary-foreground/80 flex items-center gap-2">
  <section.icon className="w-3.5 h-3.5 text-primary/70" />
  {section.title}
</h4>
```

Premium version:
```jsx
<h4 className="text-[11px] font-bold uppercase tracking-[0.18em] mb-5 text-primary-foreground/50 flex items-center gap-2.5">
  <section.icon className="w-3.5 h-3.5 text-primary/60" />
  <span className="inline-block h-[2px] w-3 rounded-full bg-gradient-to-r from-emerald-400/80 to-sky-400/80" />
  {section.title}
</h4>
```

Actually, I think removing the icon might be cleaner for premium feel. Or keep both icon + accent. Let me keep the icon but add the gradient accent bar after it.

For link hover, I'll add a subtle effect:
```jsx
className="inline-flex min-h-[40px] items-center text-sm text-primary-foreground/40 hover:text-primary-foreground group/link transition-all touch-manipulation rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1629]"
```
And add a small arrow or underline on hover. Actually, let me just do a clean hover with a small translate and color change, plus a subtle left-border indicator:

```jsx
className="inline-flex min-h-[40px] items-center text-sm text-primary-foreground/40 hover:text-primary-foreground/90 hover:pl-1 transition-all duration-200 touch-manipulation rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1629]"
```

Hmm, `hover:pl-1` can be janky. Let me use `hover:translate-x-0.5` which is already there. Let me enhance it slightly.

OK let me just write the full proposed file. I'll be careful about every change.

Actually, the user asked for a "minimal diff" - so let me structure this as a diff showing just the changed parts.

Let me organize by section:

**1. Import change** - add `useReducedMotion` to framer-motion import
**2. Motion variants** - add a helper above the component
**3. App Store buttons** - restyle to two-line premium
**4. Column headings** - uppercase, tracking, gradient accent
**5. Link hover** - refined
**6. Spacing** - more generous
**7. Wrap sections in motion.div**

Let me write this out carefully as a before/after with clear markers.

Actually, I'll present it as a clean diff format showing the changes.

Let me think about the exact spacing changes:
- `py-14` → `py-20` on the main grid
- `gap-10` → `gap-12` on the main grid  
- `space-y-5` → `space-y-6` on brand column
- `mb-4` → `mb-5` on headings
- `space-y-2.5` → `space-y-3` on link lists
- `py-5` → `py-6` on legal bar
- `py-8` → `py-10` on bottom bar

For the app store badges, the two-line approach:

```tsx
<button type="button"
  onClick={() => handleAppStore("App Store")}
  className="group/badge inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary-foreground/[0.06] border border-primary-foreground/[0.08] hover:bg-primary-foreground/[0.12] hover:border-primary-foreground/[0.15] active:scale-[0.97] transition-all touch-manipulation min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1629]"
>
  <svg className="w-7 h-7 text-primary-foreground/70 shrink-0" fill="currentColor" viewBox="0 0 24 24">...</svg>
  <div className="flex flex-col items-start leading-none">
    <span className="text-[10px] text-primary-foreground/35 font-medium tracking-wide">Download on the</span>
    <span className="text-[14px] font-semibold text-primary-foreground/85 mt-0.5">App Store</span>
  </div>
</button>
```

This is clean, premium, two-line.

Now let me think about whether to wrap the footer sections in a grid with motion. I'll do:
- Brand column: one `motion.div`
- Link columns wrapper: one `motion.div` with a slightly different delay
- Legal + bottom: one `motion.div`

Let me finalize and write the proposal. I want to be precise about the diff.

Actually, I realize I should structure this as the "plan" + "diff" + "verification notes" as requested.

Let me write the full proposed replacement for the file. Since there are many scattered changes, I think a full file replacement (with clear comments on what changed) would be clearest, but the user asked for a "minimal diff." Let me do a structured before/after for each section.

Hmm, actually, given the number of changes across the file, a unified diff would be cleaner. Let me write it that way.

Let me think about one more thing: the `motion` usage. I need to be careful. The `useReducedMotion` hook returns `boolean | null`. When `true`, I should disable animations.

Here's my approach:

```tsx
const reducedMotion = useReducedMotion();

const sectionVariants = reducedMotion
  ? undefined
  : {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-60px" },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    };
```

Then spread onto `motion.div` wrappers. When `reducedMotion` is true, `sectionVariants` is `undefined` so the `motion.div` just renders as a regular div with no animation.

Actually, to be cleaner, I should define proper variants:

```tsx
const fadeUpProps: React.ComponentProps<typeof motion.div> = reducedMotion
  ? {}
  : {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-60px" },
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    };
```

Hmm, the `ease` typing might be tricky. Let me use a simpler approach:

```tsx
const motionProps = {
  ...(reducedMotion ? {} : {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" as const },
    transition: { duration: 0.5 },
  }),
};
```

Actually the simplest type-safe way:

```tsx
const sectionAnim = reducedMotion
  ? {}
  : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" as const }, transition: { duration: 0.5 } };
```

And then use `<motion.div {...sectionAnim}>`. TypeScript should be fine with this.

Wait, `margin` in `viewport` expects a string like `"-60px"` so that's fine. Let me just use a cleaner approach. Actually I'll define it inline on each `motion.div` to keep it simple and avoid complex typing.

Let me write the final proposal now.

One more thought on the link hover: a very premium effect is a subtle left-to-right underline reveal. I can do this with a pseudo-element approach using Tailwind's `after:` modifier, but that requires arbitrary values. Simpler: just use a cleaner hover color transition and a tiny translate.

OK, I think I have a solid plan. Let me write it up.

For the diff, I'll show the key changed blocks. Since there are changes throughout the file, I'll present it as sections of the file with before → after.

Let me reconsider the structure. The user wants:
1. Premium two-line app-store badge buttons ✓
2. Subtle scroll-in motion using framer-motion ✓
3. Refined column headings ✓
4. Tasteful link hover ✓
5. More spacious vertical rhythm ✓

All in `src/components/Footer.tsx`. No new deps, no route changes.

Let me write the full proposed file content now, since changes touch most of the return JSX.

Actually, for clarity and precision, let me write a diff that shows just the changes. I'll organize it as sections.

Here's my plan for the diff:

**A. Imports**: Add `useReducedMotion` to framer-motion import

**B. New helper**: Add `const prefersReducedMotion = useReducedMotion();` at top of component

**C. Brand column wrapper**: Change `space-y-5` → `space-y-6`, wrap in `motion.div`

**D. App Store buttons**: Complete restyle to two-line premium badges

**E. Link columns heading**: Uppercase, tracking, gradient accent

**F. Link items**: Refined hover

**G. Main grid**: `py-14` → `py-20`, `gap-10` → `gap-12`

**H. Legal bar**: `py-5` → `py-6`

**I. Bottom bar**: `py-8` → `py-10`

**J. Motion wrappers**: Wrap brand column, link grid, legal bar, bottom bar in `motion.div`

Let me now produce the output. I'll do a structured plan + a clear diff.

Let me reconsider one thing: the current code has `hidden lg:block` on the footer. That means it only shows on desktop (lg+). The mobile footer is mentioned as a TODO in AGENTS.md. I won't change this.

OK here's my final diff. Let me be very precise.

For the `motion` animation, I want to stagger the columns slightly. The brand column fades up first, then the link columns fade up with a slight delay. This creates a premium sequential reveal.

```tsx
// Brand column
<motion.div
  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-60px" }}
  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  className="lg:col-span-4 space-y-6"
>
```

Wait, `initial` should accept `false` to disable animation? Let me check... In framer-motion, if `initial={false}`, the component renders in its animate state immediately without animation. That's actually what we want for reduced motion.

But `whileInView` when undefined... hmm. Let me think about this differently.

The cleanest approach for reduced motion:
```tsx
const anim = prefersReducedMotion ? {} : {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

<motion.div {...anim} className="...">
```

When `prefersReducedMotion` is true, `anim` is `{}`, so `motion.div` gets no animation props and renders immediately. Clean.

Actually, I want to be even more specific. Let me use the framer-motion recommended pattern. From the docs:

```tsx
const shouldReduceMotion = useReducedMotion();
const variants = {
  hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
  visible: { opacity: 1, y: 0 },
};
```

But this is more complex. The simpler `{}` spread approach works fine and is type-safe.

Let me finalize. I'll keep it practical:

```tsx
const reducedMotion = useReducedMotion();
// ...
// In the JSX, for each animated section:
<motion.div
  {...(!reducedMotion && {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5 },
  })}
  className="..."
>
```

Hmm, the spread of `false` is fine (nothing gets spread). But TypeScript might complain about the conditional spread. Let me check... `{...false}` is valid JS and just spreads nothing. `{...(false && {...})}` evaluates to `{...false}` which is `{}`. So TypeScript should be fine since it evaluates to either the object or `false`, and spreading `false` is a no-op.

Actually in TypeScript strict mode, spreading `false` might cause issues. Let me use a variable:

```tsx
const fadeUp = reducedMotion
  ? ({} as React.ComponentPropsWithoutRef<typeof motion.div>)
  : {
      initial: { opacity: 0, y: 20 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: "-60px" as const },
      transition: { duration: 0.5 },
    };
```

Hmm, that's ugly. Let me just use:

```tsx
const motionAttrs = reducedMotion ? {} : {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};
```

And `<motion.div {...(motionAttrs as any)} className="...">`. Hmm, `as any` is not great.

OK let me try the simplest approach: just define the props inline and let TypeScript infer:

```tsx
<motion.div
  initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
  whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
  viewport={reducedMotion ? undefined : { once: true, margin: "-60px" }}
  transition={reducedMotion ? undefined : { duration: 0.5 }}
  className="..."
>
```

This is the cleanest, most explicit, and most type-safe approach. Each prop is individually conditional. TypeScript will love this. Let me use this pattern.

But it's verbose to repeat for 3-4 wrappers. Let me create a small helper inside the component:

```tsx
const motionAttrs = reducedMotion
  ? { initial: undefined, whileInView: undefined, viewport: undefined, transition: undefined }
  : {
      initial: { opacity: 0, y: 20 } as const,
      whileInView: { opacity: 1, y: 0 } as const,
      viewport: { once: true, margin: "-60px" } as const,
      transition: { duration: 0.5 } as const,
    };
```

Actually this is getting too complicated. Let me just do the simplest thing that type-checks. I'll create a wrapper component:

```tsx
const FadeUp = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
    whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
    viewport={reducedMotion ? undefined : { once: true, margin: "-60px" }}
    transition={reducedMotion ? undefined : { duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);
```

Wait, but `initial` in framer-motion has type `Target | VariantLabels | boolean`. Setting it to `undefined` means the component has no initial state, which is fine - it'll just render in its default state. And `whileInView: undefined` means no whileInView animation. Perfect.

Actually, I just realized that `reducedMotion` is `boolean | null` from `useReducedMotion()`. So `!reducedMotion` would be `true` for both `false` and `null`. But `reducedMotion ? ... : ...` treats `null` as falsy, which means animations would play when `useReducedMotion` returns `null` (indeterminate). That's actually the correct behavior - only disable when explicitly `true`.

OK, let me finalize. I'll define a simple component-level helper and use it. Here's my final approach:

```tsx
const reducedMotion = useReducedMotion();

// Helper for scroll-reveal - returns empty object when reduced motion is preferred
const scrollReveal = (delay = 0) =>
  reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-60px" },
        transition: { duration: 0.5, delay },
      };
```

Hmm, the return type of this function would be `{}` or the full object. TypeScript would infer `{} | { initial: ..., ... }`. When spreading `motion.div {...scrollReveal()}`, TypeScript should be fine since all those props are optional on `motion.div`.

Actually wait, there could be a type issue. Let me think... `motion.div` expects specific prop types. Spreading an object of type `{} | { initial: ..., whileInView: ..., ... }` should work because all motion props are optional. The `{}` case just provides nothing, which is valid. The other case provides valid props. TypeScript should handle this.

Let me test mentally: if the function returns `{} | { initial: { opacity: 0, y: 20 }, ... }`, when you spread it on a `motion.div`, TypeScript sees that the spread could be either an empty object or an object with valid motion props. Since motion div's props are all optional, both cases are valid. This should type-check fine.

But actually, TS might complain that `{}` doesn't have the right properties... No, spreading `{} ` onto a component is fine - it just passes no extra props.

OK I'm overthinking this. Let me just write the diff and move on.

Here's what I'll propose:

```tsx
import { motion, useReducedMotion } from "framer-motion";
```

Inside the component, after `const reducedMotion = useReducedMotion();`:

```tsx
// Scroll-reveal animation helper — disabled when prefers-reduced-motion is active
const reveal = reducedMotion
  ? {}
  : {
      initial: { opacity: 0, y: 20 } as const,
      whileInView: { opacity: 1, y: 0 } as const,
      viewport: { once: true, margin: "-60px" as const },
      transition: { duration: 0.5 },
    };
```

The `as const` ensures the literal types are inferred correctly.

Then wrap sections:

```tsx
{/* Main grid */}
<motion.div {...reveal} className="py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
  {/* Brand column */}
  <div className="lg:col-span-4 space-y-6">
    ...
  </div>

  {/* Link columns */}
  <motion.div {...reveal} className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
    ...
  </motion.div>
</motion.div>
```

Wait, the motion.div for the main grid... the brand column is inside it. That means the brand column and link columns would animate together since they're children of the same motion parent. I should wrap them separately.

Let me restructure:

```tsx
<div className="py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
  {/* Brand column */}
  <motion.div {...reveal} className="lg:col-span-4 space-y-6">
    ...
  </motion.div>

  {/* Link columns */}
  <motion.div {...reveal} className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
    ...
  </motion.div>
</div>
```

And for the legal/bottom bar:

```tsx
<motion.div {...reveal} className="py-6 border-t border-primary-foreground/10">
  ...
</motion.div>

<motion.div {...reveal} className="py-10 border-t border-primary-foreground/10">
  ...
</motion.div>
```

Actually, for the legal and bottom bars, wrapping in motion.div means replacing the outer `<div>` with `<motion.div>`. Let me be careful.

OK let me now write the complete diff. I'll present it as a structured before/after showing just the changed parts.

Actually, you know what, let me just produce the full refined file. It's cleaner and avoids any ambiguity about where changes go. The user wants a concrete proposal.

Let me write it out:

```tsx
/**
 * Footer - Premium dark navy footer with refined layout & motion
 */
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ExternalLink,
  Heart,
  ChevronUp,
  CheckCircle2,
  Plane,
  Building2,
  Car,
  MapPin,
} from "lucide-react";
import ZivoLogo from "./ZivoLogo";
import { isZivoTravelHost } from "@/config/zivoTravelDomain";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";

// ... (same data arrays)

const Footer = ({ className }: { className?: string }) => {
  if (Capacitor.isNativePlatform()) return null;

  const isTravel = typeof window !== "undefined" && isZivoTravelHost(window.location.hostname);
  const brand = isTravel ? "Zivo Travel" : "ZIVO";
  const sections = isTravel
    ? footerSections.map((s) => ({
        ...s,
        links: s.links
          .filter((l) => !["ZIVO Rides", "ZIVO Eats", "Become a Driver"].includes(l.name))
          .map((l) => (l.name === "About ZIVO" ? { ...l, name: "About Zivo Travel" } : l)),
      }))
    : footerSections;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleAppStore = (store: string) => {
    toast("Coming soon!", { description: `The ${brand} ${store} app is launching soon.`, duration: 3000 });
  };

  const reducedMotion = useReducedMotion();
  const reveal = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-60px" },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <footer className={cn("relative z-30 bg-[#0f1629] text-primary-foreground overflow-hidden hidden lg:block", className)}>
      {/* Decorative orbs */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-secondary rounded-full blur-[120px] pointer-events-none" />
      
      {/* Top accent line — IG gradient */}
      <div aria-hidden className="bg-ig-gradient h-[2px] w-full opacity-90" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Main grid */}
        <div className="py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Brand column */}
          <motion.div {...(reveal as any)} className="lg:col-span-4 space-y-6">
            {/* Logo */}
            <Link to="/" className="inline-flex min-h-[40px] items-center touch-manipulation">
              {isTravel ? (
                <span className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 via-sky-500 to-violet-600 text-xl font-black text-white">Z</span>
                  <span className="text-xl font-black tracking-tight">
                    <span className="text-primary-foreground">ZIVO </span>
                    <span className="bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent">TRAVEL</span>
                  </span>
                </span>
              ) : (
                <ZivoLogo size="md" />
              )}
            </Link>
            <p className="text-sm text-primary-foreground/40 max-w-xs leading-relaxed">
              Book flights, hotels, and car rentals with transparent pricing and secure checkout. Your next adventure starts here.
            </p>

            {/* App Store + Google Play — premium two-line badges */}
            <div className="flex flex-col gap-3">
              <button type="button"
                onClick={() => handleAppStore("App Store")}
                className="group/badge inline-flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-primary-foreground/[0.06] border border-primary-foreground/[0.08] hover:bg-primary-foreground/[0.12] hover:border-primary-foreground/[0.15] active:scale-[0.97] transition-all touch-manipulation min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1629]"
              >
                <svg className="w-7 h-7 text-primary-foreground/70 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] text-primary-foreground/35 font-medium tracking-wider">Download on the</span>
                  <span className="text-sm font-semibold text-primary-foreground/85 mt-0.5">App Store</span>
                </div>
              </button>
              <button type="button"
                onClick={() => handleAppStore("Google Play")}
                className="group/badge inline-flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-primary-foreground/[0.06] border border-primary-foreground/[0.08] hover:bg-primary-foreground/[0.12] hover:border-primary-foreground/[0.15] active:scale-[0.97] transition-all touch-manipulation min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1629]"
              >
                <svg className="w-7 h-7 text-primary-foreground/70 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M3.609 1.814L13.792 12 3.609 22.186a.996.996 0 01-.299-.71V2.524a1 1 0 01.299-.71zm10.89 10.893l2.302 2.302-10.937 6.333 8

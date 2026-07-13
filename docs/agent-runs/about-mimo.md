# MiMo run — 2026-06-12T03:04:56.976Z

- model: mimo-v2.5-pro
- task: Premium + responsive refinement of the ZIVO About page (src/pages/About.tsx). It is already content-rich and responsive. Propose tasteful PREMIUM upgrades that are additive + type-safe: (1) brand the hero (gradient on 'ZIVO' in the h1), (2) add reduced-motion-aware scroll-in motion consistently to the main sections (it already imports framer-motion; only hero + changelog animate today), (3) fix the 'hover:hover:-translate-y-1' duplicate-variant typo, (4) better mobile heading sizes (text-2xl sm:text-3xl). Keep it minimal — don't rebuild. Concrete Tailwind + minimal diff. Be concise.
- files: src/pages/About.tsx

---

## Plan

Four targeted changes — no rebuild, all additive, reduced-motion-safe:

1. **Hero gradient** — wrap `ZIVO` in the h1 with a `from-primary to-teal-400` gradient span.
2. **Consistent scroll-in motion** — import `useReducedMotion`, build a small `fadeUp` spread object (empty when reduced motion is on), wrap each major section in `<motion.div {...fadeUp}>`. Hero already animates on mount; make it reduced-motion-aware too.
3. **Fix `hover:hover:-translate-y-1`** — two cards (Flights, Car Rentals) have the duplicate Tailwind variant. Remove the extra `hover:`.
4. **Mobile headings** — every `<h2 className="text-3xl …">` becomes `text-2xl sm:text-3xl`. The hero h1 stays `text-4xl md:text-5xl` (already large enough).

---

## Proposed diff — `src/pages/About.tsx`

### 1. Import

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
```

### 2. Component body — add `reducedMotion` + `fadeUp` helper

Insert right after the `useEffect(…)` block (before the `return`):

```tsx
  const reducedMotion = useReducedMotion();
  const fadeUp = reducedMotion
    ? ({ initial: false } as const)
    : ({
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
        transition: { duration: 0.5 },
      } as const);
```

### 3. Hero block — gradient + reduced-motion-aware

```diff
-          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center mb-16">
+          <motion.div
+            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
+            animate={{ opacity: 1, y: 0 }}
+            transition={{ duration: reducedMotion ? 0 : 0.4 }}
+            className="text-center mb-16"
+          >
```

```diff
-            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
-              About ZIVO
-            </h1>
+            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
+              About <span className="bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">ZIVO</span>
+            </h1>
```

### 4. Fix duplicate `hover:hover:` variant (two lines)

**Flights card:**
```diff
-  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:hover:-translate-y-1 transition-all duration-300">
+  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
```

**Car Rentals card:**
```diff
-  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:hover:-translate-y-1 transition-all duration-300">
+  <div className="p-6 rounded-2xl bg-card/80 border border-border/50 text-center hover:border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
```

### 5. Mobile heading sizes — `text-3xl` → `text-2xl sm:text-3xl`

Apply to **every `<h2>` that currently says `text-3xl`** (there are 8 of them):

```diff
-<h2 className="text-3xl font-bold mb-4">What We Do</h2>
+<h2 className="text-2xl sm:text-3xl font-bold mb-4">What We Do</h2>

-<h2 className="text-3xl font-bold mb-4">How ZIVO Makes Money</h2>
+<h2 className="text-2xl sm:text-3xl font-bold mb-4">How ZIVO Makes Money</h2>

-<h2 className="text-3xl font-bold mb-4">Built for Scale</h2>
+<h2 className="text-2xl sm:text-3xl font-bold mb-4">Built for Scale</h2>

-<h2 className="text-3xl font-bold mb-8 text-center">Our Principles</h2>
+<h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">Our Principles</h2>

-<h2 className="text-3xl font-bold mb-8 text-center">Our Journey</h2>
+<h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">Our Journey</h2>

-<h2 className="text-2xl font-bold text-center mb-6">Trust & Security</h2>
+<h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Trust & Security</h2>

-<h2 className="text-3xl font-bold mb-2">Changelog</h2>
+<h2 className="text-2xl sm:text-3xl font-bold mb-2">Changelog</h2>

-<h2 className="text-3xl font-bold mb-4">Start Your Journey</h2>
+<h2 className="text-2xl sm:text-3xl font-bold mb-4">Start Your Journey</h2>
```

The "Loving ZIVO?" h2 (`text-2xl`) and "Important Notice" h3 (`text-xl`) / "Expanding Travel Ecosystem" h3 (`text-xl`) stay as-is — they're already reasonable on mobile.

### 6. Wrap major sections in `<motion.div {...fadeUp}>`

For each section below the hero, wrap its outer element. Concrete changes:

**"What We Do" card** (has `mb-12`):
```diff
-          <Card className="mb-12 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-teal-500/10 overflow-hidden">
+          <motion.div {...fadeUp}>
+          <Card className="mb-12 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-teal-500/10 overflow-hidden">
```
```diff
            </Card>
+          </motion.div>
```

**"How ZIVO Makes Money"** (outer `<div className="mb-16">`):
```diff
-          <div className="mb-16">
+          <motion.div {...fadeUp} className="mb-16">
```
(matching closing `</motion.div>`)

**"Built for Scale"** (outer `<div className="mb-16">`):
```diff
-          <div className="mb-16">
+          <motion.div {...fadeUp} className="mb-16">
```

**"Important Notice" Card** (has `mb-12`):
```diff
-          <Card className="mb-12 border-amber-500/30 bg-amber-500/5">
+          <motion.div {...fadeUp}>
+          <Card className="mb-12 border-amber-500/30 bg-amber-500/5">
```
```diff
            </Card>
+          </motion.div>
```

**"Our Principles"** (`<div className="mb-16">`):
```diff
-          <div className="mb-16">
+          <motion.div {...fadeUp} className="mb-16">
```

**"Our Journey"** (`<div className="mb-16">`):
```diff
-          <div className="mb-16">
+          <motion.div {...fadeUp} className="mb-16">
```

**"Trust & Security"** (`<div className="mb-16">`):
```diff
-          <div className="mb-16">
+          <motion.div {...fadeUp} className="mb-16">
```

**"Rate the App"** (`<section id="rate" …>`):
```diff
-          <section id="rate" className="scroll-mt-24 mb-16">
+          <motion.section {...fadeUp} id="rate" className="scroll-mt-24 mb-16">
```
(matching `</motion.section>`)

**"Start Your Journey" CTA** (`<div className="text-center bg-gradient-to-r …">`):
```diff
-          <div className="text-center bg-gradient-to-r from-primary/10 via-background to-teal-500/10 rounded-3xl p-10 border border-primary/20">
+          <motion.div {...fadeUp} className="text-center bg-gradient-to-r from-primary/10 via-background to-teal-500/10 rounded-3xl p-10 border border-primary/20">
```

> **Note:** Each section that was `<div>` becomes `<motion.div>`, so its matching `</div>` becomes `</motion.div>`. The changelog section's inner entries already animate individually — no change needed there.

---

## Verify / deploy

```bash
npm run update
```

Must pass (type-check + worker type-check + production build, 0 errors). Preview at `localhost:5173` → `/about` — check:

- **Hero:** "ZIVO" text shows a primary→teal gradient; hero fades in on load (or appears instantly with reduced motion on).
- **Scroll-in:** each major section fades up as it enters the viewport (or renders static with reduced motion). No janky double-animation (changelog cards already animate internally — they should still work).
- **Cards:** Flights and Car Rentals cards lift on hover correctly (no duplicate variant).
- **Mobile (375px):** all h2s are `text-2xl` (1.5rem), scaling to `text-3xl` at `sm` (640px+). The hero h1 stays `text-4xl` (2.25rem).
- **Type-check:** 0 errors — `fadeUp` spreads cleanly onto `motion.div`/`motion.section` props.

# MiMo run — 2026-06-14T09:51:25.114Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on AIRoutePlanner an AI route planning tool screen. File imports framer-motion motion and AnimatePresence and has NO useTranslation so plain-English labels. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory. PERPETUAL LOOPS guard BOTH animate and transition to undefined under reduceMotion. ONE the header Brain badge motion.div animate rotate array 0 10 minus10 0 transition repeat Infinity duration 3. TWO the radial blob inside the analysis card motion.div animate scale 1 1.2 1 transition repeat Infinity duration 4. SPATIAL ENTRANCES guard initial to false and where there is a stagger delay guard it to reduceMotion ternary 0 colon original. ONE the motion.header initial opacity 0 y minus20. TWO the analysis card motion.div initial opacity 0 y 20. THREE the Recommended Areas section motion.div initial opacity 0 y 20 with an exit it is inside AnimatePresence revealed after the user taps Analyze. FOUR each recommendation card motion.div initial opacity 0 x minus20 transition delay index times 0.1. FIVE the Optimized Route section motion.div initial opacity 0 y 20. SIX the Tips section motion.div initial opacity 0 y 20 transition delay 0.2. SEVEN each tip item motion.div initial opacity 0 x minus20 transition delay i times 0.1. LEAVE AS-IS the whileHover and whileTap gestures on the back button and all button wrappers these are interaction feedback not auto-play. SPINNER the Loader2 has CSS animate-spin and sits beside the text Analyzing optimal routes so it is decorative add motion-reduce colon animate-none and aria-hidden. Icons. The header back button is icon-only motion.button with ArrowLeft add aria-label Back and aria-hidden the ArrowLeft. Decorative aria-hidden the Sparkles beside h1 the Brain in the rotating header badge which is icon-only ornamental the Brain in the analysis card beside Real-Time Analysis the TrendingUp beside Recommended Areas the MapPin in each rec card the DollarSign and Zap inside the badges the Navigation in the Navigate Here button the Route beside Optimized Multi-Stop Route the Clock beside the savings text the Navigation in the Start Optimized Route button the Navigation in the Analyze Best Routes Now button and each tip item.icon beside its text. HEADINGS the outline is messy. h1 AI Route Planner then h3 Real-Time Analysis appears first so it SKIPS h1 to h3 then h2 Recommended Areas then h4 rec.area which skips h2 to h4 then h2 Optimized Multi-Stop Route then h3 How AI Route Planner Works in the tips. All these headings have className fully controlling styling so tag swaps are zero-visual. Advise the correct heading promotions to make a clean contiguous outline. SAFE-AREA root is min-h-screen pb-24 normal flow with a BottomNav the sticky header already has pt calc env safe-area-inset-top plus 0.75rem no change. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/AIRoutePlanner.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze the file and plan all the changes needed.

## Analysis

### File: `src/pages/tools/AIRoutePlanner.tsx`

### 1. Reduced Motion

**Import:** Add `useReducedMotion` to framer-motion import.
**Const:** Add `const reduceMotion = useReducedMotion();` inside the component.

**Perpetual loops (animate + transition → undefined):**
- ONE: header Brain badge `motion.div` — `animate={{ rotate: [0, 10, -10, 0] }}` + `transition={{ repeat: Infinity, duration: 3 }}`
- TWO: radial blob `motion.div` — `animate={{ scale: [1, 1.2, 1] }}` + `transition={{ repeat: Infinity, duration: 4 }}`

**Spatial entrances (initial → false, stagger delay → 0):**
- ONE: `motion.header` — `initial={{ opacity: 0, y: -20 }}`
- TWO: analysis card `motion.div` — `initial={{ opacity: 0, y: 20 }}`
- THREE: Recommended Areas `motion.div` — `initial={{ opacity: 0, y: 20 }}` with exit
- FOUR: each recommendation card `motion.div` — `initial={{ opacity: 0, x: -20 }}` + `transition={{ delay: index * 0.1 }}`
- FIVE: Optimized Route `motion.div` — `initial={{ opacity: 0, y: 20 }}`
- SIX: Tips `motion.div` — `initial={{ opacity: 0, y: 20 }}` + `transition={{ delay: 0.2 }}`
- SEVEN: each tip item `motion.div` — `initial={{ opacity: 0, x: -20 }}` + `transition={{ delay: i * 0.1 }}`

**Leave as-is:** whileHover/whileTap on buttons.

### 2. Spinner

The `<Loader2 className="h-5 w-5 animate-spin text-primary" />` — add `motion-reduce:animate-none` and `aria-hidden="true"`.

### 3. Icons — aria-hidden

Decorative icons to add `aria-hidden="true"`:
- `Sparkles` beside h1
- `Brain` in the rotating header badge
- `Brain` in the analysis card (inside the gradient square, next to "Real-Time Analysis")
- `TrendingUp` beside "Recommended Areas"
- `MapPin` in each rec card
- `DollarSign` inside badge
- `Zap` inside badge
- `Navigation` in "Navigate Here" button
- `Route` beside "Optimized Multi-Stop Route"
- `Clock` beside savings text
- `Navigation` in "Start Optimized Route" button
- `Navigation` in "Analyze Best Routes Now" button
- each `item.icon` in tips

### 4. Back button — aria-label

The back button `motion.button` with `ArrowLeft` — add `aria-label="Back"` and `aria-hidden` on the ArrowLeft.

### 5. Heading outline

Current outline:
```
h1 AI Route Planner
  h3 Real-Time Analysis          ← SKIPS h1→h3
    h4 rec.area                  ← within rec cards
  h2 Recommended Areas
    h4 rec.area                  ← SKIPS h2→h4
  h2 Optimized Multi-Stop Route
  h3 How AI Route Planner Works  ← in tips
```

Wait, let me re-read. The `h4` inside rec cards is `rec.area`. Let me look more carefully:

- `<h1>` — "AI Route Planner"
- `<h3>` — "Real-Time Analysis" (inside analysis card) — should be `<h2>`
- `<h4>` — `rec.area` (inside each recommendation card) — should be `<h3>`
- `<h2>` — "Recommended Areas" — keep or change?
- `<h2>` — "Optimized Multi-Stop Route"
- `<h3>` — "How AI Route Planner Works" (in tips)

Let me think about the correct outline:

```
h1 AI Route Planner
  h2 Real-Time Analysis          (was h3 → promote to h2)
  h2 Recommended Areas           (keep h2)
    h3 rec.area                  (was h4 → promote to h3)
  h2 Optimized Multi-Stop Route  (keep h2)
  h2 How AI Route Planner Works  (was h3 → promote to h2)
```

Wait, but the tips section heading is "How AI Route Planner Works" — it's at the same level as the section headings. Let me reconsider.

Actually, the tips section is a standalone section at the same level as the others. So:

```
h1 AI Route Planner
  h2 Real-Time Analysis
  h2 Recommended Areas
    h3 [rec.area]
  h2 Optimized Multi-Stop Route
  h2 How AI Route Planner Works
```

That's clean. Changes:
- `h3 "Real-Time Analysis"` → `h2`
- `h4 {rec.area}` → `h3`
- `h3 "How AI Route Planner Works"` → `h2`

All className-controlled styling, so tag swaps are zero-visual.

### 6. Safe-area

Root is `min-h-screen pb-24` with `BottomNav`. Header already has `pt-[calc(env(safe-area-inset-top)+0.75rem)]`. This looks correct. No change needed.

---

Now let me write the full diff. I'll work through it carefully.

```diff
--- a/src/pages/tools/AIRoutePlanner.tsx
+++ b/src/pages/tools/AIRoutePlanner.tsx
@@ -1,5 +1,5 @@
 import { useState } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Brain, MapPin, Clock, DollarSign, Zap, Route, TrendingUp, Navigation, Sparkles, Loader2 } from "lucide-react";
```

Inside the component, add:
```ts
const reduceMotion = useReducedMotion();
```

Now let me go through each change precisely.

Let me just write out the entire proposed file with all changes. That might be clearer than a diff for this many changes.

Actually, let me do a clear diff approach.

Let me enumerate every edit:

**Import line:**
```
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

**Component body — add const:**
After `const [analysisProgress, setAnalysisProgress] = useState(0);`, add:
```ts
const reduceMotion = useReducedMotion();
```

**Back button — aria-label + icon aria-hidden:**
```tsx
// Before:
<motion.button
  onClick={() => navigate(-1)}
  className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <ArrowLeft className="w-5 h-5" />
</motion.button>

// After:
<motion.button
  onClick={() => navigate(-1)}
  className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  aria-label="Back"
>
  <ArrowLeft className="w-5 h-5" aria-hidden="true" />
</motion.button>
```

**h1 Sparkles — aria-hidden:**
```tsx
// Before:
<Sparkles className="w-4 h-4 text-primary" />

// After:
<Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
```

**Header Brain badge — reduceMotion + icon aria-hidden:**
```tsx
// Before:
<motion.div
  animate={{ rotate: [0, 10, -10, 0] }}
  transition={{ repeat: Infinity, duration: 3 }}
  className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"
>
  <Brain className="w-5 h-5 text-primary" />
</motion.div>

// After:
<motion.div
  animate={reduceMotion ? undefined : { rotate: [0, 10, -10, 0] }}
  transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3 }}
  className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20"
>
  <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
</motion.div>
```

**motion.header — initial guard:**
```tsx
// Before:
<motion.header
  className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
>

// After:
<motion.header
  className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
  initial={reduceMotion ? false : { opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
>
```

**Analysis card — initial guard:**
```tsx
// Before:
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-primary/20 via-card to-primary/5 border border-primary/30"
>

// After:
<motion.div
  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-primary/20 via-card to-primary/5 border border-primary/30"
>
```

**h3 "Real-Time Analysis" → h2:**
```tsx
// Before:
<h3 className="text-lg font-bold">Real-Time Analysis</h3>

// After:
<h2 className="text-lg font-bold">Real-Time Analysis</h2>
```

**Brain in analysis card — aria-hidden:**
```tsx
// Before:
<Brain className="h-7 w-7 text-white" />

// After:
<Brain className="h-7 w-7 text-white" aria-hidden="true" />
```

**Radial blob — reduceMotion guard:**
```tsx
// Before:
<motion.div
  className="absolute -top-16 -right-16 w-32 h-32 rounded-full"
  style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)" }}
  animate={{ scale: [1, 1.2, 1] }}
  transition={{ repeat: Infinity, duration: 4 }}
/>

// After:
<motion.div
  className="absolute -top-16 -right-16 w-32 h-32 rounded-full"
  style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)" }}
  animate={reduceMotion ? undefined : { scale: [1, 1.2, 1] }}
  transition={reduceMotion ? undefined : { repeat: Infinity, duration: 4 }}
/>
```

**Loader2 — motion-reduce + aria-hidden:**
```tsx
// Before:
<Loader2 className="h-5 w-5 animate-spin text-primary" />

// After:
<Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-primary" aria-hidden="true" />
```

**Navigation in "Analyze Best Routes Now" — aria-hidden:**
```tsx
// Before:
<Navigation className="h-5 w-5 mr-2" />

// After:
<Navigation className="h-5 w-5 mr-2" aria-hidden="true" />
```

**Recommended Areas section — initial guard:**
```tsx
// Before:
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  className="space-y-3"
>

// After:
<motion.div
  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  className="space-y-3"
>
```

**TrendingUp — aria-hidden:**
```tsx
// Before:
<TrendingUp className="h-4 w-4 text-primary" />

// After:
<TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
```

**Each recommendation card — initial guard + delay guard:**
```tsx
// Before:
<motion.div
  key={rec.id}
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.1 }}
  className="p-4 rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/30"
>

// After:
<motion.div
  key={rec.id}
  initial={reduceMotion ? false : { opacity: 0, x: -20 }}
  animate={{ opacity: 1, x:

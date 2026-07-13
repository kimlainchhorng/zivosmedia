# MiMo run — 2026-06-14T09:09:06.093Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on PerformanceScore a driver performance page. File imports framer-motion motion and has NO useTranslation so plain-English labels. ONE component. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory TWO surfaces. ONE motion.circle the score ring fill initial strokeDashoffset full circumference animate strokeDashoffset based on score transition duration 1 this is an animated stroke draw reveal GUARD initial only set to false under reduceMotion so the ring renders fully drawn at final value leave animate and transition intact. ONE motion.span the big score number initial opacity 0 animate opacity 1 transition delay 0.3 this is PURE OPACITY-ONLY entrance advise LEAVE UNGUARDED. No perpetual loops no whileHover whileTap. Icons aria-hidden decorative. ArrowLeft inside a raw icon-only button element no text add aria-label Back to the button and aria-hidden on ArrowLeft. The four metric icons Star ThumbsUp CheckCircle Clock rendered via m.icon beside each value and label aria-hidden. TrendingUp beside Performance Breakdown title aria-hidden. Award beside Tier Progress title aria-hidden. ChevronRight a decorative separator between current and next tier badges aria-hidden. HEADING h1 Performance Score is the lone real heading the section titles are shadcn CardTitle components advise leave CardTitle heading hierarchy DEFERRED out of this slice. The shadcn Progress bar is Radix with role progressbar advise whether it needs an aria-label or leave as Radix handles it. Safe-area the header already has pt calc env safe-area-inset-top plus 0.75rem and root is normal-flow min-h-screen pb-24 no change. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/PerformanceScore.tsx

---

## 1. Short Plan

**9 edit sites, 0 logic changes.** One file: `src/pages/driver/PerformanceScore.tsx`.

| # | What | Why |
|---|------|-----|
| 1 | Add `useReducedMotion` to framer-motion import | Hook source |
| 2 | Add `const reduceMotion = useReducedMotion()` inside component | Read preference |
| 3 | Guard `motion.circle` `initial` only: when `reduceMotion`, set initial = final animate value | Ring renders fully-drawn, no draw animation fires |
| 4 | `motion.span` — **leave unguarded** | Pure opacity entrance, no motion path |
| 5 | Back `<button>`: add `aria-label="Back"`; `<ArrowLeft>`: add `aria-hidden="true"` | Icon-only button needs accessible name; icon is decorative |
| 6 | Metric `<Icon>`: add `aria-hidden="true"` | Decorative (label text is the accessible name) |
| 7 | `<TrendingUp>`: add `aria-hidden="true"` | Decorative beside CardTitle |
| 8 | `<Award>`: add `aria-hidden="true"` | Decorative beside CardTitle |
| 9 | `<ChevronRight>`: add `aria-hidden="true"` | Decorative separator between tier badges |
| 10 | `<Progress>`: add `aria-label="Progress to next tier"` | Radix sets value attrs but no accessible name without an associated label — a screen reader would announce "progressbar 45%" with no description |

**Out of scope (flagged, not touched):** CardTitle heading hierarchy (deferred), logic/data, safe-area (already correct).

---

## 2. Proposed Diff

**File:** `src/pages/driver/PerformanceScore.tsx`

### Edit 1 — Import

```diff
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
```

### Edit 2 — Hook (after `const { data: earningsData } = ...` line)

```diff
  const { data: earningsData } = useDriverEarnings(earningsPeriod);
+ const reduceMotion = useReducedMotion();
```

### Edit 3 — Guard `motion.circle` initial only

```diff
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
-                   initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
+                   initial={{ strokeDashoffset: reduceMotion ? 2 * Math.PI * 52 * (1 - perf.score / 100) : 2 * Math.PI * 52 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - perf.score / 100) }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
```

### Edit 4 — `motion.span` — **NO CHANGE** (pure opacity, left unguarded)

### Edit 5 — Back button + ArrowLeft

```diff
-       <button onClick={goBack} className="p-1">
-         <ArrowLeft className="w-5 h-5" />
+       <button onClick={goBack} className="p-1" aria-label="Back">
+         <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
```

### Edit 6 — Metric icon (`<Icon>`)

```diff
-                   <Icon className={`w-5 h-5 mx-auto mb-1 ${m.color} ${m.fillIcon ? "fill-current" : ""}`} />
+                   <Icon className={`w-

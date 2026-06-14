# MiMo run — 2026-06-14T05:40:08.089Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. StopCompletionOverlay MOUNTED on /map is a transient full-screen completion overlay (backdrop + centered card, NO buttons, auto-dismisses) when a driver completes a multi-stop stop. Content: success Check icon, h2 'Stop N Complete!', subline 'Order picked up'/'Delivered successfully', then a 'Moving to stop N+1 of M' pill with an ArrowRight icon (Tailwind animate-pulse), OR a '🎉 Bundle Complete!' pill (emoji inline in text). framer-motion entrances: backdrop opacity fade; card initial y 30 scale 0.9; checkmark initial scale 0; message initial opacity 0 y 10; next-stop pill initial opacity 0; bundle pill initial opacity 0 scale 0.8. Questions: (1) aria-hidden true on Check and ArrowRight icons? (2) Wrap the inline 🎉 emoji in aria-hidden span? (3) animate-pulse on ArrowRight - add motion-reduce:animate-none? (4) Reduced-motion: guard the MOVEMENT entrances (card y+scale, checkmark scale, message y, bundle-pill scale) with useReducedMotion initial false, leave pure-opacity fades and exits? (5) Add role=status aria-live=polite on the card to announce the completion? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/navigation/StopCompletionOverlay.tsx

---

## Verdicts

| # | Question | Verdict |
|---|----------|---------|
| 1 | `aria-hidden` on `Check` and `ArrowRight` | **Yes** — both are decorative; the adjacent text already conveys the meaning. |
| 2 | Wrap 🎉 in `aria-hidden` span | **Yes** — screen readers read the Unicode description ("party popper"), which is noise. |
| 3 | `motion-reduce:animate-none` on `animate-pulse` | **Yes** — `animate-pulse` is a CSS keyframe that ignores `prefers-reduced-motion` by default; Tailwind's `motion-reduce:` variant fixes it. |
| 4 | Guard movement entrances with `useReducedMotion` | **Yes** — replace `y`/`scale` movement `initial` values with their end-state equivalents when reduced motion is preferred. Leave pure-opacity fades (backdrop opacity fade is acceptable per WCAG). Exits can stay as-is (the overlay is disappearing; exit motion is low-priority). |
| 5 | `role="status"` + `aria-live="polite"` on the card | **Yes** — this is a transient status announcement. `role="status"` implies `aria-live="polite"`, but being explicit is fine. The framer-motion mount populates the live region after DOM insertion, which is the correct announcement trigger. |

---

## Proposed diff

**File:** `../zivodriver/src/components/navigation/StopCompletionOverlay.tsx`

```diff
 import { motion, AnimatePresence } from "framer-motion";
+import { useReducedMotion } from "framer-motion";
 import { Check, ArrowRight } from "lucide-react";
```

Replace the single `motion` import line with a combined one (or add the second — either is fine; one import line is cleaner):

```diff
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { Check, ArrowRight } from "lucide-react";
```

Inside the component body, add the hook call right after the destructured props:

```diff
   stopType = "dropoff",
 }: StopCompletionOverlayProps) {
+  const prefersReducedMotion = useReducedMotion();
```

Card entrance — guard movement:

```diff
           <motion.div
-            initial={{ y: 30, scale: 0.9 }}
+            initial={prefersReducedMotion ? { opacity: 0 } : { y: 30, scale: 0.9 }}
             animate={{ y: 0, scale: 1 }}
             exit={{ y: -20, scale: 0.95 }}
             transition={{ type: "spring", stiffness: 300, damping: 25 }}
```

Checkmark entrance — guard scale:

```diff
           <motion.div
-            initial={{ scale: 0 }}
+            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
             animate={{ scale: 1 }}
```

Message entrance — guard y:

```diff
           <motion.div
-            initial={{ opacity: 0, y: 10 }}
+            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
```

Bundle pill entrance — guard scale:

```diff
           <motion.div
-            initial={{ opacity: 0, scale: 0.8 }}
+            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
```

Add `role`/`aria-live` to the card container:

```diff
           <motion.div
-            initial={prefersReducedMotion ? { opacity: 0 } : { y: 30, scale: 0.9 }}
+            role="status"
+            aria-live="polite"
+            aria-atomic="true"
+            initial={prefersReducedMotion ? { opacity: 0 } : { y: 30, scale: 0.9 }}
```

`aria-hidden` on the `Check` icon:

```diff
-              <Check className="w-10 h-10 text-success" strokeWidth={3} />
+              <Check className="w-10 h-10 text-success" strokeWidth={3} aria-hidden="true" />
```

`aria-hidden` on the `ArrowRight` icon + `motion-reduce:animate-none`:

```diff
-                <ArrowRight className="w-4 h-4 animate-pulse" />
+                <ArrowRight className="w-4 h-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
```

Wrap emoji in `aria-hidden` span:

```diff
                 <span className="text-[13px] font-semibold">
-                  🎉 Bundle Complete!
+                  <span aria-hidden="true">🎉</span> Bundle Complete!
                 </span>
```

---

## Summary of changes (all additive, zero logic/routing/copy/layout)

| Change | Count | What |
|--------|-------|------|
| `useReducedMotion` hook | 1 | Guards movement entrances |
| `initial` conditional | 4 | Card y+scale, checkmark scale, message y, bundle-pill scale → fall back to opacity-only fade |
| `role="status"` + `aria-live="polite"` + `aria-atomic="true"` | 1 element | Announces completion to screen readers |
| `aria-hidden="true"` | 2 icons + 1 emoji span | Suppresses decorative content from AT |
| `motion-reduce:animate-none` | 1 class | Suppresses `animate-pulse` for reduced-motion users |

**Owner must verify:**
- `npm run update` (type-check + build) — the `useReducedMotion` import and hook call must not break anything; the return type is `boolean | null` so the ternary works cleanly.
- Manual test: on a device with "Reduce Motion" enabled (iOS Settings → Accessibility → Motion → Reduce Motion, or Chrome DevTools → Rendering → prefers-reduced-motion: reduce), the overlay should appear with only opacity fades — no spring/scale/bounce.
- Screen reader test: VoiceOver or TalkBack should announce "Stop N Complete! Order picked up" (or "Delivered successfully") when the overlay appears, without reading "party popper" or the decorative arrow icon.

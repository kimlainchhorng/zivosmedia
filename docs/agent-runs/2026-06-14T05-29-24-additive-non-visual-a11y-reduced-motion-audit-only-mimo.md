# MiMo run — 2026-06-14T05:29:24.559Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual a11y + reduced-motion audit only, no layout/copy/logic change. MOUNTED /map Waze-style road-alert banner, auto-appears, one alert at a time (keyed AnimatePresence), thumbs-up CONFIRM + X DISMISS icon-only buttons, emoji badge, pagination dots. Concise verdict per point only, no diff: (1) emoji rendered as inline text span is decorative + redundant with the bold label - aria-hidden=true on emoji span? (2) two icon-only buttons need aria-labels (ThumbsUp='Confirm', X='Dismiss') + aria-hidden on inner glyphs; no t() so plain English. (3) reduced-motion useReducedMotion: GUARD keyed entrance initial (opacity+y:-20+scale:0.95); LEAVE exit; the buttons use CSS active:scale-90 (not framer-motion) leave; no infinite loops. (4) Live region: discrete auto-triggered road alert - ADD role=status aria-live=polite on the keyed motion.div? pagination dots aria-hidden? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/navigation/RoadAlertBanner.tsx

---

## Verdicts (concise)

1. **Emoji `aria-hidden`** — ✅ Correct. Emoji is purely decorative (label text already says "Police reported ahead" etc.). Add `aria-hidden="true"` to the `<span>`.

2. **Icon-only button labels** — ✅ Correct. Add `aria-label="Confirm"` / `aria-label="Dismiss"`, and `aria-hidden="true"` on the inner Lucide glyphs (Lucide doesn't guarantee `aria-hidden` across all versions; explicit is safer).

3. **Reduced motion** — ✅ Guard `initial` only (the entrance users see appearing unbidden). Leave `exit` (already leaving, less disruptive). CSS `active:scale-90` is user-initiated gesture — leave. No infinite loops.

4. **Live region** — ✅ Add `role="status" aria-live="polite"` on the keyed wrapper so the alert auto-announces. Pagination dots are decorative → `aria-hidden="true"`.

---

## Proposed change

**File:** `../zivodriver/src/components/navigation/RoadAlertBanner.tsx`

```diff
 import { useState, useEffect } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import { X, ThumbsUp } from "lucide-react";
 import { useHapticFeedback } from "@/hooks/useHapticFeedback";
+import { useReducedMotion } from "framer-motion";
```

Wait — `useReducedMotion` is already importable from `framer-motion` which is already imported. Cleaner to destructure from the existing import:

```diff
 import { useState, useEffect } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { X, ThumbsUp } from "lucide-react";
 import { useHapticFeedback } from "@/hooks/useHapticFeedback";
```

Inside the component body, add the hook:

```diff
 const RoadAlertBanner = ({ enabled = true }: RoadAlertBannerProps) => {
   const [alerts, setAlerts] = useState<RoadAlert[]>([]);
   const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
   const haptic = useHapticFeedback();
+  const reducedMotion = useReducedMotion();
```

The emoji span:

```diff
-          <span className="text-2xl">{config.emoji}</span>
+          <span className="text-2xl" aria-hidden="true">{config.emoji}</span>
```

The two icon-only buttons:

```diff
             <button
               onClick={confirmAlert}
+              aria-label="Confirm"
               className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center active:scale-90 transition-transform"
             >
-              <ThumbsUp className="w-3.5 h-3.5 text-success" />
+              <ThumbsUp className="w-3.5 h-3.5 text-success" aria-hidden="true" />
             </button>
             <button
               onClick={dismissAlert}
+              aria-label="Dismiss"
               className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center active:scale-90 transition-transform"
             >
-              <X className="w-3.5 h-3.5 text-muted-foreground" />
+              <X className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
             </button>
```

The live region on the keyed wrapper + reduced-motion guard on `initial`:

```diff
       <motion.div
         key={currentAlert.id}
-        initial={{ opacity: 0, y: -20, scale: 0.95 }}
+        role="status"
+        aria-live="polite"
+        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: -20, scale: 0.95 }}
         transition={{ type: "spring", stiffness: 350, damping: 30 }}
```

Pagination dots:

```diff
-          <div className="flex justify-center gap-1 pb-2">
+          <div className="flex justify-center gap-1 pb-2" aria-hidden="true">
```

---

## Summary of changes (all additive, zero logic/layout/copy)

| # | Change | Why |
|---|--------|-----|
| 1 | `aria-hidden="true"` on emoji `<span>` | Decorative; label already conveys meaning |
| 2 | `aria-label="Confirm"` / `"Dismiss"` on buttons; `aria-hidden="true"` on Lucide icons | Icon-only buttons need accessible names |
| 3 | `useReducedMotion()` → guard `initial` to opacity-only | Entrance animation is unbidden; exit left alone; CSS `active:scale` is gesture → leave |
| 4 | `role="status" aria-live="polite"` on wrapper; `aria-hidden="true"` on dots | Auto-triggered alert should announce; dots are decorative |

## Owner must verify

- **`npm run update`** — type-check + worker type-check + production build must pass (the `useReducedMotion` import is additive from an already-used package).
- **Screen reader test** — confirm the alert announces on appearance ("Police reported ahead, 0.5 mi, 3 min ago" via the `role="status"` live region) and that the Confirm/Dismiss buttons are announced by name.
- **Reduced motion** — toggle `prefers-reduced-motion: reduce` in DevTools; confirm the banner fades in (opacity only, no y/scale spring) and exits without transform jitter.
- This file lives in `zivodriver` (separate repo/app) — verify it's the right repo before applying.

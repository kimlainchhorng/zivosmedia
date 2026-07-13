# MiMo run — 2026-06-14T07:36:16.566Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File HAS framer-motion motion plus AnimatePresence and NO useTranslation there is NO back button on this page. Three motion.div: A the OfferCard outer card initial opacity 0 y 20 scale 0.95 animate opacity isExpired-conditional y 0 scale 1 exit opacity 0 x minus 100 scale 0.9 transition spring - guard initial reduceMotion ? false keep animate keep exit keep spring transition. B the countdown progress-bar motion.div initial width 100 percent animate width percentage transition duration 1 linear - this is a FUNCTIONAL data-driven width bar reflecting the live countdown seconds not a decorative entrance and the numeric seconds text already conveys time - QUESTION leave as-is or guard. Recommend LEAVE as-is. Confirm or correct. C the empty-state motion.div initial opacity 0 y 20 animate opacity 1 y 0 no exit no delay - guard initial reduceMotion ? false keep animate. useReducedMotion must be added in BOTH OfferCard and DriverOffers since each renders motion elements. Spinners append motion-reduce:animate-none to every animate-spin the full-screen Loader2 both button Loader2 and the conditional RefreshCw animate-spin inside its ternary. Icon-only RefreshCw refresh Button has title but no aria-label - add aria-label Check for new offers and RefreshCw aria-hidden true. aria-hidden true on decorative icons beside visible text Plane in Zivo Travel badge Clock beside timer both MapPin pickup and dropoff X beside Decline CheckCircle beside Accept Inbox empty state both button Loader2 full-screen Loader2. Headings h1 Job Offers then h2 No offers right now contiguous - NO change. AlertTriangle import appears unused - LEAVE imports alone. List exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Offers.tsx

---

## Plan

**One file:** `src/pages/driver/Offers.tsx` (in the `zivodriver` repo).

1. **Import `useReducedMotion`** from framer-motion (add to existing import line).
2. **Add `const prefersReducedMotion = useReducedMotion()`** in both `OfferCard` and `DriverOffers` (each renders motion elements).
3. **Guard motion A** (OfferCard outer `motion.div`): wrap `initial` — `initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.95 }}`. Keep animate/exit/transition unchanged.
4. **Motion B** (countdown progress bar): **LEAVE AS-IS** — it's a functional data-driven width bar reflecting live seconds; the numeric text already conveys time; reducing it would remove useful visual feedback, not decoration.
5. **Guard motion C** (empty-state `motion.div`): wrap `initial` — `initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}`. Keep animate unchanged.
6. **Spinners**: append `motion-reduce:animate-none` to every `animate-spin` (3 total: full-screen Loader2, Decline button Loader2, Accept button Loader2, plus the conditional RefreshCw).
7. **RefreshCw Button**: add `aria-label="Check for new offers"` (icon-only, has `title` but no accessible name).
8. **Decorative icons**: `aria-hidden="true"` on all 10 icons beside visible text or as pure decoration.

**B decision: LEAVE as-is.** The countdown bar is functional — it shows real-time time pressure to the driver. `useReducedMotion` should suppress entrance/exit flourishes, not data-viz feedback. The numeric `Xs` text already provides the same information in an accessible form, so the bar is supplementary, not essential. This matches the pattern of leaving functional/data-driven motion unguarded.

---

## Proposed diff

**File:** `src/pages/driver/Offers.tsx`

```diff
- import { motion, AnimatePresence } from "framer-motion";
+ import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
```

```diff
 }) {
   const seconds = useCountdown(offer.expires_at);
+  const prefersReducedMotion = useReducedMotion();
   const isExpired = seconds <= 0;
```

```diff
     <motion.div
       layout
-      initial={{ opacity: 0, y: 20, scale: 0.95 }}
+      initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.95 }}
       animate={{ opacity: isExpired ? 0.5 : 1, y: 0, scale: 1 }}
       exit={{ opacity: 0, x: -100, scale: 0.9 }}
       transition={{ type: "spring", stiffness: 300, damping: 30 }}
```

```diff
-                  <Plane className="mr-1 h-3 w-3" />
+                  <Plane aria-hidden="true" className="mr-1 h-3

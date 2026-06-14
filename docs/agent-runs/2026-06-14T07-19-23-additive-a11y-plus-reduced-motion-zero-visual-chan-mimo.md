# MiMo run — 2026-06-14T07:19:23.157Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File HAS framer-motion (AnimatePresence and four motion.div) and NO useTranslation plain Back. Child IncentiveCard out of scope. Add useReducedMotion, const reduceMotion in DriverIncentives. Four motion.div: (1) summary card initial opacity 0 y minus 10 no transition - guard initial reduceMotion ? false keep animate. (2) active-quest map initial opacity 0 y 20 exit scale transition delay index times 0.05 - guard initial keep animate keep exit wrap transition reduceMotion ? undefined object. (3) empty-state PURE OPACITY no movement LEAVE UNGUARDED. (4) completed map initial opacity 0 height 0 exit height - guard initial keep animate keep exit. aria: icon-only ghost back Button aria-label Back. aria-hidden true on ArrowLeft Loader2 Gift Sparkles both Trophy ChevronUp ChevronDown. Loader2 animate-spin append motion-reduce:animate-none. Refresh Button and Completed trigger have visible text NO aria-label just aria-hidden icons. Headings fine no change. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Incentives.tsx

---

## Plan

1. **Import** `useReducedMotion` from `framer-motion` (line 6).
2. **Declare** `const reduceMotion = useReducedMotion();` after existing hooks (~line 24).
3. **Guard motion.div (1)** (summary card) — `initial={reduceMotion ? false : { opacity: 0, y: -10 }}`, keep `animate`.
4. **Guard motion.div (2)** (active quest map) — `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`, keep `animate`, keep `exit`, `transition={reduceMotion ? undefined : { delay: index * 0.05 }}`.
5. **Leave motion.div (3)** (empty state — pure opacity, no movement) **completely unguarded**.
6. **Guard motion.div (4)** (completed map) — `initial={reduceMotion ? false : { opacity: 0, height: 0 }}`, keep `animate`, keep `exit`.
7. **aria-label="Back"** on the ghost icon-only back Button.
8. **aria-hidden="true"** on all 8 decorative icons: ArrowLeft, Loader2, Gift, Sparkles, Trophy (×2), ChevronUp, ChevronDown.
9. **motion-reduce:animate-none** appended to Loader2's `animate-spin` className.
10. Refresh Button + Completed CollapsibleTrigger have visible text — **no** aria-label, just aria-hidden on their child icons.

---

## Proposed diff — `src/pages/driver/Incentives.tsx`

> (file path per the context provided; adjust to the actual monorepo location if different)

```diff
--- a/src/pages/driver/Incentives.tsx
+++ b/src/pages/driver/Incentives.tsx
@@ -6,7 +6,7 @@
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
-import { motion, AnimatePresence } from "framer-motion";
+

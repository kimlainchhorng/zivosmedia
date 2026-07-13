# MiMo run — 2026-06-14T09:36:05.841Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on DriverWaitlist a post-onboarding status screen. File imports framer-motion motion and HAS useTranslation so labels use t key fallback. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory. TWO perpetual background accent motion.div one animate scale 1 1.2 1 transition repeat Infinity duration 8 one animate scale 1.1 1 1.1 transition repeat Infinity duration 10 these are PERPETUAL LOOPS guard BOTH animate and transition to undefined under reduceMotion. The main card motion.div initial opacity 0 y 30 animate opacity 1 y 0 transition duration 0.6 SPATIAL guard initial to false under reduceMotion. The logo motion.div initial scale 0 animate scale 1 transition spring delay 0.2 scale entrance is spatial guard initial to false under reduceMotion. The animated clock motion.div animate scale 1 1.05 1 transition repeat Infinity duration 3 PERPETUAL LOOP guard BOTH animate and transition to undefined. The status step motion.div in a steps map initial opacity 0 x minus 20 animate opacity 1 x 0 transition delay 0.4 plus i times 0.15 SPATIAL staggered guard initial to false and guard delay to reduceMotion ternary 0 colon original. The footer motion.p initial opacity 0 animate opacity 1 transition delay 1 PURE OPACITY ONLY leave UNGUARDED. The loading state Clock with class animate-spin is a standalone full screen spinner with NO adjacent text add role status plus aria-label Loading plus append motion-reduce:animate-none. Decorative icons aria-hidden the warning circle Clock inside the animated circle the each step item.icon beside its label text and the Home icon inside the Go to Home Button which has text. Logo img already has alt ZIVO leave. h1 is the lone heading leave. The driver as any casts are pre-existing leave untouched. Root is min-h-screen flex flex-col p-6 normal flow no safe-area change. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Waitlist.tsx

---

<details>
<summary>Plan (short)</summary>

1. **Import** `useReducedMotion` from `framer-motion` and add `const reduceMotion = useReducedMotion()` in the component body.
2. **Three perpetual loops** (2 background accents + animated clock): guard both `animate` and `transition` to `undefined` under `reduceMotion`.
3. **Two spatial entrances** (main card + logo): guard `initial` to `false` under `reduceMotion`.
4. **Staggered spatial** (status steps): guard `initial` to `false`, guard `delay` to `reduceMotion ? 0 : original`.
5. **Footer `motion.p`** (pure opacity): leave **unguarded**.
6. **Loading Clock spinner**: add `role="status"` + `aria-label="Loading"` + append `motion-reduce:animate-none` to className.
7. **Decorative icons** → `aria-hidden="true"`: the warning Clock inside the animated circle, each `item.icon` in steps, the Home icon inside the Go-to-Home button.
8. **Leave alone**: logo `alt="ZIVO"`, `h1`, `(driver as any)` casts, root className, footer `motion.p`.
</details>

---

**Proposed diff — `../zivodriver/src/pages/driver/Waitlist.tsx`**

```diff
--- a/src/pages/driver/Waitlist.tsx
+++ b/src/pages/driver/Waitlist.tsx
@@ -6,7 +6,7 @@
 import { useEffect } from "react";
 import { useNavigate } from "react-router-dom";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { Clock, CheckCircle2, Bell, Shield, Home } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useAuth } from "@/contexts/AuthContext";
@@ -23,6 +23,7 @@
   const { t } = useTranslation();
   const { language, setLanguage } = useLocale();
+  const reduceMotion = useReducedMotion();

   // Auto-set language based on driver country
   useEffect(() => {
@@ -49,7 +50,7 @@
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
-        <Clock className="w-8 h-8 animate-spin text-primary" />
+        <Clock className="w-8 h-8 animate-spin motion-reduce:animate-none text-primary" role="status" aria

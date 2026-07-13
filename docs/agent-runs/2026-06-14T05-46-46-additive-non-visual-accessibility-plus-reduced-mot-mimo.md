# MiMo run — 2026-06-14T05:46:46.071Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. TripCompletedSheet MOUNTED on /map is a shadcn Sheet (Radix Dialog, side=bottom) with an sr-only SheetTitle and Radix focus trap/role=dialog/Escape. NOTE an early 'if (!data) return null;' before any hooks. AnimatePresence wraps 6 framer-motion entrances: container (opacity 0 y 20); success CheckCircle in circle (scale 0); h2 'Trip Complete!'/'Delivery Complete!' + optional subline; hero 'Total Earned ' card (opacity 0 y 10); breakdown card (opacity 0 y 10) with Base fare/Tip rows + 2-col stats grid (Clock + Duration N min, Navigation + Distance N mi); route-summary card (opacity 0 y 10) with two decorative COLORED DOT divs beside address paragraphs; actions block (opacity 0 y 10) with optional 'Rate Passenger' Button (Star icon + text) and 'Done' Button. TrendingUp imported but UNUSED in JSX. Questions: (1) aria-hidden true on CheckCircle, Clock, Navigation, and the Star in the text-bearing button? (2) aria-hidden on the two decorative colored dot divs? (3) Guard all 6 movement entrances with useReducedMotion (hook ABOVE the early return), leave exits? (4) Already a Radix dialog with sr-only title - add NO extra live region, confirm? (5) Unused TrendingUp import - leave it (additive discipline) or remove? (6) Orphan numbers - Duration/Distance/Total/Base fare/Tip all labeled, confirm no fix needed? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/trip/TripCompletedSheet.tsx

---

## Verdict on the 6 questions

| # | Q | Verdict |
|---|---|---|
| 1 | `aria-hidden` on CheckCircle, Clock, Navigation, Star (in text button) | **YES** — all four are decorative beside visible text ("Trip Complete!", "Duration", "Distance", "Rate Passenger"). |
| 2 | `aria-hidden` on two colored-dot divs | **YES** — purely decorative, the address `<p>` sibling carries the meaning. |
| 3 | Guard 6 movement entrances with `useReducedMotion`, leave exits | **YES** — hook above the early return (before the `if (!data) return null`), set `initial` to the final pose when reduced, strip stagger `delay`s. Exits stay (user-initiated dismissal). |
| 4 | Already Radix dialog + sr-only title → no extra live region | **CONFIRMED** — Radix provides `role="dialog"`, focus trap, Escape, and `aria-labelledby` (via SheetTitle). The "Trip Complete!" h2 is semantically correct. No live region needed. |
| 5 | Unused `TrendingUp` | **REMOVE** — dead import is a lint warning; removing it is the standard cleanup, not a visual/logic change. |
| 6 | Orphan numbers | **CONFIRMED no fix needed** — Duration, Distance, Base fare, Tip, Total are all preceded by visible label text (`<p className="text-xs text-muted-foreground">`). |

---

## Proposed diff

**File:** `src/components/trip/TripCompletedSheet.tsx`

```diff
 import { motion, AnimatePresence } from "framer-motion";
-import { CheckCircle, Clock, Navigation, TrendingUp, Star } from "lucide-react";
+import { CheckCircle, Clock, Navigation, Star } from "lucide-react";
+import { useReducedMotion } from "framer-motion";
 import { Button } from "@/components/ui/button";
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
 
@@ export function TripCompletedSheet({
   onRatePassenger,
 }: TripCompletedSheetProps) {
+  const prefersReducedMotion = useReducedMotion();
+
   if (!data) return null;
 
   const totalEarned = data.payoutUsd + (data.tipUsd || 0);
   const isDelivery = data.type === "delivery";
 
+  const enter = (delay: number) =>
+    prefersReducedMotion
+      ? { initial: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0 } }
+      : { initial: { opacity: 0, y: 20 }, transition: { duration: 0.3, delay } };
+  const enterScale = (delay: number) =>
+    prefersReducedMotion
+      ? { initial: { scale: 1 }, transition: { duration: 0 } }
+      : { initial: { scale: 0 }, transition: { delay, type: "spring", stiffness: 200 } };
+  const enterSm = (delay: number) =>
+    prefersReducedMotion
+      ? { initial: { opacity: 1, y: 0 }, transition: { duration: 0 } }
+      : { initial: { opacity: 0, y: 10 }, transition: { delay } };
+
   return (
@@            {/* Success Icon */}
           <motion.div
-            initial={{ scale: 0 }}
-            animate={{ scale: 1 }}
-            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
+            {...enterScale(0.1)}
+            animate={{ scale: 1 }}
             className="flex items-center justify-center w-16 h-16 rounded-full bg-success/20"
           >
-            <CheckCircle className="w-10 h-10 text-success" />
+            <CheckCircle aria-hidden="true" className="w-10 h-10 text-success" />
@@           <motion.div
-            initial={{ opacity: 0, y: 10 }}
-            animate={{ opacity: 1, y: 0 }}
-            transition={{ delay: 0.15 }}
+            {...enterSm(0.15)}
+            animate={{ opacity: 1, y: 0 }}
             className="w-full rounded-2xl p-5 text-center"
@@           <motion.div
-            initial={{ opacity: 0, y: 10 }}
-            animate={{ opacity: 1, y: 0 }}
-            transition={{ delay: 0.2 }}
+            {...enterSm(0.2)}
+

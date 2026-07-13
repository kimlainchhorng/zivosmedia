# DeepSeek run — 2026-06-14T05:46:02.094Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is TripCompletedSheet, MOUNTED on /map. It is a shadcn Sheet (Radix Dialog, side=bottom) that already has an sr-only SheetTitle ('Delivery Complete'/'Trip Complete') plus Radix focus trap, role=dialog, aria-modal, Escape. NOTE there is an early 'if (!data) return null;' near the top before any hooks. Inside an AnimatePresence is a column of 6 framer-motion entrances: container (initial opacity 0 y 20); a success CheckCircle in a circle (initial scale 0); an h2 'Trip Complete!'/'Delivery Complete!' with optional 'Dropped off {name}' subline; a hero 'Total Earned ' card (initial opacity 0 y 10); a breakdown card (initial opacity 0 y 10) with Base fare / optional Tip rows and a 2-col trip-stats grid (a Clock icon + Duration N min, a Navigation icon + Distance N mi); a route-summary card (initial opacity 0 y 10) with two small COLORED DOT divs (primary, destructive - purely decorative pickup/dropoff markers) each beside a truncated address paragraph; and an actions block (initial opacity 0 y 10) with an optional outline 'Rate Passenger' Button (has a Star icon + visible text) and a 'Done' Button. ALSO: TrendingUp is imported from lucide-react but appears UNUSED in the JSX. Questions: (1) aria-hidden true on the decorative icons CheckCircle, Clock, Navigation, and the Star inside the text-bearing Rate Passenger button? (2) Should the two purely-decorative colored dot divs in the route summary get aria-hidden true (they are empty styling divs)? (3) Reduced-motion: guard all 6 movement entrances (y-translates + success-icon scale) with useReducedMotion so initial becomes false, placing the hook ABOVE the early return to respect rules-of-hooks, leaving exits unguarded? (4) Since it is already a Radix dialog with focus trap + sr-only title, add NO extra live region - confirm? (5) The unused TrendingUp import - should I leave it untouched (purely-additive discipline) or is removing it in-scope? (6) Orphan numbers: Duration/Distance/Total Earned/Base fare/Tip all have adjacent text labels - confirm no sr-only number fix needed? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/trip/TripCompletedSheet.tsx

---

## Plan

1. **`aria-hidden` on decorative icons** — `CheckCircle`, `Clock`, `Navigation` are purely decorative (adjacent text labels exist). The `Star` inside the "Rate Passenger" button is decorative (button has visible text). Add `aria-hidden="true"` to all four.
2. **`aria-hidden` on colored dot divs** — The two empty `div` elements (`bg-primary` pickup, `bg-destructive` dropoff) are purely decorative markers. Add `aria-hidden="true"`.
3. **Reduced-motion guard** — Add `useReducedMotion()` hook ABOVE the early return (rules-of-hooks). For all 6 `motion.div` entrances, set `initial` to `false` when reduced motion is preferred (leaving `animate` and `exit` as-is so content still appears/disappears, just without movement).
4. **No extra live region** — Confirmed. Radix dialog + sr-only title + focus trap is sufficient.
5. **Unused `TrendingUp` import** — Leave untouched. Purely-additive discipline; removing it is a logic change (import cleanup) and out of scope.
6. **Orphan numbers** — All numeric values have adjacent visible text labels ("Duration", "Distance", "Total Earned", "Base fare", "Tip"). No `sr-only` fix needed.

## Diff

```diff
--- a/zivodriver/src/components/trip/TripCompletedSheet.tsx
+++ b/zivodriver/src/components/trip/TripCompletedSheet.tsx
@@ -1,6 +1,7 @@
 import { motion, AnimatePresence } from "framer-motion";
 import { CheckCircle, Clock, Navigation, TrendingUp, Star } from "lucide-react";
 import { Button } from "@/components/ui/button";
+import { useReducedMotion } from "framer-motion";
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

 export interface TripCompletionData {
@@ -24,6 +25,8 @@ export function TripCompletedSheet({
   onRatePassenger,
 }: TripCompletedSheetProps) {
+  const prefersReducedMotion = useReducedMotion();
+
   if (!data) return null;

   const totalEarned = data.payoutUsd + (data.tipUsd || 0);
@@ -53,7 +56,7 @@ export function TripCompletedSheet({
             <motion.div
-              initial={{ opacity: 0, y: 20 }}
+              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               transition={{ duration: 0.3 }}
@@ -63,7 +66,7 @@ export function TripCompletedSheet({
               {/* Success Icon */}
               <motion.div
-                initial={{ scale: 0 }}
+                initial={prefersReducedMotion ? false : { scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                 className="flex items-center justify-center w-16 h-16 rounded-full bg-success/20"
@@ -71,7 +74,7 @@ export function TripCompletedSheet({
                 <CheckCircle
                   className="w-10 h-10 text-success"
+                  aria-hidden="true"
                 />
               </motion.div>

@@ -89,7 +92,7 @@ export function TripCompletedSheet({
               {/* Total Earnings - hero card */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.15 }}
                 className="w-full rounded-2xl p-5 text-center"
@@ -108,7 +111,7 @@ export function TripCompletedSheet({
               {/* Breakdown */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="w-full rounded-2xl p-4 space-y-3"
@@ -127,7 +130,7 @@ export function TripCompletedSheet({
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
-                      <Clock className="w-4 h-4 text-muted-foreground" />
+                      <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                     </div>
                     <div>
                       <p className="text-xs text-muted-foreground">Duration</p>
@@ -139,7 +142,7 @@ export function TripCompletedSheet({
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
-                      <Navigation className="w-4 h-4 text-muted-foreground" />
+                      <Navigation className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                     </div>
                     <div>
                       <p className="text-xs text-muted-foreground">Distance</p>
@@ -155,7 +158,7 @@ export function TripCompletedSheet({
               {/* Route summary */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.25 }}
                 className="w-full rounded-2xl p-4 space-y-2"
@@ -164,11 +167,11 @@ export function TripCompletedSheet({
               >
                 <div className="flex items-start gap-2">
-                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
+                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 shrink-0" aria-hidden="true" />
                   <p className="text-xs text-muted-foreground truncate">{data.pickupAddress}</p>
                 </div>
                 <div className="flex items-start gap-2">
-                  <div className="w-2.5 h-2.5 rounded-full bg-destructive mt-1.5 shrink-0" />
+                  <div className="w-2.5 h-2.5 rounded-full bg-destructive mt-1.5 shrink-0" aria-hidden="true" />
                   <p className="text-xs text-muted-foreground truncate">{data.dropoffAddress}</p>
                 </div>
               </motion.div>
@@ -176,7 +179,7 @@ export function TripCompletedSheet({
               {/* Actions */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 }}
                 className="w-full space-y-2 pt-1"
@@ -187,6 +190,7 @@ export function TripCompletedSheet({
                     className="w-full h-12 text-base gap-2"
                     size="lg"
                   >
-                    <Star className="w-4 h-4" />
+                    <Star className="w-4 h-4" aria-hidden="true" />
                     Rate Passenger
                   </Button>
                 )}
```

## Owner verification

- **File:** `zivodriver/src/components/trip/TripCompletedSheet.tsx`
- **Verify:** `npm run update` passes (type-check + build)
- **Preview:** Open the sheet on `/map` after a trip completes — verify content appears immediately when reduced motion is enabled (OS accessibility setting), and with the normal entrance animations when not.
- **Note:** The `useReducedMotion` import is from `framer-motion` (same package already imported). The `TrendingUp` import remains untouched per additive discipline.

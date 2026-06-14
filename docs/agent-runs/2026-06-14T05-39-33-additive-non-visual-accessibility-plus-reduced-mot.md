# DeepSeek run — 2026-06-14T05:39:33.589Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is StopCompletionOverlay, MOUNTED on /map. It is a transient full-screen completion celebration overlay (frosted backdrop + centered card, NO interactive buttons, auto-dismisses) shown when a driver completes a stop on a multi-stop bundle. Content: a success Check icon in a glowing circle, an h2 'Stop N Complete!', a subline 'Order picked up' or 'Delivered successfully', then either a 'Moving to stop N+1 of M' pill with an ArrowRight icon that has Tailwind animate-pulse, OR a '🎉 Bundle Complete!' pill (emoji is inline in the text). framer-motion entrances: backdrop opacity fade; card initial y 30 scale 0.9; checkmark initial scale 0; message initial opacity 0 y 10; next-stop pill initial opacity 0; bundle pill initial opacity 0 scale 0.8. All have exits or are static. Questions: (1) aria-hidden true on the Check and ArrowRight icons (decorative, redundant with text)? (2) The inline 🎉 emoji in '🎉 Bundle Complete!' - wrap it in a span with aria-hidden true so screen readers do not announce 'party popper'? (3) The ArrowRight has Tailwind animate-pulse (infinite) - add motion-reduce:animate-none? (4) Reduced-motion: guard the MOVEMENT entrances (card y+scale, checkmark scale, message y, bundle-pill scale) with useReducedMotion so initial becomes false, while LEAVING the pure-opacity fades (backdrop, next-stop pill) and the exits unguarded? (5) Live region: this overlay announces a discrete completion the driver did trigger but the celebration appears automatically - add role=status aria-live=polite (on the card) so a screen reader announces 'Stop N Complete, Delivered successfully, Moving to stop N+1 of M'? Or is role=status wrong for a transient no-button overlay? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/navigation/StopCompletionOverlay.tsx

---

## Plan

This is a pure accessibility + reduced-motion audit of `StopCompletionOverlay.tsx`. No layout, copy, routing, styling, or logic changes.

### Verdict per question:

1. **`aria-hidden="true"` on Check and ArrowRight icons** — ✅ **YES**. Both are decorative (the Check is redundant with the "Stop N Complete!" heading; the ArrowRight is redundant with the "Moving to stop N+1 of M" text). Add `aria-hidden="true"` to both `<Check>` and `<ArrowRight>`.

2. **Wrap 🎉 emoji in `<span aria-hidden="true">`** — ✅ **YES**. The inline emoji in "🎉 Bundle Complete!" would be announced as "party popper" by screen readers. Wrap it in `<span aria-hidden="true">` so the text reads as "Bundle Complete!" only.

3. **`motion-reduce:animate-none` on ArrowRight's `animate-pulse`** — ✅ **YES**. The infinite `animate-pulse` on ArrowRight violates reduced-motion preferences. Add `className="w-4 h-4 animate-pulse motion-reduce:animate-none"`.

4. **Guard MOVEMENT entrances with `useReducedMotion`** — ✅ **YES**. The four movement-based `initial` values (card `y: 30, scale: 0.9`, checkmark `scale: 0`, message `y: 10`, bundle-pill `scale: 0.8`) should become `false` when reduced motion is preferred. Pure-opacity fades (backdrop, next-stop pill) and all `exit` animations should remain unguarded (fades are acceptable under reduced motion; exits are transient and brief).

5. **`role="status" aria-live="polite"` on the card** — ✅ **YES**. This is a discrete, auto-appearing completion announcement triggered by the driver's action. `role="status"` with `aria-live="polite"` is correct for a transient overlay that announces itself without requiring user interaction. Place it on the inner `motion.div` (the card container) so the announcement fires when the overlay appears.

---

## Proposed Change

**File:** `src/components/navigation/StopCompletionOverlay.tsx`

```diff
 import { motion, AnimatePresence } from "framer-motion";
 import { Check, ArrowRight } from "lucide-react";
+import { useReducedMotion } from "framer-motion";

 interface StopCompletionOverlayProps {
   isVisible: boolean;
   stopNumber: number | null;
   totalStops: number;
   isLastStop: boolean;
   stopType?: "pickup" | "dropoff";
 }

 export function StopCompletionOverlay({
   isVisible,
   stopNumber,
   totalStops,
   isLastStop,
   stopType = "dropoff",
 }: StopCompletionOverlayProps) {
+  const prefersReducedMotion = useReducedMotion();
+
   return (
     <AnimatePresence>
       {isVisible && stopNumber !== null && (
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.25 }}
           className="fixed inset-0 z-[3000] flex items-center justify-center"
           style={{
             background: "hsl(var(--background) / 0.85)",
             backdropFilter: "saturate(180%) blur(24px)",
             WebkitBackdropFilter: "saturate(180%) blur(24px)",
           }}
         >
           <motion.div
-            initial={{ y: 30, scale: 0.9 }}
+            initial={prefersReducedMotion ? false : { y: 30, scale: 0.9 }}
             animate={{ y: 0, scale: 1 }}
             exit={{ y: -20, scale: 0.95 }}
             transition={{ type: "spring", stiffness: 300, damping: 25 }}
-            className="flex flex-col items-center gap-5 p-8"
+            className="flex flex-col items-center gap-5 p-8"
+            role="status"
+            aria-live="polite"
           >
             {/* Success checkmark */}
             <motion.div
-              initial={{ scale: 0 }}
+              initial={prefersReducedMotion ? false : { scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
               className="w-20 h-20 rounded-full flex items-center justify-center"
               style={{
                 background: "hsl(var(--success) / 0.15)",
                 boxShadow: "0 0 40px hsl(var(--success) / 0.2)",
               }}
             >
-              <Check className="w-10 h-10 text-success" strokeWidth={3} />
+              <Check className="w-10 h-10 text-success" strokeWidth={3} aria-hidden="true" />
             </motion.div>

             {/* Stop complete message */}
             <motion.div
-              initial={{ opacity: 0, y: 10 }}
+              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
               className="text-center"
             >
               <h2 className="text-[26px] font-bold text-foreground mb-1 tracking-tight">
                 Stop {stopNumber} Complete!
               </h2>
               <p className="text-[15px] text-muted-foreground">
                 {stopType === "pickup" ? "Order picked up" : "Delivered successfully"}
               </p>
             </motion.div>

             {/* Next stop indicator */}
             {!isLastStop && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.5 }}
                 className="flex items-center gap-2 text-primary mt-2 px-4 py-2 rounded-full bg-primary/10"
               >
                 <span className="text-[13px] font-semibold">
                   Moving to stop {stopNumber + 1} of {totalStops}
                 </span>
-                <ArrowRight className="w-4 h-4 animate-pulse" />
+                <ArrowRight className="w-4 h-4 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
               </motion.div>
             )}

             {/* Bundle complete */}
             {isLastStop && (
               <motion.div
-                initial={{ opacity: 0, scale: 0.8 }}
+                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                 className="flex items-center gap-2 text-success mt-2 px-4 py-2 rounded-full bg-success/10"
               >
-                <span className="text-[13px] font-semibold">
-                  🎉 Bundle Complete!
+                <span className="text-[13px] font-semibold">
+                  <span aria-hidden="true">🎉</span> Bundle Complete!
                 </span>
               </motion.div>
             )}
           </motion.div>
         </motion.div>
       )}
     </AnimatePresence>
   );
 }

 export default StopCompletionOverlay;
```

---

## Owner Verification

1. **Run `npm run update`** — must pass (type-check + build). The `useReducedMotion` hook is from `framer-motion` (already a dependency), so no new packages.
2. **Preview the overlay** — trigger a stop completion on the `/map` route. Verify:
   - With reduced motion OFF: all entrances animate as before (card lifts + scales, checkmark scales in, message fades up, bundle pill scales in).
   - With reduced motion ON (OS setting or `prefers-reduced-motion: reduce`): card appears immediately at full size, checkmark appears immediately, message fades in (no y movement), bundle pill fades in (no scale). The ArrowRight pulse is disabled.
   - Screen reader: when overlay appears, it announces "Stop N Complete! Delivered successfully" (or "Order picked up") via the live region. The Check icon, ArrowRight icon, and 🎉 emoji are not announced.
3. **No regressions** — the overlay auto-dismisses as before; no layout, copy, or logic changes.

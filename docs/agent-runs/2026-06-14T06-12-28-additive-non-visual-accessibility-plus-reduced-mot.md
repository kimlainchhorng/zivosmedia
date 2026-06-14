# DeepSeek run — 2026-06-14T06:12:28.709Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit ONLY. No layout, copy, routing, styling, or logic change. This is MultiStopRouteView, MOUNTED on /map (Map.tsx 1593, shown when showRouteOverview and hasBundledDelivery). It is a CUSTOM full-screen overlay: a single entrance motion.div with initial opacity 0 y 20, animate opacity 1 y 0, exit opacity 0 y 20, className fixed inset-0 z-2000 bg-background flex flex-col. NOT a Radix Dialog and NOT a shadcn Sheet, so NO role=dialog, NO focus trap, NO accessible name, NO Escape. Hooks useState/useMemo/useCallback, NO early return. The file imports NO t() (all copy is hardcoded English). It does NOT import useReducedMotion. Structure: a Header row with an icon-only shadcn Button variant ghost size icon onClick onClose containing ONLY an ArrowLeft icon (no accessible name), an h1 Route Overview + a p N stops, P pickups, D dropoffs, and a right-aligned earnings block (a p with totalEarnings dollar value + either a p incl +bonus or a p total); a ScrollArea listing StopCard children (out of scope, own file) each fed an eta and distance; a Footer with a MultiStopProgress child (out of scope) and EITHER an all-complete state (a div with a decorative Check icon + span All Stops Complete!) OR a full-width primary Button onClick onStartNavigation containing a Navigation icon + visible text (Return to Navigation, or Navigate to Stop N). Concise verdict per point: (1) Which icons need aria-hidden true? My list: the ArrowLeft inside the icon-only back Button (decorative once the button gets an aria-label), the Check beside All Stops Complete! (decorative, text present), and the Navigation inside the Navigate Button (decorative, visible text present). Confirm or correct. (2) The icon-only back Button (only an ArrowLeft, onClick onClose) needs aria-label - recommend Back (plain English, file has no t()). Agree on text? (3) Reduced-motion: file has NO useReducedMotion. Guard the single entrance movement (initial opacity 0 y 20) with the useReducedMotion idiom (set y to 0 when reduced, keep opacity) and LEAVE the exit unguarded. Confirm. (4) This is a CUSTOM modal overlay with no role=dialog / focus trap / accessible name / Escape - DEFER the dialog semantics + focus trap to a dedicated custom-modal slice (needs focus wiring), or in scope? Recommend with one line. (5) Orphan numbers: the earnings dollar values have adjacent total/bonus text; the per-stop eta/distance are passed as props into StopCard children (their own file). Anything here need an sr-only label or is it all adequately labeled / child-owned? (6) The Navigate Button label changes between Return to Navigation and Navigate to Stop N - is that fine as-is for AT (it is visible button text), no extra aria needed? (7) The component imports Route from lucide-react but appears NOT to use it in JSX - confirm whether it is an unused import; if so, recommend LEAVE it (pre-existing, out of additive a11y scope) vs remove. Tight additive-only verdict.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/navigation/MultiStopRouteView.tsx

---

## Plan

Additive non-visual accessibility + reduced-motion audit for `MultiStopRouteView.tsx`. No layout, copy, routing, styling, or logic changes. 7 points to address.

## Proposed Changes

File: `src/components/navigation/MultiStopRouteView.tsx`

### Changes:

1. **Add `useReducedMotion` import** (from `framer-motion`)
2. **Guard entrance motion** — set `y: 0` when reduced motion is preferred
3. **Add `aria-hidden="true"`** to the 3 decorative icons
4. **Add `aria-label="Back"`** to the icon-only back button
5. **Leave everything else untouched** — no dialog semantics, no focus trap, no import removal

### Diff

```diff
--- a/src/components/navigation/MultiStopRouteView.tsx
+++ b/src/components/navigation/MultiStopRouteView.tsx
@@ -1,7 +1,7 @@
 import { useState, useMemo, useCallback } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Navigation, Route, Check } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import StopCard from "./StopCard";
@@ -44,6 +44,8 @@ export function MultiStopRouteView({
   isNavigating = false,
 }: MultiStopRouteViewProps) {
+  const prefersReducedMotion = useReducedMotion();
+
   const currentStopIndex = currentStop 
     ? stops.findIndex(s => s.id === currentStop.id)
     : -1;
@@ -103,7 +105,7 @@ export function MultiStopRouteView({
   return (
     <motion.div
-      initial={{ opacity: 0, y: 20 }}
+      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: 20 }}
       className="fixed inset-0 z-[2000] bg-background flex flex-col"
@@ -113,7 +115,7 @@ export function MultiStopRouteView({
       <div className="flex items-center justify-between p-4 border-b border-border">
         <div className="flex items-center gap-3">
-          <Button variant="ghost" size="icon" onClick={onClose}>
+          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back">
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
           <div>
@@ -155,7 +157,7 @@ export function MultiStopRouteView({
         {allComplete ? (
           <div className="flex items-center justify-center gap-2 py-4 text-success">
-            <Check className="w-6 h-6" />
+            <Check className="w-6 h-6" aria-hidden="true" />
             <span className="font-semibold text-lg">All Stops Complete!</span>
           </div>
         ) : (
@@ -163,7 +165,7 @@ export function MultiStopRouteView({
             onClick={onStartNavigation}
             className="w-full h-14 text-base font-semibold gap-2"
             size="lg"
           >
-            <Navigation className="w-5 h-5" />
+            <Navigation className="w-5 h-5" aria-hidden="true" />
             {isNavigating 
               ? "Return to Navigation" 
               : `Navigate to Stop ${currentStopIndex + 1}`
```

## Verdict per point

1. **Icons needing `aria-hidden="true"`** — ✅ Your list is correct: `ArrowLeft` (decorative once button gets `aria-label`), `Check` (decorative, adjacent text "All Stops Complete!"), `Navigation` (decorative, adjacent visible button text). Applied above.

2. **Back button `aria-label`** — ✅ `aria-label="Back"` is correct. Plain English, no `t()` needed, matches the icon's semantic meaning. Applied above.

3. **Reduced-motion guard** — ✅ Guard the `initial` `y: 20` with `prefersReducedMotion ? 0 : 20`. Leave `exit` unguarded (exit animations are brief and don't cause sustained motion). Leave `opacity` transitions untouched (fade is generally acceptable for reduced motion). Applied above.

4. **Dialog semantics** — **DEFER.** This is a custom modal overlay with no focus trap, no `role="dialog"`, no accessible name, no Escape handler. Adding proper dialog semantics requires focus management wiring (trap focus within the overlay, return focus on close, `aria-modal`, Escape handler). That's a dedicated task, not an additive a11y pass. Recommend: leave as-is for this slice.

5. **Orphan numbers** — ✅ All adequately labeled. Earnings have adjacent "total"/"incl. +$X bonus" text. Per-stop `eta`/`distance` are passed as props to `StopCard` (its own file, its own responsibility). No `sr-only` needed here.

6. **Navigate Button dynamic label** — ✅ Fine as-is. The visible button text changes between "Return to Navigation" and "Navigate to Stop N". Both are descriptive, the text is the label. No extra `aria-label` needed.

7. **Unused `Route` import** — **LEAVE IT.** The `Route` icon from `lucide-react` is imported but not used in JSX. Removing it is a cleanup task, not an additive a11y change. Out of scope for this slice. Pre-existing, leave untouched.

## Owner must verify

- Run `npm run update` to confirm type-check + build pass
- Preview the `/map` route with a bundled delivery to see the overlay
- The `useReducedMotion` hook returns `boolean | undefined` — the ternary `? 0 : 20` handles `undefined` correctly (falls to `20`, the default motion)

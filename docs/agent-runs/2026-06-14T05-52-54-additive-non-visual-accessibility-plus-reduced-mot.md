# DeepSeek run — 2026-06-14T05:52:54.078Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is FinalizeReceiptSheet, MOUNTED on /map. It is a shadcn Sheet (Radix Dialog, side=bottom) that already has an sr-only SheetTitle 'Trip Receipt' plus Radix focus trap, role=dialog, aria-modal, Escape. It has useState/useEffect hooks then an early 'if (!jobId) return null;' AFTER those hooks (so useReducedMotion can sit with the other hooks at top, before that return). Inside AnimatePresence mode=wait are three mutually-exclusive phases. Phase input: a motion.div (initial opacity 0 y 20) with a decorative Receipt icon in a circle, an h2 'Finalize Trip' + subline, two number Inputs each preceded by a label element (NOT htmlFor-linked) containing a small Navigation icon + 'Final Miles' and a Clock icon + 'Final Minutes', an optional error paragraph (text-destructive), a 'Generate Receipt' Button and a ghost 'Skip' Button. Phase loading: a motion.div (initial opacity 0 ONLY - pure fade) with a Loader2 spinner (Tailwind animate-spin) and 'Generating receipt...' text. Phase receipt: a motion.div (initial opacity 0 y 20) with a success CheckCircle (initial scale 0) in a circle, an h2 'Trip Receipt', a Total card with dollar amount + currency, a line-items card (label + dollar rows) with an optional Zap icon + 'Surge applied' row, and a 'Done' Button. Questions, concise verdict per point: (1) aria-hidden true on the decorative icons Receipt, Navigation, Clock, Loader2, CheckCircle, Zap? (2) The two label elements wrap text but are NOT associated to their Inputs via htmlFor/id - is adding htmlFor+id in-scope as additive a11y, or defer as a logic/markup change? (3) Reduced-motion: guard the movement entrances (phase-input y:20, phase-receipt y:20, success-icon scale:0) with useReducedMotion initial false, and LEAVE the loading phase initial opacity 0 (pure fade, non-vestibular) plus all exits unguarded - confirm? (4) Loader2 uses Tailwind animate-spin (infinite CSS keyframe) - add motion-reduce:animate-none so it freezes under prefers-reduced-motion while staying visible? (5) Since the phases swap dynamically inside a focus-trapped Radix dialog, should the loading/receipt transition and/or the error message get a polite role=status / assertive role=alert live region so a screen reader announces the state change, or does the Radix dialog already handle it - recommend the minimal correct choice? (6) Orphan numbers: Total, currency, line-item amounts, surge multiplier - all have adjacent text labels, confirm no sr-only fix needed?
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/trip/FinalizeReceiptSheet.tsx

---

# FinalizeReceiptSheet – Accessibility & Reduced Motion Audit

## Plan

1. **`aria-hidden` on decorative icons** – Add to Receipt, Navigation, Clock, Loader2, CheckCircle, Zap (all purely decorative, no semantic meaning)
2. **`htmlFor`/`id` for label→input association** – Defer (logic/markup change that could affect form behavior)
3. **Reduced-motion guards** – Add `useReducedMotion()` from framer-motion to conditionally set `initial` to `false` for y-movement entrances; leave loading phase (pure fade) and all exits unguarded
4. **Loader2 `animate-spin` freeze** – Add `motion-reduce:animate-none` class
5. **Live region for phase transitions** – Add `role="status"` with `aria-live="polite"` on the outer `motion.div` of each phase so screen readers announce state changes
6. **Orphan numbers** – All have adjacent text labels; no `sr-only` fix needed

## Proposed Diff

File: `../zivodriver/src/components/trip/FinalizeReceiptSheet.tsx`

```diff
 import { useState, useEffect } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { Receipt, Loader2, CheckCircle, Navigation, Clock, Zap } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
@@ -49,6 +49,9 @@ export function FinalizeReceiptSheet({
   const [receipt, setReceipt] = useState<ReceiptData | null>(null);
   const [error, setError] = useState<string | null>(null);

+  const prefersReducedMotion = useReducedMotion();
+  const noMotion = prefersReducedMotion ? false : undefined;
+
   // Reset state when sheet opens
   useEffect(() => {
     if (open && jobId) {
@@ -93,6 +96,7 @@ export function FinalizeReceiptSheet({
           {/* ── Phase 1: Input final miles & minutes ── */}
           {phase === "input" && (
             <motion.div
+              role="status"
               key="input"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
@@ -101,7 +105,7 @@ export function FinalizeReceiptSheet({
             >
               <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
-                <Receipt className="w-7 h-7 text-primary" />
+                <Receipt className="w-7 h-7 text-primary" aria-hidden="true" />
               </div>

               <div className="text-center">
@@ -115,7 +119,7 @@ export function FinalizeReceiptSheet({
                 <div>
                   <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
-                    <Navigation className="w-3.5 h-3.5" /> Final Miles
+                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" /> Final Miles
                   </label>
                   <Input
                     type="number"
@@ -130,7 +134,7 @@ export function FinalizeReceiptSheet({
                 <div>
                   <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1.5">
-                    <Clock className="w-3.5 h-3.5" /> Final Minutes
+                    <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Final Minutes
                   </label>
                   <Input
                     type="number"
@@ -160,6 +164,7 @@ export function FinalizeReceiptSheet({
           {phase === "loading" && (
             <motion.div
+              role="status"
               key="loading"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
@@ -167,7 +172,7 @@ export function FinalizeReceiptSheet({
               className="flex flex-col items-center gap-4 py-10"
             >
-              <Loader2 className="w-10 h-10 text-primary animate-spin" />
+              <Loader2 className="w-10 h-10 text-primary animate-spin motion-reduce:animate-none" aria-hidden="true" />
               <p className="text-sm text-muted-foreground">Generating receipt…</p>
             </motion.div>
           )}
@@ -177,6 +182,7 @@ export function FinalizeReceiptSheet({
           {phase === "receipt" && receipt && (
             <motion.div
+              role="status"
               key="receipt"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
@@ -188,7 +194,7 @@ export function FinalizeReceiptSheet({
                 transition={{ type: "spring", stiffness: 200 }}
                 className="flex items-center justify-center w-14 h-14 rounded-full bg-success/20"
               >
-                <CheckCircle className="w-8 h-8 text-success" />
+                <CheckCircle className="w-8 h-8 text-success" aria-hidden="true" />
               </motion.div>

               <div className="text-center">
@@ -233,7 +239,7 @@ export function FinalizeReceiptSheet({
                     <div className="flex justify-between items-center">
                       <span className="text-sm text-muted-foreground flex items-center gap-1">
-                        <Zap className="w-3.5 h-3.5 text-warning" /> Surge applied
+                        <Zap className="w-3.5 h-3.5 text-warning" aria-hidden="true" /> Surge applied
                       </span>
                       <span className="text-sm font-semibold text-warning">
                         {receipt.surge_multiplier}×
```

And for the reduced-motion guard on the two y-movement entrances:

```diff
               key="input"
-              initial={{ opacity: 0, y: 20 }}
+              initial={noMotion ?? { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
```

```diff
               key="receipt"
-              initial={{ opacity: 0, y: 20 }}
+              initial={noMotion ?? { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
```

And for the success icon scale:

```diff
               <motion.div
-                initial={{ scale: 0 }}
+                initial={noMotion ?? { scale: 0 }}
                 animate={{ scale: 1 }}
```

## Verdict per question

1. **`aria-hidden` on decorative icons** – ✅ YES. All 6 icons (Receipt, Navigation, Clock, Loader2, CheckCircle, Zap) are purely decorative (adjacent text conveys the meaning). Add `aria-hidden="true"`.

2. **`htmlFor`/`id` for label→input** – ❌ **Defer**. This is a markup/logic change that could affect form behavior. The labels visually precede their inputs and the inputs have placeholders, so screen readers will still pick up the inputs. A separate a11y pass should add proper associations.

3. **Reduced-motion guards** – ✅ Confirmed: guard the two `y: 20` entrances (phase-input, phase-receipt) and the success-icon `scale: 0` with `useReducedMotion()`. Leave the loading phase `initial={{ opacity: 0 }}` (pure fade, non-vestibular) and all `exit` animations unguarded.

4. **Loader2 `animate-spin`** – ✅ YES. Add `motion-reduce:animate-none` so the spinner freezes under `prefers-reduced-motion` while remaining visible (not hidden).

5. **Live region for phase transitions** – ✅ Add `role="status"` (with implicit `aria-live="polite"`) on each phase's outer `motion.div`. This is the minimal correct choice – it announces "Finalize Trip", "Generating receipt…", or "Trip Receipt" content when phases swap, without interrupting the user. The error message already has visible text inside the input phase; no separate `role="alert"` needed since it appears within the `role="status"` region.

6. **Orphan numbers** – ✅ All amounts (Total, currency, line-item amounts, surge multiplier) have adjacent visible text labels. No `sr-only` fix needed.

## Owner verification

- Run `npm run update` to confirm type-check + build pass
- Verify the `useReducedMotion` import doesn't conflict with existing framer-motion imports
- Confirm the `noMotion ?? { ... }` pattern works correctly (when `prefersReducedMotion` is `true`, `noMotion` is `false`, so `initial` becomes `false` – framer-motion treats `false` as "no initial animation")

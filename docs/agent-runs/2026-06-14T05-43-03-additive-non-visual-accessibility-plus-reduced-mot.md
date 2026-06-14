# DeepSeek run — 2026-06-14T05:43:03.976Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit only. No layout, copy, routing, styling, or logic change. This is RideCompletedSheet, MOUNTED on /map. It is a shadcn Sheet (Radix Dialog under the hood, side=bottom) that already has an sr-only SheetTitle 'Ride Complete' for its accessible name and Radix-provided focus trap, role=dialog, aria-modal, and Escape handling. Inside, an AnimatePresence wraps a column of 6 framer-motion entrances: container (initial opacity 0 y 20); a success CheckCircle icon in a circle (initial scale 0); an h2 'Ride Complete'; an earnings-breakdown card (initial opacity 0 y 10) with labeled rows (Passenger paid, ZIVO fee, Your earnings, optional Bonus zone) showing dollar amounts; a 'This Week' weekly-earnings card (initial opacity 0 y 10) with a TrendingUp icon; a guarantee message (initial opacity 0 y 10) with an Info icon + 'Drivers earn at least 80% of the passenger fare.'; and a Done Button (initial opacity 0 y 10). Questions: (1) aria-hidden true on the 3 decorative icons CheckCircle, TrendingUp, Info (each redundant with adjacent text)? (2) Reduced-motion: guard all 6 movement entrances (the y-translates and the success-icon scale 0) with useReducedMotion so initial becomes false, leaving the exits unguarded? (3) Since it is already a Radix dialog with a focus trap and sr-only title, do we need any role=status live region, or is the dialog focus-move announcement sufficient (i.e. add NOTHING extra)? (4) Anything else additive and non-visual worth doing (the dollar amounts all have adjacent text labels so no orphan numbers - confirm)? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/ride/RideCompletedSheet.tsx

---

## Verdict per point

**(1) `aria-hidden="true"` on decorative icons** — **YES, add to all 3**: `CheckCircle`, `TrendingUp`, `Info`. Each is purely decorative (adjacent text already conveys the meaning: "Ride Complete", "This Week", the guarantee message). Screen readers would otherwise announce "check circle", "trending up", "info" redundantly.

**(2) Reduced-motion guard on entrances** — **YES, guard all 6 movement entrances** with `useReducedMotion()` so `initial` becomes `false` when reduced motion is preferred. This preserves the exit animations (they're brief and don't cause layout shift). The success icon's `scale: 0` initial is also a movement — guard it too.

**(3) `role="status"` live region** — **NO, add nothing extra**. The Radix Dialog already provides focus trap + `aria-modal` + `role="dialog"`. When the sheet opens, focus moves into the dialog and the `sr-only` `SheetTitle` "Ride Complete" is announced. That's sufficient for this pattern — the user is already looking at the earnings breakdown. A live region would double-announce.

**(4) Anything else additive/non-visual** — **Dollar amounts are fine** (all have adjacent text labels: "Passenger paid", "ZIVO fee", "Your earnings", "Bonus zone", "This Week"). No orphan numbers. The `commissionPercent` is also labeled ("ZIVO fee (25%)"). **One small improvement**: the `h2` "Ride Complete" duplicates the `sr-only` `SheetTitle` — but this is intentional (visual heading + accessible name). Leave as-is.

---

## Plan

1. Import `useReducedMotion` from `framer-motion`
2. Call `const shouldReduceMotion = useReducedMotion()` at top of component
3. Add `aria-hidden="true"` to all 3 decorative icons
4. Guard all 6 `motion.*` `initial` props: `initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}` (or `scale: 0` for the icon)

---

## Diff

File: `../zivodriver/src/components/ride/RideCompletedSheet.tsx`

```diff
 import { motion, AnimatePresence } from "framer-motion";
 import { CheckCircle, TrendingUp, Info } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
 import { useWeeklyRideEarnings } from "@/hooks/useWeeklyRideEarnings";
+import { useReducedMotion } from "framer-motion";

 export interface RideEarnings {
   price: number;
   commission: number;
   driverEarning: number;
   bonusAmount?: number;
   totalEarning: number;
 }

 export const RideCompletedSheet = ({
   open,
   onClose,
   earnings,
 }: RideCompletedSheetProps) => {
   const { weeklyTotal, isLoading: weeklyLoading } = useWeeklyRideEarnings();
+  const shouldReduceMotion = useReducedMotion();

   // Calculate commission percentage
   const commissionPercent = earnings.price > 0 
     ? Math.round((earnings.commission / earnings.price) * 100) 
     : 25;

   return (
     <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
       <SheetContent 
         side="bottom" 
         className="rounded-t-3xl px-6 pb-8 pt-6"
         style={{
           background: "hsl(var(--background) / 0.92)",
           backdropFilter: "saturate(180%) blur(24px)",
           WebkitBackdropFilter: "saturate(180%) blur(24px)",
           borderTop: "0.5px solid hsl(var(--border) / 0.3)",
         }}
       >
         <SheetHeader className="sr-only">
           <SheetTitle>Ride Complete</SheetTitle>
         </SheetHeader>
         
         <AnimatePresence>
           {open && (
             <motion.div
-              initial={{ opacity: 0, y: 20 }}
+              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               transition={{ duration: 0.3 }}
               className="flex flex-col items-center gap-5"
             >
               {/* Success Icon */}
               <motion.div
-                initial={{ scale: 0 }}
+                initial={shouldReduceMotion ? false : { scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                 className="flex items-center justify-center w-16 h-16 rounded-full bg-success/20"
               >
-                <CheckCircle className="w-10 h-10 text-success" />
+                <CheckCircle className="w-10 h-10 text-success" aria-hidden="true" />
               </motion.div>

               {/* Title */}
               <h2 className="text-xl font-semibold text-foreground">Ride Complete</h2>

               {/* Earnings Breakdown Card */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="w-full rounded-2xl p-4 space-y-3"
                 style={{
                   background: "hsl(var(--card) / 0.85)",
                   border: "0.5px solid hsl(var(--border) / 0.3)",
                   boxShadow: "inset 0 0.5px 0 0 hsl(var(--foreground) / 0.06)",
                 }}
               >
                 {/* ... content unchanged ... */}
               </motion.div>

               {/* Weekly Earnings Card */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.3 }}
                 className="w-full rounded-2xl p-4 flex items-center justify-between"
                 style={{
                   background: "hsl(var(--card) / 0.85)",
                   border: "0.5px solid hsl(var(--border) / 0.3)",
                   boxShadow: "inset 0 0.5px 0 0 hsl(var(--foreground) / 0.06)",
                 }}
               >
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
-                    <TrendingUp className="w-5 h-5 text-primary" />
+                    <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
                   </div>
                   <span className="text-sm font-medium text-foreground">This Week</span>
                 </div>
                 <span className="text-lg font-bold text-foreground">
                   {weeklyLoading ? "..." : `$${weeklyTotal.toFixed(2)}`}
                 </span>
               </motion.div>

               {/* Guarantee Message */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.4 }}
                 className="w-full rounded-2xl p-4 flex gap-3"
                 style={{
                   background: "hsl(var(--muted) / 0.3)",
                   border: "0.5px solid hsl(var(--border) / 0.2)",
                 }}
               >
-                <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
+                <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" />
                 <p className="text-sm text-muted-foreground">
                   Drivers earn at least 80% of the passenger fare.
                 </p>
               </motion.div>

               {/* Done Button */}
               <motion.div
-                initial={{ opacity: 0, y: 10 }}
+                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.5 }}
                 className="w-full pt-2"
               >
                 <Button 
                   onClick={onClose} 
                   className="w-full h-12 text-base font-semibold"
                   size="lg"
                 >
                   Done
                 </Button>
               </motion.div>
             </motion.div>
           )}
         </AnimatePresence>
       </SheetContent>
     </Sheet>
   );
 };
```

---

## Owner verification

1. **Run `npm run update`** — type-check + build must pass (the `useReducedMotion` import is from `framer-motion` which is already a dependency)
2. **Preview on `/map`** — trigger a ride completion to open the sheet. Verify:
   - Sheet opens and closes normally
   - With `prefers-reduced-motion: reduce` in devtools: all 6 elements appear immediately (no entrance animation), exit still animates briefly
3. **No visual regression** — the `aria-hidden` attributes are invisible to sighted users; the `initial={false}` guard is invisible (elements start at their `animate` state)

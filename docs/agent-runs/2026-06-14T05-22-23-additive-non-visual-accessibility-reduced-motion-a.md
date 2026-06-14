# DeepSeek run — 2026-06-14T05:22:23.759Z

- model: deepseek-chat
- task: Additive non-visual accessibility + reduced-motion audit only. Do NOT change layout, copy, routing, styling, or logic. MOUNTED on /map (Map.tsx:1388). This is a top-of-screen iOS-DynamicIsland-style banner that auto-appears for 3s when a trip/delivery is auto-accepted, then auto-dismisses; it is swipe-up-to-dismiss and has an icon-only X close button. Verdict per point: (1) aria-hidden=true on decorative icons: CheckCircle2 (inside the success icon circle), Zap (beside the 'Trip/Delivery Accepted!' text), Navigation (decorative arrow circle) - the heading + 'Navigate to pickup location' subtext carry the meaning. (2) The X dismiss button is ICON-ONLY (a motion.button wrapping just an X glyph) - it needs an aria-label (e.g. Dismiss); the file imports no t() so a plain English aria-label is the additive option, i18n deferred. Confirm. (3) reduced-motion via useReducedMotion from framer-motion: GUARD the banner entrance initial (opacity+y:-80+scale:0.85 - y/scale are movement), the success-icon scale pulse [1,1.15,1] (finite repeat:1, scale is movement), the Navigation-icon rotate [0,-15,0] (rotate is movement). LEAVE: the card exit (auto/user-triggered unmount), the boxShadow glow on the icon (non-vestibular), the auto-dismiss progress WIDTH fill 100%->0% (functional single-direction countdown), the X-button whileTap. Confirm this guard table. (4) Live region: this banner ANNOUNCES a discrete important one-time event ('Trip Accepted! Navigate to pickup location') that the driver did NOT manually trigger - recommend ADDING role=status aria-live=polite on the banner container so screen readers announce it, since unlike a per-second timer this is a single discrete event, not chatter. Confirm ADD (not omit). Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/notifications/AutoAcceptedBanner.tsx

---

## Verdict per point

### (1) `aria-hidden=true` on decorative icons — **CONFIRM ADD**

All three icons are purely decorative (the heading + subtext carry the full meaning):
- **CheckCircle2** (inside the success icon circle) → `aria-hidden="true"`
- **Zap** (beside "Trip/Delivery Accepted!") → `aria-hidden="true"`
- **Navigation** (decorative arrow circle) → `aria-hidden="true"`

### (2) X dismiss button `aria-label` — **CONFIRM ADD**

The X button is icon-only (`<X className="w-3.5 h-3.5" />` with no visible text). Add `aria-label="Dismiss"` to the `<motion.button>`. Plain English is correct since the file has no `t()` import.

### (3) Reduced-motion guard table — **CONFIRM**

| Animation | Guard? | Reasoning |
|-----------|--------|-----------|
| Banner entrance `initial` (opacity + y: -80 + scale: 0.85) | **YES** — wrap in `!prefersReducedMotion` | y and scale are movement |
| Success-icon scale pulse `[1, 1.15, 1]` | **YES** — wrap in `!prefersReducedMotion` | scale is movement |
| Navigation-icon rotate `[0, -15, 0]` | **YES** — wrap in `!prefersReducedMotion` | rotate is movement |
| Card exit (`exit` prop) | **LEAVE** — unmount transition, not vestibular |
| boxShadow glow on icon | **LEAVE** — non-vestibular (color/light only) |
| Auto-dismiss progress width 100%→0% | **LEAVE** — functional single-direction countdown |
| X-button `whileTap={{ scale: 0.8 }}` | **LEAVE** — micro-interaction, framer-motion's `useReducedMotion` already disables `whileTap` scale by default |

### (4) Live region — **CONFIRM ADD `role="status" aria-live="polite"`**

This is a **discrete one-time event** (auto-accepted trip/delivery) that the driver did not manually trigger. Unlike a per-second timer, this won't cause chatter. Add `role="status" aria-live="polite"` to the banner container `<div>` so screen readers announce "Trip Accepted! Navigate to pickup location" when it appears.

---

## Proposed diff

**File:** `../zivodriver/src/components/notifications/AutoAcceptedBanner.tsx`

```diff
 import { useEffect } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { CheckCircle2, Zap, Navigation, X } from "lucide-react";

 interface AutoAcceptedBannerProps {
   isVisible: boolean;
   onDismiss: () => void;
   tripType?: "ride" | "delivery";
 }

 export default function AutoAcceptedBanner({
   isVisible,
   onDismiss,
   tripType = "ride",
 }: AutoAcceptedBannerProps) {
+  const prefersReducedMotion = useReducedMotion();
+
   useEffect(() => {
     if (!isVisible) return;
     const timer = setTimeout(onDismiss, 3000);
     return () => clearTimeout(timer);
   }, [isVisible, onDismiss]);

   return (
     <AnimatePresence>
       {isVisible && (
         <motion.div
-          initial={{ opacity: 0, y: -80, scale: 0.85 }}
-          animate={{ opacity: 1, y: 0, scale: 1 }}
+          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -80, scale: 0.85 }}
+          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: -60, scale: 0.9 }}
           transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
           drag="y"
           dragConstraints={{ top: -80, bottom: 0 }}
           dragElastic={0.15}
           onDragEnd={(_, info) => {
             if (info.offset.y < -40 || info.velocity.y < -300) onDismiss();
           }}
           className="fixed top-0 left-0 right-0 z-[9999] flex justify-center"
           style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}
         >
           <div
+            role="status"
+            aria-live="polite"
             className="mx-3 mt-2 w-full max-w-[420px] rounded-[22px] overflow-hidden"
             style={{
               background: "hsl(var(--card) / 0.82)",
               backdropFilter: "saturate(200%) blur(40px)",
               WebkitBackdropFilter: "saturate(200%) blur(40px)",
               boxShadow: `
                 0 12px 40px -12px hsl(var(--success) / 0.3),
                 0 4px 16px -4px hsl(var(--foreground) / 0.08),
                 inset 0 0.5px 0 0 hsl(var(--foreground) / 0.08)
               `,
               border: "0.5px solid hsl(var(--success) / 0.2)",
             }}
           >
             {/* Success accent strip */}
             <div
               className="h-[2px]"
               style={{
                 background: "linear-gradient(90deg, transparent, hsl(var(--success) / 0.7), transparent)",
               }}
             />

             <div className="px-4 py-3.5">
               <div className="flex items-center gap-3">
                 {/* Animated icon */}
                 <motion.div
                   className="w-11 h-11 rounded-[14px] bg-success/15 flex items-center justify-center flex-shrink-0 border border-success/15"
-                  animate={{
-                    scale: [1, 1.15, 1],
-                    boxShadow: [
-                      "0 0 0 0 hsl(var(--success) / 0.4)",
-                      "0 0 0 10px hsl(var(--success) / 0)",
-                      "0 0 0 0 hsl(var(--success) / 0.4)",
-                    ],
-                  }}
+                  animate={
+                    prefersReducedMotion
+                      ? { boxShadow: ["0 0 0 0 hsl(var(--success)

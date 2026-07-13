# DeepSeek run — 2026-06-14T05:25:42.542Z

- model: deepseek-chat
- task: Additive non-visual accessibility + reduced-motion audit only. No layout/copy/routing/styling/logic change. MOUNTED on /map (Map.tsx:1372). Top-of-screen iOS-DynamicIsland banner that auto-appears for ~10s when a surge zone is active then auto-dismisses; swipe-up + icon-only X dismiss. It is structurally the SAME family as AutoAcceptedBanner (which we just shipped). Verdict per point: (1) aria-hidden=true on decorative icons Zap (in the animated bolt circle) and TrendingUp (beside the 'Earn N% more' text) - the 'High demand in your area!' heading + the Nx badge + 'Earn N% more on trips' text carry the meaning. (2) icon-only X dismiss button needs aria-label=Dismiss (no t() imported, plain English, i18n deferred). (3) reduced-motion via useReducedMotion: GUARD the banner entrance initial (opacity+y:-80+scale:0.85), the bolt-icon INFINITE scale+rotate pulse (scale [1,1.15,1] + rotate [0,5,-5,0], repeat Infinity), and the multiplier-badge INFINITE scale pulse [1,1.1,1]. LEAVE: card exit, the auto-dismiss WIDTH progress fill 100%->0% (functional countdown), X whileTap. Confirm guard table. (4) Live region: discrete one-time auto-triggered surge alert ('High demand in your area! Nx ... Earn N% more') - ADD role=status aria-live=polite on the banner card div (not chatter, not omit)? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/notifications/SurgeAlertBanner.tsx

---

## Plan

Additive non-visual accessibility + reduced-motion audit on `SurgeAlertBanner.tsx`. Three changes, zero layout/logic/styling changes:

1. **`aria-hidden="true"`** on decorative `Zap` and `TrendingUp` icons
2. **`aria-label="Dismiss"`** on the X close button
3. **Reduced-motion guards** via `useReducedMotion()` on: entrance animation, bolt pulse, multiplier badge pulse. Leave: exit animation, progress bar, X `whileTap`.
4. **`role="status"` + `aria-live="polite"`** on the banner card `<div>` for one-time surge announcement

## Diff

```diff
--- a/zivodriver/src/components/notifications/SurgeAlertBanner.tsx
+++ b/zivodriver/src/components/notifications/SurgeAlertBanner.tsx
@@ -1,7 +1,7 @@
 import { useEffect, useState } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { Zap, X, TrendingUp } from "lucide-react";

 interface SurgeAlertBannerProps {
   multiplier: number;
   zoneName: string | null;
@@ -15,6 +15,7 @@ export default function SurgeAlertBanner({
   multiplier, zoneName, isVisible, onDismiss, autoDismissMs = 10000,
 }: SurgeAlertBannerProps) {
   const [isShowing, setIsShowing] = useState(false);
+  const prefersReducedMotion = useReducedMotion();

   useEffect(() => {
     if (isVisible && multiplier > 1) {
@@ -33,9 +34,9 @@ export default function SurgeAlertBanner({
       {isShowing && (
         <motion.div
           initial={{ opacity: 0, y: -80, scale: 0.85 }}
-          animate={{ opacity: 1, y: 0, scale: 1 }}
+          animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, scale: 1 }}
           exit={{ opacity: 0, y: -60, scale: 0.9 }}
-          transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
+          transition={prefersReducedMotion ? { duration: 0.3 } : { type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
           drag="y"
           dragConstraints={{ top: -80, bottom: 0 }}
           dragElastic={0.15}
@@ -50,6 +51,8 @@ export default function SurgeAlertBanner({
         >
           <div
             className="mx-3 mt-2 w-full max-w-[420px] rounded-[22px] overflow-hidden"
+            role="status"
+            aria-live="polite"
             style={{
               background: "hsl(var(--card) / 0.82)",
               backdropFilter: "saturate(200%) blur(40px)",
@@ -79,6 +82,7 @@ export default function SurgeAlertBanner({
                   transition={{ repeat: Infinity, duration: 1.5 }}
                 >
                   <Zap className="w-5 h-5 text-secondary fill-secondary/20" />
+                  aria-hidden="true"
                 </motion.div>

                 <div className="flex-1 min-w-0">
@@ -87,6 +91,7 @@ export default function SurgeAlertBanner({
                       High demand in your area!
                     </p>
                     <motion.span
+                      animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                       className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-secondary/15 text-secondary"
                       animate={{ scale: [1, 1.1, 1] }}
                       transition={{ repeat: Infinity, duration: 1.2 }}
@@ -95,6 +100,7 @@ export default function SurgeAlertBanner({
                   </div>
                   <div className="flex items-center gap-1.5 mt-0.5">
                     <TrendingUp className="w-3 h-3 text-success" />
+                    aria-hidden="true"
                     <p className="text-[12px] text-muted-foreground font-medium">
                       Earn <span className="font-bold text-secondary">{bonusPercent}% more</span> on trips
                       {zoneName && <span className="text-muted-foreground/70"> · {zoneName}</span>}
@@ -104,6 +110,7 @@ export default function SurgeAlertBanner({
 
                 <motion.button
                   whileTap={{ scale: 0.8 }}
+                  aria-label="Dismiss"
                   onClick={() => { setIsShowing(false); onDismiss(); }}
                   className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center"
                 >
```

## Verdict per point

| # | Point | Verdict |
|---|-------|---------|
| 1 | `aria-hidden="true"` on decorative `Zap` and `TrendingUp` | ✅ **ADD** — both are purely decorative (meaning carried by heading + text). |
| 2 | `aria-label="Dismiss"` on X button | ✅ **ADD** — icon-only, no visible text. Plain English, no `t()` import needed. |
| 3 | Reduced-motion guards | ✅ **GUARD** entrance `initial→animate` (skip scale, use `duration: 0.3` spring→tween fallback), bolt pulse (skip entirely), multiplier badge pulse (skip entirely). **LEAVE** exit animation, progress bar, X `whileTap`. |
| 4 | `role="status"` + `aria-live="polite"` on banner card | ✅ **ADD** — one-time auto-triggered surge alert, not chatter. `role="status"` is the correct ARIA widget for a live region that announces a discrete status update. |

## Owner verification

- **`npm run update`** must pass (type-check + worker type-check + build)
- Verify the

# DeepSeek run — 2026-06-14T05:28:47.213Z

- model: deepseek-chat
- task: Additive non-visual accessibility + reduced-motion audit only. No layout/copy/routing/styling/logic change. MOUNTED on /map (Map.tsx:1321). Waze-style road-alert banner that auto-appears ~8s after navigation starts, shows one alert at a time (keyed AnimatePresence swap by alert id), auto-dismisses each after 8s, with a thumbs-up CONFIRM button and an X DISMISS button (both icon-only), an emoji badge, and pagination dots when >1 alert. Verdict per point: (1) The emoji is rendered as inline text <span class=text-2xl>{config.emoji}</span> (police/traffic/etc) - it is DECORATIVE and redundant with the adjacent bold label ('Police reported ahead' etc); screen readers would announce the emoji name. Recommend aria-hidden=true on the emoji span. Confirm. (2) The two icon-only buttons need aria-labels: the ThumbsUp button CONFIRMS the alert (aria-label like 'Confirm alert' or 'Confirm'), the X button DISMISSES (aria-label 'Dismiss'); plus aria-hidden on the inner ThumbsUp and X glyphs. No t() imported so plain English, i18n deferred. Confirm. (3) reduced-motion via useReducedMotion: GUARD the keyed entrance initial (opacity+y:-20+scale:0.95 - y/scale are movement). LEAVE the exit (auto/user-triggered unmount). The two buttons use CSS 'active:scale-90 transition-transform' (not framer-motion) - leave. No infinite loops exist. Confirm. (4) Live region: this banner ANNOUNCES a discrete auto-triggered road alert ('Police reported ahead · 0.5 mi · 3 min ago') the driver did not trigger - recommend ADD role=status aria-live=polite on the keyed motion.div so each new alert is announced; not chatter (alerts are occasional, one at a time). Confirm ADD. Also: should the pagination dots get aria-hidden (purely decorative empty divs)? Concise verdict per point.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/navigation/RoadAlertBanner.tsx

---

## Plan

Apply 4 additive accessibility fixes to `../zivodriver/src/components/navigation/RoadAlertBanner.tsx`:

1. **`aria-hidden="true"`** on the emoji `<span>` (decorative, redundant with adjacent bold label)
2. **`aria-label`** on both icon-only buttons + **`aria-hidden="true"`** on the inner Lucide icons
3. **`role="status"` + `aria-live="polite"`** on the keyed `motion.div` (live region for auto-triggered alerts)
4. **`aria-hidden="true"`** on the pagination dots container (purely decorative)

Plus guard the entrance animation with `useReducedMotion()` — skip `y` and `scale` transforms when reduced motion is preferred.

## Diff

```diff
--- a/zivodriver/src/components/navigation/RoadAlertBanner.tsx
+++ b/zivodriver/src/components/navigation/RoadAlertBanner.tsx
@@ -1,7 +1,7 @@
 import { useState, useEffect } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { X, ThumbsUp } from "lucide-react";
-import { useHapticFeedback } from "@/hooks/useHapticFeedback";
+import { useHapticFeedback } from "@/hooks/useHapticFeedback";

 interface RoadAlert {
   id: string;
@@ -37,6 +37,7 @@ const RoadAlertBanner = ({ enabled = true }: RoadAlertBannerProps) => {
   const [alerts, setAlerts] = useState<RoadAlert[]>([]);
   const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
   const haptic = useHapticFeedback();
+  const shouldReduceMotion = useReducedMotion();

   // Simulate receiving alerts
   useEffect(() => {
@@ -82,7 +83,9 @@ const RoadAlertBanner = ({ enabled = true }: RoadAlertBannerProps) => {
   return (
     <AnimatePresence>
       <motion.div
+        role="status"
+        aria-live="polite"
         key={currentAlert.id}
-        initial={{ opacity: 0, y: -20, scale: 0.95 }}
+        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.95 }}
         animate={{ opacity: 1, y: 0, scale: 1 }}
         exit={{ opacity: 0, y: -20, scale: 0.95 }}
         transition={{ type: "spring", stiffness: 350, damping: 30 }}
@@ -92,7 +95,7 @@ const RoadAlertBanner = ({ enabled = true }: RoadAlertBannerProps) => {
       >
         <div className="flex items-center gap-3 px-3.5 py-3">
-          <span className="text-2xl">{config.emoji}</span>
+          <span className="text-2xl" aria-hidden="true">{config.emoji}</span>
           <div className="flex-1 min-w-0">
             <p className="text-[13px] font-bold text-foreground">{config.label}</p>
             <p className="text-[11px] text-muted-foreground font-medium">
@@ -102,13 +105,15 @@ const RoadAlertBanner = ({ enabled = true }: RoadAlertBannerProps) => {
           <div className="flex items-center gap-1.5 shrink-0">
             <button
               onClick={confirmAlert}
+              aria-label="Confirm alert"
               className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center active:scale-90 transition-transform"
             >
-              <ThumbsUp className="w-3.5 h-3.5 text-success" />
+              <ThumbsUp className="w-3.5 h-3.5 text-success" aria-hidden="true" />
             </button>
             <button
               onClick={dismissAlert}
+              aria-label="Dismiss"
               className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center active:scale-90 transition-transform"
             >
-              <X className="w-3.5 h-3.5 text-muted-foreground" />
+              <X className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
             </button>
           </div>
         </div>
         {alerts.length > 1 && (
-          <div className="flex justify-center gap-1 pb-2">
+          <div className="flex justify-center gap-1 pb-2" aria-hidden="true">
             {alerts.map((_, i) => (
               <div
                 key={i}
```

## Verdict per point

1. **Emoji `aria-hidden="true"`** ✅ — Correct. The emoji is decorative (redundant with the adjacent bold label text). Screen readers would otherwise announce "police officer emoji" etc. Adding `aria-hidden="true"` on the `<span>` suppresses that.

2. **Icon-only buttons** ✅ — Both get `aria-label` (plain English, no `t()` available): `"Confirm alert"` on ThumbsUp, `"Dismiss"` on X. Both inner Lucide icons get `aria-hidden="true"` so they don't double-announce. No `aria-pressed` needed (one-shot actions, not toggles).

3. **Reduced motion** ✅ — The entrance `initial` is guarded with `shouldReduceMotion`: when true, only `opacity: 0` (no `y` or `scale` movement). The `exit` is left unguarded (user-triggered unmount is fine to animate out). The two buttons use CSS `active:scale-90 transition-transform` (not framer-motion) — left as-is. No infinite loops exist.

4. **Live region** ✅ — `role="status"` + `aria-live="polite"` on the keyed `motion.div` ensures each new alert is announced by screen readers without interrupting. Alerts are discrete and occasional (one at a time,

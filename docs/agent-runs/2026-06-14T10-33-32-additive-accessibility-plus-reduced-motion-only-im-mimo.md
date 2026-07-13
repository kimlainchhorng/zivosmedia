# MiMo run — 2026-06-14T10:33:32.032Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Import useReducedMotion from framer-motion extending existing motion import add const reduceMotion equals useReducedMotion. Spatial entrance initial becomes reduceMotion question false colon original on motion.header Hero-Stats grid and Tabs motion.div. Stagger delay becomes reduceMotion question 0 colon original on Tabs delay 0.1. TWO perpetual loops repeat Infinity the two decorative glow-circle motion.div scale 1 1.2 1 guard both animate and transition to reduceMotion question undefined colon original plus aria-hidden true on each glow motion.div. Add aria-label Back to back motion.button and aria-hidden ArrowLeft. aria-hidden true on decorative header Sparkles header TrendingUp badge Calendar stat Clock stat and Zone-Demand MapPin. Three TabsTrigger have visible text Schedule Demand Earnings so NO aria-label only aria-hidden Clock ChartLine TrendingUp icons. Promote section h3 Zone Demand to h2 under single h1 className unchanged. Leave whileHover whileTap. Verify each item.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/ShiftPlanner.tsx

---

## Plan

12 discrete edits in `../zivodriver/src/pages/tools/ShiftPlanner.tsx`:

1. Extend `framer-motion` import with `useReducedMotion`.
2. Add `const reduceMotion = useReducedMotion();` in the component body.
3. Guard `initial` on `motion.header` (header entrance).
4. Guard `initial` on Hero-Stats `motion.div` (stats entrance).
5. Guard `initial` + `transition.delay` on Tabs `motion.div` (stagger entrance).
6. Guard glow-circle #1 (`animate` + `transition` → `undefined`) + add `aria-hidden="true"`.
7. Guard glow-circle #2 (same) + add `aria-hidden="true"`.
8. Add `aria-label="Back"` on back `motion.button` + `aria-hidden` on `ArrowLeft`.
9. Add `aria-hidden="true"` on decorative header `Sparkles`.
10. Add `aria-hidden="true"` on decorative header `TrendingUp`.
11. Add `aria-hidden="true"` on decorative stat `Calendar`, stat `Clock`, and Zone-Demand `MapPin`.
12. Add `aria-hidden` on the three TabsTrigger icons (`Clock`, `ChartLine`, `TrendingUp`) — NO `aria-label` (visible text present).
13. Promote `<h3>` → `<h2>` on "Zone Demand" (className unchanged).

---

## Diff

```diff
--- a/src/pages/tools/ShiftPlanner.tsx
+++ b/src/pages/tools/ShiftPlanner.tsx
@@ -1,5 +1,5 @@
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Calendar, Clock, ChartLine, TrendingUp, Sparkles, MapPin } from "lucide-react";
 import { useNavigate } from "react-router-dom";
@@ -12,6 +12,7 @@ const ShiftPlanner = () => {
   const navigate = useNavigate();
   const [activeTab, setActiveTab] = useState("schedule");
+  const reduceMotion = useReducedMotion();
   const { shifts } = useDriverShifts();
   const { data: zones } = useZoneDemand();
@@ -32,7 +33,7 @@ const ShiftPlanner = () => {
       {/* Premium Header */}
       <motion.header
         className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
-        initial={{ opacity: 0, y: -20 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <div className="flex items-center gap-3">
@@ -40,12 +41,14 @@ const ShiftPlanner = () => {
             onClick={() => navigate(-1)}
             className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
+            aria-label="Back"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </motion.button>
           <div className="flex-1">
             <h1 className="text-lg font-display font-bold flex items-center gap-2">
               Shift Planner
-              <Sparkles className="w-4 h-4 text-primary" />
+              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
             </h1>
             <p className="text-xs text-muted-foreground">Schedule & optimize hours</p>
           </div>
@@ -53,7 +56,7 @@ const ShiftPlanner = () => {
             <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
-              <TrendingUp className="w-3 h-3" />
+              <TrendingUp className="w-3 h-3" aria-hidden="true" />
               ${avgHourlyRate.toFixed(0)}/hr avg
             </div>
@@ -64,7 +67,7 @@ const ShiftPlanner = () => {
         {/* Hero Stats */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="grid grid-cols-2 gap-2 sm:gap-3"
         >
@@ -73,14 +76,16 @@ const ShiftPlanner = () => {
               className="absolute -top-8 -right-8 sm:-top-10 sm:-right-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full"
               style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)" }}
-              animate={{ scale: [1, 1.2, 1] }}
-              transition={{ repeat: Infinity, duration: 4 }}
+              animate={reduceMotion ? undefined : { scale: [1, 1.2, 1] }}
+              transition={reduceMotion ? undefined : { repeat: Infinity, duration: 4 }}
+              aria-hidden="true"
             />
             <div className="relative">
               <div className="w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30 flex items-center justify-center">
-                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground

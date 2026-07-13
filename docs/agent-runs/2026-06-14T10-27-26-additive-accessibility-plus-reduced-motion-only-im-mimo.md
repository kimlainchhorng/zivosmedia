# MiMo run — 2026-06-14T10:27:26.888Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Import useReducedMotion from framer-motion extending existing motion import add const reduceMotion equals useReducedMotion. Spatial entrance initial becomes reduceMotion question false colon original on motion.header 3 stat cards Add-Stop row Stops-List card per-stop rows Action-Buttons block Success message and Pro-Tips card. Stagger delay becomes reduceMotion question 0 colon original. ONE perpetual loop repeat Infinity the header Route badge rotate guard both animate and transition to reduceMotion question undefined colon original plus aria-hidden true on its motion.div wrapper. Add aria-label Back to back motion.button and aria-hidden ArrowLeft. Icon-only buttons aria-label plus inner icon aria-hidden Plus add-stop aria-label Add stop Trash2 remove aria-label Remove stop. Optimize and Open-in-Maps buttons have visible text so NO aria-label only aria-hidden Zap and Navigation icons. aria-hidden true on decorative Sparkles header Route stat icons GripVertical CheckCircle Pro-Tips Sparkles. Promote two section h3 Delivery Stops and Pro Tips to h2 under single h1 className unchanged. Leave whileHover whileTap layout prop and priority emoji spans. Verify each item.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/RouteOptimizer.tsx

---

## Plan

**File:** `src/pages/tools/RouteOptimizer.tsx` (in the `zivodriver` repo)

Six additive categories of changes, all preserve existing layout, interaction, and logic:

| # | Category | What changes |
|---|----------|-------------|
| 1 | **Import + hook** | Extend `framer-motion` import to include `useReducedMotion`; add `const reduceMotion = useReducedMotion();` inside the component. |
| 2 | **Spatial entrance guards** | Every `initial`/`animate`/stagger `delay` on motion elements gets a ternary: `reduceMotion ? false : original` for initials/animates, `reduceMotion ? 0 : original` for delays. Affects: `motion.header`, 3 stat cards, Add-Stop row, Stops-List card, per-stop rows, Action-Buttons block, Success message, Pro-Tips card. |
| 3 | **Perpetual-loop guard** | The Route-badge `motion.div`: both `animate` and `transition` become `reduceMotion ? undefined : original`. Add `aria-hidden="true"` on the `motion.div` wrapper (decorative). |
| 4 | **Icon-button a11y** | Back: `aria-label="Back"` + `aria-hidden` on `ArrowLeft`. Plus add-stop `Button`: `aria-label="Add stop"` + `aria-hidden` on `Plus`. Trash2 remove `Button`: `aria-label="Remove stop"` + `aria-hidden` on `Trash2`. |
| 5 | **Visible-text button icons** | Optimize/Zap and Open-in-Maps/Navigation — `aria-hidden` only on the icon (visible text provides the label). |
| 6 | **Decorative icon `aria-hidden`** | Header `Sparkles`, stat-card `stat.icon`, `GripVertical`, Success `CheckCircle`, Pro-Tips `Sparkles`. Promote `<h3>` → `<h2>` for "Delivery Stops" and "Pro Tips" (under single `<h1>`). className unchanged. |

**Untouched:** `whileHover`, `whileTap`, `layout`, priority emoji spans.

---

## Proposed diff

```diff
--- a/src/pages/tools/RouteOptimizer.tsx
+++ b/src/pages/tools/RouteOptimizer.tsx
@@ -1,5 +1,5 @@
 import { useState, useEffect } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Route, MapPin, Clock, Fuel, Plus, Zap, GripVertical, Navigation, Trash2, Sparkles, CheckCircle } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
@@ -22,6 +22,7 @@ const RouteOptimizer = () => {
   const navigate = useNavigate();
   const mapState = useEnhancedMapState();
+  const reduceMotion = useReducedMotion();
   
   // Fetch real nearby orders
   const { data: nearbyOrders = [] } = useNearbyOrders(
@@ -86,13 +87,14 @@ const RouteOptimizer = () => {
       {/* Premium Header */}
       <motion.header
         className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
-        initial={{ opacity: 0, y: -20 }}
-        animate={{ opacity: 1, y: 0 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
+        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
       >
         <div className="flex items-center gap-3">
           <motion.button
             onClick={() => navigate(-1)}
             className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
+            aria-label="Back"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </motion.button>
           <div className="flex-1">
             <h1 className="text-lg font-display font-bold flex items-center gap-2">
               Route Optimizer
-              <Sparkles className="w-4 h-4 text-secondary" />
+              <Sparkles className="w-4 h-4 text-secondary" aria-hidden="true" />
             </h1>
             <p className="text-xs text-muted-foreground">AI-powered route planning</p>
           </div>
           <motion.div
-            animate={{ rotate: [0, 10, -10, 0] }}
-            transition={{ repeat: Infinity, duration: 3 }}
+            animate={reduceMotion ? undefined : { rotate: [0, 10, -10, 0] }}
+            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3 }}
             className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20"
+            aria-hidden="true"
           >
             <Route className="w-5 h-5 text-secondary" />
           </motion.div>
@@ -110,14 +112,14 @@ const RouteOptimizer = () => {
               key={stat.label}
-              initial={{ opacity: 0, y: 20 }}
-              animate={{ opacity: 1, y: 0 }}
-              transition={{ delay: index * 0.1 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+              transition={{ delay: reduceMotion ? 0 : index * 0.1 }}
               className="p-4 rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/30 text-center"
             >
               <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg ${stat.glow} flex items-center justify-center`}>
-                <stat.icon className="w-5 h-5 text-white" />
+                <stat.icon className="w-5 h-5 text-white" aria-hidden="true" />
               </div>
               <p className="text-lg font-bold">{stat.value}</p>
               <p className="text-xs text-muted-foreground">{stat.label}</p>
@@ -128,8 +130,8 @@ const RouteOptimizer = () => {
         {/* Add Stop */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.2 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={{ delay: reduceMotion ? 0 : 0.2 }}
           className="flex gap-2"
         >
@@ -149,6 +151,7 @@ const RouteOptimizer = () => {
           <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
-            <Button onClick={addStop} size="icon" className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
-              <Plus className="w-5 h-5" />
+            <Button onClick={addStop} size="icon" className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25" aria-label="Add stop">
+              <Plus className="w-5 h-5" aria-hidden="true" />
             </Button>
           </motion.div>
@@ -158,8 +161,8 @@ const RouteOptimizer = () => {
         {/* Stops List */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.3 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={{ delay: reduceMotion ? 0 : 0.3 }}
           className="p-5 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/30"
         >
           <div className="flex items-center justify-between mb-4">
-            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Delivery Stops</h3>
+            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Delivery Stops</h2>
             <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50">{stops.length} stops</span>
           </div>
@@ -169,9 +172,9 @@ const RouteOptimizer = () => {
               <motion.div
                 key={stop.id}
-                initial={{ opacity: 0, x: -20 }}
-                animate={{ opacity: 1, x: 0 }}
-                transition={{ delay: index * 0.05 }}
+                initial={reduceMotion ? false : { opacity: 0, x: -20 }}
+                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
+                transition={{ delay: reduceMotion ? 0 : index * 0.05 }}
                 layout
                 className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30"
               >
                 <div className="cursor-grab text-muted-foreground">
-                  <GripVertical className="w-4 h-4" />
+                  <GripVertical className="w-4 h-4" aria-hidden="true" />
                 </div>
@@ -197,6 +200,6 @@ const RouteOptimizer = () => {
                   className="shrink-0 text-muted-foreground hover:text-destructive rounded-xl"
+                  aria-label="Remove stop"
                 >
-                  <Trash2 className="w-4 h-4" />
+                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                 </Button>
@@ -207,8 +210,8 @@ const RouteOptimizer = () => {
         {/* Action Buttons */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.4 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={{ delay: reduceMotion ? 0 : 0.4 }}
           className="space-y-3"
         >
@@ -219,7 +222,7 @@ const RouteOptimizer = () => {
               disabled={stops.length < 2}
             >
-              <Zap className="w

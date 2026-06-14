# MiMo run — 2026-06-14T10:20:18.488Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Import useReducedMotion from framer-motion extending existing motion import add const reduceMotion equals useReducedMotion. Spatial entrance initial becomes reduceMotion question false colon original object. Stagger transition delay becomes reduceMotion question 0 colon original. Add aria-hidden true to decorative lucide icons beside visible text Sparkles Gauge DollarSign TrendingUp TrendingDown Calendar Fuel BarChart3 Droplets Plus stat icons. Add aria-label Back to back motion.button and aria-hidden to its ArrowLeft. Add button keeps visible Add text no aria-label only aria-hidden Plus icon. Append motion-reduce colon animate-none to animate-pulse skeleton keep animate-pulse. Promote three h3 headings to h2 under the single h1 className unchanged. Leave whileHover whileTap and DialogTitle as-is. Verify each item.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/FuelTracker.tsx

---

## 1. Plan

Eight additive-only edits to `src/pages/tools/FuelTracker.tsx`:

| # | What | How |
|---|------|-----|
| A | Reduced-motion hooks | Import `useReducedMotion`; add `const reduceMotion = useReducedMotion()` |
| B | Respect reduced motion on spatial entrances | `initial` → `reduceMotion ? false : {...}` on 5 motion wrappers (stats grid, MPG chart, cost chart, recent entries, cost-per-mile) |
| C | Respect reduced motion on stagger delays | `delay` → `reduceMotion ? 0 : original` on 3 staggered containers (stats grid `*0.1`, entries list `*0.05`, recent entries fixed `0.3`) |
| D | Decorative icon a11y | `aria-hidden="true"` on all 11 decorative lucide icons beside visible text |
| E | Back button a11y | `aria-label="Back"` on `motion.button` + `aria-hidden="true"` on its `ArrowLeft` |
| F | Skeleton reduced-motion | `animate-pulse` → `animate-pulse motion-reduce:animate-none` |
| G | Heading hierarchy | Promote 3 `h3` → `h2` (under the single `h1`) |
| H | Leave untouched | `whileHover`, `whileTap`, `DialogTitle`, all logic/props/structure |

No new components, no new imports besides the single `useReducedMotion`. Fully additive — zivosmedia unaffected.

---

## 2. Proposed diff

**File:** `src/pages/tools/FuelTracker.tsx`

```diff
--- a/src/pages/tools/FuelTracker.tsx
+++ b/src/pages/tools/FuelTracker.tsx
@@ -1,5 +1,5 @@
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Fuel, Plus, TrendingUp, TrendingDown, Calendar, DollarSign, Gauge, BarChart3, Sparkles, Droplets } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
@@ -13,6 +13,7 @@ import BottomNav from "@/components/BottomNav";
 const EnhancedFuelTracker = () => {
   const navigate = useNavigate();
   const [isOpen, setIsOpen] = useState(false);
+  const reduceMotion = useReducedMotion();
   const { entries, stats, mpgChartData, costChartData, addEntry, isAdding, isLoading } = useFuelEntries();
 
   const [newEntry, setNewEntry] = useState({
@@ -84,7 +85,7 @@ const EnhancedFuelTracker = () => {
               <h1 className="text-lg font-display font-bold flex items-center gap-2">
               Fuel Tracker
-              <Sparkles className="w-4 h-4 text-warning" />
+              <Sparkles className="w-4 h-4 text-warning" aria-hidden="true" />
             </h1>
             <p className="text-xs text-muted-foreground">Track expenses & efficiency</p>
           </div>
@@ -93,6 +94,7 @@ const EnhancedFuelTracker = () => {
             className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
+            aria-label="Back"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </motion.button>
 
@@ -105,7 +107,7 @@ const EnhancedFuelTracker = () => {
                 <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25">
-                  <Plus className="w-4 h-4 mr-1" /> Add
+                  <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> Add
                 </Button>
 
@@ -125,8 +127,8 @@ const EnhancedFuelTracker = () => {
             <motion.div
               key={stat.label}
-              initial={{ opacity: 0, y: 20 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
-              transition={{ delay: index * 0.1 }}
+              transition={{ delay: reduceMotion ? 0 : index * 0.1 }}
               className="p-4 rounded-2xl bg-gradient-to-br from-card via-card to-muted/30 border border-border/30"
             >
               <div className="flex items-center gap-3">
@@ -134,7 +136,7 @@ const EnhancedFuelTracker = () => {
                   <stat.icon className="w-6 h-6 text-white" />
                 </div>
                 <div>
-                  <p className="text-2xl font-bold">{stat.value}</p>
+                  <p className="text-2xl font-bold" aria-hidden="true">{stat.value}</p>
                   <p className="text-xs text-muted-foreground">{stat.label}</p>
                 </div>
               </div>
 
@@ -161,13 +163,13 @@ const EnhancedFuelTracker = () => {
             <motion.div
-              initial={{ opacity: 0, y: 20 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/30"
             >
-              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
+              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-primary" />
                 Fuel Efficiency Over Time
-              </h3>
+              </h2>
 
@@ -194,13 +196,13 @@ const EnhancedFuelTracker = () => {
             <motion.div
-              initial={{ opacity: 0, y: 20 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-4 p-5 rounded-3xl bg-gradient-to-br from-card via-card to-secondary/5 border border-border/30"
             >
-              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
+              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
                 <DollarSign className="w-4 h-4 text-secondary" />
                 Fill-up Costs
-              </h3>
+              </h2>
 
@@ -222,7 +224,7 @@ const EnhancedFuelTracker = () => {
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.3 }}
+          transition={{ delay: reduceMotion ? 0 : 0.3 }}
           className="p-5 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/30"
         >
-          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Fill-ups</h3>
+          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Fill-ups</h2>
           {isLoading ? (
             <div className="space-y-3">
               {[1, 2, 3].map((i) => (
-                <div key={i} className="h-16 rounded-2xl bg-muted/30 animate-pulse" />
+                <div key={i} className="h-16 rounded-2xl bg-muted/30 animate-pulse motion-reduce:animate-none" />
               ))}
             </div>
 
@@ -233,7 +235,7 @@ const EnhancedFuelTracker = () => {
               {entries.slice(0, 5).map((entry, index) => (
                 <motion.div
                   key={entry.id}
-                  initial={{ opacity: 0, x: -20 }}
+                  initial={reduceMotion ? false : { opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
-                  transition={{ delay: index * 0.05 }}
+                  transition={{ delay: reduceMotion ? 0 :

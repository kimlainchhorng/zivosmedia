# MiMo run — 2026-06-14T11:08:53.884Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Add useReducedMotion from framer-motion as var reduceMotion. For framer-motion entrance elements with spatial initial props opacity y or x guard the whole initial object with reduceMotion ternary to false. For stagger delays set transition delay to 0 when reduceMotion using delay reduceMotion ? 0 : original. Append motion-reduce colon animate-none to the loading spinner CSS animate-spin div and add aria-hidden true to it. Add aria-hidden true to decorative icons. Add aria-label Back to the icon-only back button. The refresh button is an icon-only Button with size icon and only a RefreshCw icon so add aria-label Refresh to it and aria-hidden its icon. Do not add aria-label to any control that has visible text such as the Live badge or the Navigate Here button or the Top Earning Areas card title, only aria-hidden their inner icons. Do not promote any CardTitle shadcn component heading. There is no raw heading skip in this file the only raw heading is the h1. Do not change logic or layout.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/community/HotspotMap.tsx

---

## Plan

1. Add `useReducedMotion` import + call it as `reduceMotion`.
2. Guard `initial` objects on `motion.div` (selectedHotspot) and `motion.button` (top hotspots list) with `reduceMotion ? false : { ... }`.
3. Guard stagger delay: `reduceMotion ? 0 : index * 0.1`.
4. Loading spinner: append `motion-reduce:animate-none` + `aria-hidden="true"`.
5. Back button: add `aria-label="Back"`, `aria-hidden` its `ArrowLeft` icon.
6. Refresh Button: add `aria-label="Refresh"`, `aria-hidden` its `RefreshCw` icon.
7. `aria-hidden="true"` on all remaining decorative icons (`Flame` ×2, `DollarSign` ×2, `Clock`, `Zap`, `Navigation`, `TrendingUp` ×2).
8. Zero logic/layout changes.

---

## Diff

```diff
--- a/src/pages/community/HotspotMap.tsx
+++ b/src/pages/community/HotspotMap.tsx
@@ -1,5 +1,5 @@
 import { useState, useEffect } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Flame, Clock, DollarSign, TrendingUp, Zap, RefreshCw, Navigation } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { GoogleMap, Circle, Marker, InfoWindow } from "@react-google-maps/api";
@@ -98,6 +98,7 @@
   const navigate = useNavigate();
   const { isLoaded, loadError, hasApiKey } = useGoogleMaps();
+  const reduceMotion = useReducedMotion();
   const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
     lat: 40.7128,
     lng: -74.006,
@@ -229,7 +230,7 @@
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
-        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
+        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full motion-reduce:animate-none" aria-hidden="true" />
       </div>
     );
   }
@@ -240,10 +241,10 @@
       <header className="sticky top-0 z-[1000] bg-card/95 backdrop-blur-md border-b border-border/50 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
         <div className="flex items-center gap-3">
-          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
-            <ArrowLeft className="w-5 h-5" />
+          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </button>
           <div className="flex-1">
             <h1 className="text-lg font-display font-bold">Demand Hotspots</h1>
@@ -252,12 +253,12 @@
           <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
-              <Flame className="w-3 h-3" />
+              <Flame className="w-3 h-3" aria-hidden="true" />
               Live
             </div>
-            <Button size="icon" variant="outline" onClick={handleRefresh} className="rounded-xl">
-              <RefreshCw className="w-4 h-4" />
+            <Button size="icon" variant="outline" onClick={handleRefresh} aria-label="Refresh" className="rounded-xl">
+              <RefreshCw className="w-4 h-4" aria-hidden="true" />
             </Button>
           </div>
         </div>
@@ -293,7 +294,7 @@
                 <div className="p-2 min-w-[180px] text-foreground">
                   <p className="font-bold text-sm">{selectedHotspot.name}</p>
                   <div className="flex items-center gap-2 mt-2 text-sm">
-                    <DollarSign className="w-4 h-4 text-success" />
+                    <DollarSign className="w-4 h-4 text-success" aria-hidden="true" />
                     <span>${selectedHotspot.avgEarnings.toFixed(2)} avg</span>
                   </div>
                 </div>
@@ -330,7 +331,7 @@
           {selectedHotspot ? (
             <motion.div
-              initial={{ opacity: 0, y: 20 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
             >
               <Card className="glass-card overflow-hidden">
@@ -344,17 +345,17 @@
                     <div className="text-center">
                       <div className="w-10 h-10 mx-auto rounded-xl bg-primary/20 flex items-center justify-center mb-2">
-                        <DollarSign className="w-5 h-5 text-primary" />
+                        <DollarSign className="w-5 h-5 text-primary" aria-hidden="true" />
                       </div>
                       <p className="text-lg font-bold">${selectedHotspot.avgEarnings.toFixed(0)}</p>
@@ -353,7 +354,7 @@
                     <div className="text-center">
                       <div className="w-10 h-10 mx-auto rounded-xl bg-secondary/20 flex items-center justify-center mb-2">
-                        <Clock className="w-5 h-5 text-secondary" />
+                        <Clock className="w-5 h-5 text-secondary" aria-hidden="true" />
                       </div>
                       <p className="text-lg font-bold">{selectedHotspot.waitTime}</p>
@@ -362,7 +363,7 @@
                     <div className="text-center">
                       <div className="w-10 h-10 mx-auto rounded-xl bg-warning/20 flex items-center justify-center mb-2">
-                        <Zap className="w-5 h-5 text-warning" />
+                        <Zap className="w-5 h-5 text-warning" aria-hidden="true" />
                       </div>
                       <p className="text-lg font-bold">{selectedHotspot.surgeMultiplier}x</p>
@@ -372,7 +373,7 @@
                   <Button className="w-full gradient-rides glow-rides">
-                    <Navigation className="w-4 h-4 mr-2" />
+                    <Navigation className="w-4 h-4 mr-2" aria-hidden="true" />
                     Navigate Here
                   </Button>
@@ -383,7 +384,7 @@
               <CardContent className="py-8 text-center">
-                <Flame className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
+                <Flame className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" aria-hidden="true" />
                 <p className="text-muted-foreground">Tap a hotspot to see details</p>
@@ -395,7 +396,7 @@
               <CardTitle className="text-base flex items-center gap-2">
-                <TrendingUp className="w-4 h-4 text-primary" />
+                <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
                 Top Earning Areas
@@ -410,9 +411,9 @@
                   <motion.button
                     key={hotspot.id}
                     className="w-full flex items-center gap-3 p-3 rounded-xl bg

# MiMo run — 2026-06-14T07:04:35.965Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. HAS framer-motion (6 entrance motion.div, TWO CSS animate-pulse), NO useTranslation plain Back. Child components OUT OF SCOPE. Add useReducedMotion, const reduceMotion in EcosystemHub. Guard all 6 entrance motion.div initial opacity 0 y 20 reduceMotion ? false : object keep animate; the 5 with transition delay also wrap transition reduceMotion ? undefined : object (first network-status has no transition initial-only). Two CSS animate-pulse append motion-reduce:animate-none: online status dot div bg-success animate-pulse, and Zap icon. aria: icon-only ghost back Button aria-label Back. aria-hidden true on ArrowLeft Globe Wifi WifiOff MapPin Zap. Two quick-link anchors have decorative emoji spans car and burger beside text - aria-hidden those spans. Confirm h1 then h2 then h3 no skip. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/EcosystemHub.tsx

---

## Plan

1. Import `useReducedMotion` from framer-motion; add `const reduceMotion = useReducedMotion()`.
2. Guard all 6 entrance `motion.div`s — first (Network Status) has no `transition` prop so only `initial` is guarded; the other 5 have `transition={{ delay }}` so both `initial` and `transition` are guarded.
3. Append `motion-reduce:animate-none` to the two CSS `animate-pulse` elements (status dot + Zap icon).
4. ARIA: `aria-label="Back"` on the ghost back Button; `aria-hidden="true"` on all 6 decorative icons (ArrowLeft, Globe, Wifi, WifiOff, MapPin, Zap); `aria-hidden` on the two decorative emoji `<span>`s.
5. Confirm heading hierarchy: h1 → h2 → h3s — **already correct, no skip**.
6. Child components (EcosystemStatusWidget, CrossAppBanner, LiveOrderSync, DriverTrackingStatus) — out of scope.

---

## Proposed diff — `src/pages/EcosystemHub.tsx`

*(Paths below assume the file lives at that relative location in the zivodriver sub-project.)*

```diff
--- a/src/pages/EcosystemHub.tsx
+++ b/src/pages/EcosystemHub.tsx
@@ -1,4 +1,4 @@
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Globe, Wifi, WifiOff, MapPin, Zap } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useNavigate } from "react-router-dom";
@@ -19,6 +19,7 @@
   const navigate = useNavigate();
   const { driver } = useAuth();
   const { activeDelivery } = useActiveDelivery();
+  const reduceMotion = useReducedMotion();
   
   // Live location tracking status
   const { currentLocation, isTracking, error: locationError } = useLiveLocationBroadcast({
@@ -40,7 +41,7 @@
           <Button 
             variant="ghost" 
             size="icon" 
             className="shrink-0"
             onClick={() => navigate(-1)}
+            aria-label="Back"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
@@ -51,1 +52,1 @@
-          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-success animate-pulse" : "bg-muted"}`} />
+          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-success animate-pulse motion-reduce:animate-none" : "bg-muted"}`} />
@@ -58,3 +59,3 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
@@ -64,1 +65,1 @@
-              <Globe className="w-6 h-6 text-primary" />
+              <Globe className="w-6 h-6 text-primary" aria-hidden="true" />
@@ -74,3 +75,3 @@
-              <Wifi className="w-5 h-5 text-success" />
+              <Wifi className="w-5 h-5 text-success" aria-hidden="true" />
             ) : (
-              <WifiOff className="w-5 h-5 text-muted-foreground" />
+              <WifiOff className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
@@ -86,3 +87,3 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.1 }}
+          transition={reduceMotion ? undefined : { delay: 0.1 }}
           className="p-4 rounded-xl border border-border/50 bg-card/50"
@@ -97,3 +98,3 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.2 }}
+          transition={reduceMotion ? undefined : { delay: 0.2 }}
         >
@@ -110,3 +111,3 @@
           <motion.div
-            initial={{ opacity: 0, y: 20 }}
+            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
-            transition={{ delay: 0.25 }}
+            transition={reduceMotion ? undefined : { delay: 0.25 }}
             className="p-4 rounded-xl border border-success/30 bg-success/10"
@@ -116,1 +117,1 @@
-                <MapPin className="w-5 h-5 text-success" />
+                <MapPin className="w-5 h-5 text-success" aria-hidden="true" />
@@ -121,1 +122,1 @@
-                  <Zap className="w-3 h-3 text-success animate-pulse" />
+                  <Zap className="w-3 h-3 text-success animate-pulse motion-reduce:animate-none" aria-hidden="true" />
@@ -141,3 +142,3 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.3 }}
+          transition={reduceMotion ? undefined : { delay: 0.3 }}
           className="space-y-3"
@@ -150,3 +151,3 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.4 }}
+          transition={reduceMotion ? undefined : { delay: 0.4 }}
           className="grid grid-cols-2 gap-3"
@@ -158,1 +159,1 @@
-            <span className="text-2xl mb-2 block">🚗</span>
+            <span className="text-2xl mb-2 block" aria-hidden="true">🚗</span>
@@ -167,1 +168,1 @@
-            <span className="text-2xl mb-2 block">🍔</span>
+            <span className="text-2xl mb-2 block" aria-hidden="true">🍔</span>
```

---

## Summary of exact edits

| # | What | Detail |
|---|------|--------|
| 1 | Import | `useReducedMotion` added to framer-motion import |
| 2 | Hook + const | `const reduceMotion = useReducedMotion()` after line 21 |
| 3 | Motion guard ×6 | `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`

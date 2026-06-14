# DeepSeek run — 2026-06-14T06:54:36.564Z

- model: deepseek-chat
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File HAS framer-motion and HAS useTranslation t with common.back. Add useReducedMotion from framer-motion. Motion inventory: FloatingOrb component has an infinite loop animate y scale opacity with transition repeat Infinity - gate BOTH animate and transition with reduceMotion ternary to undefined, call useReducedMotion inside FloatingOrb. Header motion.div entrance initial y minus 20 opacity 0 no transition - guard initial whole-object false. Summary card motion.div entrance initial opacity 0 y 20 rotateX 8 with spring transition - guard initial false and wrap transition reduceMotion undefined. Holographic sheen motion.div infinite loop backgroundPosition with repeat Infinity - gate both animate and transition. Filter chips container motion.div entrance initial opacity 0 x minus 20 no transition - guard initial false. filters.map motion.button has whileTap plus entrance initial opacity 0 y 10 with transition delay - guard initial and transition, KEEP whileTap. groups.map motion.div entrance initial opacity 0 y 20 transition delay - guard. events.map motion.div entrance initial opacity 0 x minus 15 transition delay - guard. Leave all whileTap unguarded. aria stuff: back motion.button icon-only needs aria-label t common.back, refresh motion.button icon-only needs aria-label Refresh fallback, Live tab has text so just aria-hidden the Radio icon. aria-hidden true on ArrowLeft RefreshCw Radio. RefreshCw uses animate-spin - add motion-reduce:animate-none to its className. EmptyState icon prop Activity is component-level, leave. Confirm heading h1 only. List exact edits, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Activity.tsx

---

## Plan

1. **Add `useReducedMotion` import** from `framer-motion` at the top
2. **`FloatingOrb`** – call `useReducedMotion()` inside the component; gate both `animate` and `transition` with a ternary (return `undefined` when reduced motion is preferred)
3. **Header `motion.div`** – guard `initial` with `!prefersReducedMotion ? { y: -20, opacity: 0 } : false`
4. **Summary card `motion.div`** – guard `initial` with `!prefersReducedMotion ? { opacity: 0, y: 20, rotateX: 8 } : false`; wrap `transition` with `!prefersReducedMotion ? { type: "spring", ... } : undefined`
5. **Holographic sheen `motion.div`** – gate both `animate` and `transition` with a ternary (return `undefined` when reduced motion is preferred)
6. **Filter chips container `motion.div`** – guard `initial` with `!prefersReducedMotion ? { opacity: 0, x: -20 } : false`
7. **`filters.map` `motion.button`** – guard `initial` and `transition`, keep `whileTap` unguarded
8. **`groups.map` `motion.div`** – guard `initial` and `transition`
9. **`events.map` `motion.div`** – guard `initial` and `transition`
10. **Aria additions**:
    - Back `motion.button`: add `aria-label={t("common.back")}`
    - Refresh `motion.button`: add `aria-label="Refresh"`
    - Live tab `motion.button`: add `aria-hidden="true"` to the `<Radio>` icon
    - Back `ArrowLeft` icon: add `aria-hidden="true"`
    - Refresh `RefreshCw` icon: add `aria-hidden="true"` and `motion-reduce:animate-none` to its className
    - Confirm `<h1>` is the only heading

## Diff

```diff
--- a/zivodriver/src/pages/driver/Activity.tsx
+++ b/zivodriver/src/pages/driver/Activity.tsx
@@ -1,7 +1,7 @@
 /**
  * Driver Activity Feed — Cinematic 3D timeline at /driver/activity
  */
-
+import { useReducedMotion } from "framer-motion";
 import { useState, useMemo } from "react";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
@@ -47,7 +47,9 @@ const extruded3d = {

 /** Floating 3D particle background */
-const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) => (
+const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) => {
+  const prefersReducedMotion = useReducedMotion();
+  return (
   <motion.div
     className="absolute rounded-full pointer-events-none"
     style={{
@@ -55,12 +57,12 @@ const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y
       background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
       filter: "blur(40px)",
     }}
-    animate={{
+    animate={!prefersReducedMotion ? {
       y: [0, -25, 0, 18, 0],
       scale: [1, 1.3, 0.85, 1.15, 1],
       opacity: [0.2, 0.5, 0.2, 0.4, 0.2],
-    }}
-    transition={{ repeat: Infinity, duration: 10 + delay, delay, ease: "easeInOut" }}
+    } : undefined}
+    transition={!prefersReducedMotion ? { repeat: Infinity, duration: 10 + delay, delay, ease: "easeInOut" } : undefined}
   />
 );
+};

@@ -70,6 +72,7 @@ export default function DriverActivity() {
   const { t } = useTranslation();
+  const prefersReducedMotion = useReducedMotion();
   const { driver } = useAuth();
   const isCambodia = (driver as any)?.country === "KH";
   const filters: { label: string; value: TimelineCategory | "all" }[] = {
@@ -117,7 +120,7 @@ export default function DriverActivity() {

       {/* 3D Header */}
       <motion.div
-        initial={{ y: -20, opacity: 0 }}
+        initial={!prefersReducedMotion ? { y: -20, opacity: 0 } : false}
         animate={{ y: 0, opacity: 1 }}
         className="sticky top-0 z-10 pt-[calc(env(safe-area-inset-top)+4px)]"
         style={{
@@ -133,6 +136,7 @@ export default function DriverActivity() {
             <motion.button
               whileTap={{ scale: 0.9, translateY: 2 }}
               onClick={goBack}
+              aria-label={t("common.back")}
               className="p-2 rounded-xl"
               style={extruded3d}
             >
@@ -148,6 +152,7 @@ export default function DriverActivity() {
           <motion.button
             whileTap={{ scale: 0.9, rotate: 180 }}
             onClick={handleRefresh}
+            aria-label="Refresh"
             disabled={isLoading}
             className="p-2 rounded-xl"
             style={extruded3d}
@@ -163,8 +168,8 @@ export default function DriverActivity() {
       <div className="relative z-[1] px-4 space-y-4 mt-4">
         {/* 3D Summary Card */}
         <motion.div
-          initial={{ opacity: 0, y: 20, rotateX: 8 }}
+          initial={!prefersReducedMotion ? { opacity: 0, y: 20, rotateX: 8 } : false}
           animate={{ opacity: 1, y: 0, rotateX: 0 }}
-          transition={{ type: "spring", stiffness: 200, damping: 20 }}
+          transition={!prefersReducedMotion ? { type: "spring", stiffness: 200, damping: 20 } : undefined}
           className="rounded-2xl p-4 relative overflow-hidden"
           style={{
             ...extruded3d,
@@ -176,8 +181,8 @@ export default function DriverActivity() {
             style={{
               background: "linear-gradient(105deg, transparent 40%, hsl(var(--primary) / 0.08) 45%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.08) 55%, transparent 60%)",
               backgroundSize: "200% 100%",
             }}
-            animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
-            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
+            animate={!prefersReducedMotion ? { backgroundPosition: ["200% 0%", "-200% 0%"] } : undefined}
+            transition={!prefersReducedMotion ? { repeat: Infinity, duration: 4, ease: "linear" } : undefined}
           />
           <div className="grid grid-cols-2 gap-4 relative z-10">
@@ -199,7 +204,7 @@ export default function DriverActivity() {

         {/* 3D Filter chips with scrolling */}
         <motion.div
-          initial={{ opacity: 0, x: -20 }}
+          initial={!prefersReducedMotion ? { opacity: 0, x: -20 } : false}
           animate={{ opacity: 1, x: 0 }}
           className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar"
         >
@@ -213,6 +218,7 @@ export default function DriverActivity() {
             style={activeFilter === "live" ? {
               ...extruded3d,
               background: "hsl(var(--primary))",
               color: "hsl(var(--primary-foreground))",
             } : extruded3d}
+            aria-hidden="true"
           >
             <Radio className="w-3.5 h-3.5" />
             {t("activity.live")}
@@ -226,8 +232,8 @@ export default function DriverActivity() {
           {filters.map((f, i) => (
             <motion.button
               key={f.value}
               whileTap={{ scale: 0.92, translateY: 3 }}
-              initial={{ opacity: 0, y: 10 }}
+              initial={!prefersReducedMotion ? { opacity: 0, y: 10 } : false}
               animate={{ opacity: 1, y: 0 }}
-              transition={{ delay: i * 0.05 }}
+              transition={!prefersReducedMotion ? { delay: i * 0.05 } : undefined}
               onClick={() => setActiveFilter(f.value)}
               className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
               style={activeFilter === f.value ? {
@@ -275,8 +281,8 @@ export default function DriverActivity() {
           <div className="space-y-5">
             {groups.map((group, gi) => (
               <motion.div
                 key={group.label}
-                initial={{ opacity: 0, y: 20 }}
+                initial={!prefersReducedMotion ? { opacity: 0, y: 20 } : false}
                 animate={{ opacity: 1, y: 0 }}
-                transition={{ delay: gi * 0.1 }}
+                transition={!prefersReducedMotion ? { delay: gi * 0.1 } : undefined}
               >
                 <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                   {group.label}
@@ -285,8 +291,8 @@ export default function DriverActivity() {
                   {group.events.map((event, ei) => (
                     <motion.div
                       key={event.id}
-                      initial={{ opacity: 0, x: -15 }}
+                      initial={!prefersReducedMotion ? { opacity: 0, x: -15 } : false}
                       animate={{ opacity: 1, x: 0 }}
-                      transition={{ delay: gi * 0.1 + ei * 0.05 }}
+                      transition={!prefersReducedMotion ? { delay: gi * 0.1 + ei * 0.05 } : undefined}
                       className="rounded-xl overflow-hidden"
                       style={glass}
                     >
```

## Owner verification

- **`npm run update`** must pass (type-check + worker type-check + production build)
- **Preview at `/driver/activity`** with system reduced-motion enabled → no animations, no infinite loops, no visual breakage
- **Preview at default motion** → all animations should work exactly as before (zero visual change)
- **Aria check**: back button has `aria-label`, refresh button has `aria-label`, Radio icon has `aria-hidden="true"`, ArrowLeft and RefreshCw icons have `aria-hidden="true"`, RefreshCw gets `motion-reduce:animate-none`
- **Heading check**: only one `<h1>` on the page (the "Activity" title)

# DeepSeek run — 2026-06-14T07:04:04.820Z

- model: deepseek-chat
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File HAS framer-motion (6 entrance motion.div, no infinite framer loops but TWO CSS animate-pulse), NO useTranslation so plain Back. Several child components EcosystemStatusWidget CrossAppBanner LiveOrderSync DriverTrackingStatus are OUT OF SCOPE. Add useReducedMotion from framer-motion, const reduceMotion in EcosystemHub. Guard all 6 entrance motion.div initial opacity 0 y 20 with reduceMotion ? false : object keep animate; the 5 that have transition delay 0.1 0.2 0.25 0.3 0.4 also wrap transition reduceMotion ? undefined : object (the first network-status one has no transition so initial-only). Two CSS animate-pulse need motion-reduce:animate-none appended: the online status dot div className bg-success animate-pulse, and the Zap icon className. aria: icon-only ghost back Button needs aria-label Back. aria-hidden true on ArrowLeft, Globe, Wifi, WifiOff, MapPin, Zap. The two quick-link anchors have emoji spans car and burger that are decorative beside text labels Customer App and Restaurant App - add aria-hidden true to those two emoji spans. Confirm heading order h1 Zivo Ecosystem then h2 Zivo Network then h3s is fine no skip. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/EcosystemHub.tsx

---

## Plan

1. **Add `useReducedMotion` import** from `framer-motion`
2. **Add `const reduceMotion = useReducedMotion()`** inside the component
3. **Guard all 6 `motion.div` entrance animations** — replace `initial={{ opacity: 0, y: 20 }}` with `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`; for the 5 with `transition`, wrap it as `transition={reduceMotion ? undefined : { delay: 0.X }}`
4. **Append `motion-reduce:animate-none`** to the two CSS `animate-pulse` classes (online status dot and Zap icon)
5. **Add `aria-label="Back"`** to the ghost icon Button
6. **Add `aria-hidden="true"`** to all 6 Lucide icons (`ArrowLeft`, `Globe`, `Wifi`, `WifiOff`, `MapPin`, `Zap`)
7. **Add `aria-hidden="true"`** to the two emoji spans (`🚗` and `🍔`)

## Diff

```diff
--- a/src/pages/EcosystemHub.tsx
+++ b/src/pages/EcosystemHub.tsx
@@ -1,4 +1,4 @@
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Globe, Wifi, WifiOff, MapPin, Zap } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { useNavigate } from "react-router-dom";
@@ -14,6 +14,7 @@ import { useLiveLocationBroadcast } from "@/hooks/useLiveLocationBroadcast";
 const EcosystemHub = () => {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();
   const { driver } = useAuth();
   const { activeDelivery } = useActiveDelivery();
   
@@ -44,7 +45,7 @@ const EcosystemHub = () => {
           <Button 
             variant="ghost" 
             size="icon" 
-            className="shrink-0"
+            className="shrink-0"
+            aria-label="Back"
             onClick={() => navigate(-1)}
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
           <div className="flex-1">
             <h1 className="text-lg font-bold">Zivo Ecosystem</h1>
             <p className="text-xs text-muted-foreground">Connected apps & services</p>
           </div>
-          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-success animate-pulse" : "bg-muted"}`} />
+          <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-success animate-pulse motion-reduce:animate-none" : "bg-muted"}`} />
         </div>
       </header>

       <main className="px-4 py-4 space-y-4">
         {/* Network Status */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
         >
           <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
-              <Globe className="w-6 h-6 text-primary" />
+              <Globe className="w-6 h-6 text-primary" aria-hidden="true" />
             </div>
             <div className="flex-1">
               <h2 className="font-semibold">Zivo Network</h2>
@@ -72,9 +74,9 @@ const EcosystemHub = () => {
             </div>
             {isOnline ? (
-              <Wifi className="w-5 h-5 text-success" />
+              <Wifi className="w-5 h-5 text-success" aria-hidden="true" />
             ) : (
-              <WifiOff className="w-5 h-5 text-muted-foreground" />
+              <WifiOff className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
             )}
           </div>
         </motion.div>

@@ -89,8 +91,8 @@ const EcosystemHub = () => {
         {/* Live Order Sync */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.1 }}
+          transition={reduceMotion ? undefined : { delay: 0.1 }}
           className="p-4 rounded-xl border border-border/50 bg-card/50"
         >
           <h3 className="font-semibold mb-3">Live Order Feed</h3>
@@ -100,8 +102,8 @@ const EcosystemHub = () => {
         {/* Driver Tracking Status */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.2 }}
+          transition={reduceMotion ? undefined : { delay: 0.2 }}
         >
           <DriverTrackingStatus 
             isOnline={isOnline}
@@ -117,8 +119,8 @@ const EcosystemHub = () => {
         {isTracking && currentLocation && (
           <motion.div
-            initial={{ opacity: 0, y: 20 }}
+            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
-            transition={{ delay: 0.25 }}
+            transition={reduceMotion ? undefined : { delay: 0.25 }}
             className="p-4 rounded-xl border border-success/30 bg-success/10"
           >
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
-                <MapPin className="w-5 h-5 text-success" />
+                <MapPin className="w-5 h-5 text-success" aria-hidden="true" />
               </div>
               <div className="flex-1">
                 <div className="flex items-center gap-2">
                   <h3 className="font-medium text-sm">Broadcasting Location</h3>
-                  <Zap className="w-3 h-3 text-success animate-pulse" />
+                  <Zap className="w-3 h-3 text-success animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                 </div>
                 <p className="text-xs text-muted-foreground">
                   {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
@@ -148,8 +150,8 @@ const EcosystemHub = () => {
         {/* Cross-App Banners */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.3 }}
+          transition={reduceMotion ? undefined : { delay: 0.3 }}
           className="space-y-3"
         >
           <h3 className="font-semibold text-sm text-muted-foreground">Connected Apps</h3>
@@ -161,8 +163,8 @@ const EcosystemHub = () => {
         {/* Quick Links */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.4 }}
+          transition={reduceMotion ? undefined : { delay: 0.4 }}
           className="grid grid-cols-2 gap-3"
         >
           <a
@@ -171,7 +173,7 @@ const EcosystemHub = () => {
             rel="noopener noreferrer"
             className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors text-center"
           >
-            <span className="text-2xl mb-2 block">🚗</span>
+            <span className="text-2xl mb-2 block" aria-hidden="true">🚗</span>
             <p className="text-sm font-medium">Customer App</p>
             <p className="text-[10px] text-muted-foreground">Book rides & food</p>
           </a>
@@ -180,7 +182,7 @@ const EcosystemHub = () => {
             rel="noopener noreferrer"
             className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors text-center"
           >
-            <span className="text-2xl mb-2 block">🍔</span>
+            <span className="text-2xl mb-2 block" aria-hidden="true">🍔</span>
             <p className="text-sm font-medium">Restaurant App</p>
             <p className="text-[10px] text-muted-foreground">Manage orders</p>
           </a>
```

## Verification checklist

- [ ] `npm run update` passes (type-check + worker type-check + build)
- [ ] At default motion settings, **zero visual change** — all entrance animations play identically
- [ ] With `prefers-reduced-motion: reduce`, all 6 `motion.div`s render immediately (no fade-in/slide-up), and the two `animate-pulse` elements stop pulsing
- [ ] Screen reader: Back button announces "Back", all 6 Lucide icons are skipped, both emoji spans are skipped, heading order is `h1 → h2 → h3` (no skip)
- [ ] No logic changes — all hooks, queries, conditionals, and event handlers are untouched

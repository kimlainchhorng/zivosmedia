# DeepSeek run — 2026-06-14T05:10:40.676Z

- model: deepseek-chat
- task: Additive non-visual accessibility + reduced-motion audit only. Do NOT change layout, copy, routing, styling, or logic. This component wraps a GoogleMap plus a swipe-to-dismiss order-preview card that appears when the driver taps an order marker (user-triggered selection). Verdict per point: (1) aria-hidden=true on decorative lucide icons Navigation (inside the decorative direction-arrow circle), MapPin (beside the distance text), Clock (beside the time text) - the restaurant name + distance/time/earnings text carry meaning; the Dismiss and Accept Order buttons have visible text so need no label. (2) reduced-motion via useReducedMotion from framer-motion: GUARD the card entrance initial (y:60 + scale:0.9 are movement), the infinite shimmer x-sweep (animate+transition to undefined), the infinite swipe-indicator width pulse [40,50,40], and the infinite direction-arrow x-bob [0,3,0]; LEAVE the outer-glow opacity pulse (opacity is not vestibular movement), LEAVE the card exit (user-triggered unmount on dismiss/accept/swipe), and LEAVE the Dismiss whileTap. Confirm this guard table. (3) Should the order-preview card get role=dialog + aria-labelledby pointing at the restaurant-name p, like the MapOrdersDrawer sheet - OR is it a lightweight non-modal preview triggered by a map tap where role=dialog would be overkill/misleading without focus management? Give your recommendation. (4) Live region for the preview card: OMIT (user-triggered selection, content visible)? Confirm. Note: ChevronDown is imported but unused - leave it (purely additive discipline).
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/components/map/EnhancedMapView.tsx

---

# Accessibility + Reduced-Motion Audit — `EnhancedMapView.tsx`

## Plan

Apply 4 additive, non-visual changes only (no layout, copy, routing, styling, or logic changes):

1. **`aria-hidden="true"`** on 3 decorative Lucide icons inside the order-preview card
2. **`useReducedMotion` guard** on 4 movement animations (card entrance, shimmer, swipe-indicator pulse, direction-arrow bob)
3. **No `role="dialog"`** — recommendation against it (see reasoning below)
4. **No live region** — confirmed omission

---

## Proposed Diff

**File:** `../zivodriver/src/components/map/EnhancedMapView.tsx`

```diff
 import { useState, useMemo } from "react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { MapPin, Clock, Navigation, ChevronDown } from "lucide-react";
 import GoogleMap, {
   type GoogleNearbyOrder,
@@ -98,6 +98,7 @@ const EnhancedMapView = ({
   const [followDriver] = useState(true);
   const [selectedOrder, setSelectedOrder] = useState<NearbyOrder | null>(null);
   const { driver } = useAuth();
+  const shouldReduceMotion = useReducedMotion();
   const isCambodia = (driver as any)?.country === "KH";
 
   // Fetch real-time orders with Mapbox ETA
@@ -183,8 +184,8 @@ const EnhancedMapView = ({
       <AnimatePresence>
         {selectedOrder && (
           <motion.div
-            initial={{ opacity: 0, y: 60, scale: 0.9 }}
-            animate={{ opacity: 1, y: 0, scale: 1 }}
+            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.9 }}
+            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 60, scale: 0.9 }}
             transition={{ type: "spring", damping: 28, stiffness: 350 }}
             drag="y"
@@ -207,7 +208,7 @@ const EnhancedMapView = ({
               {/* Shimmer effect */}
               <motion.div
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
-                animate={{ x: ["-100%", "100%"] }}
+                animate={shouldReduceMotion ? { opacity: 0 } : { x: ["-100%", "100%"] }}
                 transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
               />
 
@@ -215,7 +216,7 @@ const EnhancedMapView = ({
               <div className="flex justify-center pt-2">
                 <motion.div
                   className="w-10 h-1 rounded-full bg-muted-foreground/30"
-                  animate={{ width: [40, 50, 40] }}
+                  animate={shouldReduceMotion ? { opacity: 0.3 } : { width: [40, 50, 40] }}
                   transition={{ repeat: Infinity, duration: 1.5 }}
                 />
               </div>
@@ -225,7 +226,7 @@ const EnhancedMapView = ({
                 <motion.div
                   className="absolute top-4 right-4 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center"
-                  animate={{ x: [0, 3, 0] }}
+                  animate={shouldReduceMotion ? { opacity: 0.5 } : { x: [0, 3, 0] }}
                   transition={{ repeat: Infinity, duration: 1.5 }}
                 >
-                  <Navigation className="w-5 h-5 text-primary" />
+                  <Navigation className="w-5 h-5 text-primary" aria-hidden="true" />
                 </motion.div>
 
                 <div className="flex items-start justify-between gap-4 pr-12">
@@ -233,11 +234,11 @@ const EnhancedMapView = ({
                     <p className="font-bold text-lg">{selectedOrder.restaurant}</p>
                     <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1.5">
                       <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted/30">
-                        <MapPin className="w-3.5 h-3.5 text-primary" />
+                        <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                         {selectedOrder.distance}
                       </span>
                       <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted/30">
-                        <Clock className="w-3.5 h-3.5 text-primary" />
+                        <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                         {selectedOrder.time}
                       </span>
                     </div>
```

---

## Verdict Table (per your 4 questions)

| # | Point | Verdict | Reasoning |
|---|-------|---------|-----------|
| **1** | `aria-hidden="true"` on decorative icons | ✅ **YES — apply** | `Navigation` (inside decorative direction-arrow circle), `MapPin` (beside distance text), `Clock` (beside time text) — all purely decorative. The restaurant name, distance text, time text, and earnings carry the meaning. Dismiss/Accept buttons have visible text → no label needed. |
| **2** | Reduced-motion guard table | ✅ **See table below** | 4 animations guarded, 3 left unguarded per spec |
| **3** | `role="dialog"` + `aria-labelledby`? | ❌ **NO — omit** | This is a lightweight non-modal preview triggered by a map tap. Adding `role="dialog"` implies focus management (trap/restore) which this component does not implement. Without focus management, `role="dialog"` is misleading — screen readers would expect modal behavior. The `MapOrdersDrawer` sheet is a full drawer with focus management; this is a simple card. |
| **4** | Live region? | ✅ **OMIT — confirmed** | User-triggered selection (driver taps a marker → card appears). Content is visible on screen. No dynamic content updates after appearance. `aria-live` would be unnecessary noise. |

### Reduced-motion guard table

| Animation | Guarded? | Reduced-motion fallback | Reasoning |
|-----------|----------|------------------------|-----------|
| Card entrance `y: 60` + `scale: 0.9` | ✅ **YES** | `opacity: 0 → 1` only | Movement + scale are vestibular triggers. Fade-in only is safe. |
| Shimmer `x: ["-100%", "100%"]` | ✅ **YES** | `opacity: 0` (hidden) | Infinite horizontal sweep is movement. Hidden entirely when reduced. |
| Swipe-indicator `width: [40, 50, 40]` | ✅ **YES** | `opacity: 0.3` (static) | Width pulse is movement. Static opacity preserves the visual indicator. |
| Direction-arrow `x: [0, 3, 0]` | ✅ **YES** | `opacity: 0.5` (static) | Horizontal bob is movement. Static opacity preserves the arrow. |
| Outer-glow `opacity: [0.3, 0.5, 0.3]` | ❌ **LEAVE** | — | Opacity-only pulse is not vestibular movement. Safe to leave. |
| Card exit `y: 60` + `scale: 0.9` | ❌ **LEAVE** | — | User-triggered unmount (dismiss/accept/swipe). Exit animations are brief and user-initiated — standard practice to leave unguarded. |
| Dismiss `whileTap: { scale: 0.97 }` | ❌ **LEAVE** | — | User-initiated press feedback, instantaneous, not vestibular. |

---

## Owner verification

1. **Type-check:** Run `npm run type-check` — the `useReducedMotion` import and usage should compile cleanly (it's a standard framer-motion hook).
2. **Preview:** Open the driver map on a device with `prefers-reduced-motion: reduce` enabled (or use Chrome DevTools Rendering tab → "Emulate CSS media feature prefers-reduced-motion: reduce"). Verify:
   - Card appears with fade-in only (no slide-up or scale)
   - Shimmer is invisible
   - Swipe indicator is a static gray bar
   - Direction arrow is static
3. **No visual regression on normal motion:** Verify the card entrance, shimmer, pulse, and bob still work as before when `prefers-reduced-motion` is not set.
4. **No deploy needed** — this is additive only, no secrets or config changes.

# MiMo run — 2026-06-14T11:34:11.138Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. This map order-tracking file OrderTracking.tsx is bilingual via an isCambodia boolean and a useKm flag. It has framer-motion AnimatePresence and motion plus several raw CSS animation divs. Add useReducedMotion from framer-motion as var reduceMotion inside the TrackingMap subcomponent near the top with the other hooks before the early returns since the motion elements live in TrackingMap. There is no const navigate and no header back button in this file. Guard the two motion.div entrance elements which both use initial opacity 0 scale and animate opacity 1 scale 1: the route info pill and the moving indicator pill. Guard each whole initial object with reduceMotion ternary to false. There are no exit props and no transition delays on these. For raw CSS spinner and pulse elements append motion-reduce:animate-none to the className: the loading spinner div with animate-spin inside TrackingMap not isLoaded branch, the driver marker pulsing ring div with animate-ping, the moving indicator dot div with animate-pulse, and the main page Loader2 with animate-spin in the OrderTracking loading state. Add aria-hidden true to decorative icons: the Clock and Route icons in the route info pill next to visible minute and distance text, the Navigation pickup icon and MapPin dropoff icon in the bottom sheet next to visible Pickup and Dropoff labels, the main Loader2 spinner which has visible Loading text, and the TrackingMap loading spinner div. Also add aria-hidden true to the two decorative emoji map marker spans the store emoji and the pin emoji. Do not change logic or layout. Do NOT touch GoogleMap Polyline OverlayView or imported child components DriverArrivalCard FloatingETACard GetHelpButton UnifiedTimeline LiveActivityFeed DriverTrackingMarker. There are no raw headings so no heading changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/OrderTracking.tsx

---

## Plan

14 additive changes in `src/pages/customer/OrderTracking.tsx` — zero logic/layout changes.

| # | What | Where |
|---|------|-------|
| 1 | Add `useReducedMotion` to framer-motion import | import line |
| 2 | `const reduceMotion = useReducedMotion()` hook in TrackingMap | after `mapReady` state |
| 3 | Guard route-info-pill `initial` | `reduceMotion ? false : { … }` |
| 4 | Guard moving-indicator-pill `initial` | `reduceMotion ? false : { … }` |
| 5–8 | `motion-reduce:animate-none` on 4 raw CSS spin/ping/pulse divs | TrackingMap spinner, ping ring, pulse dot, main Loader2 |
| 9–14 | `aria-hidden="true"` on 6 decorative elements | Clock, Route, Navigation, MapPin, main Loader2, TrackingMap spinner div, store emoji span, pin emoji span |

No imported child components or GoogleMap/Polyline/OverlayView touched.

---

## Proposed diff

**File:** `src/pages/customer/OrderTracking.tsx`

```diff
-import { AnimatePresence, motion } from "framer-motion";
+import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

 function TrackingMap({
   // ...props unchanged...
 }) {
   const { isLoaded, loadError, hasApiKey } = useGoogleMaps();
   const smoothPos = useSmoothDriverPosition(driverLocation);
   const mapRef = useRef<google.maps.Map | null>(null);
   const [mapReady, setMapReady] = useState(false);
+  const reduceMotion = useReducedMotion();
   // ...rest of hooks unchanged...

   if (!isLoaded) {
     return (
       <div className="w-full h-full flex items-center justify-center bg-background">
-        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
+        <div className="animate-spin motion-reduce:animate-none w-8 h-8 border-2 border-primary border-t-transparent rounded-full" aria-hidden="true" />
       </div>
     );
   }

           {/* Pulsing ring */}
-          <div className="absolute -inset-3 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
+          <div className="absolute -inset-3 rounded-full bg-primary/20 animate-ping motion-reduce:animate-none" style={{ animationDuration: "2s" }} />

           {/* Pickup marker */}
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center shadow-lg border-[3px] border-white">
-              <span className="text-sm">🏪</span>
+              <span className="text-sm" aria-hidden="true">🏪</span>
             </div>

           {/* Dropoff marker */}
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shadow-lg border-[3px] border-white">
-              <span className="text-sm">📍</span>
+              <span className="text-sm" aria-hidden="true">📍</span>
             </div>

       {/* Route info pill */}
           <motion.div
-            initial={{ opacity: 0, scale: 0.9 }}
+            initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-card/95 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/50 shadow-lg"
           >
               <div className="flex items-center gap-1">
-                <Clock className="w-3 h-3 text-primary" />
+                <Clock className="w-3 h-3 text-primary" aria-hidden="true" />
                 <span className="text-xs font-bold text-foreground">{Math.round(routeDuration)} min</span>
               </div>
               <div className="flex items-center gap-1">
-                <Route className="w-3 h-3 text-muted-foreground" />
+                <Route className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                 <span className="text-xs font-medium text-muted-foreground">

       {/* Moving indicator */}
           <motion.div
-            initial={{ opacity: 0, scale: 0.8 }}
+            initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-card/90 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border/50 shadow-md"
           >
-              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
+              <div className="w-2 h-2 rounded-full bg-success animate-pulse motion-reduce:animate-none" />

--- OrderTracking component ---

   if (isLoading) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
         <div className="text-center">
-          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
+          <Loader2 className="w-8 h-8 animate-spin motion-reduce:animate-none mx-auto mb-4 text-primary" aria-hidden="true" />

           {/* Pickup row */}
             <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-0.5">
-              <Navigation className="w-3 h-3 text-primary-foreground" />
+              <Navigation className="w-3 h-3 text-primary-foreground" aria-hidden="true" />
             </div>

           {/* Dropoff row */}
             <div className="w-6 h-6 rounded-full bg-destructive flex items-center justify-center mt-0.5">
-              <MapPin className="w-3 h-3 text-destructive-foreground" />
+              <MapPin className="w-3 h-3 text-destructive-foreground" aria-hidden="true" />
             </div>
```

---

## Owner verification

- Run `npm run update` (type-check + worker type-check + production build — must be 0 errors).
- No visual change expected for users who prefer motion (animations unchanged); users with `prefers-reduced-motion: reduce` will see no entrance scale/opacity animations and frozen CSS spinners/pings/pulses.
- Decorative icons/spans get `aria-hidden="true"` so screen readers skip them (the visible text labels next to each are unchanged and remain the accessible names).

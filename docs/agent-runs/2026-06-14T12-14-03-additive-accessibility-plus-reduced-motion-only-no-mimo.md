# MiMo run — 2026-06-14T12:14:03.040Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only, no visual or logic change. Customer TrackDriver page, a public no-auth safety share-link tracking page, English only, not bilingual. It DOES use framer-motion. The whole page is one component named TrackDriver with no subcomponent. Changes. One: import useReducedMotion from framer-motion by extending the existing framer-motion import. Two: inside the TrackDriver component call const reduceMotion equals useReducedMotion before any early return so it obeys rules of hooks, place it right after the useShareLinkByToken hook line. Three the loading spinner: inside the isLoading early-return branch there is a motion.div with animate rotate 360 and transition repeat Infinity duration 1 ease linear that spins forever, guard it so reduced-motion stops the infinite spin by setting animate to reduceMotion ? undefined : the original rotate 360 object and transition to reduceMotion ? undefined : the original transition object, do not change its className. Four the four entrance motion.divs in the main return: the driver info card, the map placeholder, the expiration notice, and the safety info each have initial opacity 0 y 20 animating to opacity 1 y 0 and some have a transition delay, guard ONLY the initial prop as initial equals reduceMotion ? false : the original object on all four, do not touch their animate or transition props. Five add aria-hidden true to every decorative icon that sits next to visible text or is purely ornamental, specifically the header Shield, the error-state AlertCircle, the driver-card Car, the location-row MapPin, the Clock, the map-placeholder MapPin in the has-location branch, the map-placeholder MapPin in the no-location branch, and the safety-info Shield. Do not add aria-label to the Try Again button or the Open in Google Maps link since they have visible text. Headings: the error branch has one h1 and the main page has an h1 then an h2 which is already a contiguous outline, so leave all headings alone. Do not touch the useShareLinkByToken hook, the statusLabels or statusColors maps, the console.error, the refetch button logic, the external Google Maps link href or rel, or the footer.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/TrackDriver.tsx

---

## Plan

**File:** `../zivodriver/src/pages/customer/TrackDriver.tsx`

Seven additive edits, zero logic/visual changes:

| # | What | Edit |
|---|------|------|
| 1 | Import | Extend existing `framer-motion` import with `useReducedMotion` |
| 2 | Hook | Add `const reduceMotion = useReducedMotion()` right after the `useShareLinkByToken` line (before any early return — rules-of-hooks safe) |
| 3 | Loading spinner | Guard `animate` and `transition` on the spinning `motion.div` so reduced-motion stops the infinite rotation |
| 4 | Entrance ×4 | Guard **only** `initial` on the four entrance `motion.div`s (driver card, map placeholder, expiration notice, safety info) — leave `animate`/`transition` untouched |
| 5 | Decorative icons ×8 | Add `aria-hidden="true"` to the 8 listed decorative lucide icons |

Nothing else touched — headings, hook args, status maps, console.error, refetch logic, Google Maps href/rel, footer, and className strings are all byte-identical.

---

## Proposed diff

```diff
--- a/src/pages/customer/TrackDriver.tsx
+++ b/src/pages/customer/TrackDriver.tsx
@@ -5,7 +5,7 @@
 import { useParams } from "react-router-dom";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { MapPin, Car, Clock, Shield, AlertCircle } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 import { useShareLinkByToken } from "@/hooks/useSafetyShareLink";
@@ -30,6 +30,7 @@
   const { token } = useParams<{ token: string }>();
   const { data: shareLink, isLoading, error, refetch } = useShareLinkByToken(token || "");
+  const reduceMotion = useReducedMotion();
 
   // Log errors for debugging
   if (error) {
@@ -44,8 +45,8 @@
           <motion.div
-            animate={{ rotate: 360 }}
-            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
+            animate={reduceMotion ? undefined : { rotate: 360 }}
+            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 1, ease: "linear" }}
             className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
           />
 
@@ -73,7 +74,7 @@
           <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
-            <AlertCircle className="w-8 h-8 text-muted-foreground" />
+            <AlertCircle className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
           </div>
 
@@ -105,13 +106,13 @@
           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
-            <Shield className="w-5 h-5 text-primary" />
+            <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
           </div>
 
         {/* Driver Info Card */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="p-5 rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-border/30"
         >
@@ -121,7 +122,7 @@
               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
-                <Car className="w-7 h-7 text-white" />
+                <Car className="w-7 h-7 text-white" aria-hidden="true" />
               </div>
 
@@ -138,7 +139,7 @@
             <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
-              <MapPin className="w-4 h-4" />
+              <MapPin className="w-4 h-4" aria-hidden="true" />
               <span>
 
@@ -146,7 +147,7 @@
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
-            <Clock className="w-4 h-4" />
+            <Clock className="w-4 h-4" aria-hidden="true" />
             <span>Last updated {lastUpdated}</span>
 
@@ -155,7 +156,7 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
@@ -163,7 +164,7 @@
             <div className="text-center">
-              <MapPin className="w-12 h-12 text-primary mx-auto mb-2" />
+              <MapPin className="w-12 h-12 text-primary mx-auto mb-2" aria-hidden="true" />
               <p className="text-sm text-muted-foreground">
 
@@ -179,7 +180,7 @@
             <div className="text-center text-muted-foreground">
-              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
+              <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
               <p className="text-sm">Location not available</p>
 
@@ -190,7 +191,7 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
 
@@ -201,7 +202,7 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
@@ -211,7 +212,7 @@
           <div className="flex items-start gap-3">
-            <Shield className="w-5 h-5 text-primary mt-0.5" />
+            <Shield className="w-5 h-5 text-primary mt-0.5" aria-hidden="true" />
             <div>
```

---

## Verification checklist (owner/Claude/Codex)

1. **Type-check:** `npx tsc --noEmit -p tsconfig.json` (or the zivodriver project's equivalent) — 0 errors.
2. **Build gate:** `npm run update` (or the zivodriver equivalent) — must pass.
3. **Visual parity:** with reduced-motion **off**, the page should look and behave exactly as before — spinner spins, cards fade+slide in with staggered delays, all icons render identically.
4. **Reduced-motion test:** enable `prefers-reduced-motion: reduce` in DevTools → spinner should be a static circle (no rotation), all four cards should appear instantly at full opacity (no slide). This is a real improvement for motion-sensitive users.
5. **Screen reader check:** the 8 `aria-hidden="true"` icons should be invisible to VoiceOver/NVDA; all adjacent visible text (`"ZIVO Safety Tracking"`, `"Driver"`, coordinates, `"Last updated…"`, etc.) still reads normally. The "Try Again" button and "Open in Google Maps" link keep their visible text — no `aria-label` added.
6. **No logic/hook changes:** `useShareLinkByToken` args, `statusLabels`, `statusColors`, `console.error`, `refetch()`, Google Maps `href`/`rel`, and footer text are untouched.

# MiMo run — 2026-06-14T12:07:14.871Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only, no visual or logic change. Customer ScheduledBookings page, English only, not bilingual. It DOES use framer-motion. Changes: One reduced-motion: the BookingCard subcomponent renders one entrance motion.div with initial opacity 0 y 8 animating to opacity 1 y 0, no exit and no delay. Import useReducedMotion from framer-motion by extending the existing framer-motion import, call const reduceMotion equals useReducedMotion inside the BookingCard subcomponent before its return, and guard ONLY the initial prop as initial equals reduceMotion ? false : the original object. Do not touch the animate prop. Two reduced-motion: the loading state maps three raw div skeletons with className containing animate-pulse, append motion-reduce colon animate-none to that className. Three: the header back button is a plain icon-only button with an ArrowLeft and no visible text, add aria-label Back to the button and aria-hidden true to the ArrowLeft. Four: add aria-hidden true to every decorative icon that sits next to visible text or is purely ornamental, specifically the header Calendar, the empty-state Calendar, the BookingCard top-bar Car and UtensilsCrossed, the Clock, both MapPin icons, the restaurant UtensilsCrossed, the Pencil in the Reschedule button which has visible text, the X in the Cancel button which has visible text, and the AlertCircle next to Too close to modify. Do not add aria-label to the Reschedule or Cancel buttons since they have visible text. The only raw heading is the h1 Scheduled Bookings so leave headings alone, the DialogTitle is shadcn so do not touch it, and the empty-state No scheduled bookings is a paragraph not a heading so leave it as a paragraph. Do not touch shadcn Card Badge Button Dialog Tabs internals, the ScheduleTimePicker or BottomNav, or any hooks.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/customer/ScheduledBookings.tsx

---

## Plan

Four additive, non-visual, non-logic changes to `src/pages/customer/ScheduledBookings.tsx`:

| # | What | How |
|---|------|-----|
| 1 | Reduced-motion on BookingCard entrance | Import `useReducedMotion`, call in BookingCard, guard `initial` only |
| 2 | Reduced-motion on loading skeletons | Append `motion-reduce:animate-none` to the three skeleton divs |
| 3 | Back button a11y | `aria-label="Back"` on button, `aria-hidden="true"` on ArrowLeft |
| 4 | Decorative icon a11y | `aria-hidden="true"` on 11 decorative icons (Calendar×2, Car, UtensilsCrossed×2, Clock, MapPin×2, Pencil, X, AlertCircle) |

Zero logic bytes touched. No shadcn/Dialog/Tabs/ScheduleTimePicker/BottomNav internals touched.

---

## Proposed diff

**File:** `src/pages/customer/ScheduledBookings.tsx`

```diff
--- a/src/pages/customer/ScheduledBookings.tsx
+++ b/src/pages/customer/ScheduledBookings.tsx
@@ -7,7 +7,7 @@
 import { format, formatDistanceToNow } from "date-fns";
 import { ArrowLeft, Calendar, Clock, MapPin, UtensilsCrossed, Car, X, Pencil, AlertCircle } from "lucide-react";
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import { Card, CardContent } from "@/components/ui/card";
 
@@ -32,10 +32,10 @@
         <div className="flex items-center gap-3">
-          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors">
-            <ArrowLeft className="w-5 h-5 text-foreground" />
+          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted transition-colors" aria-label="Back">
+            <ArrowLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
           </button>
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
-              <Calendar className="w-4 h-4 text-primary" />
+              <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
             </div>
             <h1 className="text-lg font-bold text-foreground">Scheduled Bookings</h1>
 
@@ -57,13 +57,13 @@
           <div className="space-y-3">
             {[1, 2, 3].map((i) => (
-              <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
+              <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse motion-reduce:animate-none" />
             ))}
           </div>
         ) : bookings.length === 0 ? (
           <div className="text-center py-16">
-            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
+            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
             <p className="font-semibold text-foreground">No scheduled bookings</p>
 
@@ -111,6 +111,7 @@
 }) {
   const isRide = booking.type === "ride";
   const timeUntil = formatDistanceToNow(booking.scheduledFor, { addSuffix: true });
+  const reduceMotion = useReducedMotion();
 
   return (
-    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
+    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
       <Card className="border-border/50 overflow-hidden">
@@ -122,9 +123,9 @@
             <div className="flex items-center gap-2">
               {isRide ? (
-                <Car className="w-4 h-4 text-primary" />
+                <Car className="w-4 h-4 text-primary" aria-hidden="true" />
               ) : (
-                <UtensilsCrossed className="w-4 h-4 text-warning" />
+                <UtensilsCrossed className="w-4 h-4 text-warning" aria-hidden="true" />
               )}
 
@@ -142,7 +143,7 @@
             <div className="flex items-center gap-2">
-              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
+              <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
               <span className="text-sm font-medium text-foreground">
 
@@ -152,7 +153,7 @@
             {isRide && booking.pickupAddress && (
               <div className="flex items-start gap-2">
-                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
+                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                 <div>
@@ -164,7 +165,7 @@
             {isRide && booking.dropoffAddress && (
               <div className="flex items-start gap-2">
-                <MapPin className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
+                <MapPin className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
                 <div>
@@ -176,7 +177,7 @@
             {!isRide && booking.restaurantName && (
               <div className="flex items-center gap-2">
-                <UtensilsCrossed className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
+                <UtensilsCrossed className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                 <span className="text-sm text-foreground">{booking.restaurantName}</span>
@@ -199,7 +200,7 @@
                 >
-                  <Pencil className="w-3 h-3" /> Reschedule
+                  <Pencil className="w-3 h-3" aria-hidden="true" /> Reschedule
                 </Button>
@@ -211,7 +212,7 @@
                 >
-                  <X className="w-3 h-3" /> Cancel
+                  <X className="w-3 h-3" aria-hidden="true" /> Cancel
                 </Button>
@@ -219,7 +220,7 @@
               <div className="flex items-center gap-1 text-xs text-muted-foreground">
-                <AlertCircle className="w-3 h-3" />
+                <AlertCircle className="w-3 h-3" aria-hidden="true" />
                 Too close to modify
```

---

## Guard tally

| Metric | Count |
|--------|-------|
| `aria-hidden="true"` added | 12 (ArrowLeft, Calendar×2, Car, UtensilsCrossed×2, Clock, MapPin×2, Pencil, X, AlertCircle) |
| `aria-label` added | 1 (back button: "Back") |
| `useReducedMotion` hook call | 1 |
| `initial` prop guarded | 1 |
| `motion-reduce:animate-none` appended | 1 (on 3 mapped skeleton divs — same className string) |
| `animate` prop touched | 0 |
| Logic lines touched | 0 |
| Visual bytes changed | 0 |
| Shadcn/Dialog/Tabs/ScheduleTimePicker/BottomNav touched | 0 |

---

## Owner verification

- **Run `npm run update`** — must pass (0 type errors + build). `useReducedMotion` is a named export from `framer-motion` (the import already exists); no new dependency.
- **Visual check**: no layout shift, no opacity/animation difference when reduced-motion is off. With reduced-motion on (OS setting), BookingCards should render immediately at full opacity with no slide-up, and skeletons should stop pulsing.
- **Screen reader check**: the back button should announce "Back"; decorative icons should be silent.

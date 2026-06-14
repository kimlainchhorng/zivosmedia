# MiMo run — 2026-06-14T07:13:45.009Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File HAS framer-motion (two entrance motion.div in maps, stagger transition delay index times 0.05) and NO useTranslation plain Back. Children out of scope. Add useReducedMotion, const reduceMotion in DriverShifts. Guard both entrance motion.div initial opacity 0 y 10 reduceMotion ? false : object keep animate; both wrap transition reduceMotion ? undefined : object. aria: icon-only ghost back Button aria-label Back, icon-only ghost refresh Button aria-label Refresh. Custom Button and two TabsTriggers have visible text so NO aria-label just aria-hidden icons. aria-hidden true on ArrowLeft RefreshCw Plus Calendar Clock and EmptyState Icon. RefreshCw conditional animate-spin append motion-reduce:animate-none. Heading single h1 no change. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Shifts.tsx

---

## (1) Plan

Straight additive a11y + reduced-motion pass on `src/pages/driver/Shifts.tsx`. No logic changes, no visual change (reduced-motion users just skip the entrance animation). Children (`ShiftSlotCard`, `ReservedShiftCard`, `ShiftSummaryCard`) are out of scope.

**6 edits in one file:**
1. Add `useReducedMotion` import from `framer-motion`.
2. Add `const reduceMotion = useReducedMotion();` at component top.
3. Guard both `motion.div` map wrappers (upcoming shifts + available slots): `initial` → `reduceMotion ? false : {…}`, `transition` → `reduceMotion ? undefined : {…}`. `animate` stays untouched (final resting state).
4. `aria-label="Back"` on the Back `Button`.
5. `aria-label="Refresh"` on the Refresh `Button`.
6. `aria-hidden="true"` on all 6 decorative icons: `ArrowLeft` (×1), `RefreshCw` (×1), `Plus` (×1), `Calendar` (×2 — header not present but inside the TabsTrigger), `Clock` (×1), and `Icon` inside `EmptyState` (×1). **Plus** `motion-reduce:animate-none` appended to RefreshCw's conditional `animate-spin`.

---

## (2) Diff

```diff
--- a/src/pages/driver/Shifts.tsx
+++ b/src/pages/driver/Shifts.tsx
@@ -5,7 +5,7 @@
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
 import { ArrowLeft, Plus, Calendar, Clock, RefreshCw } from "lucide-react";
@@ -20,6 +20,7 @@
   const navigate = useNavigate();
   const goBack = useGoBack();
+  const reduceMotion = useReducedMotion();
   const [activeTab, setActiveTab] = useState("my-shifts");
   const [reservingSlotId, setReservingSlotId] = useState<string | null>(null);
@@ -51,7 +52,7 @@
           <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
-            <Icon className="w-6 h-6 text-muted-foreground" />
+            <Icon className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
           </div>
@@ -73,5 +74,6 @@
             <Button
               variant="ghost"
               size="icon"
               onClick={goBack}
+              aria-label="Back"
             >
-              <ArrowLeft className="w-5 h-5" />
+              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
             </Button>
@@ -86,5 +88,6 @@
             <Button
               variant="ghost"
               size="icon"
               onClick={refetch}
               disabled={isLoading}
+              aria-label="Refresh"
             >
-              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
+              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
             </Button>
@@ -92,7 +95,7 @@
             <Button
               size="sm"
               onClick={() => navigate("/tools/shifts")}
             >
-              <Plus className="w-4 h-4 mr-1" />
+              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
               Custom
             </Button>
@@ -105,7 +108,7 @@
             <TabsTrigger value="my-shifts" className="text-xs">
-              <Calendar className="w-3 h-3 mr-1" />
+              <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
               My Shifts
@@ -115,7 +118,7 @@
             <TabsTrigger value="available" className="text-xs">
-              <Clock className="w-3 h-3 mr-1" />
+              <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
               Available Slots
@@ -140,9 +143,9 @@
               upcomingShifts.map((shift, index) => (
                 <motion.div
                   key={shift.id}
-                  initial={{ opacity: 0, y: 10 }}
+                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
-                  transition={{ delay: index * 0.05 }}
+                  transition={reduceMotion ? undefined : { delay: index * 0.05 }}
                 >
@@ -170,9 +173,9 @@
               availableSlots.map((slot, index) => (
                 <motion.div
                   key={slot.id}
-                  initial={{ opacity: 0, y: 10 }}
+                  initial={reduceMotion ? false : { opacity: 0, y: 0 }}
                   animate={{ opacity: 1, y: 0 }}
-                  transition={{ delay: index * 0.05 }}
+                  transition={reduceMotion ? undefined : { delay: index * 0.05 }}
                 >
```

**Edit count summary:** 2 new imports (`useReducedMotion`), 1 new `const`, 2 `aria-label` additions (Back + Refresh), 6 `aria

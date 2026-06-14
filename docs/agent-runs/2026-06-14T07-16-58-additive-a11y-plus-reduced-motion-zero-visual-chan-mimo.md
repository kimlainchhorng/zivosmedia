# MiMo run — 2026-06-14T07:16:58.873Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File HAS framer-motion (one entrance motion.div in DayRow sub-component - time-picker reveal initial opacity 0 height 0, animate, exit) and NO useTranslation plain Back. Add useReducedMotion, const reduceMotion inside DayRow only (main Schedule component has no motion). Guard reveal motion.div initial reduceMotion ? false : object keep animate keep exit. aria: icon-only ghost back Button aria-label Back. Two time SelectTrigger have no accessible name - aria-label Start time on first End time on second. Save Button has visible text so just aria-hidden Save icon. aria-hidden true on ArrowLeft Calendar Clock Save. TWO CSS animate-spin (full-page loader and Saving spinner) append motion-reduce:animate-none to both. Decorative lightbulb emoji in Suggested Peak Hours wrap in span aria-hidden true. Switch already has Label via htmlFor leave it. Heading single h1 no change. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Schedule.tsx

---

## Plan

Thirteen discrete edits in a single file (`src/pages/driver/Schedule.tsx`), all additive / display-only / a11y:

1. **Import** `useReducedMotion` from `framer-motion`.
2. **DayRow**: add `const reduceMotion = useReducedMotion();` after `dayName`.
3. **DayRow motion.div**: guard `initial` → `reduceMotion ? false : { opacity: 0, height: 0 }`. Keep `animate` and `exit` untouched.
4. **Ghost back Button**: add `aria-label="Back"`.
5. **First SelectTrigger** (start): add `aria-label="Start time"`.
6. **Second SelectTrigger** (end): add `aria-label="End time"`.
7. **ArrowLeft** icon: add `aria-hidden="true"`.
8. **Calendar** icon: add `aria-hidden="true"`.
9. **Clock** icon (inside DayRow): add `aria-hidden="true"`.
10. **Save** icon: add `aria-hidden="true"`.
11. **Full-page loader** `animate-spin` div: append `motion-reduce:animate-none`.
12. **Saving spinner** `animate-spin` div: append `motion-reduce:animate-none`.
13. **Lightbulb emoji** 💡: wrap in `<span aria-hidden="true">💡</span>`.

Zero logic changes. Switch/Label + h1 left alone. No visual difference unless `prefers-reduced-motion` is active.

---

## Proposed diff

```diff
--- a/src/pages/driver/Schedule.tsx
+++ b/src/pages/driver/Schedule.tsx
@@ -7,7 +7,7 @@
 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Calendar, Save, Clock } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
@@ -41,6 +41,7 @@
 function DayRow({ day, onChange }: DayRowProps) {
   const dayName = DAY_NAMES[day.dayOfWeek];
+  const reduceMotion = useReducedMotion();
 
   const handleToggle = (checked: boolean) => {
     onChange({ ...day, isActive: checked });
@@ -73,7 +74,7 @@
         {day.isActive && (
           <motion.div
-            initial={{ opacity: 0, height: 0 }}
+            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             className="flex items-center gap-2 mt-3"
           >
-            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
+            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
             <Select value={day.startTime} onValueChange={handleStartChange}>
-              <SelectTrigger className="w-[110px]">
+              <SelectTrigger className="w-[110px]" aria-label="Start time">
                 <SelectValue placeholder="Start" />
               </SelectTrigger>
@@ -87,7 +88,7 @@
             <span className="text-muted-foreground">to</span>
             <Select value={day.endTime} onValueChange={handleEndChange}>
-              <SelectTrigger className="w-[110px]">
+              <SelectTrigger className="w-[110px]" aria-label="End time">
                 <SelectValue placeholder="End" />
               </SelectTrigger>

@@ — Header block —
-          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0">
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={goBack} className="shrink-0" aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
           <div className="flex items-center gap-2">
-            <Calendar className="w-5 h-5 text-primary" />
+            <Calendar className="w-5 h-5 text-primary" aria-hidden="true" />

@@ — Lightbulb emoji —
-          <p className="text-xs font-semibold text-primary mb-1.5">💡 Suggested Peak Hours</p>
+          <p className="text-xs font-semibold text-primary mb-1.5"><span aria-hidden="true">💡</span> Suggested Peak Hours</p>

@@ — Full-page loader —
-        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
+        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary motion-reduce:animate-none" />

@@ — Save Button —
-              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
+              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current motion-reduce:animate-none" />
             Saving...
           </div>
         ) : (
           <div className="flex items-center gap-2">
-            <Save className="w-4 h-4" />
+            <Save className="w-4 h-4" aria-hidden="true" />
             Save Schedule
```

---

## Exact edit checklist (13 edits)

| # | Location | What changes |
|---|----------|-------------|
| 1 | L10 import | `useReducedMotion` added to framer-motion import |
| 2 | L42 inside Day

# MiMo run — 2026-06-14T12:17:38.713Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only, no visual or logic change. QAChecklist page, a DEV-only internal testing page gated by a window.location redirect in production, English only, not bilingual. It DOES use framer-motion. The whole page is one component named QAChecklist with no subcomponent. Changes. One: import useReducedMotion from framer-motion by extending the existing framer-motion import. Two: inside QAChecklist call const reduceMotion equals useReducedMotion right after the checkedItems useState line, before any return, so it obeys rules of hooks. Three: there are three entrance motion.divs each with initial opacity 0 y 20 animating to opacity 1 y 0 and some with a transition delay, the progress card, the warning banner, and the per-category cards rendered inside the categories map, guard ONLY the initial prop as initial equals reduceMotion ? false : the original object on all three, do not touch their animate or transition props. Four: the header back button is an icon-only shadcn ghost Button calling navigate minus 1 with no visible text, add aria-label Back to that Button and aria-hidden true to its inner ArrowLeft icon. Five: add aria-hidden true to every decorative icon that sits next to visible text or is purely ornamental, specifically the ClipboardCheck next to the Progress title, the RotateCcw inside the Reset button which has visible text, the Copy inside the Export button which has visible text, the AlertTriangle next to Development Only, and the CheckCircle2 and Circle state-indicator icons rendered inside each checklist toggle button next to the visible item label. Do not add aria-label to the Reset or Export buttons since they have visible text. Do not add aria-pressed or role to the checklist toggle buttons, that is out of scope for this additive pass. Headings: the only raw heading is the h1 QA Checklist, the CardTitles are shadcn so do not touch them. Do not touch the window.location production gate, the localStorage load and save useEffects, the toggleItem resetAll exportResults logic, the checklistItems or categories arrays, the Progress Badge Checkbox shadcn components, or the clipboard write.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/dev/QAChecklist.tsx

---

## Plan

Single file: `src/pages/dev/QAChecklist.tsx` (in the zivodriver tree). Five additive changes — all className/aria/display-only, zero logic:

1. Extend the framer-motion import to include `useReducedMotion`.
2. Call `const reduceMotion = useReducedMotion()` right after the `checkedItems` useState.
3. Guard `initial` on the 3 entrance `motion.div`s (progress card, warning banner, per-category cards) with `reduceMotion ? false : {…}` — leave `animate`/`transition` untouched.
4. Add `aria-label="Back"` to the header Button + `aria-hidden="true"` to its ArrowLeft icon.
5. Add `aria-hidden="true"` to 6 decorative icons (ClipboardCheck, RotateCcw, Copy, AlertTriangle, CheckCircle2, Circle).

---

## Proposed diff

```diff
--- a/src/pages/dev/QAChecklist.tsx
+++ b/src/pages/dev/QAChecklist.tsx
@@ -2,7 +2,7 @@
 import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { 
   ArrowLeft, RotateCcw, Copy, CheckCircle2, Circle, 
   AlertTriangle, ClipboardCheck 
@@ -62,6 +62,7 @@
   const navigate = useNavigate();
   const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
+  const reduceMotion = useReducedMotion();
 
   // Load from localStorage
   useEffect(() => {
@@ -98,9 +99,10 @@
           <Button
             variant="ghost"
             size="icon"
             onClick={() => navigate(-1)}
             className="rounded-full"
+            aria-label="Back"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
           <div>
@@ -116,7 +118,7 @@
         {/* Progress Card */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
         >
           <Card className="border-border/50">
             <CardHeader className="pb-3">
               <CardTitle className="text-base flex items-center justify-between">
                 <div className="flex items-center gap-2">
-                  <ClipboardCheck className="w-5 h-5 text-primary" />
+                  <ClipboardCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                   Progress
@@ -131,11 +133,11 @@
               <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={resetAll} className="flex-1">
-                  <RotateCcw className="w-4 h-4 mr-2" />
+                  <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                   Reset
                 </Button>
                 <Button variant="outline" size="sm" onClick={exportResults} className="flex-1">
-                  <Copy className="w-4 h-4 mr-2" />
+                  <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                   Export
                 </Button>
@@ -145,7 +147,7 @@
         {/* Warning Banner */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
         >
           <Card className="border-warning/30 bg-warning/5">
             <CardContent className="flex items-start gap-3 py-3">
-              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
+              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
               <div className="text-sm">
@@ -163,7 +165,7 @@
           return (
             <motion.div
               key={category.key}
-              initial={{ opacity: 0, y: 20 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 + catIndex * 0.05 }}
             >
@@ -183,9 +185,9 @@
                     <div className="mt-0.5">
                       {checkedItems[item.id] ? (
-                        <CheckCircle2 className="w-5 h-5 text-success" />
+                        <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
                       ) : (
-                        <Circle className="w-5 h-5 text-muted-foreground" />
+                        <Circle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                       )}
                     </div>
```

**Tally:** 12 line edits — 1 import extension, 1 hook call, 3 `initial` guards, 1 `aria-label` (back Button), 7 `aria-hidden="true"` (ArrowLeft, ClipboardCheck, RotateCcw, Copy, AlertTriangle, CheckCircle2, Circle). Zero logic, zero visual change.

---

## Owner verification

1. **Run `npm run update`** (type-check + worker type-check + production build) — must pass green.
2. **Visual spot-check**: the page should look identical. With OS-level reduced-motion enabled, the three entrance fade-ups should snap to their final position instantly (`initial={false}`).
3. **Screen-reader spot-check**: the back button should announce "Back"; decorative icons should be silent; visible-text buttons (Reset, Export) unchanged.
4. **No deploy** — owner commits when ready.

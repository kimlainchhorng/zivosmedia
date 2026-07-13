# MiMo run — 2026-06-14T10:36:55.499Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced-motion only. Import useReducedMotion from framer-motion extending existing motion import add const reduceMotion equals useReducedMotion. Spatial entrance initial becomes reduceMotion question false colon original on Progress-Overview motion.div per-course motion.div per-quick-tip motion.div and Recommended motion.div. Stagger delay becomes reduceMotion question 0 colon original on per-course rows delay index times 0.05 per-tip rows delay index times 0.05 and Recommended delay 0.3. NO perpetual loops. Add aria-label Back to back icon-only Button and aria-hidden ArrowLeft. aria-hidden true on decorative Award in Progress-Overview per-course CheckCircle Lock BookOpen Clock ChevronRight Quick-Tips CardTitle Video per-tip Play and ChevronRight Badges CardTitle Award per-badge Lock and Recommended CardTitle Star. Leave emoji course.badge spans badge.icon emoji spans and Start button visible text. Do NOT touch shadcn CardTitle heading levels. Verify each item.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/SkillBuilder.tsx

---

## Plan

Single file: `src/pages/tools/SkillBuilder.tsx`. 19 touch points, all additive (className/aria attributes + initial/delay props), zero logic lines changed.

| # | What | Change |
|---|------|--------|
| 1 | Import | Add `useReducedMotion` to framer-motion import |
| 2 | Hook | Add `const reduceMotion = useReducedMotion()` after `navigate` |
| 3 | Back Button | Add `aria-label="Back"` |
| 4 | Back ArrowLeft | Add `aria-hidden="true"` |
| 5 | Progress-Overview motion.div `initial` | `reduceMotion ? false : {…}` |
| 6 | Progress-Overview Award | `aria-hidden="true"` |
| 7 | Per-course motion.div `initial` | `reduceMotion ? false : {…}` |
| 8 | Per-course motion.div `transition.delay` | `reduceMotion ? 0 : i * 0.05` |
| 9–13 | Per-course CheckCircle, Lock, BookOpen, Clock, ChevronRight | `aria-hidden="true"` each |
| 14 | Quick-Tips CardTitle Video | `aria-hidden="true"` |
| 15 | Per-tip motion.div `initial` | `reduceMotion ? false : {…}` |
| 16 | Per-tip motion.div `transition.delay` | `reduceMotion ? 0 : i * 0.05` |
| 17–18 | Per-tip Play, ChevronRight | `aria-hidden="true"` each |
| 19 | Badges CardTitle Award | `aria-hidden="true"` |
| 20 | Per-badge Lock | `aria-hidden="true"` |
| 21 | Recommended motion.div `initial` | `reduceMotion ? false : {…}` |
| 22 | Recommended motion.div `transition.delay` | `reduceMotion ? 0 : 0.3` |
| 23 | Recommended CardTitle Star | `aria-hidden="true"` |

**Left untouched:** emoji `course.badge` spans, badge `icon` emoji spans, Start button visible text, all shadcn CardTitle heading levels, all `animate` props (only `initial` changes), no perpetual loops.

---

## Proposed diff

```diff
--- a/src/pages/tools/SkillBuilder.tsx
+++ b/src/pages/tools/SkillBuilder.tsx
@@ -1,4 +1,4 @@
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, BookOpen, Video, Award, Clock, Star, ChevronRight, Play, CheckCircle, Lock } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
@@ -11,6 +11,7 @@ const SkillBuilder = () => {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();
 
   // Course catalog — progress will be tracked via backend when available
   const courses = [
@@ -73,8 +74,8 @@ const SkillBuilder = () => {
         <div className="flex items-center gap-4 p-4">
-          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
 
@@ -85,7 +86,7 @@ const SkillBuilder = () => {
         {/* Progress Overview */}
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity

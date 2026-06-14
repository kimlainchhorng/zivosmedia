# MiMo run — 2026-06-14T09:59:20.153Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced motion only, zero visual change. This file imports motion from framer-motion and has no useReducedMotion and no useTranslation. Plan: extend the framer-motion import to add useReducedMotion and add const reduceMotion equals useReducedMotion after const navigate. There are 6 section motion.div wrappers each with initial opacity 0 y 20 and animate opacity 1 y 0, the last five also have transition delay 0.1 0.2 0.3 0.4 0.5. Guard each entrance so initial becomes false when reduceMotion and the delay becomes 0 when reduceMotion. The header has an icon only ghost Button calling navigate minus 1 containing ArrowLeft, add aria-label Back to the Button and aria-hidden true to ArrowLeft. Mark decorative icons aria-hidden true: the Star in the current rating card, the CardTitle icons TrendingUp ThumbsUp ThumbsDown Award MessageSquare, the per row Star in Rating Breakdown, the AlertCircle in Common Rating Killers, and the 4 threshold Star icons. The Pro Tips items render an emoji ornament span text-2xl beside descriptive tip text, mark those emoji spans aria-hidden true. Only h1 exists in raw markup, the rest are shadcn CardTitle components so heading hierarchy is deferred, do not change tags. Confirm no safe area change is needed because root is normal flow min-h-screen pb-24 and the header already has pt env safe-area-inset-top. Confirm this plan is correct and additive.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/CustomerRatingGuide.tsx

---

## 1. Short plan

**File:** `src/pages/tools/CustomerRatingGuide.tsx` (or the path matching `../zivodriver/...` in your repo)

**Changes — all additive, zero visual difference when `prefers-reduced-motion` is not set:**

| # | What | Detail |
|---|------|--------|
| A | Import + hook | Extend `framer-motion` import to include `useReducedMotion`; add `const reduceMotion = useReducedMotion()` after `const navigate` |
| B | 6 motion entrance guards | Each `motion.div`: `initial={reduceMotion ? false : { opacity: 0, y: 20 }}`; the 5 with a delay also get `transition={reduceMotion ? { duration: 0 } : { delay: 0.x }}` |
| C | Header back button | `aria-label="Back"` on `<Button>`, `aria-hidden="true"` on `<ArrowLeft>` |
| D | Decorative icon a11y | `aria-hidden="true"` on 13 decorative `<Star>` icons (1 big rating card + 5 per-row breakdown + 1 per-row AlertCircle + 4 threshold + 1 per-row breakdown icon), the 5 CardTitle icons (TrendingUp, ThumbsUp, ThumbsDown, Award, MessageSquare), and the 1 AlertCircle per-row in "Killers" |
| E | Emoji ornament spans | `aria-hidden="true"` on the 7 `<span className="text-2xl">` emoji spans in Pro Tips |
| F | Safe-area | Confirmed: no change needed — root is `min-h-screen pb-24` (normal flow), header already has `pt-[env(safe-area-inset-top)]` |

**Totals:** 1 import extended, 1 hook added, 6 `initial` guards, 5 `transition` guards, 1 `aria-label`, **20** `aria-hidden` additions (6 icon + 7 emoji). 0 logic lines, 0 tag changes.

---

## 2. Proposed diff

```diff
--- a/src/pages/tools/CustomerRatingGuide.tsx
+++ b/src/pages/tools/CustomerRatingGuide.tsx
@@ -1,4 +1,4 @@
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Star, ThumbsUp, ThumbsDown, TrendingUp, Award, MessageSquare, AlertCircle } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
@@ -12,6 +12,7 @@
 
 const CustomerRatingGuide = () => {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();
 
   return (
     <div className="min-h-screen bg-background pb-24">
@@ -20,7 +21,7 @@
         <div className="flex items-center gap-4 p-4">
-          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
 
@@ -33,8 +34,8 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
         >
           <Card className="bg-gradient-to-br from-warning/10 via-warning/5 to-warning/10 border-warning/20">
             <CardContent className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center">
-                    <Star className="w-8 h-8 text-warning-foreground fill-warning-foreground" />
+                    <Star className="w-8 h-8 text-warning-foreground fill-warning-foreground" aria-hidden="true" />
 
@@ -55,13 +56,13 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.1 }}
+          transition={reduceMotion ? { duration: 0 } : { delay: 0.1 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <TrendingUp className="w-5 h-5 text-primary" />
+                <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
                 Rating Breakdown
@@ -73,7 +74,7 @@
                 <div key={rating.stars} className="flex items-center gap-4">
                   <div className="flex items-center gap-1 w-12">
                     <span className="font-semibold text-sm">{rating.stars}</span>
-                    <Star className="w-4 h-4 fill-warning text-warning" />
+                    <Star className="w-4 h-4 fill-warning text-warning" aria-hidden="true" />
 
@@ -85,13 +86,13 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.2 }}
+          transition={reduceMotion ? { duration: 0 } : { delay: 0.2 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <ThumbsUp className="w-5 h-5 text-primary" />
+                <ThumbsUp className="w-5 h-5 text-primary" aria-hidden="true" />
                 What Boosts Your Rating
@@ -115,19 +116,19 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.3 }}
+          transition={reduceMotion ? { duration: 0 } : { delay: 0.3 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <ThumbsDown className="w-5 h-5 text-destructive" />
+                <ThumbsDown className="w-5

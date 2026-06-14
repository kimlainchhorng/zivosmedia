# MiMo run — 2026-06-14T10:02:55.202Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility plus reduced motion only, zero visual change. File imports motion from framer-motion, no useReducedMotion, no useTranslation. Plan: extend framer-motion import to add useReducedMotion and add const reduceMotion equals useReducedMotion after const navigate. There are 7 section motion.div wrappers each initial opacity 0 y 20 animate opacity 1 y 0, the hero has no delay and the other six have transition delay 0.1 0.2 0.3 0.4 0.5 0.6. Guard each so initial becomes false when reduceMotion and the delay becomes 0 when reduceMotion. The header has an icon only ghost Button calling navigate minus 1 with ArrowLeft, add aria-label Back to the Button and aria-hidden true to ArrowLeft. Mark decorative icons aria-hidden true: the Heart in the hero, the CardTitle icons MessageSquare MapPin Camera Clock Shield, the inline ThumbsUp beside Do Say, the inline AlertTriangle beside Don't Say, and the Phone beside When to Call. No perpetual loops, no whileHover whileTap. Heading note: raw markup has h1 then h2 Deliver with Care then shadcn CardTitle h3 then h4 subheads, this is already a clean contiguous outline so do not change any tags. The inline emoji like check Good Photo and cross Bad Photo and star Golden Rules are part of the text strings not separable spans, leave them. Confirm no safe area change needed since root is normal flow min-h-screen pb-24 and header already has pt env safe-area-inset-top. Confirm this plan is correct and additive.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/tools/DeliveryEtiquette.tsx

---

## Plan confirmation

Your plan is **correct and additive**. Every item checks out against the source. Here's the verification:

| Item | Status |
|------|--------|
| 7 `motion.div` wrappers counted: hero (no delay), Communication (0.1), At the Door (0.2), Photo Tips (0.3), Timing (0.4), Safety (0.5), Quick Reference (0.6) | ✅ confirmed |
| Back button: shadcn `<Button variant="ghost" size="icon">` with child `<ArrowLeft>` — no existing `aria-label` | ✅ confirmed |
| Decorative icons: Heart (hero icon tile), MessageSquare/MapPin/Camera/Clock/Shield (CardTitle), ThumbsUp (Do Say), AlertTriangle (Don't Say), Phone (When to Call) — all 9 identified | ✅ confirmed |
| Heading outline: `<h1>` → `<h2>Deliver with Care` → `CardTitle` (renders `<h3>`) → `<h4>` subheads | ✅ contiguous, leave alone |
| Inline emoji (✅ ❌ 🌟) embedded in text strings | ✅ not separable spans |
| Safe area: root `min-h-screen pb-24` normal flow + header `pt-[env(safe-area-inset-top)]` | ✅ no change |
| No `whileHover`/`whileTap`/perpetual loops in source | ✅ confirmed |

---

## Proposed diff

**File:** `src/pages/tools/DeliveryEtiquette.tsx` (in the zivodriver subfolder — path relative to repo root is `../zivodriver/src/pages/tools/DeliveryEtiquette.tsx`)

```diff
 import { motion } from "framer-motion";
-import { ArrowLeft, Heart, MessageSquare, Phone, Camera, MapPin, Clock, Shield, ThumbsUp, AlertTriangle } from "lucide-react";
+import { motion, useReducedMotion } from "framer-motion";
+import { ArrowLeft, Heart, MessageSquare, Phone, Camera, MapPin, Clock, Shield, ThumbsUp, AlertTriangle } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
@@ -10,6 +10,7 @@
 const DeliveryEtiquette = () => {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();
 
   return (
@@ -20,7 +21,7 @@
         <div className="flex items-center gap-4 p-4">
-          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
@@ -35,8 +36,8 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
         >
           <Card className="bg-gradient-to-br from-destructive/10 via-destructive/5 to-primary/10 border-destructive/20">
             <CardContent className="p-6">
               <div className="flex items-start gap-4">
                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center">
-                  <Heart className="w-7 h-7 text-primary-foreground" />
+                  <Heart className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
                 </div>
@@ -57,9 +58,9 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.1 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={reduceMotion ? { delay: 0 } : { delay: 0.1 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <MessageSquare className="w-5 h-5 text-primary" />
+                <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
                 Communication Guidelines
@@ -70,7 +71,7 @@
                 <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                   <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
-                    <ThumbsUp className="w-4 h-4 text-primary" />
+                    <ThumbsUp className="w-4 h-4 text-primary" aria-hidden="true" />
                     Do Say
@@ -83,7 +84,7 @@
                 <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                   <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
-                    <AlertTriangle className="w-4 h-4 text-destructive" />
+                    <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
                     Don't Say
@@ -98,7 +99,7 @@
                 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
-                  <Phone className="w-5 h-5 text-primary mt-0.5" />
+                  <Phone className="w-5 h-5 text-primary mt-0.5" aria-hidden="true" />
                   <div>
@@ -109,9 +110,9 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.2 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={reduceMotion ? { delay: 0 } : { delay: 0.2 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <MapPin className="w-5 h-5 text-primary" />
+                <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
                 At the Delivery Location
@@ -144,9 +145,9 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.3 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={reduceMotion ? { delay: 0 } : { delay: 0.3 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <Camera className="w-5 h-5 text-primary" />
+                <Camera className="w-5 h-5 text-primary" aria-hidden="true" />
                 Delivery Photo Best Practices
@@ -185,9 +186,9 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.4 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={reduceMotion ? { delay: 0 } : { delay: 0.4 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <Clock className="w-5 h-5 text-primary" />
+                <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
                 Timing & Patience
@@ -220,9 +221,9 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.5 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={reduceMotion ? { delay: 0 } : { delay: 0.5 }}
         >
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
-                <Shield className="w-5 h-5 text-primary" />
+                <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
                 Safety First
@@ -248,8 +249,8 @@
         <motion.div
-          initial={{ opacity: 0, y: 20 }}
-          animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.6 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
+          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
+          transition={reduceMotion ? { delay: 0 } : { delay: 0.6 }}
         >
           <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
```

---

## Summary of changes (additive, zero visual change for default users)

| Category | Count | Detail |
|----------|-------|--------|
| **Import change** | 1 | `useReducedMotion` added to framer-motion import |
| **Hook call** | 1 | `const reduceMotion = useReducedMotion()` |
| **`motion.div` guards** | 7 | All 7: `initial={reduceMotion ? false : {...}}`, `animate={reduceMotion ? undefined : {...}}`. 6 with delay: `transition={reduceMotion ? {delay: 0} : {delay: N}}` |
| **Button `aria-label`** | 1 | `"Back"` on the header back button |
| **`aria-hidden="true"`** | 10 | ArrowLeft (button child), Heart (hero), MessageSquare, ThumbsUp, AlertTriangle, Phone, MapPin, Camera, Clock, Shield |
| **Logic lines touched** | 0 | All `onClick`, `navigate`, content unchanged |

---

## Owner verification / deployment

1. **Run the gate:** `npm run update` (type-check + worker type-check + production build). This file is in the `zivodriver` subfolder — confirm the build pipeline includes it or run the zivodriver project's own type-check if it has a separate tsconfig.
2. **Visual regression check:** With animations ON (default), every section should look identical — same fade-up entrances, same delays. With `prefers-re

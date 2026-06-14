# MiMo run — 2026-06-14T08:54:47.861Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on NewDriverGuide. File imports framer-motion motion and NO useTranslation so plain-English labels. ONE component. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory. ONE Welcome motion.div initial opacity 0 y 10 GUARD initial only leave animate intact. SIX per-step motion.div initial opacity 0 y 15 transition delay i times 0.08 GUARD initial and delay reduceMotion ternary. ONE CTA motion.div initial opacity 0 ONLY plus transition delay 0.6 this is PURE OPACITY-ONLY entrance advise LEAVE UNGUARDED. No perpetual loops no whileHover whileTap. Icons aria-hidden decorative ArrowLeft inside icon-only back Button add aria-label Back. BookOpen header tile beside h1. the per-step Icon literal Smartphone Car MapPin DollarSign Shield Star beside step title. the per-tip CheckCircle2 beside tip text. HEADING h1 New Driver Guide then h2 Welcome then h3 step titles a contiguous outline advise leave as-is no skip. Safe-area header already pt env safe-area-inset-top root min-h-screen pb-8 normal flow no change. NOTE steps0 tips name the payment provider Stripe in Link your bank account through Stripe advise whether to neutralize that copy or defer out of this a11y slice. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/NewDriverGuide.tsx

---

## Plan

1. **Import** `useReducedMotion` alongside `motion` from framer-motion.
2. **Add** `const reduceMotion = useReducedMotion()` in the component body.
3. **Guard `initial`** on the Welcome `motion.div` — when `reduceMotion`, start at `{ opacity: 1, y: 0 }` (matches `animate`, no flash). Leave `animate` untouched.
4. **Guard `initial` and `transition.delay`** on each per-step `motion.div` — same `initial` ternary; when `reduceMotion`, set `{ duration: 0 }` (kills the stagger delay). Leave `animate` untouched.
5. **CTA `motion.div`** — **leave unguarded** per task (pure opacity-only entrance, no spatial movement).
6. **aria-hidden="true"** on all 9 decorative icons: `ArrowLeft`, `BookOpen`, the 6 step `Icon` literals, every `CheckCircle2`.
7. **`aria-label="Back"`** on the icon-only back `<Button>`.
8. **Headings** (`h1`→`h2`→`h3`s) are already a contiguous outline — leave as-is.
9. **Layout** (`pt-[env(safe-area-inset-top)]`, `min-h-screen`, `pb-8`, normal flow) — already correct, no change.

**Stripe copy (steps[0].tips[2]):** "Link your bank account through Stripe" — **defer out of this a11y slice.** It's a content/branding decision, not an accessibility fix. Flag for owner as a separate copy-neutralization task if desired.

---

## Diff — `src/pages/driver/NewDriverGuide.tsx`

```diff
--- a/src/pages/driver/NewDriverGuide.tsx
+++ b/src/pages/driver/NewDriverGuide.tsx
@@ -1,6 +1,6 @@
 /**
  * NewDriverGuide - Step-by-step guide for new ZIVO drivers
  */
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, BookOpen, CheckCircle2, Car, DollarSign, Shield, Star, Smartphone, MapPin } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
@@ -52,6 +52,7 @@
 export default function NewDriverGuide() {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();
 
   return (
     <div className="min-h-screen bg-background pb-8">
@@ -59,10 +60,10 @@
         <div className="flex items-center gap-4 px-5 py-4">
-          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
-              <BookOpen className="w-5 h-5 text-primary" />
+              <BookOpen className="w-5 h-5 text-primary" aria-hidden="true" />
             </div>
@@ -78,7 +79,7 @@
         {/* Welcome */}
         <motion.div
-          initial={{ opacity: 0, y: 10 }}
+          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
@@ -95,9 +96,9 @@
           return (
             <motion.div
               key={i}
-              initial={{ opacity: 0, y: 15 }}
+              initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
-              transition={{ delay: i * 0.08 }}
+              transition={reduceMotion ? { duration: 0 } : { delay: i * 0.08 }}
             >
               <Card>
@@ -107,7 +108,7 @@
                       <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
-                        <Icon className="w-5 h-5 text-primary" />
+                        <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                       </div>
@@ -119,7 +120,7 @@
                             <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
```

Wait — that last hunk needs to show the change. Let me restate the tip icon line precisely:

```diff
@@ -119,7 +120,7 @@
                             <div key={j} className="flex items-start gap-

# MiMo run — 2026-06-14T08:57:55.919Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on Onboarding driver wizard. File imports framer-motion motion and AnimatePresence and HAS useTranslation t use t with plain-English fallback for any new label. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory. ONE motion.section step card inside AnimatePresence mode wait initial opacity 0 y 18 animate exit y minus 12 spring transition GUARD initial only leave animate and exit intact. ONE motion.aside requirements panel initial opacity 0 y 14 transition delay 0.12 spring GUARD initial only with initial false the delay is moot. No perpetual loops no whileHover whileTap. Loading state a standalone full-screen Loader2 animate-spin NO adjacent text add role status aria-label Loading and append motion-reduce colon animate-none. Icons aria-hidden decorative ArrowLeft inside back Button which ALREADY has aria-label Go back leave the label. BadgeCheck beside Driver account text. ShieldCheck beside Connected or Secure session text. Sparkles in the kicker beside workflowKicker. FileText CheckCircle2 Clock3 the three workflow stat icons beside their labels. The brand-mark img already has alt ZIVO Driver leave it. HEADING h1 Driver Onboarding then h2 Finish your driver setup contiguous advise leave as-is. The child step components are SEPARATE components OUT OF SCOPE. Safe-area handled by the driver-onboarding CSS classes NOT touched. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Onboarding.tsx

---

## Plan

12 additive edits in `src/pages/driver/Onboarding.tsx` — zero logic, zero visual change at default motion:

| # | What | Why |
|---|------|-----|
| 1 | Extend `framer-motion` import with `useReducedMotion` | needed for motion guards |
| 2 | `const reduceMotion = useReducedMotion()` in component body | wired to the import |
| 3 | Loading `Loader2`: add `role="status"`, `aria-label`, `motion-reduce:animate-none` | a11y status + reduced-motion stop |
| 4–9 | Six decorative icons get `aria-hidden="true"` | `ArrowLeft`, `BadgeCheck`, `ShieldCheck`, `Sparkles`, `FileText`, `CheckCircle2`, `Clock3` — all have adjacent visible text or a parent with `aria-label` |
| 10 | `motion.section`: `initial={reduceMotion ? false : { opacity: 0, y: 18 }}` | skip entrance under reduced motion; animate/exit untouched |
| 11 | `motion.aside`: `initial={reduceMotion ? false : { opacity: 0, y: 14 }}` | same; delay is moot when initial is false |

Headings (`h1` → `h2` not contiguous), safe-area CSS, child step components — all left as-is per task.

---

## Proposed diff

**File:** `src/pages/driver/Onboarding.tsx`

```diff
--- a/src/pages/driver/Onboarding.tsx
+++ b/src/pages/driver/Onboarding.tsx
@@ -10,7 +10,7 @@ import { useState, useEffect } from "react";
 import { useNavigate } from "react-router-dom";
 
-import { motion, AnimatePresence } from "framer-motion";
+import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
 import {
   ArrowLeft,
   BadgeCheck,
@@ -44,6 +44,7 @@ export default function Onboarding() {
   const { t } = useTranslation();
   const geo = useGeoLocation();
+  const reduceMotion = useReducedMotion();
   const {
     data: onboardingData,
     isLoading,
@@ -83,7 +84,7 @@ export default function Onboarding() {
   if (isLoading) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
-        <Loader2 className="w-8 h-8 animate-spin text-primary" />
+        <Loader2 className="w-8 h-8 animate-spin text-primary motion-reduce:animate-none" role="status" aria-label={t("onboarding.loading", "Loading")} />
       </div>
     );
   }
@@ -134,7 +135,7 @@ export default function Onboarding() {
         <div className="driver-onboarding-topbar">
-            <Button variant="ghost" size="icon" onClick={goBack} className="driver-icon-button" aria-label="Go back">
-              <ArrowLeft className="w-5 h-5" />
+            <Button variant="ghost" size="icon" onClick={goBack} className="driver-icon-button" aria-label="Go back">
+              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
             </Button>
@@ -153,12 +154,12 @@ export default function Onboarding() {
             <Badge variant="outline" className="driver-status-badge">
-              <BadgeCheck className="h-3.5 w-3.5" />
+              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
               Driver account
             </Badge>
             <Badge variant="outline" className="driver-status-badge driver-status-badge--connected">
-              <ShieldCheck className="h-3.5 w-3.5" />
+              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
               {connectedByZivosmedia ? "Connected via Zivosmedia" : "Secure session"}
             </Badge>
@@ -181,7 +182,7 @@ export default function Onboarding() {
               <span className="driver-kicker">
-                <Sparkles className="h-3.5 w-3.5" />
+                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                 {workflowKicker}
@@ -199,15 +200,15 @@ export default function Onboarding() {
             <div className="driver-workflow-stats">
               <div>
-                <FileText className="h-4 w-4" />
+                <FileText className="h-4 w-4" aria-hidden="true" />
                 <span>Documents</span>
@@ -205,7 +206,7 @@ export default function Onboarding() {
               </div>
               <div>
-                <CheckCircle2 className="h-4 w-4" />
+                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                 <span>Workflow</span>
@@ -213,7 +

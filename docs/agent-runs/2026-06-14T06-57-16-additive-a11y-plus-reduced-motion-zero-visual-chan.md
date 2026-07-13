# DeepSeek run — 2026-06-14T06:57:16.848Z

- model: deepseek-chat
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File HAS framer-motion (one entrance motion.div inside TabsContent, NO infinite loops), NO useTranslation so plain Back. Add useReducedMotion from framer-motion, const reduceMotion in DriverAchievements component. The single motion.div entrance initial opacity 0 y 10 animate opacity 1 y 0 transition duration 0.2 - guard initial whole-object reduceMotion ? false : object, keep animate and transition intact (duration only, no delay). aria: icon-only ghost back button needs aria-label Back. aria-hidden true on ArrowLeft, header Trophy badge icon (beside earnedCount slash totalCount text), and the TabsTrigger category Icon (beside config.label text). AchievementBadge icon prop is component-level leave it. Confirm single h1 Achievements heading. Note const navigate useNavigate is pre-existing unused, do not touch. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/DriverAchievements.tsx

---

## Plan

Additive a11y + reduced-motion pass on `DriverAchievements.tsx`:

1. **`useReducedMotion`** — import from framer-motion, add `const reduceMotion = useReducedMotion()` inside component
2. **Entrance `motion.div`** — guard `initial` with `reduceMotion ? false : { opacity: 0, y: 10 }`, keep `animate` and `transition` intact
3. **Back button** — add `aria-label="Back"` to the ghost icon-only `<button>`
4. **`aria-hidden="true"`** on:
   - `ArrowLeft` icon (decorative, beside textless button)
   - `Trophy` icon in header badge (decorative, beside `earnedCount / totalCount` text)
   - Each `Icon` inside `TabsTrigger` (decorative, beside `config.label` text)
5. **`h1`** — confirm single `<h1 className="text-lg font-bold font-display text-foreground">Achievements</h1>` (already correct)
6. **`navigate`** — pre-existing unused `const navigate = useNavigate();` — do NOT touch

---

## Diff

```diff
--- a/zivodriver/src/pages/driver/DriverAchievements.tsx
+++ b/zivodriver/src/pages/driver/DriverAchievements.tsx
@@ -1,6 +1,6 @@
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Trophy, Truck, Star, DollarSign, Flame } from "lucide-react";
 import { useAchievements } from "@/hooks/useAchievements";
 import { useAuth } from "@/contexts/AuthContext";
@@ -62,6 +62,7 @@ const getDriverProgress = (
 const DriverAchievements = () => {
   const navigate = useNavigate();
   const goBack = useGoBack();
+  const reduceMotion = useReducedMotion();
   const { achievements, isLoading, earnedCount, totalCount } = useAchievements();
   const { driver } = useAuth() as any;
 
@@ -93,7 +94,7 @@ const DriverAchievements = () => {
           <button
             onClick={goBack}
             className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center"
+            aria-label="Back"
           >
-            <ArrowLeft className="w-5 h-5 text-foreground" />
+            <ArrowLeft className="w-5 h-5 text-foreground" aria-hidden="true" />
           </button>
           <div className="flex-1">
             <h1 className="text-lg font-bold font-display text-foreground">Achievements</h1>
@@ -101,7 +102,7 @@ const DriverAchievements = () => {
           <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10">
-            <Trophy className="w-4 h-4 text-primary" />
+            <Trophy className="w-4 h-4 text-primary" aria-hidden="true" />
             <span className="text-sm font-bold text-primary">
               {earnedCount} / {totalCount}
             </span>
@@ -120,7 +121,7 @@ const DriverAchievements = () => {
             return (
               <TabsTrigger key={cat} value={cat} className="gap-1 text-xs">
-                <Icon className="w-3.5 h-3.5" />
+                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                 {config.label}
               </TabsTrigger>
             );
@@ -135,7 +136,7 @@ const DriverAchievements = () => {
               <motion.div
                 className="grid grid-cols-2 gap-3 mt-2"
-                initial={{ opacity: 0, y: 10 }}
+                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.2 }}
               >
```

---

## Owner verification

- **`npm run update`** must pass (type-check + worker type-check + build) — run this before committing
- **Preview** the page at `/driver/achievements` (or the driver app route) — confirm:
  - Back button still navigates correctly
  - Entrance animation plays at default motion, skips entirely when reduced motion is enabled
  - No visual regressions (icons still render, layout unchanged)
- **`navigate`** is pre-existing unused — left untouched as instructed
- **`AchievementBadge`** icon prop is component-level — left untouched as instructed

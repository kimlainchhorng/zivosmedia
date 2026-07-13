# MiMo run — 2026-06-14T09:14:12.815Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on RankComparison a driver tier comparison page. File imports framer-motion motion and has NO useTranslation so plain-English labels. ONE component. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory ONE surface. ONE motion.div rendered per driver tier in a map initial opacity 0 y 15 animate opacity 1 y 0 transition delay i times 0.06 this is a SPATIAL staggered entrance slide up plus fade GUARD initial to false under reduceMotion and set transition delay to reduceMotion ? 0 colon i times 0.06 leave animate intact. No perpetual loops no whileHover whileTap. Icons aria-hidden decorative. ArrowLeft inside a shadcn Button icon-only no text add aria-label Back to the Button and aria-hidden on ArrowLeft. Current rank banner Icon beside text aria-hidden. Per-tier Icon beside text aria-hidden. Lock beside Invite Only text aria-hidden. TrendingUp beside trips text aria-hidden. Star beside rating text aria-hidden. Check beside each benefit text aria-hidden. HEADINGS h1 Driver Ranks then h2 All Ranks then h3 per tier label contiguous no skip advise leave AS-IS. The shadcn Progress bar is Radix role progressbar with a visible Progress label above it advise whether to add aria-label or leave. Safe-area sticky header has pt env safe-area-inset-top and no base padding on the header element padding is on inner div advise no change. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/RankComparison.tsx

---

## (1) Plan

The file has 8 discrete edits — all additive, zero logic/visual change at default motion:

| # | What | Why |
|---|------|-----|
| 1 | Import `useReducedMotion` from framer-motion | needed for motion guard |
| 2 | `const reduceMotion = useReducedMotion()` inside component | consumes the hook |
| 3 | Guard `motion.div`: `initial={reduceMotion ? false : {...}}`, `transition.delay: reduceMotion ? 0 : i*0.06` | spatial stagger off under reduced motion; `animate` stays (final resting state) |
| 4 | Back Button: add `aria-label="Back"`, `ArrowLeft` gets `aria-hidden="true"` | icon-only button a11y |
| 5–10 | `aria-hidden="true"` on 6 decorative icons: current-rank `Icon`, per-tier `Icon`, `Lock`, `TrendingUp`, `Star`, `Check` | each has adjacent visible text |

**Headings** (h1 → h2 → h3): contiguous, no skip. **Leave as-is.**

**Progress bar**: Radix renders `role="progressbar"`. The visible `<span>Progress</span>` label sits directly above. Not programmatically associated but contextually clear. **Advise leave as-is** — optionally add `aria-label="Progress to next tier"` on `<Progress>` if the owner wants explicit association, but not a deficiency.

**Safe-area header**: `pt-[env(safe-area-inset-top)]` on `<header>`, content padding on inner `<div>`. Correct pattern. **No change needed.**

---

## (2) Diff

**File:** `src/pages/driver/RankComparison.tsx`

```diff
--- a/src/pages/driver/RankComparison.tsx
+++ b/src/pages/driver/RankComparison.tsx
@@ -1,5 +1,5 @@
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Crown, Star, Check, Lock, TrendingUp, Award, Gem, Sparkles } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Button } from "@/components/ui/button";
@@ -27,6 +27,8 @@ export default function RankComparison() {
   const { driver } = useAuth();
 
+  const reduceMotion = useReducedMotion();
+
   const totalTrips = (driver as any)?.total_trips || 0;
   const rating = (driver as any)?.rating || 0;
   const currentLevel = getDriverLevel(totalTrips, rating);
@@ -37,7 +39,7 @@ export default function RankComparison() {
       <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
         <div className="flex items-center gap-4 px-5 py-4">
-          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
-            <ArrowLeft className="w-5 h-5" />
+          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl" aria-label="Back">
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </Button>
@@ -52,7 +54,7 @@ export default function RankComparison() {
               {(() => {
                 const Icon = tierIcons[currentLevel.level] || Star;
-                return <Icon className={cn("w-7 h-7", currentLevel.badge.color)} />;
+                return <Icon className={cn("w-7 h-7", currentLevel.badge.color)} aria-hidden="true" />;
               })()}
@@ -81,9 +83,9 @@ export default function RankComparison() {
           return (
             <motion.div
               key={level.level}
-              initial={{ opacity: 0, y: 15 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
               animate={{ opacity: 1, y: 0 }}
-              transition={{ delay: i * 0.06 }}
+              transition={{ delay: reduceMotion ? 0 : i * 0.06 }}
             >
@@ -107,7 +109,7 @@ export default function RankComparison() {
                     <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", level.badge.bgColor)}>
-                      <Icon className={cn("w-6 h-6", level.badge.color)} />
+                      <Icon className={cn("w-6 h-6", level.badge.color)} aria-hidden="true" />
                     </div>
@@ -120,7 +122,7 @@ export default function RankComparison() {
                         {level.requiresApproval && (
                           <Badge variant="outline" className="text-[10px] h-5">
-                            <Lock className="w-3 h-3 mr-1" /> Invite Only
+                            <Lock className="w-3 h-3 mr-1" aria-hidden="true" /> Invite Only
                           </Badge>
@@ -131,10 +133,10 @@ export default function RankComparison() {
                         <span className="flex items-center gap-1">
-                          <TrendingUp className="w-3 h-3" />
+                          <TrendingUp className="w-3 h-3" aria-hidden="true" />
                           {level.tripsRequired

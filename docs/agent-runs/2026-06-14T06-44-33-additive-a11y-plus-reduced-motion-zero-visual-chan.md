# DeepSeek run — 2026-06-14T06:44:33.304Z

- model: deepseek-chat
- task: Additive a11y plus reduced-motion, zero visual change at default motion. File has framer-motion, no useTranslation. Use useReducedMotion hook from framer-motion, variable reduceMotion, called inside BOTH LeaderboardItem and LeaderboardPage. Guard the LeaderboardItem entrance initial opacity 0 x minus 20 with whole-object false form initial reduceMotion ? false : object, keep animate intact, zero the transition delay. Gate the 2 infinite loops to undefined: rank-1 Sparkles badge scale pulse, and current-user sliding glow x minus100 to 100. Icon-only back button needs aria-label Back. aria-hidden true on decorative icons: ArrowLeft, header Trophy, empty-state Trophy, getRankIcon Crown and 2 Medal, Star, CheckCircle, DollarSign, User fallback, Sparkles. Confirm single h1 Top Drivers heading order fine. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Leaderboard.tsx

---

## Plan

1. **Import `useReducedMotion`** from `framer-motion` in `Leaderboard.tsx`
2. **In `LeaderboardItem`**: guard entrance animation `initial` with `reduceMotion ? false : { opacity: 0, x: -20 }`, keep `animate` intact, zero the `transition.delay` when reduced
3. **In `LeaderboardItem`**: gate the rank-1 Sparkles badge `scale` pulse to `undefined` when reduced
4. **In `LeaderboardItem`**: gate the current-user sliding glow `x` animation to `undefined` when reduced
5. **In `LeaderboardPage`**: add `aria-label="Back"` to the icon-only back button
6. **Add `aria-hidden="true"`** to decorative icons: `ArrowLeft`, header `Trophy`, empty-state `Trophy`, `getRankIcon`'s `Crown` and both `Medal`s, `Star`, `CheckCircle`, `DollarSign`, `User` fallback, `Sparkles`

## Diff

```diff
--- a/zivodriver/src/pages/driver/Leaderboard.tsx
+++ b/zivodriver/src/pages/driver/Leaderboard.tsx
@@ -1,7 +1,7 @@
 import { useState } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Trophy, Medal, Star, User, Crown, Sparkles, DollarSign, CheckCircle } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
 import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
@@ -13,13 +13,13 @@ import BottomNav from "@/components/BottomNav";
 const getRankIcon = (rank: number) => {
   switch (rank) {
     case 1:
-      return <Crown className="w-6 h-6 text-warning" />;
+      return <Crown className="w-6 h-6 text-warning" aria-hidden="true" />;
     case 2:
-      return <Medal className="w-6 h-6 text-muted-foreground" />;
+      return <Medal className="w-6 h-6 text-muted-foreground" aria-hidden="true" />;
     case 3:
-      return <Medal className="w-6 h-6 text-warning/80" />;
+      return <Medal className="w-6 h-6 text-warning/80" aria-hidden="true" />;
     default:
       return (
         <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">
           {rank}
@@ -56,14 +56,16 @@ const LeaderboardItem = ({
   showEarnings?: boolean;
 }) => {
+  const reduceMotion = useReducedMotion();
   const initials = driver.full_name
     .split(" ")
     .map((n) => n[0])
     .join("")
     .toUpperCase()
     .slice(0, 2);

   const styles = getRankStyles(driver.rank, driver.isCurrentUser);

   return (
     <motion.div
-      initial={{ opacity: 0, x: -20 }}
+      initial={reduceMotion ? false : { opacity: 0, x: -20 }}
       animate={{ opacity: 1, x: 0 }}
-      transition={{ delay: index * 0.03 }}
+      transition={reduceMotion ? { delay: 0 } : { delay: index * 0.03 }}
       className={`relative flex items-center gap-3 p-4 rounded-2xl border ${styles.bg} ${styles.border} ${styles.glow ? `shadow-lg ${styles.glow}` : ''}`}
     >
       {/* Rank */}
@@ -81,7 +83,7 @@ const LeaderboardItem = ({
       <div className="relative">
         <Avatar className={`h-12 w-12 border-2 ${driver.rank <= 3 ? styles.border : 'border-muted'}`}>
           <AvatarImage src={driver.avatar_url || undefined} alt={driver.full_name} />
-          <AvatarFallback className="bg-muted text-xs font-bold">
+          <AvatarFallback className="bg-muted text-xs font-bold" aria-hidden="true">
             {initials || <User className="w-4 h-4" />}
           </AvatarFallback>
         </Avatar>
@@ -89,9 +91,9 @@ const LeaderboardItem = ({
           <motion.div
             className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-warning to-warning/80 rounded-full flex items-center justify-center"
-            animate={{ scale: [1, 1.1, 1] }}
-            transition={{ duration: 2, repeat: Infinity }}
+            animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
+            transition={reduceMotion ? undefined : { duration: 2, repeat: Infinity }}
           >
-            <Sparkles className="w-3 h-3 text-primary-foreground" />
+            <Sparkles className="w-3 h-3 text-primary-foreground" aria-hidden="true" />
           </motion.div>
         )}
       </div>
@@ -109,14 +111,14 @@ const LeaderboardItem = ({
         <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
           <span className="font-medium">{driver.total_trips} trips</span>
           <div className="flex items-center gap-0.5">
-            <Star className="w-3.5 h-3.5 fill-warning text-warning" />
+            <Star className="w-3.5 h-3.5 fill-warning text-warning" aria-hidden="true" />
             <span>{driver.rating.toFixed(1)}</span>
           </div>
           {driver.acceptanceRate > 0 && (
             <div className="flex items-center gap-0.5">
-              <CheckCircle className="w-3.5 h-3.5 text-success" />
+              <CheckCircle className="w-3.5 h-3.5 text-success" aria-hidden="true" />
               <span>{Math.round(driver.acceptanceRate)}%</span>
             </div>
           )}
         </div>
       </div>
@@ -125,7 +127,7 @@ const LeaderboardItem = ({
       {showEarnings && driver.weeklyEarnings > 0 && (
         <div className="text-right">
           <div className="flex items-center gap-1 text-success">
-            <DollarSign className="w-4 h-4" />
+            <DollarSign className="w-4 h-4" aria-hidden="true" />
             <span className="font-bold">{driver.weeklyEarnings.toFixed(0)}</span>
           </div>
         </div>
@@ -136,8 +138,8 @@ const LeaderboardItem = ({
         <motion.div
           className="absolute inset-0 rounded-2xl pointer-events-none"
           style={{
             background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)",
           }}
-          animate={{ x: ["-100%", "100%"] }}
-          transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
+          animate={reduceMotion ? { x: 0 } : { x: ["-100%", "100%"] }}
+          transition={reduceMotion ? undefined : { duration: 2, repeat: Infinity, repeatDelay: 2 }}
         />
       )}
     </motion.div>
@@ -157,7 +159,7 @@ export default function LeaderboardPage() {
       {/* Header */}
       <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
         <div className="flex items-center gap-3">
           <button
             onClick={goBack}
+            aria-label="Back"
             className="p-2 rounded-lg hover:bg-muted transition-colors"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </button>
           <div className="flex items-center gap-2">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center shadow-lg shadow-warning/25">
-              <Trophy className="w-5 h-5 text-primary-foreground" />
+              <Trophy className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
             </div>
             <div>
               <h1 className="text-lg font-semibold">Top Drivers</h1>
@@ -195,7 +197,7 @@ export default function LeaderboardPage() {
         ) : !leaderboard || leaderboard.length === 0 ? (
           <div className="text-center py-16">
-            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
+            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" aria-hidden="true" />
             <p className="text-lg font-medium text-muted-foreground">
               No drivers on the leaderboard yet
             </p>
```

## Owner verification

- **No visual change at default motion** — `useReducedMotion()` returns `false` on most devices, so all animations run identically
- **`h1` heading order** is correct: single `<h1>Top Drivers</h1>` at line ~175
- **`aria-hidden` on `AvatarFallback`** — the avatar already has `alt={driver.full_name}` on the `<AvatarImage>`, so the fallback is decorative
- **`aria-hidden` on `User` fallback icon** — only rendered when `initials` is empty (edge case), still decorative
- **`aria-hidden` on `Sparkles`** — the parent `motion.div` has no semantic role, purely decorative
- **`aria-hidden` on `Crown`/`Medal`s** — rank is also conveyed by the number text in the default case; the icons are decorative enhancements
- **`aria-hidden` on `Star`/`CheckCircle`/`DollarSign`** — each has adjacent visible text (`rating`, `acceptanceRate`, `weeklyEarnings`) that conveys the same info
- **`aria-hidden` on header `Trophy`** — decorative icon next to the `<h1>` heading
- **`aria-hidden` on empty-state `Trophy`** — decorative illustration
- **`aria-hidden` on `ArrowLeft`** — the parent `<button>` now has `aria-label="Back"` which replaces the icon's semantic role

Run `npm run update` to verify type-check + build pass before committing.

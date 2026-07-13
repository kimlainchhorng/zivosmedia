# DeepSeek run — 2026-06-14T06:18:46.731Z

- model: deepseek-chat
- task: Additive non-visual accessibility plus reduced-motion audit ONLY. No layout, copy, routing, styling, or logic change. This is DriverEarnings, the auth-gated /driver/earnings page (flagship daily-use earnings screen), already premium 3D glass styling. It DOES import useTranslation t() and uses t() keys for copy. It does NOT import useReducedMotion. Structure: a root div min-h-100dvh bg-background pb-24 (NORMAL flow, not fixed inset-0); a decorative fixed inset-0 pointer-events-none layer holding THREE FloatingOrb components - each FloatingOrb is a motion.div with an INFINITE animation (animate y array 0 -20 0 15 0, scale array, opacity array, transition repeat Infinity duration 9+delay) - these are purely decorative blurred orbs (WCAG 2.3.3 vestibular trigger); a sticky motion.header with an ENTRANCE (initial y -20 opacity 0, animate y 0 opacity 1) containing an icon-only back motion.button (whileTap scale 0.9 translateY 2, onClick goBack, holding ONLY an ArrowLeft, NO accessible name), an h1 t earningsPage.title + p t earningsPage.trackIncome, and an icon-only refresh motion.button (whileTap scale 0.9 rotate 180, onClick refetch, disabled when isLoading, holding ONLY a RefreshCw that gets className animate-spin when isLoading, NO accessible name); a main with child cards (TodayEarningsHero, TipsSummaryCard, PayoutStatusCard, EarningsAnalyticsSection - all out of scope own files); a shadcn Tabs (today/week) whose TabsTrigger each hold a decorative Calendar icon + visible text; inside each TabsContent a 2-col grid of category motion.buttons (whileTap scale 0.94 translateY 3, each holding a decorative Truck or Gift icon + visible label + visible formatted amount - NOT icon-only); a breakdown card child (out of scope); and a section motion.div ENTRANCE (initial opacity 0 y 15) whose header h3 holds a decorative Package or Calendar icon + visible text, with an empty-state decorative Package icon + text, OR a deliveries list (child cards). The week TabsContent also has a 2x2 grid of stat motion.divs (ENTRANCE initial opacity 0 scale 0.9 + STAGGER transition delay i*0.08) each a value p + label p, and a text-link button to /history. Finally a Quick Actions 2-col grid of motion.buttons (whileTap scale 0.94 translateY 3, ENTRANCE initial opacity 0 y 12 + STAGGER delay 0.3+i*0.05) each holding a decorative EMOJI span + visible t() label, navigating on click. Concise verdict per point: (1) Freeze the 3 infinite FloatingOrbs under reduced-motion - confirm the approach: refactor FloatingOrb to take a reduceMotion prop and conditionally render a STATIC plain div (no framer-motion, resting opacity 0.2) when reduced, else the animating motion.div. Agree? (2) Guard which ENTRANCES with useReducedMotion idiom (initial reduceMotion ? false : the-object): header, the 2 section motion.div opacity-0-y-15, the 4 week stat tiles opacity-0-scale-0.9 (+ zero their i*0.08 stagger delay), the 7 quick-action buttons opacity-0-y-12 (+ zero their 0.3+i*0.05 stagger). Confirm list + that ALL whileTap micro-feedback (back, refresh, category, quick-action) stays UNGUARDED. (3) The icon-only back button (ArrowLeft only) and icon-only refresh button (RefreshCw only) both lack an accessible name - add aria-label. The file HAS t(): use t('common.back') for back; for refresh recommend t('common.refresh','Refresh') 2-arg fallback. Agree on keys/text? (4) aria-hidden true on which decorative icons: the back ArrowLeft, the refresh RefreshCw, the 2 TabsTrigger Calendar icons, the 4 category Truck/Gift icons, the 2 section-header Package/Calendar icons, the empty-state Package icon. Also the 7 quick-action EMOJI spans (text emojis read aloud by AT) - wrap each emoji span aria-hidden true? Confirm full list. (5) RefreshCw gets CSS animate-spin while isLoading (infinite) - append Tailwind motion-reduce:animate-none so it freezes under prefers-reduced-motion, or LEAVE (functional transient loading indicator)? One line. (6) Heading order: h1 earningsPage.title then the only other headings are h3 (completedToday / thisWeekSummary) - that SKIPS h2. Change those h3 to h2 (className controls size, zero visual change) for a contiguous outline, OR are child components (TodayEarningsHero etc) injecting an h2 between them so it is already fine - recommend (note you cannot see child files; give the safe call). (7) Safe-area: header already has pt-calc(env(safe-area-inset-top)+4px), root is normal-flow min-h-100dvh pb-24 with BottomNav - anything needed or adequate? Tight additive-only verdict, max ~450 words.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Earnings.tsx

---

## Plan

Additive accessibility + reduced-motion audit for `src/pages/driver/Earnings.tsx`. 7-point verdict:

1. **FloatingOrb freeze** — refactor to accept `reduceMotion` prop, render static `div` with `opacity-20` when reduced.
2. **Entrance guards** — use `useReducedMotion` idiom on header, 2 section `motion.div`s, 4 week stat tiles, 7 quick-action buttons. All `whileTap` micro-feedback stays unguarded.
3. **Icon-only buttons** — add `aria-label` using `t()`: `t('common.back')` for back, `t('common.refresh', 'Refresh')` for refresh.
4. **Decorative icons** — `aria-hidden="true"` on: ArrowLeft, RefreshCw, 2 TabsTrigger Calendars, 4 category Truck/Gift icons, 2 section-header Package/Calendar icons, empty-state Package icon, 7 emoji spans.
5. **RefreshCw spin** — append `motion-reduce:animate-none` to the `animate-spin` class.
6. **Heading order** — safe call: change `h3` to `h2` for both section headers (className controls size, zero visual change).
7. **Safe-area** — already adequate (header has `pt-[calc(env(safe-area-inset-top)+4px)]`, root is normal-flow `min-h-[100dvh] pb-24` with BottomNav).

## Diff

```diff
--- a/src/pages/driver/Earnings.tsx
+++ b/src/pages/driver/Earnings.tsx
@@ -1,6 +1,6 @@
 /**
  * Driver Earnings Page — 3D cinematic style
  */
 
-import { useState } from "react";
+import { useState, useMemo } from "react";
 import { ArrowLeft, Calendar, RefreshCw, Package, Truck, Gift } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { useGoBack } from "@/hooks/useGoBack";
@@ -14,6 +14,7 @@ import { Button } from "@/components/ui/button";
 import { Skeleton } from "@/components/ui/skeleton";
 import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
 import BottomNav from "@/components/BottomNav";
+import { useReducedMotion } from "framer-motion";
 import { useTranslation } from "@/hooks/useTranslation";
 import { useAuth } from "@/contexts/AuthContext";
 import { formatCurrency } from "@/utils/currency";
@@ -40,16 +41,26 @@ const extruded3d = {
   `,
 };
 
-const FloatingOrb = ({ delay, x, y, size, color }: { delay: number; x: string; y: string; size: number; color: string }) => (
-  <motion.div
-    className="absolute rounded-full pointer-events-none"
-    style={{
-      left: x, top: y, width: size, height: size,
-      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
-      filter: "blur(40px)",
-    }}
-    animate={{
-      y: [0, -20, 0, 15, 0],
-      scale: [1, 1.2, 0.9, 1.1, 1],
-      opacity: [0.2, 0.5, 0.2, 0.4, 0.2],
-    }}
-    transition={{ repeat: Infinity, duration: 9 + delay, delay, ease: "easeInOut" }}
-  />
-);
+const FloatingOrb = ({ delay, x, y, size, color, reduceMotion }: { delay: number; x: string; y: string; size: number; color: string; reduceMotion: boolean }) => {
+  if (reduceMotion) {
+    return (
+      <div
+        className="absolute rounded-full pointer-events-none opacity-20"
+        style={{
+          left: x, top: y, width: size, height: size,
+          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
+          filter: "blur(40px)",
+        }}
+      />
+    );
+  }
+  return (
+    <motion.div
+      className="absolute rounded-full pointer-events-none"
+      style={{
+        left: x, top: y, width: size, height: size,
+        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
+        filter: "blur(40px)",
+      }}
+      animate={{
+        y: [0, -20, 0, 15, 0],
+        scale: [1, 1.2, 0.9, 1.1, 1],
+        opacity: [0.2, 0.5, 0.2, 0.4, 0.2],
+      }}
+      transition={{ repeat: Infinity, duration: 9 + delay, delay, ease: "easeInOut" }}
+    />
+  );
+};
 
 export default function DriverEarnings() {
   const navigate = useNavigate();
   const goBack = useGoBack();
+  const reduceMotion = useReducedMotion();
   const { t } = useTranslation();
   const { driver } = useAuth();
   const isCambodia = (driver as any)?.country === "KH";
@@ -93,9 +104,9 @@ export default function DriverEarnings() {
       {/* Living 3D background */}
       <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" style={{ perspective: "800px" }}>
-        <FloatingOrb delay={0} x="8%" y="15%" size={180} color="hsl(var(--primary) / 0.1)" />
-        <FloatingOrb delay={2} x="72%" y="45%" size={140} color="hsl(var(--accent) / 0.08)" />
-        <FloatingOrb delay={3.5} x="25%" y="75%" size={110} color="hsl(var(--primary) / 0.06)" />
+        <FloatingOrb delay={0} x="8%" y="15%" size={180} color="hsl(var(--primary) / 0.1)" reduceMotion={reduceMotion} />
+        <FloatingOrb delay={2} x="72%" y="45%" size={140} color="hsl(var(--accent) / 0.08)" reduceMotion={reduceMotion} />
+        <FloatingOrb delay={3.5} x="25%" y="75%" size={110} color="hsl(var(--primary) / 0.06)" reduceMotion={reduceMotion} />
       </div>
 
       {/* 3D Header */}
@@ -103,7 +114,7 @@ export default function DriverEarnings() {
-        initial={{ y: -20, opacity: 0 }}
-        animate={{ y: 0, opacity: 1 }}
+        initial={reduceMotion ? false : { y: -20, opacity: 0 }}
+        animate={reduceMotion ? false : { y: 0, opacity: 1 }}
         className="sticky top-0 z-40 px-4 py-3 pt-[calc(env(safe-area-inset-top)+4px)]"
         style={{ ...glass, borderRadius: 0, borderBottom: "0.5px solid hsl(var(--border) / 0.3)" }}
         data-sticky-header
@@ -115,6 +126,7 @@ export default function DriverEarnings() {
             <motion.button
               whileTap={{ scale: 0.9, translateY: 2 }}
               onClick={goBack}
+              aria-label={t('common.back')}
               className="p-2 rounded-xl"
               style={extruded3d}
             >
@@ -130,6 +142,7 @@ export default function DriverEarnings() {
           <motion.button
             whileTap={{ scale: 0.9, rotate: 180 }}
             onClick={() => refetch()}
+            aria-label={t('common.refresh', 'Refresh')}
             disabled={isLoading}
             className="p-2 rounded-xl"
             style={extruded3d}
@@ -175,7 +188,7 @@ export default function DriverEarnings() {
             <TabsTrigger value="today" className="flex items-center gap-2">
-              <Calendar className="w-4 h-4" />
+              <Calendar className="w-4 h-4" aria-hidden="true" />
               {t("history.today")} ({todayCount})
             </TabsTrigger>
             <TabsTrigger value="week" className="flex items-center gap-2">
-              <Calendar className="w-4 h-4" />
+              <Calendar className="w-4 h-4" aria-hidden="true" />
               {t("history.thisWeek")} ({weekCount})
             </TabsTrigger>
@@ -193,7 +206,7 @@ export default function DriverEarnings() {
                 <motion.button
                   key={cat.key}
                   whileTap={{ scale: 0.94, translateY: 3 }}
                   onClick={() => setEarningsCategory(cat.key)}
                   className="flex flex-col items-center gap-1 p-3 rounded-xl"
                   style={earningsCategory === cat.key ? {
                     ...extruded3d,
                     background: "hsl(var(--card) / 0.9)",
                   } : glass}
                 >
-                  <cat.icon className={`w-5 h-5 ${earningsCategory === cat.key ? "text-primary" : "text-muted-foreground"}`} />
+                  <cat.icon className={`w-5 h-5 ${earningsCategory === cat.key ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                   <span className={`text-xs font-medium ${earningsCategory === cat.key ? "text-foreground" : "text-muted-foreground"}`}>
                     {cat.label}
                   </span>
@@ -227,7 +240,7 @@ export default function DriverEarnings() {
             <motion.div
-              initial={{ opacity: 0, y: 15 }}
-              animate={{ opacity: 1, y: 0 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
+              animate={reduceMotion ? false : { opacity: 1, y: 0 }}
               className="rounded-2xl overflow-hidden"
               style={extruded3d}
             >
               <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
-                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
-                  <Package className="w-4 h-4" />
+                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
+                  <Package className="w-4 h-4" aria-hidden="true" />
                   {t("earningsPage.completedToday")}
-                </h3>
+                </h2>
               </div>
 
               {isLoading ? (
@@ -247,7 +260,7 @@ export default function DriverEarnings() {
               ) : deliveries.length === 0 ? (
                 <div className="py-12 text-center">
-                  <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
+                  <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" aria-hidden="true" />
                   <p className="text-muted-foreground">{t("earningsPage.noDeliveriesToday")}</p>
@@ -283,7 +296,7 @@ export default function DriverEarnings() {
                 <motion.button
                   key={cat.key}
                   whileTap={{ scale: 0.94, translateY: 3 }}
                   onClick={() => setEarningsCategory(cat.key)}
                   className="flex flex-col items-center gap-1 p-3 rounded-xl"
                   style={earningsCategory === cat.key ? {
                     ...extruded3d,
                     background: "hsl(var(--card) / 0.9)",
                   } : glass}
                 >
-                  <cat.icon className={`w-5 h-5 ${earningsCategory === cat.key ? "text-primary" : "text-muted-foreground"}`} />
+                  <cat.icon className={`w-5 h-5 ${earningsCategory === cat.key ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                   <span className={`text-xs font-medium ${earningsCategory === cat.key ? "text-foreground" : "text-muted-foreground"}`}>
                     {cat.label}
                   </span>
@@ -317,7 +330,7 @@ export default function DriverEarnings() {
             <motion.div
-              initial={{ opacity: 0, y: 15 }}
-              animate={{ opacity: 1, y: 0 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 15 }}
+              animate={reduceMotion ? false : { opacity: 1, y: 0 }}
               className="rounded-2xl overflow-hidden"
               style={extruded3d}
             >
               <div className="px-4 py-3 border-b" style={{ borderColor: "hsl(var(--border) / 0.2)" }}>
-                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
-                  <Calendar className="w-4 h-4" />
+                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
+                  <Calendar className="w-4 h-4" aria-hidden="true" />
                   {t("earningsPage.thisWeekSummary")}
-                </h3>
+                </h2>
               </div>
 
               <div className="p-4 space-y-4">
@@ -337,7 +350,7 @@ export default function DriverEarnings() {
                   ].map((stat, i) => (
                     <motion.div
                       key={stat.label}
-                      initial={{ opacity: 0, scale: 0.9 }}
-                      animate={{ opacity: 1, scale: 1 }}
-                      transition={{ delay: i * 0.08 }}
+                      initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
+                      animate={reduceMotion ? false : { opacity: 1, scale: 1 }}
+                      transition={reduceMotion ? undefined : { delay: i * 0.08 }}
                       className="p-4 rounded-xl text-center"
                       style={{ background: "hsl(var(--muted) / 0.4)", boxShadow: "inset 0 2px 4px hsl(var(--foreground) / 0.04)" }}
@@ -370,7 +383,7 @@ export default function DriverEarnings() {
           ].map((item, i) => (
             <motion.button
               key={item.path + i}
               whileTap={{ scale: 0.94, translateY: 3 }}
-              initial={{ opacity: 0, y: 12 }}
-              animate={{ opacity: 1, y: 0 }}
-              transition={{ delay: 0.3 + i * 0.05 }}
+              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
+              animate={reduceMotion ? false : { opacity: 1, y: 0 }}
+              transition={reduceMotion ? undefined : { delay: 0.3 + i * 0.05 }}
               onClick={() => navigate(item.path)}
               className="flex flex-col items-center gap-2 py-4 rounded-xl text-sm"
               style={extruded3d}
             >
-              <span className="text-lg">{item.emoji}</span>
+              <span className="text-lg" aria-hidden="true">{item.emoji}</span>
               <span className="text-sm font-medium">{item.label}</span>
             </motion.button>
```

## Owner verification

1. **`npm run update`** must pass (type-check + worker + build).
2. **Preview at `/driver/earnings`** — verify:
   - Back button and refresh button have visible tooltips/accessible names.
   - With `prefers-reduced-motion: reduce` in devtools: FloatingOrbs are static, all entrance animations skip, RefreshCw spin freezes.
   - Heading outline: `h1` → `h2` (no `h3` skipping).
3. **`useReducedMotion` import** — confirm framer-motion exports it (it does, since v6).
4. **`t('common.back')` and `t('common.refresh', 'Refresh')`** — verify these keys exist in the translation files, or add them if missing.

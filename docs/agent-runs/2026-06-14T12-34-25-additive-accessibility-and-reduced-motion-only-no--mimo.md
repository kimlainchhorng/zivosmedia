# MiMo run — 2026-06-14T12:34:25.377Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive accessibility and reduced motion only, no visual or behavioral change. This is an English only React TSX page using framer motion. One, extend the framer motion import to add useReducedMotion and create const reduceMotion equals useReducedMotion inside the component. Two, for every entrance animation that uses initial, wrap the whole initial object in a ternary so initial becomes reduceMotion question mark false colon the original object, leaving animate and transition unchanged. Three, for every infinite repeat Infinity loop animation, guard BOTH animate and transition so each becomes reduceMotion question mark undefined colon the original. Four, the icon only back button needs aria-label Back on the motion.button and aria-hidden true on the ArrowLeft icon. Five, add aria-hidden true to decorative lucide icons. Six, promote the two h3 headings to h2 keeping classNames. Leave the interactive TooltipTrigger Info icon alone. Report the exact edits.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/financial/TaxEstimator.tsx

---

## 1. Plan

Six additive edits to `../zivodriver/src/pages/financial/TaxEstimator.tsx`:

| # | What | Scope |
|---|------|-------|
| 1 | Extend `framer-motion` import with `useReducedMotion`; add `const reduceMotion = useReducedMotion()` | Top of file + first line of component |
| 2 | Wrap every `initial` prop (11 elements) in `reduceMotion ? false : {…}` | All entrance animations |
| 3 | Guard every infinite-loop `animate` + `transition` (8 elements × 2 props) with `reduceMotion ? undefined : {…}` | All `repeat: Infinity` animations |
| 4 | `aria-label="Back"` on the back `motion.button`; `aria-hidden="true"` on its `<ArrowLeft>` | 1 button + 1 icon |
| 5 | `aria-hidden="true"` on every decorative lucide icon (12 icons; the `<TooltipTrigger>` `<Info>` is left alone) | Scattered |
| 6 | Promote two `<h3>` → `<h2>` keeping classNames | "Quarterly Earnings" + "Tax Breakdown" |

---

## 2. Exact diffs (unified format, file: `../zivodriver/src/pages/financial/TaxEstimator.tsx`)

```diff
--- a/zivodriver/src/pages/financial/TaxEstimator.tsx
+++ b/zivodriver/src/pages/financial/TaxEstimator.tsx
@@ -1,6 +1,6 @@
 import { useState, useEffect } from "react";
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, Calculator, DollarSign, Percent, TrendingUp, Info, Loader2, Sparkles, PiggyBank, Receipt, Wallet, TrendingDown } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import { Input } from "@/components/ui/input";
@@ -15,6 +15,7 @@
 const TaxEstimator = () => {
   const navigate = useNavigate();
+  const reduceMotion = useReducedMotion();
   const { data: monthlyEarnings, isLoading: earningsLoading } = useDriverEarnings("monthly");
   const { data: mileageData, isLoading: mileageLoading } = useMileageData();
```

```diff
@@ -44,18 +45,19 @@
       <motion.header
         className="sticky top-0 z-40 backdrop-blur-2xl bg-gradient-to-b from-card/90 via-card/80 to-transparent border-b border-white/10 px-4 py-3"
-        initial={{ opacity: 0, y: -20 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
         animate={{ opacity: 1, y: 0 }}
       >
```

```diff
@@ -52,13 +54,14 @@
           <motion.button
             onClick={() => navigate(-1)}
+            aria-label="Back"
             className="p-2.5 rounded-2xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all border border-white/10"
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </motion.button>
```

```diff
@@ -61,18 +64,18 @@
             <h1 className="text-lg font-display font-bold flex items-center gap-2">
               Tax Estimator
               <motion.div
-                animate={{ rotate: [0, 15, -15, 0] }}
-                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
+                animate={reduceMotion ? undefined : { rotate: [0, 15, -15, 0] }}
+                transition={reduceMotion ? undefined : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
               >
-                <Sparkles className="w-4 h-4 text-primary" />
+                <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
               </motion.div>
```

```diff
@@ -80,17 +83,17 @@
           <motion.div
             className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30 overflow-hidden"
-            animate={{ rotate: [0, 5, -5, 0] }}
-            transition={{ repeat: Infinity, duration: 3 }}
+            animate={reduceMotion ? undefined : { rotate: [0, 5, -5, 0] }}
+            transition={reduceMotion ? undefined : { repeat: Infinity, duration: 3 }}
           >
             {/* Shimmer effect */}
             <motion.div
               className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
-              animate={{ x: [-100, 100] }}
-              transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
+              animate={reduceMotion ? undefined : { x: [-100, 100] }}
+              transition={reduceMotion ? undefined : { repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
             />
-            <Calculator className="w-5 h-5 text-primary relative

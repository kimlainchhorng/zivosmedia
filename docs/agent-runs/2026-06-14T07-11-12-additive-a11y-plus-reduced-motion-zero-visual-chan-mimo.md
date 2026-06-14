# MiMo run — 2026-06-14T07:11:12.114Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File HAS framer-motion (two entrance motion.div in Documents component, second has transition delay 0.1) and HAS useTranslation. Children out of scope. Add useReducedMotion, const reduceMotion inside Documents component only (VehicleDocumentsWrapper has no motion). Guard both entrance motion.div initial opacity 0 y 12 reduceMotion ? false : object keep animate; second also wrap transition reduceMotion ? undefined : object. aria: icon-only back button aria-label t common.back. aria-hidden true on ArrowLeft, FileText, Car. Heading single h1 plus CardTitle h3 cross-component no change. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Documents.tsx

---

## Plan

Six surgical edits in `src/pages/driver/Documents.tsx`, all additive, zero visual change for non-reduced-motion users:

1. **Import** — add `useReducedMotion` to the framer-motion import.
2. **Hook** — add `const reduceMotion = useReducedMotion();` at the top of the `Documents` component body (not in `VehicleDocumentsWrapper`, which has no motion).
3. **First `motion.div`** (Driver Documents card) — guard `initial` so reduced-motion users get `false` (skip animation entirely); `animate` stays as-is so the element is visible.
4. **Second `motion.div`** (Vehicle Documents wrapper) — same `initial` guard, plus guard the `transition` prop (`reduceMotion ? undefined : { delay: 0.1 }`).
5. **Back button** — add `aria-label={t("common.back" as any, "Back")}` to the `<button>`, add `aria-hidden="true"` to `<ArrowLeft>`.
6. **Decorative icons** — add `aria-hidden="true"` to `<FileText>` (Driver Documents card) and `<Car>` (VehicleDocumentsWrapper).

`h1` and `CardTitle` (`h3`) are already correct across components — no heading change needed.

---

## Diff

```diff
--- a/src/pages/driver/Documents.tsx
+++ b/src/pages/driver/Documents.tsx
@@ -1,4 +1,4 @@
-import { motion } from "framer-motion";
+import { motion, useReducedMotion } from "framer-motion";
 import { ArrowLeft, FileText, Car } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 import BottomNav from "@/components/BottomNav";
@@ -37,6 +37,7 @@ const VehicleDocumentsWrapper = () => {
 const Documents = () => {
   const navigate = useNavigate();
   const { t } = useTranslation();
+  const reduceMotion = useReducedMotion();
 
   return (
     <div className="min-h-screen bg-background pb-24 pt-[env(safe-area-inset-top)]">
@@ -46,9 +47,10 @@ const Documents = () => {
           <button
             onClick={() => navigate(-1)}
             className="p-2 rounded-xl hover:bg-muted transition-colors"
+            aria-label={t("common.back" as any, "Back")}
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </button>
           <div className="flex-1">
             <h1 className="text-base font-bold font-display">{t("docs.pageTitle" as any, "Documents")}</h1>
@@ -64,7 +66,7 @@ const Documents = () => {
         {/* Driver Documents */}
         <motion.div
-          initial={{ opacity: 0, y: 12 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
           animate={{ opacity: 1, y: 0 }}
         >
           <Card className="rounded-2xl border border-border">
             <CardHeader className="pb-3">
               <CardTitle className="text-base flex items-center gap-3 font-display">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
-                  <FileText className="w-5 h-5 text-primary" />
+                  <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
                 </div>

@@ -82,8 +84,8 @@ const Documents = () => {
         {/* Vehicle Documents */}
         <motion.div
-          initial={{ opacity: 0, y: 12 }}
+          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
           animate={{ opacity: 1, y: 0 }}
-          transition={{ delay: 0.1 }}
+          transition={reduceMotion ? undefined : { delay: 0.1 }}
         >
           <VehicleDocumentsWrapper />
         </motion.div>
```

And in `VehicleDocumentsWrapper`, one aria-hidden on `<Car>`:

```diff
--- a/src/pages/driver/Documents.tsx
+++ b/src/pages/driver/Documents.tsx
@@ -27,7 +27,7 @@ const VehicleDocumentsWrapper = () => {
           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
-            <Car className="w-5 h-5 text-primary" />
+            <Car className="w-5 h-5 text-primary" aria-hidden="true" />
           </div>
```

**Total: 1 import edit, 1 hook addition, 6 prop additions across 5 JSX locations. Zero logic/onClick/Supabase changes.**

---

## Owner verification

1. Run `npm run update` (type-check + build must pass).
2. **Reduced-motion check:** enable "Reduce motion" in OS settings → Documents page should render instantly (no fade/slide), back button should have a visible focus ring on Tab, all three icons (`ArrowLeft`, `FileText`, `Car`) should be hidden from screen readers.
3. **Normal-motion check:** disable "Reduce motion" → same entrance animations as before (fade + 12px slide, vehicle card delayed 0.1s). Zero visual regression.

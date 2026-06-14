# MiMo run — 2026-06-14T07:09:27.248Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion, zero visual change. File has NO framer-motion and NO useTranslation so plain Back. It has FOUR CSS animate-pulse loading skeletons. Append motion-reduce:animate-none to each animate-pulse className. aria: icon-only back button aria-label Back. aria-hidden true on ArrowLeft, Check, X, Ban. Heading order single h1 Account plus CardTitle h3 cross-component leave it no change. List exact edits only.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/Account.tsx

---

## Plan

One file, pure additive a11y + reduced-motion. Zero visual changes, zero logic changes. Six categories of edit:

1. **Back button**: add `aria-label="Back"`
2. **ArrowLeft icon**: add `aria-hidden="true"`
3. **Check / X / Ban icons** (decorative, paired with visible text): add `aria-hidden="true"` to each
4. **Four `animate-pulse` skeletons**: append `motion-reduce:animate-none` to each

Heading order left alone (single `<h1>` + `CardTitle` h3 cross-component).

---

## Proposed diff

**File:** `src/pages/driver/Account.tsx`

```diff
--- a/src/pages/driver/Account.tsx
+++ b/src/pages/driver/Account.tsx
@@ -44,7 +44,8 @@
           <button
             onClick={goBack}
+            aria-label="Back"
             className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"
           >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
           </button>
@@ -67,7 +68,7 @@
             {isLoading ? (
-              <div className="animate-pulse space-y-3">
+              <div className="animate-pulse motion-reduce:animate-none space-y-3">
                 <div className="h-2 bg-muted rounded" />
                 <div className="h-4 w-20 bg-muted rounded" />
@@ -85,7 +86,7 @@
                   <div className="flex items-center justify-center gap-1 mb-1">
-                    <Check className="w-4 h-4 text-success" />
+                    <Check className="w-4 h-4 text-success" aria-hidden="true" />
                   </div>
@@ -93,7 +94,7 @@
               {isLoading ? (
-                <div className="animate-pulse space-y-2">
+                <div className="animate-pulse motion-reduce:animate-none space-y-2">
                   <div className="h-8 w-12 bg-muted rounded mx-auto" />
@@ -109,7 +110,7 @@
                   <div className="flex items-center justify-center gap-1 mb-1">
-                    <X className="w-4 h-4 text-warning" />
+                    <X className="w-4 h-4 text-warning" aria-hidden="true" />
                   </div>
@@ -117,7 +118,7 @@
               {isLoading ? (
-                <div className="animate-pulse space-y-2">
+                <div className="animate-pulse motion-reduce:animate-none space-y-2">
                   <div className="h-8 w-12 bg-muted rounded mx-auto" />
@@ -133,7 +134,7 @@
                   <div className="flex items-center justify-center gap-1 mb-1">
-                    <Ban className="w-4 h-4 text-destructive" />
+                    <Ban className="w-4 h-4 text-destructive" aria-hidden="true" />
                   </div>
@@ -141,7 +142,7 @@
               {isLoading ? (
-                <div className="animate-pulse space-y-2">
+                <div className="animate-pulse motion-reduce:animate-none space-y-2">
                   <div className="h-8 w-12 bg-muted rounded mx-auto" />
```

---

## Summary of edits

| # | What | Edit | Type |
|---|------|------|------|
| 1 | Back `<button>` | add `aria-label="Back"` | aria attr |
| 2 | `<ArrowLeft>` | add `aria-hidden="true"` | aria attr |
| 3 | `<Check>` | add `aria-hidden="true"` | aria attr |
| 4 | `<X>` | add `aria-hidden="true"` | aria attr |
| 5 | `<Ban>` | add `aria-hidden="true"` | aria attr |
| 6 | Acceptance-rate skeleton | `animate-pulse` → `animate-pulse motion-reduce:animate-none` | className |
| 7 | Accepted-card skeleton | same | className |
| 8 | Declined-card skeleton | same | className |
| 9 | Cancelled-card skeleton | same | className |

**Totals:** 4 className edits, 5 aria attrs, 0 logic lines, 0 visual changes.

---

## Owner verification

- Run `npm run update` (or the zivodriver project's equivalent type-check + build gate) — must pass at 0 errors.
- Confirm `prefers-reduced-motion` disables the four skeleton pulses (DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`).
- Tab to the Back button — screen reader should announce "Back" (ArrowLeft icon silent). The three stat icons (Check/X/Ban) should be silent; "Accepted"/"Declined"/"Cancelled" text labels convey the meaning.

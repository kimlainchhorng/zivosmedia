# MiMo run — 2026-06-14T09:17:19.230Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change on ServiceEarningsPage a driver earnings dashboard. File has NO framer-motion and NO useTranslation so plain-English labels. Motion inventory ZERO framer-motion. ONE CSS animation a Loader2 with className animate-spin shown while loading the trip list it is a standalone loading spinner with NO adjacent text advise role status plus aria-label Loading plus append motion-reduce:animate-none to its className so reduced-motion users get a still spinner. Icons aria-hidden decorative. The back Button has VISIBLE text Back beside the ArrowLeft so do NOT add aria-label to the Button only add aria-hidden to the ArrowLeft. The Bucket card Icon beside its label text aria-hidden. The per-trip row Icon Car or Package beside the Ride or Delivery text aria-hidden. HEADINGS h1 Earnings is the lone real heading the Trips this month title is a shadcn CardTitle advise leave CardTitle heading hierarchy DEFERRED. Safe-area root is normal-flow container mx-auto p-4 pb-24 not fixed inset-0 advise no change. Confirm or correct exact edits only no logic changes. No useReducedMotion needed since there is no framer-motion.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/ServiceEarningsPage.tsx

---

## Plan

Four additive a11y edits, zero logic, zero visual change:

| # | Target | Edit |
|---|--------|------|
| 1 | `ArrowLeft` in Back button (L29) | `aria-hidden="true"` — decorative; "Back" text is the visible label |
| 2 | `Loader2` spinner (L57) | `role="status"` + `aria-label="Loading"` (standalone, no adjacent text) + append `motion-reduce:animate-none` to className |
| 3 | `Icon` in `Bucket` sub-component (L93) | `aria-hidden="true"` — decorative; `{label}` text is adjacent |
| 4 | `Icon` in per-trip row (L72) | `aria-hidden="true"` — decorative; "Ride"/"Delivery" text is adjacent |

**Left alone (as confirmed):**
- Back `<Button>` — no `aria-label` (visible "Back" text present)
- `<CardTitle>` — heading hierarchy deferred, not touched
- Root `<div>` — normal-flow, no safe-area change
- No `useReducedMotion` — no framer-motion in file

---

## Proposed diff

**File:** `src/pages/driver/ServiceEarningsPage.tsx`

```diff
--- a/src/pages/driver/ServiceEarningsPage.tsx
+++ b/src/pages/driver/ServiceEarningsPage.tsx
@@ -26,7 +26,7 @@ export default function ServiceEarningsPage() {
   return (
     <div className="container mx-auto p-4 max-w-2xl space-y-4 pb-24">
       <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
-        <ArrowLeft className="mr-2 h-4 w-4" /> Back
+        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Back
       </Button>
 
       <header>
@@ -54,7 +54,7 @@ export default function ServiceEarningsPage() {
           {isLoading && (
             <div className="flex items-center justify-center py-6">
-              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
+              <Loader2 role="status" aria-label="Loading" className="h-5 w-5 animate-spin motion-reduce:animate-none text-muted-foreground" />
             </div>
           )}
@@ -69,7 +69,7 @@ export default function ServiceEarningsPage() {
                 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
-                  <Icon className="h-4 w-4 text-primary" />
+                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                 </div>
@@ -90,7 +90,7 @@ function Bucket({ label, bucket, icon: Icon }: { label: string; bucket: Earni
         <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
-          <Icon className="h-3 w-3" /> {label}
+          <Icon className="h-3 w-3" aria-hidden="true" /> {label}
         </div>
```

**Summary of exact edits:**

1. **L29** `ArrowLeft` → append `aria-hidden="true"`
2. **L57** `Loader2` → add `role="status" aria-label="Loading"` props + append `motion-reduce:animate-none` to className string
3. **L72** trip-row `Icon` → append `aria-hidden="true"`
4. **L93** Bucket `Icon` → append `aria-hidden="true"`

---

## Verify / deploy

- Run `npm run update` after applying — must pass (type-check + worker type-check + production build, true exit 0).
- No visual regression expected (all changes are screen-reader/motion-reduce attributes only).
- `motion-reduce:animate-none` is a Tailwind built-in utility — no custom CSS needed.
- Owner commits & deploys when ready.

# DeepSeek run — 2026-06-13T22:16:50.802Z

- model: deepseek-chat
- task: Analyze src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx (a customer-facing PUBLIC page where a buyer submits a star-rating review for a car dealership) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page has ZERO active:scale and ZERO focus-visible rings. Focus on: (1) interaction consistency — add active:scale-[0.98] transition-transform + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every interactive raw button/anchor, star-rating control, chip, and submit/back CTA (icon-only/star buttons use scale-[0.95], chips scale-[0.97]); do NOT add rings to shadcn <Button> or <Input>/<Textarea> (already ship focus styles) — shadcn Button gets only active:scale + transition-transform; (2) responsive issues at 375/768/1280 (form layout, rating row, header); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1200 tokens.
- files: src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

This page is a **standalone public form** (no app shell, no fixed header) — it's already responsive at 375/768/1280 (single-column `max-w-2xl` centered layout). No fetched-but-unused fields found. The only gap is **interaction tokens** on raw controls.

**Controls needing `active:scale` + `focus-visible:ring`:**

1. **5 star-rating `<button>`s** — raw buttons, currently only `hover:scale-110`. Need `active:scale-[0.95]` + `focus-visible:ring-2`.
2. **Phone `<a>` link** (header) — raw anchor, currently `hover:bg-muted`. Needs `active:scale-[0.98]` + ring.
3. **Store name `<Link>`** (header) — raw link, currently `hover:text-primary`. Needs `active:scale-[0.98]` + ring.
4. **"Back to inventory" `<Link>`** (error/already-reviewed states) — raw link. Needs `active:scale-[0.97]` + ring.
5. **"Back to inventory" `<Button>`** (submitted state) — shadcn `<Button>`, already has focus ring. Gets `active:scale-[0.98] transition-transform` only.
6. **Submit `<Button>`** — shadcn `<Button>`, already has focus ring. Gets `active:scale-[0.98] transition-transform` only.

**No responsive issues** — the form is a single-column `max-w-2xl` with `flex-wrap` on the header row. The phone link hides below `sm` which is correct. No changes needed.

---

## Diff

```diff
--- a/src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx
+++ b/src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx
@@ -1,6 +1,6 @@
 import { useEffect, useState } from "react";
 import { useParams, Link } from "react-router-dom";
 import { Helmet } from "react-helmet-async";
 import {
   Car, MapPin, Loader2, Phone, Star, CheckCircle2, AlertTriangle,
   MessageCircle,
@@ -117,7 +117,7 @@ export default function PublicCarDealershipReviewSubmitPage() {
           <h1 className="mt-3 text-2xl font-bold">Link not valid</h1>
           <p className="mt-2 text-muted-foreground">
             This review link doesn't match an active deal at this dealership.
           </p>
           {slug && (
-            <Link to={`/car-dealership/${slug}`} className="mt-4 inline-block text-primary underline">
+            <Link to={`/car-dealership/${slug}`} className="mt-4 inline-block text-primary underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
               ← Back to inventory
             </Link>
           )}
@@ -133,7 +133,7 @@ export default function PublicCarDealershipReviewSubmitPage() {
           <h1 className="mt-3 text-2xl font-bold">Already reviewed</h1>
           <p className="mt-2 text-muted-foreground">
             Thanks — looks like a review for this deal has already been submitted.
           </p>
           {slug && (
-            <Link to={`/car-dealership/${slug}`} className="mt-4 inline-block text-primary underline">
+            <Link to={`/car-dealership/${slug}`} className="mt-4 inline-block text-primary underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
               ← Back to inventory
             </Link>
           )}
@@ -156,7 +156,7 @@ export default function PublicCarDealershipReviewSubmitPage() {
           <div className="min-w-0 flex-1">
-            <Link to={`/car-dealership/${store.slug}`} className="text-base font-bold truncate block hover:text-primary transition-colors">
+            <Link to={`/car-dealership/${store.slug}`} className="text-base font-bold truncate block hover:text-primary transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
               {store.name}
             </Link>
             {cityState && (
@@ -168,7 +168,7 @@ export default function PublicCarDealershipReviewSubmitPage() {
           {store.phone && (
             <a
               href={`tel:${store.phone}`}
-              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium transition-colors"
+              className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <Phone className="h-3.5 w-3.5" />
               {store.phone}
@@ -195,7 +195,7 @@ export default function PublicCarDealershipReviewSubmitPage() {
             </p>
             <Link to={`/car-dealership/${store.slug}`}>
-              <Button className="mt-2">Back to inventory</Button>
+              <Button className="mt-2 active:scale-[0.98] transition-transform">Back to inventory</Button>
             </Link>
           </Card>
         ) : (
@@ -228,7 +228,7 @@ export default function PublicCarDealershipReviewSubmitPage() {
                   {[1, 2, 3, 4, 5].map((n) => (
                     <button
                       key={n}
                       type="button"
                       onMouseEnter={() => setHoverRating(n)}
                       onClick={() => setRating(n)}
-                      className="transition-transform hover:scale-110"
+                      className="transition-all hover:scale-110 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                       aria-label={`${n} star${n !== 1 ? "s" : ""}`}
                     >
                       <Star
@@ -296,7 +296,7 @@ export default function PublicCarDealershipReviewSubmitPage() {
               <Button
                 className="w-full"
+                className="w-full active:scale-[0.98] transition-transform"
                 onClick={handleSubmit}
                 disabled={submitting || !name.trim() || !body.trim()}
               >
```

---

## Verification

- **`npm run update`** must pass (type-check + worker + build).
- **Preview** at `/car-dealership/:slug/review/:dealId` — verify star buttons have `active:scale-[0.95]` + focus ring, phone link has ring, both CTAs have `active:scale-[0.98]`. No console errors.
- **No behavior change** — all supabase queries/mutations/routing are byte-identical.

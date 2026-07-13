# MiMo run — 2026-06-13T22:31:53.050Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze TWO customer-facing PUBLIC review-submit pages — src/pages/salon/PublicReviewSubmitPage.tsx and src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx (a client submits a star-rating review) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. Both pages have ZERO active:scale and ZERO focus-visible rings. For EACH page separately: (1) interaction consistency — add active:scale-[0.98] transition-transform + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every raw interactive button/anchor/Link, star-rating control, chip, and submit/back CTA (icon-only/star buttons use scale-[0.95], chips scale-[0.97]); do NOT add rings to shadcn Button/Input/Textarea (already ship focus styles) — shadcn Button gets only active:scale + transition-transform; (2) responsive issues at 375/768/1280; (3) any fetched-but-unused fields worth surfacing. Return a CONCISE per-file line-referenced punch list of exact className edits. Do NOT reprint whole components. Keep under ~1400 tokens.
- files: src/pages/salon/PublicReviewSubmitPage.tsx, src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Both pages are minimal review forms (star rating + textarea + submit). The salon page has only **2 interactive control groups** (star buttons + shadcn submit); the car-rental page has **4** (star buttons, 3 "Back to home" Links, shadcn submit). No responsive crush — both are single-column `max-w-md`/`max-w-xl`. One fetched-but-unused field set worth surfacing on car-rental: `pickup_at`/`dropoff_at` (rental dates — context for "which rental am I reviewing?", matching the salon page's service date).

---

## File 1: `src/pages/salon/PublicReviewSubmitPage.tsx`

### Edit 1 — Star rating `<button>`s (line ~118)

**Before:**
```
className="rounded-full p-1 transition-transform hover:scale-110"
```
**After:**
```
className="rounded-full p-1 transition-transform hover:scale-110 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
*Star buttons = icon-like → `scale-[0.95]` press + keyboard ring.*

### Edit 2 — shadcn submit `<Button>` (line ~138)

**Before:**
```
<Button onClick={handleSubmit} disabled={submitting || rating < 1} className="w-full gap-1.5">
```
**After:**
```
<Button onClick={handleSubmit} disabled={submitting || rating < 1} className="w-full gap-1.5 transition-transform active:scale-[0.98]">
```
*shadcn ships its own ring → active:scale only.*

**That's it.** No other interactive controls exist on this page (the submitted/already_reviewed/notReviewable states are pure informational with no links or buttons). No responsive issues. No fetched-but-unused fields worth surfacing (`store_id`/`store_slug`/`stylist_id` are internal IDs).

---

## File 2: `src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx`

### Edit 1 — `StarRow` `<button>`s (shared component, line ~174)

**Before:**
```
className="rounded p-0.5 transition-transform hover:scale-110"
```
**After:**
```
className="rounded p-0.5 transition-transform hover:scale-110 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
*Single edit covers all 20 star buttons (4 rows × 5).*

### Edit 2 — Error-state "Back to home" `<Link>` (line ~105)

**Before:**
```
<Link to="/" className="mt-4 inline-block text-primary underline">Back to home</Link>
```
**After:**
```
<Link to="/" className="mt-4 inline-block text-primary underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Back to home</Link>
```

### Edit 3 — Already-submitted "Back to home" `<Link>` (line ~118)

**Before:**
```
<Link to="/" className="inline-block text-sm text-primary underline">Back to home</Link>
```
**After:**
```
<Link to="/" className="inline-block text-sm text-primary underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Back to home</Link>
```

### Edit 4 — Submitted "Back to home" `<Link>` (line ~130)

**Before:**
```
<Link to="/" className="inline-block pt-2 text-sm text-primary underline">Back to home</Link>
```
**After:**
```
<Link to="/" className="inline-block pt-2 text-sm text-primary underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Back to home</Link>
```

### Edit 5 — shadcn submit `<Button>` (line ~155)

**Before:**
```
<Button onClick={submit} disabled={rating === 0 || submitting} className="w-full">
```
**After:**
```
<Button onClick={submit} disabled={rating === 0 || submitting} className="w-full transition-transform active:scale-[0.98]">
```

### Edit 6 — Surface rental dates (display-only, line ~127 after `vehicle_label`)

After the existing `{reservation.vehicle_label}` line, add inside the same conditional:

```tsx
<p className="text-[11px] text-muted-foreground">
  {new Date(reservation.pickup_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – {new Date(reservation.dropoff_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
</p>
```

*`pickup_at`/`dropoff_at` are fetched but never rendered — shows "which rental" context, matching the salon page's service date display. Display-only conditional; no query/logic change.*

---

## Summary

| Page | Edits | Types |
|------|-------|-------|
| Salon | 2 | 1 raw star buttons, 1 shadcn Button |
| Car-rental | 6 | 1 shared StarRow, 3 raw Links, 1 shadcn Button, 1 display-only date surfacing |

**Net:** 8 edits total, all className-only except one 3-line JSX addition (rental dates). Zero logic/query/mutation/routing changes.

## Owner verification

- Run `npm run update` (must pass).
- Preview both routes at 375/768/1280 — star buttons should have visible press shrink + keyboard ring; Links should show `active:scale-[0.97]`; submit buttons should press-shrink.
- Tab through star buttons on both pages to confirm `focus-visible` ring appears (programmatic click won't show it — needs keyboard Tab navigation).
- Car-rental header should now show rental dates below the vehicle label when a reservation loads.

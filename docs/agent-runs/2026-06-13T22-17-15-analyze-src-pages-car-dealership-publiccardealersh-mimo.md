# MiMo run — 2026-06-13T22:17:15.100Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx (a customer-facing PUBLIC page where a buyer submits a star-rating review for a car dealership) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page has ZERO active:scale and ZERO focus-visible rings. Focus on: (1) interaction consistency — add active:scale-[0.98] transition-transform + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every interactive raw button/anchor, star-rating control, chip, and submit/back CTA (icon-only/star buttons use scale-[0.95], chips scale-[0.97]); do NOT add rings to shadcn <Button> or <Input>/<Textarea> (already ship focus styles) — shadcn Button gets only active:scale + transition-transform; (2) responsive issues at 375/768/1280 (form layout, rating row, header); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1200 tokens.
- files: src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Scan every raw interactive element (`<button>`, `<a>`, `<Link>`) in the review submit page. There are **7 raw controls** lacking `active:scale` / `focus-visible:ring` (plus 2 shadcn `<Button>`s that only need the press transform). No responsive crush issues — the form is already `max-w-2xl px-4` with a single-column layout. No fetched-but-unused fields (every column in the two queries renders or pre-fills).

---

## Proposed className edits — `src/pages/car-dealership/PublicCarDealershipReviewSubmitPage.tsx`

**1. Error-state "Back to inventory" link** (line ~143)
```
// BEFORE:
className="mt-4 inline-block text-primary underline"

// AFTER:
className="mt-4 inline-block text-primary underline transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**2. Already-reviewed "Back to inventory" link** (line ~157)
Same before/after as #1.

**3. Header store name `<Link>`** (line ~163)
```
// BEFORE:
className="text-base font-bold truncate block hover:text-primary transition-colors"

// AFTER:
className="text-base font-bold truncate block hover:text-primary transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**4. Header phone `<a href="tel:...">`** (line ~168-175)
```
// BEFORE:
className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors"

// AFTER:
className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted px-3 py-1.5 text-sm font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**5. Star rating `<button>`s** (line ~189-200)
```
// BEFORE:
className="transition-transform hover:scale-110"

// AFTER:
className="transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**6. Success-state shadcn `<Button>`** ("Back to inventory", line ~188)
```
// BEFORE:
<Button className="mt-2">Back to inventory</Button>

// AFTER:
<Button className="mt-2 active:scale-[0.98] transition-transform">Back to inventory</Button>
```

**7. Submit shadcn `<Button>`** (line ~241)
```
// BEFORE:
className="w-full"

// AFTER:
className="w-full active:scale-[0.98] transition-transform"
```

---

## Notes for the applier

- **No logic changes.** All 7 edits are className-only. Supabase queries, mutations, react-query keys, routing, state, and `handleSubmit` are untouched.
- **No responsive crush.** The header phone link is `hidden sm:inline-flex` (mobile-safe), stars are 5 × 32px + gaps ≈ 200px (fits 375px), form is `max-w-2xl px-4`, vehicle card and inputs are single-column. Verified mental layout at 375/768/1280 — no fix needed.
- **No unused fields.** `store.logo_url`, `.address`, `.phone` all render; `deal.vehicle_label`, `.vehicle_vin`, `.customer_name` all render or pre-fill; `deal.status` gates the load state.
- **Verify:** `npm run update` (type-check + worker type-check + production build — must be green). Preview at `/car-dealership/test-slug/review/test-deal` at 375/768/1280 to confirm star hover/active + ring behavior on the links.

# DeepSeek run — 2026-06-13T22:30:50.086Z

- model: deepseek-chat
- task: Analyze TWO customer-facing PUBLIC review-submit pages — src/pages/salon/PublicReviewSubmitPage.tsx and src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx (a client submits a star-rating review) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. Both pages have ZERO active:scale and ZERO focus-visible rings. For EACH page separately: (1) interaction consistency — add active:scale-[0.98] transition-transform + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every raw interactive button/anchor/Link, star-rating control, chip, and submit/back CTA (icon-only/star buttons use scale-[0.95], chips scale-[0.97]); do NOT add rings to shadcn Button/Input/Textarea (already ship focus styles) — shadcn Button gets only active:scale + transition-transform; (2) responsive issues at 375/768/1280; (3) any fetched-but-unused fields worth surfacing. Return a CONCISE per-file line-referenced punch list of exact className edits. Do NOT reprint whole components. Keep under ~1400 tokens.
- files: src/pages/salon/PublicReviewSubmitPage.tsx, src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Analysis & Plan

Both pages are clean, well-structured review forms with **zero** `active:scale` and **zero** `focus-visible` rings on raw controls. The reference `JobPostingDetailPage` uses `active:scale-[0.98]` on its custom buttons and `active:scale-[0.99]` on the owner toggle.

**Plan:**
1. **Salon page** — 4 raw controls need tokens (star buttons, back-link in error state, the "Booked under" text is static — skip)
2. **Car-rental page** — 8 raw controls need tokens (star buttons in `StarRow`, `SubRating` cards, error-state back-link, already-submitted back-link, submitted back-link, header store logo area is static — skip)
3. **Responsive** — both already use `max-w-md`/`max-w-xl` centered columns, no crush at 375px
4. **Fetched-but-unused** — none worth surfacing (both pages display all fetched data)

---

## Salon: `src/pages/salon/PublicReviewSubmitPage.tsx`

### Edits (4 controls)

**1. Star buttons (L118-127)** — 5 `<button>` elements in the `[1,2,3,4,5].map`:
```
// BEFORE:
className="rounded-full p-1 transition-transform hover:scale-110"
// AFTER:
className="rounded-full p-1 transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
```

**2. Error-state back link (L62-64)** — the `<div>` with `AlertCircle` is static text, no link. Skip.

**3. Submit Button (L148-152)** — shadcn `<Button>`:
```
// BEFORE:
className="w-full gap-1.5"
// AFTER:
className="w-full gap-1.5 transition-transform active:scale-[0.98]"
```

**4. Already-reviewed / not-reviewable / submitted blocks** — all are static `<div>`s with no interactive controls. Skip.

**Total: 2 className edits** (star buttons via `replace_all` on the shared pattern, submit Button)

---

## Car-rental: `src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx`

### Edits (8 controls)

**1. StarRow star buttons (L175-183)** — 5 `<button>` elements in the `[1,2,3,4,5].map`:
```
// BEFORE:
className="rounded p-0.5 transition-transform hover:scale-110"
// AFTER:
className="rounded p-0.5 transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-110"
```

**2. Error-state "Back to home" link (L108)** — raw `<Link>`:
```
// BEFORE:
className="mt-4 inline-block text-primary underline"
// AFTER:
className="mt-4 inline-block text-primary underline transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**3. Already-submitted "Back to home" link (L131)** — raw `<Link>`:
```
// BEFORE:
className="inline-block text-sm text-primary underline"
// AFTER:
className="inline-block text-sm text-primary underline transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**4. Submitted "Back to home" link (L142)** — raw `<Link>`:
```
// BEFORE:
className="inline-block pt-2 text-sm text-primary underline"
// AFTER:
className="inline-block pt-2 text-sm text-primary underline transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
```

**5. Submit Button (L170-172)** — shadcn `<Button>`:
```
// BEFORE:
className="w-full"
// AFTER:
className="w-full transition-transform active:scale-[0.98]"
```

**6. SubRating card containers (L186-188)** — these are `<div>` containers, not buttons. Skip (no interaction).

**7. Header store logo area** — static `<div>`/`<img>`. Skip.

**8. Error banner (L149-151)** — static `<div>`. Skip.

**Total: 5 className edits** (star buttons via `replace_all`, 3 back-links via `replace_all` on the shared `underline` pattern, submit Button)

---

## Summary

| Page | Edits | Controls |
|------|-------|----------|
| `PublicReviewSubmitPage.tsx` | 2 | star buttons (replace_all), submit Button |
| `PublicCarRentalReviewSubmitPage.tsx` | 5 | star buttons (replace_all), 3 back-links (replace_all), submit Button |

**No responsive issues** at any breakpoint — both use single-column `max-w-md`/`max-w-xl` layouts that wrap cleanly.

**No fetched-but-unused fields** worth surfacing — both pages display all queried data.

**Owner must verify:** `npm run update` passes, then preview both routes at 375/768/1280 to confirm no visual regression.

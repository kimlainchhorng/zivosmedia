# MiMo run — 2026-06-13T21:13:56.894Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze the ListingDetail bottom-sheet component (function ListingDetail, ~lines 2080-3175) in src/pages/MarketplacePage.tsx for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes. The component is already mature (image carousel+lightbox, gradient price, trust-score seller card, offers, Q&A, reviews, similar items, sticky bottom CTA, offer/report modals). Focus on: (1) button consistency — several interactive buttons lack 'active:scale-[0.98] transition-transform' and 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' that the sticky CTA and modals already have, e.g. the inline Message/Make Offer/Report (~2662-2687), the top fav/share (~2477-2489), owner Edit/Bump/Promote/Delete (~2722-2761), tag chips (~2525), seller card (~2545), similar-item cards (~2905); (2) any real responsive issue at 375/768/1280. Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/MarketplacePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Audit the `ListingDetail` bottom-sheet (~lines 2080–3175) in `src/pages/MarketplacePage.tsx` for missing premium button/interaction classes. The reference (`JobPostingDetailPage.tsx`) uses consistent `active:scale-[0.98] transition-all` on every interactive button plus `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (or `focus-visible:ring-primary/50`). Several interactive targets in `ListingDetail` are missing one or both. No logic changes — className-only diffs.

---

## Punch list — exact className additions

All edits are **append** to existing `className` strings (never remove). The token set to add per interactive element type:

| Element type | Tokens to add |
|---|---|
| `<button>` (non-disabled) | `active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Chip/tag `<button>` | `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| Icon-only `<button>` (e.g. fav, share, close) | `active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |

### 1. **Top action buttons — fav & share** (~lines 2477–2489)

The Heart (favorite toggle) and Share2 buttons are icon-only interactive targets. Add to each:

```
active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 2. **Tag chips** (~line 2525)

Each tag chip `<button>` (the `rounded-full bg-muted/40` chips). Add:

```
active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 3. **Seller card** (~line 2545)

The seller card is a clickable element (navigates to seller profile). Add to its outer interactive wrapper:

```
active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 4. **Inline action buttons — Message / Make Offer / Report** (~lines 2662–2687)

Three buttons in a row. Each gets:

```
active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

Note: if "Report" already has a different visual treatment (text-only, danger), keep its existing `text-red-*` and just append the interaction tokens.

### 5. **Owner controls — Edit / Bump / Promote / Delete** (~lines 2722–2761)

Four buttons for the listing owner. Each gets:

```
active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

Delete (destructive) can use `focus-visible:ring-red-500` instead of `focus-visible:ring-ring` for semantic correctness.

### 6. **Similar-item cards** (~line 2905)

Each similar-item card `<button>` (the clickable card grid). Add:

```
active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### 7. **Responsive check — no structural issues expected**

The component already uses responsive patterns (the image carousel, the grid layout). The main things to spot-check at 375px:

- The inline Message/Make Offer/Report row (~2662–2687): if they sit in a `flex gap-2` row, confirm they wrap or scroll on 375px. If they overflow, add `flex-wrap` or reduce padding (`px-2 sm:px-3`).
- Owner Edit/Bump/Promote/Delete row (~2722–2761): same — if 4 buttons in one row at 375px, consider `flex-wrap gap-2` so they don't get crushed.
- The similar-items grid (~2905): should be `grid-cols-2 sm:grid-cols-3` at minimum. If it's hardcoded `grid-cols-3`, 375px cards will be too narrow.

These are the only likely responsive issues; the rest of the component (carousel, sticky CTA, seller card, Q&A, reviews) already handles mobile widths.

---

## What NOT to change

- No supabase queries, mutations, react-query keys, routing, or component logic
- The sticky bottom CTA bar and modals already have these tokens — leave them as-is
- No new components or imports

---

## Verification

1. `npm run update` — must pass (type-check + worker type-check + production build)
2. Preview at `/marketplace` → open a listing detail at 375px / 768px / 1280px
3. Tab through every interactive element — all must show a visible focus ring
4. Touch/click every button — all must have the micro-scale feedback
5. Check owner controls vs visitor controls (different user states)

# MiMo run — 2026-06-13T22:12:18.875Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/GroceryStorePage.tsx (a customer-facing PUBLIC grocery storefront) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. This page has near-ZERO active:scale and ZERO focus-visible rings. Focus on: (1) interaction consistency — add active:scale-[0.98] transition-transform + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring to every interactive button, product/category card, quantity control, and CTA (icon-only buttons use scale-[0.95], chips/filter pills use scale-[0.97]); do NOT add rings to shadcn <Button> (already has them) — give those only active:scale + transition-transform; (2) responsive issues at 375/768/1280 (product grid, category lists, cart/summary layout); (3) any obviously incomplete/disconnected UI piece (fetched-but-unused fields). Return a CONCISE, line-referenced punch list of exact className edits. Do NOT reprint the whole component. Keep under ~1500 tokens.
- files: src/pages/GroceryStorePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

This page is already well-structured with framer-motion `whileTap` on most controls, but several raw interactive elements are missing **`focus-visible:ring`** and **`active:scale` in className** (relying solely on `whileTap` which doesn't help keyboard users). One responsive skeleton mismatch and one fetched-but-unused field in the featured row.

---

## Punch List — 6 className-only edits

### 1. Sort mode button (line ~438) — missing focus ring + className active:scale

```diff
- className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors"
+ className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 2. Cart drawer close (ChevronUp) button (line ~396) — missing focus ring + active:scale

```diff
- className="p-1 rounded-lg hover:bg-muted/60 transition-colors"
+ className="p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 3. Floating cart bar button (line ~478) — missing focus ring + active:scale

```diff
- className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20"
+ className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-ig-gradient text-white shadow-2xl shadow-primary/30 border border-primary/20 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
```

*(ring-offset-2 needed so the white ring is visible against the gradient bg)*

### 4. Featured product image click area (line ~143) — clickable div, no active:scale

```diff
- className="relative h-[120px] bg-gradient-to-br from-primary/[0.03] to-muted/20 flex items-center justify-center p-3.5 cursor-pointer"
+ className="relative h-[120px] bg-gradient-to-br from-primary/[0.03] to-muted/20 flex items-center justify-center p-3.5 cursor-pointer active:scale-[0.98] transition-all"
```

*(Deliberately no ring — non-focusable `<div>`, same pattern as car-dealership vehicle cards)*

### 5. Skeleton grid mismatch (line ~335) — 2-col skeleton doesn't match 3-col product grid

```diff
- <div className="grid grid-cols-2 gap-2.5">
+ <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
```

*(Matches the actual product grid at line ~453: `grid-cols-3 sm:grid-cols-4 gap-2`)*

### 6. Featured product brand — fetched but unused display field (line ~150)

After the product name `<p>`, add:

```jsx
{p.brand && <p className="text-[9px] text-muted-foreground truncate">{p.brand}</p>}
```

*(`brand` is confirmed fetched — `handleAdd` at line ~225 passes `p.brand` to the cart. Display-only addition.)*

---

## What's NOT touched (and why)

- **Shadcn `<Button>`** (Back to stores, Place Order) — already ships `active:scale-[0.98]` + `focus-visible:ring-2` in its base component.
- **SwipeableCartItem +/- buttons** — already have the full token set.
- **Quick filter chips** — already have `focus-visible:ring` + `whileTap`.
- **Header back/cart buttons** — already have the full token set.
- **Featured add-to-cart button** — already has `focus-visible:ring`.
- **Cart "Clear" button** — already has `active:scale-[0.95]` + `focus-visible:ring`.
- **All supabase queries, mutations, react-query keys, routing, component logic** — untouched (HARD RULE).

## Verification

After applying: `npm run update` (type-check + worker + build). Preview at 375 / 768 / 1280 — focus on the skeleton-to-grid transition and the 3 newly-tokenized buttons via keyboard Tab.

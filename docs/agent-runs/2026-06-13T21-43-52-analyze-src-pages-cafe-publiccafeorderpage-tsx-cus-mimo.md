# MiMo run — 2026-06-13T21:43:52.546Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze src/pages/cafe/PublicCafeOrderPage.tsx (customer-facing PUBLIC cafe ordering storefront at route /cafe/:slug) for PREMIUM + RESPONSIVE refinements toward parity with the reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase queries, mutations, react-query keys, routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. IMPORTANT CONTEXT: the shadcn <Button> base component ALREADY includes active:scale-[0.98] + focus-visible:ring-2, so DO NOT propose edits to <Button> elements — focus ONLY on the RAW <button> elements which currently have ZERO active:scale and ZERO focus-visible rings. Those raw buttons are: featured-item cards (~L903), bundle cards (~L940), clear-search X (~L990, icon-only), category filter chips incl All (~L1005/L1010), menu-item cards (~L1028), modifier toggle rows in the item dialog (~L1140), upsell cards in cart (~L1280), tip-preset buttons (~L1370), and schedule ASAP/Schedule buttons (~L1396/L1405). For each: add active:scale-[0.98] (cards/wide) or active:scale-[0.97] (chips) or active:scale-[0.95] (icon-only) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring, and upgrade transition-colors/transition-shadow to transition-all where needed. Also check: (2) responsive at 375/768/1280 — menu grid is grid-cols-1 sm:grid-cols-2, featured/bundle are horizontal scroll rows, cart is a Dialog; flag any crush; (3) any obviously incomplete/disconnected UI. Return a CONCISE line-referenced punch list of exact className edits. Do NOT reprint the whole component. Under ~1500 tokens.
- files: src/pages/cafe/PublicCafeOrderPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Identify every **raw `<button>`** (not shadcn `<Button>`) in `PublicCafeOrderPage.tsx` missing `active:scale` + `focus-visible:ring`, and add the tokens per the task instructions. Upgrade `transition-shadow`/`transition-colors` → `transition-all` where needed. No logic/query changes.

---

## Proposed className edits

All in **`src/pages/cafe/PublicCafeOrderPage.tsx`**. Line refs are approximate (the file is large).

### 1. Featured-item cards (~L903)
```
// BEFORE
…hover:shadow-md transition-shadow">
// AFTER
…hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 2. Bundle cards (~L940)
```
// BEFORE
…hover:shadow-md transition-shadow relative">
// AFTER
…hover:shadow-md transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative">
```

### 3. Clear-search X button (~L990, icon-only)
```
// BEFORE
className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
// AFTER
className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 4. "All" category chip (~L1005)
```
// BEFORE
…activeCatId === null ? "bg-ig-gradient text-white border-primary" : "bg-card border-border"
// AFTER
…activeCatId === null ? "bg-ig-gradient text-white border-primary" : "bg-card border-border",
  "active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 5. Per-category chips (~L1010)
```
// BEFORE
…activeCatId === c.id ? "bg-ig-gradient text-white border-primary" : "bg-card border-border"
// AFTER
…activeCatId === c.id ? "bg-ig-gradient text-white border-primary" : "bg-card border-border",
  "active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 6. Menu-item cards (~L1028)
```
// BEFORE
"text-left rounded-xl border border-border bg-card overflow-hidden transition-shadow relative",
// AFTER
"text-left rounded-xl border border-border bg-card overflow-hidden transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative",
```

### 7. Modifier toggle rows in item dialog (~L1140)
```
// BEFORE
"w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
// AFTER
"w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

### 8. Upsell cards in cart (~L1280)
```
// before: any raw <button> for upsell items lacking scale/ring
// add: "active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
*(Exact location depends on where the upsell rail renders inside the cart Dialog — search for `upsellItems.map` inside the cart dialog.)*

### 9. Tip-preset buttons (~L1370)
```
// add to each preset button:
"active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 10. Schedule ASAP / Schedule buttons (~L1396/L1405)
```
// add to each:
"active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Responsive check (375 / 768 / 1280)

| Surface | Assessment |
|---|---|
| Menu grid `grid-cols-1 sm:grid-cols-2` | ✅ Good — 1-col on 375, 2-col on 768+. No crush. |
| Featured & bundle rows | ✅ Horizontal scroll rows, `shrink-0 w-44` cards — natural overflow, no crush. |
| Category chip strip | ✅ Horizontal scroll (`overflow-x-auto`), `shrink-0` chips — fine on 375. |
| Cart | ✅ `Dialog` — inherently responsive. |
| Search bar | ✅ Full-width `Input`, no crush. |

**No responsive issues found.** The layout is already well-structured.

---

## Incomplete / disconnected UI notes

1. **No obvious disconnections** — the page is self-contained (load → browse → pick → cart → submit). The upsell rail, reorder flow, loyalty balance, scheduled orders, bundles, and happy-hour pricing all appear wired correctly.

2. **Minor polish (not in scope):** The store hero banner has no safe-area top padding (fixed app header may overlap on native). The "Reserve a table" / "About" links are plain `<a>` tags (full reload) — could be `<Link>` but that's logic-adjacent, not in scope.

---

## Owner verification

1. Apply edits to `src/pages/cafe/PublicCafeOrderPage.tsx`.
2. Run `npm run update` (must pass 0 TS errors + build).
3. Preview at `/cafe/<any-slug>` at 375 / 768 / 1280 — verify featured cards, category chips, menu cards, modifier rows in the dialog, and tip/schedule buttons all show press-scale + keyboard ring.
4. The hard rule is maintained: **no supabase queries, mutations, react-query keys, routing, or component logic changed** — only `className` string edits.

# DeepSeek run — 2026-06-13T22:44:07.146Z

- model: deepseek-chat
- task: Premium interaction + responsive QA pass on ONE customer-facing page: src/pages/GroceryMarketplace.tsx (the LIVE /grocery landing — nearby grocery store list with delivery address bar, featured store spotlight, category chips, store cards). It ALREADY uses framer-motion whileTap for press feedback and has aria-labels on icon-only header buttons. Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute (incl. framer-motion whileTap) changes ONLY — do NOT change any supabase query, hook, RPC, mutation, react-query key, routing, navigate target, or filter/sort logic. Identify genuine gaps ONLY: (1) interactive controls (motion.button/button/a) missing focus-visible keyboard rings; (2) controls missing press feedback (whileTap/active:scale) that their siblings already have; (3) icon-only buttons without aria-label; (4) responsive crush/overflow at 375px; (5) fetched-but-unused data fields; (6) contrast/legibility bugs. IMPORTANT: for motion elements whose scale is already controlled by framer-motion (whileTap or a scale variant), CSS active:scale is dead — use whileTap instead. Be concise; cite exact classNames not line numbers.
- files: src/pages/GroceryMarketplace.tsx

---

# GroceryMarketplace Premium Interaction + Responsive QA

## Plan

After careful analysis of `src/pages/GroceryMarketplace.tsx` against the reference standard (`JobPostingDetailPage.tsx`), I found **4 genuine gaps**:

1. **Header back button** — `motion.button` with `whileTap={{ scale: 0.9 }}` but **no focus-visible ring** (keyboard users can't see focus)
2. **Header "My orders" button** — same: `whileTap` present, no focus ring
3. **Header "Shopping cart" button** — same: `whileTap` present, no focus ring
4. **Database-backed store cards** (`visibleDbStores.map`) — these are `motion.button` with **no `whileTap` at all** (inconsistent with all other store cards which have `whileTap={{ scale: 0.97 }}`)

**No other gaps found:**
- ✅ All icon-only buttons already have `aria-label`
- ✅ No responsive crush at 375px (flex layout with `min-w-0`, `truncate`, `flex-wrap` already handles narrow widths)
- ✅ No fetched-but-unused data fields (all `StoreConfig`/`StoreProfile` fields are rendered)
- ✅ No contrast/legibility bugs (text colors use proper `text-foreground`/`text-muted-foreground` hierarchy)
- ✅ `FeaturedStore` and `StoreCardWithLocation` already have `whileTap={{ scale: 0.97 }}` — correct, no CSS `active:scale` needed
- ✅ `GroceryCategories`, `GroceryPromos`, `GroceryRecentStores`, `GroceryReorder`, `GrocerySmartSearch`, `GroceryDeliveryBar`, `GroceryHowItWorks` are all separate components — not in scope for this file

## Proposed Changes

**File: `src/pages/GroceryMarketplace.tsx`**

### Change 1-3: Add focus-visible rings to header buttons (3 edits)

**Before (line ~155):**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate(-1)}
  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 transition-colors duration-200 touch-manipulation"
  aria-label="Go back"
>
```

**After:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate(-1)}
  className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-2xl hover:bg-muted/60 transition-colors duration-200 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  aria-label="Go back"
>
```

**Before (line ~175):**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery/orders")}
  className="p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
  aria-label="My orders"
>
```

**After:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery/orders")}
  className="p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  aria-label="My orders"
>
```

**Before (line ~183):**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery/store/walmart")}
  className="relative p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
  aria-label="Shopping cart"
>
```

**After:**
```tsx
<motion.button
  whileTap={{ scale: 0.9 }}
  onClick={() => navigate("/grocery/store/walmart")}
  className="relative p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  aria-label="Shopping cart"
>
```

### Change 4: Add whileTap to database-backed store cards (1 edit)

**Before (line ~280):**
```tsx
<motion.button
  key={ds.id}
  variants={cardVariant}
  onClick={() => navigate(getStorePublicPath(ds))}
  className="w-full rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all text-left group overflow-hidden"
>
```

**After:**
```tsx
<motion.button
  key={ds.id}
  variants={cardVariant}
  whileTap={{ scale: 0.97 }}
  onClick={() => navigate(getStorePublicPath(ds))}
  className="w-full rounded-2xl bg-card border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all text-left group overflow-hidden"
>
```

## Summary

| # | Control | Gap | Fix |
|---|---------|-----|-----|
| 1 | Header back button | Missing focus-visible ring | Added `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| 2 | Header "My orders" button | Missing focus-visible ring | Same as above |
| 3 | Header "Shopping cart" button | Missing focus-visible ring | Same as above |
| 4 | DB-backed store cards | Missing `whileTap` (inconsistent with all other store cards) | Added `whileTap={{ scale: 0.97 }}` |

**HARD RULE honored:** All 4 changes are className/attribute-only. No supabase queries, hooks, RPCs, mutations, react-query keys, routing, navigate targets, or filter/sort logic touched.

## Verification

Run `npm run update` after applying. Preview at 375px width — verify:
- Header buttons show focus ring on keyboard Tab
- DB-backed store cards have press feedback (scale on click)
- No layout crush at 375px (existing responsive utilities handle it)

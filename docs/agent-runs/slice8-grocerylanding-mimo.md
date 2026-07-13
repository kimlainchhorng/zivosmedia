# MiMo run — 2026-06-13T22:36:07.265Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA pass on ONE customer-facing page: src/pages/GroceryPage.tsx (the grocery landing / multi-store product search). Reference standard for interaction tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale-[0.97/0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). HARD RULE: className and display-only attribute changes ONLY — do NOT change any supabase query, RPC, mutation, react-query key, routing, or pricing/cart logic. Identify genuine gaps ONLY: (1) raw <button>/<a> controls missing active:scale press feedback or focus-visible rings; (2) icon-only buttons without aria-label; (3) responsive crush or overflow at 375px width; (4) fetched-but-unused data fields; (5) contrast/legibility bugs. shadcn <Button>/<Input>/<Badge> already ship built-in tokens — do NOT flag those. Be concise; cite exact classNames not line numbers.
- files: src/pages/GroceryPage.tsx

---

## 1. Plan

**8 raw controls** need interaction tokens; **6 icon-only buttons** need `aria-label`. No responsive crush (3-col grid at 375px is fine with the px-2.5 + gap-2 padding), no fetched-but-unused fields (products are passed through to the shared card/detail components which handle display), no contrast bugs.

| # | Control | Issue |
|---|---------|-------|
| 1 | Back `<button>` (header) | No scale, no ring, no aria-label (icon-only ArrowLeft) |
| 2 | Cart `<button>` (header) | No scale, no ring, no aria-label (icon-only ShoppingCart + badge) |
| 3 | Store tab `<button>` elements | Has `transition-all` but no `active:scale` or focus ring |
| 4 | Search clear X `<button>` | No scale, no ring, no aria-label (icon-only X) |
| 5 | Cart "Clear all" `<button>` | No scale, no ring (text button) |
| 6 | Cart qty − `<button>` | No scale, no ring, no aria-label (icon-only Minus) |
| 7 | Cart qty + `<button>` | No scale, no ring, no aria-label (icon-only Plus) |
| 8 | Cart trash `<button>` | No scale, no ring, no aria-label (icon-only Trash2) |

---

## 2. Diff — `src/pages/GroceryPage.tsx`

### (1+2) Header back + cart buttons — add ring, scale, transition, aria-label

**Before:**
```tsx
<button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted">
```
**After:**
```tsx
<button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="p-1.5 rounded-xl hover:bg-muted active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

**Before:**
```tsx
<button type="button" onClick={() => setShowCart(!showCart)} className="relative p-2 rounded-xl hover:bg-muted">
```
**After:**
```tsx
<button type="button" onClick={() => setShowCart(!showCart)} aria-label="Open cart" className="relative p-2 rounded-xl hover:bg-muted active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### (3) Store tab buttons — append scale + ring (already has `transition-all`)

**Before:**
```tsx
className={cn(
  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
  selectedStore === store.name
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-muted/50 text-muted-foreground hover:bg-muted"
)}
```
**After:**
```tsx
className={cn(
  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  selectedStore === store.name
    ? "bg-ig-gradient text-white shadow-sm"
    : "bg-muted/50 text-muted-foreground hover:bg-muted"
)}
```

### (4) Search clear X button — add ring, scale, transition, aria-label

**Before:**
```tsx
<button type="button" onClick={() => { setQuery(""); clearResults(); }} className="absolute right-3 top-1/2 -translate-y-1/2">
```
**After:**
```tsx
<button type="button" onClick={() => { setQuery(""); clearResults(); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
```

### (5) Cart "Clear all" text button — add scale + ring

**Before:**
```tsx
<button type="button" onClick={cart.clearCart} className="text-xs text-destructive hover:underline">Clear all</button>
```
**After:**
```tsx
<button type="button" onClick={cart.clearCart} className="text-xs text-destructive hover:underline active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">Clear all</button>
```

### (6+7+8) Cart item qty − / + / trash buttons — add ring, scale, transition, aria-label

**Before (minus):**
```tsx
<button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)} className="p-1 rounded-lg hover:bg-muted"><Minus className="h-3 w-3" /></button>
```
**After:**
```tsx
<button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)} aria-label="Decrease quantity" className="p-1 rounded-lg hover:bg-muted active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Minus className="h-3 w-3" /></button>
```

**Before (plus):**
```tsx
<button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)} className="p-1 rounded-lg hover:bg-muted"><Plus className="h-3 w-3" /></button>
```
**After:**
```tsx
<button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)} aria-label="Increase quantity" className="p-1 rounded-lg hover:bg-muted active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="h-3 w-3" /></button>
```

**Before (trash):**
```tsx
<button type="button" onClick={() => cart.removeItem(item.productId)} className="p-1 rounded-lg hover:bg-destructive/10 ml-1"><Trash2 className="h-3 w-3 text-destructive" /></button>
```
**After:**
```tsx
<button type="button" onClick={() => cart.removeItem(item.productId)} aria-label="Remove item" className="p-1 rounded-lg hover:bg-destructive/10 ml-1 active:scale-[0.95] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-3 w-3 text-destructive" /></button>
```

---

### Summary of changes

- **8 className edits** (all appending `active:scale` + `focus-visible:ring-*` + `transition-transform`/keeping existing `transition-all`)
- **6 new `aria-label` attributes** on icon-only buttons
- **Zero logic/query/mutation/routing changes** — all edits are className + display-only aria attributes
- shadcn `<Button>`, `<Input>`, `<Badge>` left untouched (they ship built-in tokens)
- `GroceryProductCard`, `GroceryProductDetail`, `GroceryCheckoutDrawer` are separate components — not touched here (they may need their own pass)

---

## 3. Owner must verify

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build).
2. **Preview at 375px** — confirm the 3-col product grid still fits cleanly (should be fine with `px-2.5 gap-2`).
3. **Keyboard tab through** — verify the focus ring appears on each of the 8 controls when focused via keyboard.
4. **`GroceryProductCard` / `GroceryProductDetail` / `GroceryCheckoutDrawer`** are separate component files — they likely need their own premium interaction pass (the card's Add/qty buttons and the detail modal's controls). That's a separate task to avoid file collisions with the parallel `StoreProfilePage` + `GroceryStorePage` claim already in progress by @claude.

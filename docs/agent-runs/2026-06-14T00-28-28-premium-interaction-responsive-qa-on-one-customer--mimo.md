# MiMo run — 2026-06-14T00:28:28.395Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + responsive QA on ONE customer-facing page: src/pages/GroceryPage.tsx (290 lines, route /grocery -- multi-store grocery storefront: sticky header (back + cart-toggle w/ count badge), horizontal-scroll store-tabs, search Input w/ clear-X, inline cart drawer (Clear-all + per-item qty minus/plus/remove + shadcn Place-Order Button), product grid (GroceryProductCard children), checkout drawer + product-detail (child components), ZivoMobileNav).

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (grep-confirmed): exactly 8 raw <button type="button">, 0 motion.button. The shadcn <Button> ("Place Shopping Order"), shadcn <Input> (search), shadcn <Badge> (store chip, presentational) all ship their own tokens => SKIP. GroceryProductCard / GroceryProductDetail / GroceryCheckoutDrawer are child components (own slices) => SKIP. <img> store logo has alt={selectedStore}; cart item <img alt=""> decorative => fine. The cart drawer wrapper is motion.div (presentational) => nothing.

TOKEN TIERS (this repo): wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when a bg/color also animates OR general raw-button standard. aria-label for icon-only; aria-pressed for segmented buttons whose selection is conveyed ONLY by background (AchievementsPage/ChallengesPage/CoinTransfers precedent). ring-inset only when a control is flush inside an overflow-hidden rounded parent.

CRITICAL edit-shape rule: RAW <button> (these 8) => FULL token set. shadcn => never touch. motion.div => nothing.

HARD RULE: className + display-only attr (aria-label/aria-pressed/aria-expanded) ONLY. Do NOT change any onClick / navigate / handleSearch / handleStoreChange / setSelectedStore / setQuery / setShowCart / clearResults / cart.* (addItem/updateQuantity/removeItem/clearCart) / useStoreSearch / useGroceryCart / debounceRef logic.

MY PLAN -- validate or correct each (before->after; cite classNames):

(1) Header back (icon ArrowLeft) -- before: "p-1.5 rounded-xl hover:bg-muted" -> append " transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" + add aria-label="Go back" (icon tier; rounded-xl -> normal ring; transition-all so hover:bg fades).
(2) Header cart toggle (icon ShoppingCart + count badge; onClick setShowCart(!showCart)) -- before: "relative p-2 rounded-xl hover:bg-muted" -> append " transition-all active:scale-95 ...ring" + add aria-label="Shopping cart" + aria-expanded={showCart} (icon tier; it toggles the inline cart drawer => aria-expanded correct? or aria-label only to match the CommunityDetailPage create-post toggle which got aria-label only?).
(3) Store tabs (.map'd raw button; cn() base has transition-all ALREADY; img + store-name text) -- before base: "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0" -> append " active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the cn base + add aria-pressed={selectedStore === store.name} (segmented tier; selection conveyed only by bg-ig-gradient vs bg-muted/50; store name = accessible name).
(4) Search clear-X (icon X; only positioning className) -- before: "absolute right-3 top-1/2 -translate-y-1/2" -> append " rounded-md transition-all active:scale-95 ...ring" + add aria-label="Clear search" (icon tier; ADD rounded-md for clean ring; sits absolutely inside the search wrapper, not overflow-hidden).
(5) Cart "Clear all" (text link, visible text; inside cart drawer) -- before: "text-xs text-destructive hover:underline" -> append " rounded-sm transition-all active:scale-[0.97] ...ring" (small text-link tier).
(6) Qty minus (icon Minus; onClick updateQuantity(...-1)) -- before: "p-1 rounded-lg hover:bg-muted" -> append " transition-all active:scale-95 ...ring" + aria-label="Decrease quantity" (icon tier).
(7) Qty plus (icon Plus; onClick updateQuantity(...+1); IDENTICAL className to (6) -- disambiguate by onClick) -- same append + aria-label="Increase quantity".
(8) Remove item (icon Trash2) -- before: "p-1 rounded-lg hover:bg-destructive/10 ml-1" -> append " transition-all active:scale-95 ...ring" + aria-label="Remove item".

QUESTIONS:
(1) Cart toggle (2): add aria-expanded={showCart} (it discloses the inline cart drawer), or aria-label="Shopping cart" only to match the Slice-18 create-post toggle (which got aria-label only, no aria-expanded)? I lean aria-expanded={showCart} (more correct for a disclosure; display-only, safe; no aria-controls since the drawer has no id and adding one is a bigger change).
(2) Store tabs (3): is aria-pressed right (segmented selector), and is the standard outward ring safe inside the "flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar" row? (overflow-x:auto can compute overflow-y to auto -> could a 2px ring (no offset) clip top/bottom?) Prior slices' overflow-x-auto chip rows used normal ring (no inset) and verified live -- confirm same here, or ring-inset?
(3) ring-inset anywhere? The ONLY overflow-hidden parent is the cart drawer ("bg-card rounded-2xl border ... overflow-hidden"); controls (5) Clear-all and (6)/(7)/(8) qty sit inside its p-4 (16px) + nested rows, far from the rounded edge -> I say NO ring-inset. Agree?
(4) Tiers: icons (back/cart/search-X/minus/plus/trash) 95, store tabs [0.97], Clear-all [0.97] -- right?
(5) Responsive 375/768/1280: header back + flex-1 (logo+truncate title) + cart; store tabs overflow-x-auto (scroll); search full-width; cart drawer mx-4 sticky; product grid grid-cols-3 sm:grid-cols-4 gap-2 (children). Any crush at 375px, esp the cart-row (img + name + price/badge + 3 qty icons)?

ALSO confirm: (a) qty minus/plus/remove are tiny (p-1, h-3 icons ~20px) sub-44px tap targets -- FLAG only (existing compact-cart design, not a token fix)? (b) inventory exhaustive (exactly 8 raw <button>, no missed control)?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/GroceryPage.tsx

---

## (1) Plan — validated, 8 edits, minor corrections

Your audit is solid. I'll correct two details and confirm the rest.

**Q1 — Cart toggle:** Add **both** `aria-label="Shopping cart"` and `aria-expanded={showCart}`. The icon alone has no accessible name (label mandatory), and this IS a disclosure toggle (the inline cart drawer). `aria-expanded` is display-only, zero logic risk. The CommunityDetailPage create-post toggle getting label-only was a prior-pass choice, not a binding precedent — the more correct a11y wins.

**Q2 — Ring in overflow-x-auto row:** `overflow-x: auto` computes `overflow-y: auto` per spec, which CAN clip a 2px outward ring at the top (no `pt-*` on the container — button top edge is flush with container top). **However**, every prior slice (AchievementsPage, ChallengesPage, CoinTransfersPage) used this identical pattern (`overflow-x-auto no-scrollbar` chip rows → normal outward ring) and verified live. **Match the established pattern: normal ring, no ring-inset.** If paranoid, add `pt-0.5` to the container (2px buffer, invisible cost) — but it wasn't needed before.

**Q3 — ring-inset:** Agree: **NO ring-inset anywhere.** The cart drawer's `overflow-hidden` is irrelevant — controls (5)–(8) sit inside `p-4` → nested `p-2 rounded-xl bg-muted/30` items → 16px+ clearance from the `rounded-2xl` edge. Ring extends ~2px. Safe.

**Q4 — Tiers:** All correct. Icons `95`, store tabs `[0.97]`, Clear-all `[0.97]`.

**Q5 — Responsive 375px:** No crush. Header: back (~32px) + gap-3 + flex-1 truncate (logo + "Grocery") + gap-3 + cart (~36px) ≈ 92px fixed → ~251px title. Store tabs scroll horizontally. Cart row: img(40) + gap-3 + flex-1 min-w-0 + 3×qty-icons(~60px) + trash(~20px) + ml-1 ≈ 132px fixed → ~211px for name/price. Clean.

**Q6a — Sub-44px tap targets:** **FLAG only.** `p-1` + `h-3` icon ≈ 20px. Established compact-cart pattern (identical to GroceryCheckoutDrawer, prior cart UIs). Not a token fix.

**Q6b — Inventory:** Confirmed exhaustive. Exactly 8 raw `<button type="button">`, 0 `motion.button`, 1 shadcn `<Button>` (Place Order), 1 shadcn `<Input>` (search), 1 shadcn `<Badge>` (store chip) → all 3 SKIP. Child components (GroceryProductCard, GroceryProductDetail, GroceryCheckoutDrawer) → SKIP.

---

## (2) Proposed diff — `src/pages/GroceryPage.tsx`

8 controls, 8 line-edits. Every edit is className append + display-only attr. All `onClick` / `navigate` / `handleSearch` / `handleStoreChange` / `setSelectedStore` / `setQuery` / `setShowCart` / `clearResults` / `cart.*` logic byte-identical.

### Edit 1 — Header back (icon, tier 95)

```diff
-          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted">
+          <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="p-1.5 rounded-xl hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 2 — Cart toggle (icon, tier 95, disclosure)

```diff
-          <button type="button" onClick={() => setShowCart(!showCart)} className="relative p-2 rounded-xl hover:bg-muted">
+          <button type="button" onClick={() => setShowCart(!showCart)} aria-label="Shopping cart" aria-expanded={showCart} className="relative p-2 rounded-xl hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 3 — Store tabs (segmented, tier [0.97])

`transition-all` already present in the `cn()` base → no transition change. Append `active:scale-[0.97]` + ring to the **base** string; add `aria-pressed`.

```diff
-            <button type="button"
+            <button type="button"
               key={store.name}
               onClick={() => handleStoreChange(store.name)}
+              aria-pressed={selectedStore === store.name}
               className={cn(
-                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
+                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 selectedStore === store.name
```

### Edit 4 — Search clear X (icon, tier 95)

No existing transition, no hover-bg → `transition-all` for consistency (zero cost). Add `rounded-md` for clean ring radius.

```diff
-              <button type="button" onClick={() => { setQuery(""); clearResults(); }} className="absolute right-3 top-1/2 -translate-y-1/2">
+              <button type="button" onClick={() => { setQuery(""); clearResults(); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### Edit 5 — Cart "Clear all" (small text-link, tier [0.97])

```diff
-                  <button type="button" onClick={cart.clearCart} className="text-xs text-destructive hover:underline">Clear all</button>
+                  <button type="button" onClick={cart.clearCart} className="text-xs text-destructive hover:underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Clear all</button>
```

### Edit 6 — Qty minus (icon, tier 95)

```diff
-                        <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)} className="p-1 rounded-lg hover:bg-muted"><Minus className="h-3 w-3" /></button>
+                        <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)} aria-label="Decrease quantity" className="p-1 rounded-lg hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Minus className="h-3 w-3" /></button>
```

### Edit 7 — Qty plus (icon, tier 95)

```diff
-                        <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)} className="p-1 rounded-lg hover:bg-muted"><Plus className="h-3 w-3" /></button>
+                        <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)} aria-label="Increase quantity" className="p-1 rounded-lg hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus className="h-3 w-3" /></button>
```

### Edit 8 — Remove item (icon, tier 95)

```diff
-                        <button type="button" onClick={() => cart.removeItem(item.productId)} className="p-1 rounded-lg hover:bg-destructive/10 ml-1"><Trash2 className="h-3 w-3 text-destructive" /></button>
+                        <button type="button" onClick={() => cart.removeItem(item.productId)} aria-label="Remove item" className="p-1 rounded-lg hover:bg-destructive/10 ml-1 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Trash2 className="h-3 w-3 text-destructive" /></button>
```

---

## Summary diff stats

- **8 controls / 8 line-edits**
- **8 `aria-*` attr additions** (2 `aria-label` on edits 1/4 (icon-only without visible text); 2 `aria-label` + `aria-expanded` on edit 2; 1 `aria-pressed` on edit 3; 3 `aria-label` on edits 6/7/8)
- **8 className edits** (all appends — `transition-all active:scale-{tier} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; edit 4 also adds `rounded-md`; edit 5 also adds `rounded-sm`)
- **Estimated `git diff`: ~8 insertions / 8 deletions**, zero net lines
- **HARD RULE**: every `onClick`/`navigate`/`handleSearch`/`handleStoreChange`/`setSelectedStore`/`setQuery`/`setShowCart`/`clearResults`/`cart.*`/`useStoreSearch`/`useGroceryCart`/`debounceRef` byte-identical

## (3) Owner verify / deploy

1. Run `npm run update` — must pass (types + worker types + production build, true exit 0).
2. Preview at `/grocery` at 375px/768px/1280 — verify: store-tab ring visible on focus (not clipped by `overflow-x-auto`; if top ring clips, add `pt-0.5` to the `flex overflow-x-auto` container), cart drawer controls ring correctly, press-scale animates on all 8.
3. Advisor runs: `npm run agent:deepseek -- --task "Audit GroceryPage interaction pass" --file src/pages/GroceryPage.tsx` and `npm run agent:mimo -- --task "Audit GroceryPage interaction pass" --file src/pages/GroceryPage.tsx` for independent validation.
4. **Flag (NOT fixable in token pass):** cart qty minus/plus/remove are ~20px tap targets (sub-44px WCAG guideline) — established compact-cart design pattern, not a regression.

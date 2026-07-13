# DeepSeek run — 2026-06-14T07:13:44.366Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/MarketplaceCartPage.tsx (331-line "Cart" — the user's marketplace shopping cart: REAL Supabase `useQuery ["marketplace-cart", user.id]` reading `marketplace_cart` (eq user_id, order created_at desc) + a 2nd `useQuery ["marketplace-listings-cart", listingIds.join(",")]` reading `marketplace_listings` via `.in("id", listingIds)`; AUTH-aware via useAuth, enabled gating; `useMemo listingIds/listingMap/enriched/totals`; OPTIMISTIC `updateQty` (qc.setQueryData then Supabase update, rollback-invalidate on error) + `removeItem` (qc.setQueryData filter then Supabase delete, toast); sticky header [shadcn ghost icon Back + ig-gradient Cart title] + an ig-gradient subtotal banner + a list of cart-row cards [each: a tappable thumbnail button + title/badges/price + a −/qty/+ stepper + a trash remove button] + a fixed bottom CTA bar [Total + shadcn Checkout Button]). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, updateQty/removeItem, qc.setQueryData, useQuery/Supabase queries, toast, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't churn shadcn <Button> (ships own focus/scale tokens). Don't renumber an existing scale (several buttons already carry active:scale-95 — LEAVE that number).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT (so an outward box-shadow ring would be clipped), OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/IMAGE/MEDIA surface AS THE PARENT (or a ring rendering OVER media — e.g. an INSET ring on a media tile, or an outward ring in a near-gapless media grid) = ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; wide full-width row/card WITH its own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]; media/image grid TILE — your call.
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border OR existing color/opacity wash. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. ALREADY transition-transform with NO hover (scale only) → append ring without flipping. ALREADY framer whileTap → append the focus ring ONLY.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, +/- qty step, remove/delete).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L237 THUMBNAIL button (raw `<button>`, mapped per cart row, one-shot `onClick={() => navigate(`/marketplace/${l.id}`)}` opens the listing, ALREADY `aria-label={`View ${l.title}`}`, renders the listing's first image [`<img object-cover>`] or a Package-icon placeholder): base `shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted relative active:scale-95 transition-transform`. ALREADY `active:scale-95` + `transition-transform`, NO hover, NO focus. It is a STANDALONE 80×80 media tile (NOT in a grid) — its PARENT is the cart-row card `flex gap-3 p-3 rounded-2xl bg-card border border-border` (neutral, the thumbnail's right neighbor is the `flex-1` text block, `gap-3`/12px clearance, the row has `p-3` padding around the tile). → plan: ring-ONLY append (whileTap absent but `active:scale-95` IS the press already → NO 2nd scale; `transition-transform` covers the existing scale, NO hover so NO flip; NO new aria — already labeled). OPEN QUESTIONS for you: (1) ring COLOR — `ring-ring` (an OUTWARD ring renders against the neutral `bg-card` row parent, NOT over the image) vs `ring-white/70` (the tile IS a media/image surface)? (2) ring-inset vs OUTWARD — it's a standalone tile with `gap-3`/`p-3` clearance (NOT a near-gapless grid, NOT a flush edge child of a rounded overflow-hidden parent — its OWN `overflow-hidden` clips its descendants/img, not its own box-shadow), so is OUTWARD correct (ring sits outside the tile on the bg-card), making `ring-ring` the right color? Resolve both — give the exact final after-string.

B) L276 DECREASE-qty button (raw `<button>`, mapped per cart row, icon-only Minus, ALREADY `aria-label="Decrease quantity"`, `disabled={c.quantity <= 1}`, one-shot `updateQty(c.id, c.quantity - 1)`): base `h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all`. ALREADY `active:scale-95` + `transition-all` + `hover:bg-muted`, NO focus. **CRITICAL CONTAINER:** it is a flush LEFT-edge child of a segmented stepper pill `<div className="inline-flex items-center bg-secondary rounded-full overflow-hidden">` (the −/qty/+ group; the parent has `rounded-full overflow-hidden`). → plan: ring-ONLY append (active:scale-95 is the press, NO 2nd; transition-all present, NO flip; NO new aria — already labeled). OPEN QUESTION: because the parent is `rounded-full overflow-hidden`, an OUTWARD box-shadow ring would be CLIPPED by the parent → use `focus-visible:ring-inset`? And ring COLOR `ring-ring` (the pill is `bg-secondary`, neutral)? Confirm `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`.

C) L286 INCREASE-qty button (raw `<button>`, mapped per cart row, icon-only Plus, ALREADY `aria-label="Increase quantity"`, `disabled={c.quantity >= maxQty}`, one-shot `updateQty(c.id, c.quantity + 1)`): base `h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all`. Mirror of B — flush RIGHT-edge child of the SAME `rounded-full overflow-hidden bg-secondary` stepper pill. → plan: identical to B — ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring` (INSET — clipped-outward; `ring-ring` neutral pill; NO flip; NO new aria). Confirm.

D) L296 REMOVE button (raw `<button>`, mapped per cart row, icon-only Trash2, ALREADY `aria-label="Remove from cart"`, one-shot `removeItem(c.id)`): base `h-7 w-7 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors`. Has `transition-colors` + `hover:text`/`hover:bg`, NO scale, NO focus. It is a STANDALONE sibling (NOT inside the stepper pill) — its parent is the `flex items-center justify-between` row inside the cart-row card (`bg-card`). → plan: FLIP `transition-colors`→`transition-all` + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier active:scale-95, NEW scale; FLIP mandatory — transition-colors gaining a NEW scale; OUTWARD `ring-ring` on neutral `bg-card` [standalone, NOT clipped]; NO new aria — already labeled). Confirm tier + FLIP + OUTWARD ring-ring + no-aria.

ALSO CONFIRM I should LEAVE these: the shadcn ghost-icon Back `<Button>` L167 (aria-label="Back" already, own tokens); the shadcn "Browse marketplace" `<Button>` L209 (empty-state CTA, own tokens); the shadcn "Checkout" `<Button>` L320 (fixed-CTA, own tokens); SwipeBackContainer/SEOHead (wrappers/non-visual); the subtotal banner motion.div L180 (entrance anim, NO onClick); the cart-row motion.div L227 (entrance anim, NO onClick — the tappable thumbnail INSIDE it is control A); the loading skeleton divs L196; the qty `<span>` L285 + condition/Negotiable/Unavailable badge `<span>`s (non-interactive); ShoppingCart/Sparkles/Minus/Plus/Trash2/Tag/Package/CreditCard/ArrowLeft icons + thumbnail img (decorative/media).

Be concise and exact. Return the precise final className after-string per control + any aria attr. A–D are mapped templates (single edit hits every cart row). Resolve A's two open questions (ring color + inset-vs-outward for a standalone media thumbnail) and confirm B/C's ring-inset (flush child of a rounded-full overflow-hidden pill) explicitly.
- files: src/pages/MarketplaceCartPage.tsx

---

# MarketplaceCartPage — Premium Interaction + A11y Pass

## Plan

4 raw `<button>` controls edited (A–D), all mapped per cart row. 4 className edits + 0 new aria attrs (all 4 already labeled). 0 logic lines touched.

## Per-Control Analysis

### A) L237 Thumbnail button
- **Ring color: `ring-ring`** — OUTWARD ring renders against the neutral `bg-card` row parent, NOT over the image. The tile is standalone with `gap-3`/`p-3` clearance, not a near-gapless grid.
- **Ring direction: OUTWARD** — standalone tile with `gap-3` clearance, its own `overflow-hidden` clips descendants not box-shadow.
- **Press tier:** already `active:scale-95` — DON'T renumber.
- **Transition:** already `transition-transform` — NO flip (no hover, no new scale).
- **Aria:** already `aria-label` — NO new aria.
- **Final append:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### B) L276 Decrease-qty button
- **Ring color: `ring-ring`** — `bg-secondary` pill is neutral.
- **Ring direction: `ring-inset`** — flush LEFT-edge child of `rounded-full overflow-hidden` parent → outward ring would be clipped.
- **Press tier:** already `active:scale-95` — DON'T renumber.
- **Transition:** already `transition-all` — NO flip.
- **Aria:** already `aria-label` — NO new aria.
- **Final append:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`

### C) L286 Increase-qty button
- **Identical to B** — flush RIGHT-edge child of same `rounded-full overflow-hidden` pill.
- **Final append:** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`

### D) L296 Remove button
- **Ring color: `ring-ring`** — standalone on neutral `bg-card` parent.
- **Ring direction: OUTWARD** — standalone, NOT clipped.
- **Press tier:** `active:scale-95` (icon-only tier, NEW scale).
- **Transition: FLIP** `transition-colors` → `transition-all` (gaining a new CSS scale alongside existing `hover:text`/`hover:bg`).
- **Aria:** already `aria-label` — NO new aria.
- **Final after-string:** `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### LEAVE confirmed:
- shadcn Back `<Button>` L167 (own tokens)
- shadcn "Browse marketplace" `<Button>` L209 (own tokens)
- shadcn "Checkout" `<Button>` L320 (own tokens)
- `SwipeBackContainer`/`SEOHead` (wrappers)
- subtotal banner `motion.div` L180 (presentational)
- cart-row `motion.div` L227 (entrance anim, no onClick)
- loading skeleton divs L196
- qty `<span>` L285 + condition/Negotiable/Unavailable badges (non-interactive)
- All icons + thumbnail img (decorative/media)

## Diff

```diff
--- a/src/pages/MarketplaceCartPage.tsx
+++ b/src/pages/MarketplaceCartPage.tsx
@@ -234,7 +234,7 @@ export default function MarketplaceCartPage() {
                   <button
                     type="button"
                     onClick={() => navigate(`/marketplace/${l.id}`)}
-                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted relative active:scale-95 transition-transform"
+                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted relative active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     aria-label={`View ${l.title}`}
                   >
                     {firstImage ? (
@@ -273,7 +273,7 @@ export default function MarketplaceCartPage() {
                           type="button"
                           aria-label="Decrease quantity"
                           disabled={c.quantity <= 1}
-                          className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all"
+                          className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                           onClick={() => updateQty(c.id, c.quantity - 1)}
                         >
                           <Minus className="h-3 w-3" />
@@ -283,7 +283,7 @@ export default function MarketplaceCartPage() {
                           type="button"
                           aria-label="Increase quantity"
                           disabled={c.quantity >= maxQty}
-                          className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all"
+                          className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                           onClick={() => updateQty(c.id, c.quantity + 1)}
                         >
                           <Plus className="h-3 w-3" />
@@ -293,7 +293,7 @@ export default function MarketplaceCartPage() {
                         type="button"
                         aria-label="Remove from cart"
                         onClick={() => removeItem(c.id)}
-                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
+                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                       >
                         <Trash2 className="h-3.5 w-3.5" />
                       </button>
```

## Guard grep verification

| Metric | Count |
|--------|-------|
| className edits (`−`/`+`) | 4 |
| New aria attrs | 0 (all 4 pre-labeled) |
| `focus-visible:ring` | 4 |
| `ring-ring` | 4 (A/C/D outward, B/C inset) |
| `ring-inset` | 2 (B/C — flush stepper pill children) |
| `ring-white/70` | 0 |
| `aria-pressed` | 0 |
| `aria-label` new | 0 |
| `active:scale-95` kept | 3 (A/B/C, unchanged) |
| `active:scale-95` new | 1 (D) |
| FLIPs | 1 (D `transition-colors`→`transition-all`) |
| `transition-colors` removed | 1 (D, none remain) |
| Logic lines touched | 0 |

## Owner verification

- Run `npm run update` — must pass (type-check + worker + build).
- Preview at 375/768/1280 — cart rows, stepper pill, remove button all lay out cleanly.
- Sub-44px flag (repo-wide, not introduced): stepper buttons `h-7 w-7` (28px), remove button `h-7 w-7` (28px), thumbnail `w-20 h-20` (80px ✓), shadcn Back `h-10 w-10` (40px).

# DeepSeek run — 2026-06-14T05:59:13.671Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/SavedFavoritesPage.tsx (list every restaurant & hotel the user hearted; each card = a media-forward tappable card-button + an unfavorite heart overlay + shadcn quick-action Buttons). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, hook calls byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT (an OUTWARD ring would be clipped by the parent's overflow-hidden → use inset).
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/muted) = ring-ring; saturated/image surface as the PARENT (or, for an INSET ring, the control's own edge content being media) = ring-white/70. A button OVERLAID on top of a media/image thumbnail → ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale, adding ONLY a ring does NOT require a flip (keep its existing transition class + scale number).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (remove, nav).
- No-op/don't-churn: if a control already ships active:scale + transition, append ring ONLY; keep its existing scale number + transition class.

CONTROLS (give me per control: exact final after-string of appended/changed classes, ring color + inset-vs-outward + reason, press tier, transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L96 header Back icon button: `className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"` ALREADY `aria-label="Back"`, onClick navigate(-1). Icon-only (ChevronLeft). NO scale/transition/hover. Parent is the neutral sticky header (bg-background/90).

B) L212 RestaurantCard main card-button (appears in RestaurantCard): `className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"` onClick navigate(`/eats/restaurant/${r.id}`). This `block w-full` button is the TOP portion of the card — it wraps the `aspect-[16/10]` cover image (with gradient + PartnerBadge + the unfavorite heart + rating badge absolutely positioned over it) AND the `p-3` name/cuisine text block below the image. Its PARENT is the card `motion.div` (`relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm`). The button is flush to the card's top/left/right edges (block w-full at the top), beneath it is a separate quick-actions Button row. ALREADY active:scale-[0.99] + transition-transform. → ring treatment? An outward ring would be clipped by the parent `overflow-hidden rounded-2xl` on 3 edges → inset? Ring color (the button's top edge content is the cover photo, its bottom edge is the bg-card text block)?

C) L220 RestaurantCard unfavorite heart button: `className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"` ALREADY `aria-label="Remove from saved"`, onClick (e)=>{e.stopPropagation(); onUnfavorite()} (removes from the saved list — the heart is always filled red here; tapping removes the item). Icon-only (filled Heart). Positioned ABSOLUTE over the cover image (top-2 right-2 = 8px inset, NOT flush). NO scale/transition/hover. Its own bg is bg-black/55 backdrop-blur but the surface BEHIND it is the cover photo. (One-shot remove, item disappears — NOT a persistent toggle.)

D) L296 HotelCard main card-button: IDENTICAL className to B — `className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"` onClick navigate(`/hotels?hotelId=${h.id}`). Same structure (cover image + p-3 name/city block, inside `relative rounded-2xl overflow-hidden border bg-card` parent). Treat the same as B.

E) L304 HotelCard unfavorite heart button: IDENTICAL className to C — `className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"` ALREADY `aria-label="Remove from saved"`, same stopPropagation + onUnfavorite. Treat the same as C.

ALSO CONFIRM I should LEAVE these (shadcn `<Button>` ship their own focus/scale tokens, or presentational): EmptyState Browse `<Button>` L186; RestaurantCard Reserve/Reorder/Ride `<Button>` ×3 L245/257/264; HotelCard "Book again"/"Ride here" `<Button>` ×2 L330/337; the card `motion.div`s L206/L290 (entrance anim, NOT controls — the card-button B/D is the control); the `<img>` covers, PartnerBadge, gradient overlays, rating/Star badges, MapPin (presentational); Loader2 L121.

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note B≡D and C≡E (I'll apply each identical pair with replace_all).
- files: src/pages/SavedFavoritesPage.tsx

---

# Plan

**File:** `src/pages/SavedFavoritesPage.tsx`

**Controls inventoried:**
1. **A)** L96 header Back icon — RAW button, no scale/transition, icon-only with `aria-label="Back"`
2. **B)** L212 RestaurantCard main card-button — already has `active:scale-[0.99] transition-transform`
3. **C)** L220 RestaurantCard unfavorite heart — RAW button, no scale/transition, icon-only with `aria-label="Remove from saved"`, positioned ABSOLUTE over cover image
4. **D)** L296 HotelCard main card-button — identical to B
5. **E)** L304 HotelCard unfavorite heart — identical to C

**Leave untouched:** EmptyState shadcn `<Button>` L186 (ships own tokens); RestaurantCard Reserve/Reorder/Ride `<Button>`s L245/257/264 (shadcn); HotelCard "Book again"/"Ride here" `<Button>`s L330/337 (shadcn); all `motion.div`s (presentational); all `<img>`/badges/gradients (presentational); `Loader2` L121.

---

# Proposed Changes

## A) Header Back icon (L96)

**Current:** `"w-10 h-10 rounded-xl bg-muted flex items-center justify-center"`
**After:** `"w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

- **Press tier:** icon-only → `active:scale-95`
- **Transition:** `transition-all` (FLIP from none — gaining both scale AND the pre-existing `bg-muted` hover state is covered by `transition-all`)
- **Ring:** OUTWARD `ring-ring` (neutral `bg-background/90` parent)
- **Aria:** keep existing `aria-label="Back"` (already present)

## B) RestaurantCard main card-button (L212) — also applies to D) HotelCard (L296)

**Current:** `"block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"`
**After:** `"block w-full text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"`

- **Press tier:** KEEP existing `active:scale-[0.99]` — don't churn
- **Transition:** KEEP existing `transition-transform` — no flip needed (only adding ring)
- **Ring:** **INSET** `ring-white/70` — the button is flush to the card's top/left/right edges, and the parent has `overflow-hidden rounded-2xl` → an outward ring would be clipped on 3 edges. The button's top edge content is the cover photo (dark gradient overlay) → `ring-white/70` for contrast.
- **Aria:** none needed (visible text content)

## C) RestaurantCard unfavorite heart (L220) — also applies to E) HotelCard (L304)

**Current:** `"absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"`
**After:** `"absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"`

- **Press tier:** icon-only → `active:scale-95`
- **Transition:** `transition-transform` (scale is the ONLY animated prop — no hover bg/text/border on this control)
- **Ring:** OUTWARD `ring-white/70` — the button is positioned `top-2 right-2` (8px inset from the card edge, NOT flush), so an outward ring is NOT clipped. The surface BEHIND the button is the cover photo (dark gradient overlay) → `ring-white/70` for contrast.
- **Aria:** keep existing `aria-label="Remove from saved"` (already present, correct for one-shot remove action — NOT a toggle, so no `aria-pressed`)

---

# Diff

```diff
--- a/src/pages/SavedFavoritesPage.tsx
+++ b/src/pages/SavedFavoritesPage.tsx
@@ -93,7 +93,7 @@ export default function SavedFavoritesPage() {
         <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center gap-3">
           <button type="button"
             onClick={() => navigate(-1)}
-            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
+            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             aria-label="Back"
           >
             <ChevronLeft className="w-5 h-5" />
@@ -209,7 +209,7 @@ function RestaurantCard({
       <button type="button"
         onClick={() => navigate(`/eats/restaurant/${r.id}`)}
-        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"
+        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
       >
         <div className="relative aspect-[16/10] overflow-hidden">
           <img src={cover} alt={r.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
@@ -220,7 +220,7 @@ function RestaurantCard({
             onClick={(e) => {
               e.stopPropagation();
               onUnfavorite();
             }}
-            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"
+            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
             aria-label="Remove from saved"
           >
             <Heart className="w-4 h-4 text-red-500 fill-red-500" />
@@ -293,7 +293,7 @@ function HotelCard({
       <button type="button"
         onClick={() => navigate(`/hotels?hotelId=${h.id}`)}
-        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"
+        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
       >
         <div className="relative aspect-[16/10] overflow-hidden">
           <img src={cover} alt={h.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
@@ -304,7 +304,7 @@ function HotelCard({
             onClick={(e) => {
               e.stopPropagation();
               onUnfavorite();
             }}
-            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"
+            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
             aria-label="Remove from saved"
           >
             <Heart className="w-4 h-4 text-red-500 fill-red-500" />
```

---

# Summary

| Control | Edits | Ring | Press | Transition | Aria |
|---------|-------|------|-------|------------|------|
| A) Header Back | 1 className | OUTWARD `ring-ring` | `scale-95` | `transition-all` (FLIP) | keep `aria-label="Back"` |
| B) RestaurantCard main | 1 className | **INSET** `ring-white/70` | keep `[0.99]` | keep `transition-transform` | none |
| D) HotelCard main | 1 className (identical to B) | **INSET** `ring-white/70` | keep `[0.99]` | keep `transition-transform` | none |
| C) RestaurantCard unfavorite | 1 className | OUTWARD `ring-white/70` | `scale-95` | `transition-transform` | keep `aria-label="Remove from saved"` |
| E) HotelCard unfavorite | 1 className (identical to C) | OUTWARD `ring-white/70` | `scale-95` | `transition-transform` | keep `aria-label="Remove from saved"` |

**0 logic lines touched, 0 imports added, 0 handler changes.** All `onClick`/`navigate`/`onUnfavorite`/`stopPropagation` byte-identical.

**Owner must verify:** `npm run update` passes (type-check + worker type-check + production build). Preview at `/network/saved` on the dev server to confirm rings render correctly on the card-button (inset) vs the unfavorite heart (outward).

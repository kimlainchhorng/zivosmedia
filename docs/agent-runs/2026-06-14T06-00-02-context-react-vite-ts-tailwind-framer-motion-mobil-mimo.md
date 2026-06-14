# MiMo run — 2026-06-14T06:00:02.825Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

3 unique className edits across 5 controls (B≡D via `replace_all`, C≡E via `replace_all`). 0 aria additions (existing labels preserved). 0 logic lines touched. No new competing press effects — B/D already own `active:scale-[0.99]` (ring-only append), A/C/E get fresh scale (no prior scale exists to compete with).

---

## Per-control analysis

### A) L96 — Header Back icon button

| Attribute | Value |
|---|---|
| Tier | Icon-only → `scale-95` |
| Transition | `transition-transform` (scale sole prop, no hover) |
| FLIP | No (no existing transition) |
| Ring | **Outward `ring-ring`** — parent is neutral `bg-background/90` |
| Inset | No (not flush to an overflow-hidden parent) |
| aria | Keep existing `aria-label="Back"` |

**Final className:**
```
"w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### B) L212 / D) L296 — Restaurant/Hotel card-button (replace_all)

| Attribute | Value |
|---|---|
| Tier | Already `active:scale-[0.99]` → **ring-only, don't-churn** |
| Transition | Keep existing `transition-transform` |
| FLIP | No (ring-only append, no new scale) |
| Ring | **`ring-inset ring-white/70`** — button is `block w-full` flush to the `rounded-2xl overflow-hidden` parent on top/left/right edges; an outward ring would be clipped → mandatory inset. Edge content is the cover photo (media) → `ring-white/70`. |
| aria | None (visible text, one-shot navigate) |

**Final className:**
```
"block w-full text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

---

### C) L220 / E) L304 — Unfavorite heart overlay (replace_all)

| Attribute | Value |
|---|---|
| Tier | Icon-only → `scale-95` |
| Transition | `transition-transform` (scale sole prop, no hover) |
| FLIP | No (no existing transition) |
| Ring | **Outward `ring-white/70`** — button is 8px inset (`top-2 right-2`), NOT flush to the parent edges; inset rule doesn't apply. Surface behind is the cover photo → `ring-white/70`. |
| Inset | No (8px inset from parent, outward ring survives) |
| aria | Keep existing `aria-label="Remove from saved"`, **NO `aria-pressed`** (one-shot destructive remove, NOT a persistent toggle) |

**Final className:**
```
"absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

---

## Leave untouched (confirmed)

- EmptyState Browse `<Button>` L186 — shadcn, ships own tokens
- RestaurantCard Reserve / Reorder / Ride `<Button>` ×3 L245/257/264 — shadcn
- HotelCard "Book again" / "Ride here" `<Button>` ×2 L330/337 — shadcn
- Card `motion.div`s L206/L290 — entrance anim, not controls
- `<img>` covers, PartnerBadge, gradient overlays, rating/Star badges, MapPin — presentational
- Loader2 L121 — presentational

---

## Diff

```diff
--- a/src/pages/SavedFavoritesPage.tsx
+++ b/src/pages/SavedFavoritesPage.tsx
@@ header Back button (L96)
-            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
+            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

@@ RestaurantCard main card-button (L212) — replace_all also hits D L296
-        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"
+        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"

@@ RestaurantCard unfavorite heart (L220) — replace_all also hits E L304
-            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center"
+            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/55 backdrop-blur flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

**Summary:** 3 unique `−`/`+` className edits → 5 controls total (B and D identical, C and E identical). 0 aria additions. 0 logic lines. `active:scale` counts: 1×95 (A), 2×99 kept (B/D don't-churn), 2×95 (C/E). `ring-inset` on 2 controls (B/D). `ring-white/70` on 4 controls (B/C/D/E). `ring-ring` on 1 control (A).

---

## Owner verification

1. Run `npm run update` — must pass (types + worker types + production build).
2. Preview at 375/768/1280: focus-ring visible on Back (neutral ring), card-button (inset white/70 ring over media), and heart (outward white/70 ring over media). Heart should scale-95 on tap; card-button keeps its existing [0.99] press. No layout shift from inset ring on the card-button.
3. Keyboard Tab through: Back → card-button → heart → shadcn quick-action buttons. All should show a visible focus ring.
4. The `ring-inset` on the card-button may appear as a subtle inner border on focus — that's correct (outward ring would be clipped by the parent's `overflow-hidden rounded-2xl`).

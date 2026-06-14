# DeepSeek run — 2026-06-14T07:58:47.342Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/NetworkPlacesPage.tsx (445-line "Places we book for you" — directory of ZIVO-network partner restaurants + hotels at /network. REAL Supabase: a useEffect fetches `restaurants` + `hotels` (Promise.all, cancelled-flag + .catch guarded, gated behind VITE_ENABLE_PUBLIC_NETWORK_PLACES). useState tab/query/restaurants/hotels/loading; `useSearchParams` tab-sync (`onTab` writes ?tab=); `filtered` useMemo over query+tab; `RestaurantCard`/`HotelCard`/`NetworkEmptyState` subcomponents. Layout: sticky header [raw icon Back + title + shadcn Search Input + a 3-tab chip row (all/restaurants/hotels) + count label] + main [Loader2 OR restaurant grid + hotel grid OR empty state]. Each card = a motion.div [rounded-2xl overflow-hidden bg-card] containing a big clickable image+title <button> ON TOP + a footer row of shadcn <Button>s (Reserve/Order or View rooms). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setQuery/setTab/onTab/setParams, useSearchParams, Supabase fetch, useMemo filter, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Input> (own focus/scale tokens). Don't add role/tabIndex/onKeyDown (out of scope). Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a NEAR-GAPLESS grid (gap-0.5/2px inset; gap-2/gap-3 outward).
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or ring over media) = ring-white/70. A gradient-FILLED chip (bg-ig-gradient) selected state on a NEUTRAL parent still uses ring-ring (ring renders against the neutral parent, not the button's own fill). For an INSET ring, it renders over the control's OWN content/surface.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select picker active:scale-[0.97]; wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]. Don't renumber an existing scale.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF OR an existing color wash that must keep animating. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all (a transform isn't covered by transition-colors). ALREADY transition-all → append without flipping. NO transition + scale-only + NO hover ON THE BUTTON → transition-transform NEW. Adding ONLY a focus ring (no new animated prop) → leave the existing transition class as-is.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, clear, submit).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L140 HEADER BACK button (raw <button>, icon-only ChevronLeft, one-shot `onClick={() => navigate(-1)}`, base `w-10 h-10 rounded-xl bg-muted flex items-center justify-center`, ALREADY `aria-label="Back"`, NO transition/scale/hover/focus). Parent = sticky header `bg-background/90 backdrop-blur` (neutral). → my plan: KEEP existing aria-label="Back" + APPEND `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; transition-transform NEW — bg-muted is the static base, NO hover variant on the button, scale is the SOLE animated prop, NO prior transition → NEW not a flip; OUTWARD ring-ring on neutral header). Confirm transition-transform (not transition-all) + scale-95 + keep-aria.

B) L167 TAB chip (raw <button>, mapped ×3 over ["all","restaurants","hotels"], single-select tab/filter, selection bg-conveyed `bg-ig-gradient text-white` [active] vs `bg-muted text-foreground` [inactive], one-shot `onClick={() => onTab(t)}` [sets tab state + writes ?tab= via setParams], VISIBLE text = tab name; base `px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors`, ALREADY transition-colors [animates the selection bg swap], NO hover on the button, NO scale/focus/aria). Container = `flex gap-2` in the sticky header `bg-background/90` (neutral). NOTE: no role=tablist/tab structure — custom chips. → my plan: ADD `aria-pressed={tab === t}` (persistent single-select segmented tab, bg-conveyed, custom-tabs→aria-pressed house pattern) + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` AND FLIP `transition-colors`→`transition-all` (segmented-tab tier [0.97]; FLIP REQUIRED — the new active:scale is a transform NOT covered by transition-colors, and the existing selection-bg color wash must keep animating, so flip to transition-all; OUTWARD ring-ring — the selected bg-ig-gradient fill renders the ring against the neutral bg-background/90 header; single edit hits all 3 tabs). Confirm the FLIP + tier [0.97] + aria-pressed + OUTWARD ring-ring.

C) L341 RESTAURANT-CARD top button (raw <button>, the big clickable image+title region, one-shot `onClick={() => navigate(`/eats/restaurant/${r.id}`)}`, base `block w-full text-left active:scale-[0.99] transition-transform touch-manipulation`, ALREADY active:scale-[0.99] + transition-transform, NO hover, NO focus/aria; CONTAINS an <img alt={r.name}> + a dark gradient overlay + PartnerBadge + rating pill + a p-3 footer with the restaurant NAME text [bg-card]). PARENT = a `motion.div` card `relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm`; the button is the FLUSH top child (image flush to top/left/right card edges); BELOW the button (still in the card) is a `px-3 pb-3` row of shadcn Reserve/Order <Button>s. Grid = `grid grid-cols-1 sm:grid-cols-2 gap-3`. → my plan: APPEND focus ring ONLY (button already has the press scale + transition-transform; adding only a ring = no new animated prop → leave transition-transform as-is). Ring placement: `focus-visible:ring-inset` — the button is a FLUSH edge child of the rounded-2xl OVERFLOW-HIDDEN parent card, so an outward ring would be CLIPPED on the top/left/right edges; inset is correct. Ring color: the inset ring renders over the control's OWN content — top + upper sides over the IMAGE (media), bottom + lower sides over the bg-card name footer → my lean `ring-white/70` (the control is image-DOMINANT, the ring's majority coverage is over media; white reads on the photo where a black ring would wash out). NO aria (visible text = restaurant name, not icon-only). So APPEND `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`. Confirm: ring-inset (overflow-hidden parent) + ring-white/70 vs ring-ring for a mixed image+card inset ring + no transition change + no aria + DON'T touch the existing active:scale-[0.99].

D) L405 HOTEL-CARD top button (raw <button>, structurally IDENTICAL to C — big clickable image+title region, one-shot `onClick={() => navigate(`/hotels?hotelId=${h.id}`)}`, base `block w-full text-left active:scale-[0.99] transition-transform touch-manipulation`, ALREADY active:scale-[0.99] + transition-transform, CONTAINS <img alt={h.name}> + gradient + PartnerBadge + rating + a p-3 footer with the hotel NAME + city + price [bg-card]; FLUSH top child of the same `rounded-2xl overflow-hidden bg-card` motion.div; below it a `px-3 pb-3` shadcn "View rooms" <Button>). → my plan: identical to C — APPEND `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring-inset, image-dominant → ring-white/70, no transition change, no aria, keep active:scale-[0.99]). Confirm identical-to-C treatment.

ALSO CONFIRM I should LEAVE these: the shadcn Search <Input> L157 (own focus tokens); ALL shadcn <Button>s — empty-state "Clear search" L298 / "Browse Eats" L304 / "Browse Hotels" L310 / "Add your business" L316, RestaurantCard "Reserve" L364 + "Order" L376, HotelCard "View rooms" L435 (all ship own focus/scale tokens); the motion.div card wrappers L335/L399 (entrance anim, NO onClick — presentational); the PartnerBadge component; the rating pill <div>s + name/cuisine/city/price <div>s + count-label <span> + section <h2>s (non-interactive); Search/UtensilsCrossed/BedDouble/Star/MapPin/ChevronLeft/Loader2/ArrowRight/Store icons (decorative); the card <img>s (have alt).

Be concise and exact. Return the precise final className after-string per control + any aria attr. B is a mapped chip (single edit hits all 3 tabs); C/D are the two near-identical card-top image buttons. Resolve: A transition-transform-NEW (no hover, scale sole); B the transition-colors→transition-all FLIP + aria-pressed; C/D ring-inset (overflow-hidden parent) + ring-white/70-vs-ring-ring for the mixed image+card inset ring + no transition change + no aria + keep the existing active:scale-[0.99].
- files: src/pages/NetworkPlacesPage.tsx

---

## Plan

**File:** `src/pages/NetworkPlacesPage.tsx`

**4 controls to edit** (className + aria only, 0 logic changes):

| Control | Edit | Key rationale |
|---------|------|---------------|
| **A** L140 Header Back `<button>` | Append `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `transition-transform` NEW (no hover, scale sole), `scale-95` icon tier, keep existing `aria-label="Back"` |
| **B** L167 Tab chip `<button>` (mapped ×3) | FLIP `transition-colors`→`transition-all` + append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + add `aria-pressed={tab === t}` | FLIP required (new scale not covered by `transition-colors`), `[0.97]` segmented-tab tier, `aria-pressed` for single-select bg-conveyed filter |
| **C** L341 RestaurantCard top `<button>` | Append `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` | `ring-inset` (flush child of `overflow-hidden` parent), `ring-white/70` (image-dominant surface), no transition change, keep existing `active:scale-[0.99]` |
| **D** L405 HotelCard top `<button>` | Append `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` | Identical to C |

**Leave:** shadcn `<Input>`/`<Button>`s, `motion.div` wrappers, `PartnerBadge`, rating pills, icons, `<img>`s.

---

## Diff

```diff
--- a/src/pages/NetworkPlacesPage.tsx
+++ b/src/pages/NetworkPlacesPage.tsx
@@ -137,7 +137,7 @@ export default function NetworkPlacesPage() {
           <div className="flex items-center gap-2 mb-3">
             <button type="button"
               onClick={() => navigate(-1)}
-              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
+              className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               aria-label="Back"
             >
               <ChevronLeft className="w-5 h-5" />
@@ -164,7 +164,7 @@ export default function NetworkPlacesPage() {
               <button type="button"
                 key={t}
                 onClick={() => onTab(t)}
-                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
+                className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                   tab === t
                     ? "bg-ig-gradient text-white"
                     : "bg-muted text-foreground"
@@ -172,6 +172,7 @@ export default function NetworkPlacesPage() {
               >
                 {t}
               </button>
+              aria-pressed={tab === t}
             ))}
             <span className="ml-auto self-center text-[11px] text-muted-foreground">
               {countLabel}
@@ -299,7 +300,7 @@ function RestaurantCard({
       <button type="button"
         onClick={() => navigate(`/eats/restaurant/${r.id}`)}
-        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"
+        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
       >
         <div className="relative aspect-[16/10] overflow-hidden">
           <img src={cover} alt={r.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
@@ -363,7 +364,7 @@ function HotelCard({
       <button type="button"
         onClick={() => navigate(`/hotels?hotelId=${h.id}`)}
-        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation"
+        className="block w-full text-left active:scale-[0.99] transition-transform touch-manipulation focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
       >
         <div className="relative aspect-[16/10] overflow-hidden">
           <img src={cover} alt={h.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
```

**Wait — the `aria-pressed` placement in the diff above is wrong.** It's placed *after* the closing `</button>` tag. It should be on the `<button>` opening tag. Let me fix that:

```diff
@@ -164,7 +164,7 @@ export default function NetworkPlacesPage() {
               <button type="button"
                 key={t}
                 onClick={() => onTab(t)}
+                aria-pressed={tab === t}
                 className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                   tab === t
                     ? "bg-ig-gradient text-white"
@@ -172,7 +172,6 @@ export default function NetworkPlacesPage() {
               >
                 {t}
               </button>
-              aria-pressed={tab === t}
             ))}
```

---

## Verification needed

Run `npm run update` (type-check + worker type-check + production build) before marking done. Preview at `/network` on 375/768/1280 to confirm:
- Tab chips get focus ring + press scale + `aria-pressed`
- Card image buttons get inset white ring on focus
- No double rings, no clipped rings, no broken layout

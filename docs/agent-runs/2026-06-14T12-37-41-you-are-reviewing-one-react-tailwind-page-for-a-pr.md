# DeepSeek run — 2026-06-14T12:37:41.702Z

- model: deepseek-chat
- task: You are reviewing ONE React + Tailwind page for a premium-feel interaction + accessibility token pass. The codebase has a strict, established design-token vocabulary. Propose ONLY className-string changes and display-only ARIA attributes (aria-label / aria-pressed). DO NOT propose any logic, role, tabIndex, onKeyDown, structural, or data changes. Preserve all queries/handlers byte-identical.

FILE: src/pages/PostAlbumsPage.tsx — a creator "Albums" page (curate posts into named albums). Sticky header (shadcn ghost Back <Button> + a "New" shadcn <Button>); a gradient banner; an AnimatePresence "create album" card with a Cancel icon <button>, a name <input>, a post-picker grid of selectable thumbnail <button>s, and a "Create" shadcn <Button>; a grid of album cards where each card = a motion.div (rounded-2xl overflow-hidden bg-card border) containing a big cover <button> (navigate to album) + an inline rename <input> + two floating icon <button>s (Rename, Delete) at top-left over the cover.

DESIGN TOKENS (house rules):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD by default; ring-inset ONLY for a flush edge child of a rounded overflow-hidden PARENT, or a flush media tile in a near-gapless grid.
- Ring color: `--ring` resolves BLACK. OUTWARD ring renders against the control's PARENT surface: neutral parent (bg-card/background/muted) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or a ring rendering directly OVER photographic media) = ring-white/70. A gradient/tinted-FILLED button on a NEUTRAL parent still uses ring-ring. For an INSET ring it renders over the control's OWN surface — image-dominant tile → ring-white/70; neutral bg-card → ring-ring.
- Press-scale tiers (CSS): icon-only active:scale-95; small text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select active:scale-[0.97]; wide full-width row WITH own surface active:scale-[0.98]; BARE full-width row active:scale-[0.99]; media tile → treat as its dominant content. Don't renumber an existing scale.
- "No second competing press": a control that ALREADY has a press effect (framer whileTap, existing CSS active:scale, active:bg-wash, active:opacity) gets ring-ONLY (no added CSS active:scale).
- transition rule: `transition-transform` if scale is the only animated CSS prop; `transition-all` if ALSO hover bg/text/border/opacity. A `transition-colors`/`transition-opacity` GAINING a new active:scale must FLIP to transition-all. ALREADY `transition-all` → append without flipping. A button with NO transition class GAINING only a new active:scale: if scale is the only animated prop → fresh `transition-transform`; if the button ALSO has a hover bg/color change → `transition-all`. Adding ONLY a focus ring (no new animated CSS prop) → leave the transition as-is (don't flip).
- aria: aria-label ONLY on icon-only / image-only controls. aria-pressed ONLY on a persistent single-select/multi-select toggle whose on/off is bg-conveyed.
- shadcn <Button>/<Input> ship own focus/scale tokens → LEAVE. Raw <input> with native focus tokens (focus:outline-none/focus:ring-*) → LEAVE (form-field carveout).

CONTROLS in this file (raw <button>s only — the shadcn <Button>s Back/New/Create are LEFT):
1. L289 CANCEL <button> (icon-only X, aria-label="Cancel" present). className `h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground` (NO transition, NO scale, NO ring; HAS hover:bg-secondary). Sits inside the create card `bg-card border` (NEUTRAL parent).
2. L319 POST-PICKER tile <button> (×N over posts; multi-select, selection bg-conveyed via an inset bg-ig-gradient ring overlay + a Check badge; aria-pressed={sel} present; onClick toggles selection). className `relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity` (ALREADY active:opacity-80 + transition-opacity). The tile is image/video-DOMINANT (object-cover media fills it). Sits in a `grid grid-cols-4 sm:grid-cols-5 gap-1.5` near-gapless grid.
3. L400 ALBUM-COVER <button> (per album; onClick navigate(`/feed?album=...`); aria-label={`Open album ${name}`} present). className `w-full aspect-square relative active:opacity-80 transition-opacity` (ALREADY active:opacity-80 + transition-opacity). It is the FLUSH top child of its parent motion.div `relative rounded-2xl overflow-hidden bg-card border`; the button fills the tile with a cover <img> OR a bg-ig-gradient fallback + a dark gradient overlay → image/gradient-DOMINANT.
4. L439 RENAME <button> (icon-only Pencil, aria-label={`Rename ${name}`} present). className `h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all` (ALREADY active:scale-90 + transition-all + hover:bg). Positioned `absolute top-2 left-2` (inset ~8px) OVER the album cover image/gradient inside the overflow-hidden card.
5. L447 DELETE <button> (icon-only Trash2, aria-label={`Delete ${name}`} present). className `h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all` (ALREADY active:scale-90 + transition-all + hover:bg). Same floating-over-cover placement as #4.

For EACH of the 5 controls: state (a) add/skip a focus ring + exact tokens incl. ring color (ring-ring vs ring-white/70) + inset/outward, (b) add/skip a press scale + which tier (or ring-ONLY if it already presses), (c) aria already present? add/skip, (d) transition: fresh transition-transform vs transition-all vs leave-as-is/no-flip. Give the EXACT final className string for each. RESOLVE SPECIFICALLY: (1) Cancel — it has hover:bg-secondary and no transition; gaining active:scale-95 → `transition-all` (because of the hover bg) or `transition-transform`? ring-ring OUTWARD (neutral card)? (2) post-picker tile — ring-ONLY (already active:opacity)? INSET ring (media tile in a gap-1.5 near-gapless grid) with ring-white/70 (image-dominant), or OUTWARD ring-ring (renders in the 6px gap against card)? (3) album-cover — ring-ONLY (already active:opacity)? INSET ring-white/70 (flush child of the rounded-2xl overflow-hidden parent, image/gradient cover) — outward would be clipped? (4)/(5) rename & delete — ring-ONLY (already active:scale-90 + transition-all)? ring-white/70 (over the cover image) OUTWARD (inset ~8px from the clipped edge, not flush)? Flag anything needing a structural change as OUT OF SCOPE. Be precise and terse.
- files: src/pages/PostAlbumsPage.tsx

---

# Review: PostAlbumsPage.tsx — Premium Interaction + A11y Token Pass

## Plan

5 raw `<button>` controls need className + display-aria tokens. All shadcn `<Button>`s (Back/New/Create) are left untouched. The diff is token-only — zero logic lines changed.

## Per-Control Verdict

### 1. CANCEL `<button>` (L289) — icon-only X
- **Ring**: ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — OUTWARD (neutral `bg-card` parent, not flush to overflow-hidden edge)
- **Press**: ADD `active:scale-95` (icon tier) — no existing CSS press
- **Transition**: FLIP to `transition-all` — gaining scale AND has `hover:bg-secondary`
- **Aria**: `aria-label="Cancel"` already present — KEEP
- **Final className**: `"h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### 2. POST-PICKER tile `<button>` (L319) — image-dominant multi-select
- **Ring**: ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70` — INSET `ring-white/70` (image-dominant tile in a `gap-1.5` near-gapless grid; an OUTWARD ring would render in the 6px gap against the card surface, but INSET over the image is more visible and matches the media-tile pattern)
- **Press**: SKIP (ring-ONLY) — already has `active:opacity-80`
- **Transition**: LEAVE as-is (`transition-opacity`) — no new animated CSS prop (ring is `focus-visible`, not animated)
- **Aria**: `aria-pressed={sel}` already present — KEEP
- **Final className**: `"relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"`

### 3. ALBUM-COVER `<button>` (L400) — image/gradient-dominant, flush child of overflow-hidden parent
- **Ring**: ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70` — INSET `ring-white/70` (flush top child of `rounded-2xl overflow-hidden` parent → OUTWARD would be clipped; image/gradient-dominant surface → white ring)
- **Press**: SKIP (ring-ONLY) — already has `active:opacity-80`
- **Transition**: LEAVE as-is (`transition-opacity`) — no new animated CSS prop
- **Aria**: `aria-label={`Open album ${a.name}`}` already present — KEEP
- **Final className**: `"w-full aspect-square relative active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"`

### 4. RENAME `<button>` (L439) — icon-only, floating over cover image
- **Ring**: ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` — OUTWARD `ring-white/70` (renders directly OVER the cover image; inset ~8px from the clipped edge, NOT flush → OUTWARD is safe; white ring over dark image)
- **Press**: SKIP (ring-ONLY) — already has `active:scale-90`
- **Transition**: LEAVE as-is (`transition-all`) — no new animated CSS prop
- **Aria**: `aria-label={`Rename ${a.name}`}` already present — KEEP
- **Final className**: `"h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"`

### 5. DELETE `<button>` (L447) — icon-only, floating over cover image
- **Ring**: ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` — same as #4: OUTWARD `ring-white/70` over dark image
- **Press**: SKIP (ring-ONLY) — already has `active:scale-90`
- **Transition**: LEAVE as-is (`transition-all`) — no new animated CSS prop
- **Aria**: `aria-label={`Delete ${a.name}`}` already present — KEEP
- **Final className**: `"h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"`

## Diff

```diff
--- a/src/pages/PostAlbumsPage.tsx
+++ b/src/pages/PostAlbumsPage.tsx
@@ -286,7 +286,7 @@ export default function PostAlbumsPage() {
                 <button
                   type="button"
                   aria-label="Cancel"
-                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
+                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   onClick={() => { setCreating(false); setName(""); setSelectedPostIds(new Set()); }}
                 >
                   <X className="h-4 w-4" />
@@ -316,7 +316,7 @@ export default function PostAlbumsPage() {
                         <button
                           key={p.id}
                           type="button"
-                          className="relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity"
+                          className="relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                           onClick={() => togglePostSelect(p.id)}
                           aria-pressed={sel}
                         >
@@ -397,7 +397,7 @@ export default function PostAlbumsPage() {
                   <button
                     type="button"
                     onClick={() => navigate(`/feed?album=${a.id}`)}
-                    className="w-full aspect-square relative active:opacity-80 transition-opacity"
+                    className="w-full aspect-square relative active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                     aria-label={`Open album ${a.name}`}
                   >
                     {a.cover_url ? (
@@ -436,7 +436,7 @@ export default function PostAlbumsPage() {
                     <button
                       type="button"
                       aria-label={`Rename ${a.name}`}
-                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all"
+                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                       onClick={(e) => { e.stopPropagation(); setEditingId(a.id); setEditName(a.name); }}
                     >
                       <Pencil className="h-3 w-3" />
@@ -444,7 +444,7 @@ export default function PostAlbumsPage() {
                     <button
                       type="button"
                       aria-label={`Delete ${a.name}`}
-                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all"
+                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                       onClick={(e) => { e.stopPropagation(); if (confirm(`Delete album "${a.name}"?`)) deleteMutation.mutate(a.id); }}
                     >
                       <Trash2 className="h-3 w-3" />
```

## Guard Tally

| Metric | Count |
|--------|-------|
| className edits | 5 |
| New aria-label | 0 (all 5 pre-existing) |
| New aria-pressed | 0 (L319 pre-existing) |
| focus-visible:ring | 5 |
| ring-ring (OUTWARD) | 1 (#1 Cancel) |
| ring-white/70 (OUTWARD) | 2 (#4 Rename, #5 Delete) |
| ring-white/70 (INSET) | 2 (#2 post-picker, #3 album-cover) |
| ring-inset | 2 (#2, #3) |
| active:scale new | 1 (#1 `scale-95`) |
| active:scale kept | 3 (#4, #5 `scale-90`; #2, #3 ring-ONLY) |
| FLIPs | 1 (#1 `transition-all`) |
| Fresh transitions | 0 (#1 FLIP to `transition-all`) |
| Logic lines touched | 0 |

## Owner Verification

- **Run `npm run update`** before committing — must pass (type-check + worker + build).
- **Preview at 375/768/1280** — the `grid grid-cols-4 sm:grid-cols-5 gap-1.5` post-picker grid and `grid grid-cols-2 gap-3` album grid are responsive; the floating Rename/Delete buttons (`top-2 left-2`, `h-7 w-7`) are compact but consistent with the repo's floating-action scale.
- **Out of scope (flagged, not applied):** (a) the post-picker tiles lack `role="gridcell"`/`role="grid"` — a structural a11y upgrade; (b) the album-cover button's `onClick` navigates to `/feed?album=${a.id}` — confirm the feed route handles the `album` query param; (c) the `confirm()` dialog in the delete handler is synchronous — a custom modal would be more polished but is a logic change.

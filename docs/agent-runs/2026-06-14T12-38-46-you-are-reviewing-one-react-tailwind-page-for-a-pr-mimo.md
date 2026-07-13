# MiMo run — 2026-06-14T12:38:46.878Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

All 5 controls are raw `<button>`s needing focus-ring tokens. Three already press (#2 opacity, #3 opacity, #4/#5 scale-90) → ring-ONLY. One has no press (#1 Cancel) → add icon-only scale-95 + ring. All already have `aria-label` or `aria-pressed` → zero ARIA additions. Five className edits total, zero logic lines.

---

## Per-control verdict

### 1. Cancel `<button>` (L289) — **ADD scale + ring**

| Token | Decision | Why |
|-------|----------|-----|
| Press | `active:scale-95` NEW | Icon-only tier; no prior press |
| Ring | OUTWARD `ring-ring` | Neutral `bg-card` parent |
| Transition | Fresh `transition-all` | Has `hover:bg-secondary` (color) + new `scale` → both animate |
| Aria | Keep `aria-label="Cancel"` | Already present |

**Before:**
```
className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
```
**After:**
```
className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### 2. Post-picker tile `<button>` (L319) — **ring-ONLY**

| Token | Decision | Why |
|-------|----------|-----|
| Press | NONE (ring-ONLY) | Already `active:opacity-80` |
| Ring | INSET `ring-white/70` | Media-dominant tile in `gap-1.5` near-gapless grid → inset per rule; image surface → white/70 |
| Transition | Leave as-is (`transition-opacity`) | No new animated CSS prop |
| Aria | Keep `aria-pressed={sel}` | Already present |

**Before:**
```
className="relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity"
```
**After:**
```
className="relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

### 3. Album-cover `<button>` (L400) — **ring-ONLY**

| Token | Decision | Why |
|-------|----------|-----|
| Press | NONE (ring-ONLY) | Already `active:opacity-80` |
| Ring | INSET `ring-white/70` | Flush child of `rounded-2xl overflow-hidden` parent → outward clipped; image/gradient-dominant surface → white/70 |
| Transition | Leave as-is (`transition-opacity`) | No new animated CSS prop |
| Aria | Keep `` aria-label={`Open album ${a.name}`} `` | Already present |

**Before:**
```
className="w-full aspect-square relative active:opacity-80 transition-opacity"
```
**After:**
```
className="w-full aspect-square relative active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

### 4. Rename `<button>` (L439) — **ring-ONLY**

| Token | Decision | Why |
|-------|----------|-----|
| Press | NONE (ring-ONLY) | Already `active:scale-90` |
| Ring | OUTWARD `ring-white/70` | Inset ~8px from the clipped edge (not flush) → outward survives; renders over cover image → white/70 |
| Transition | Leave as-is (`transition-all`) | No new animated CSS prop |
| Aria | Keep `` aria-label={`Rename ${a.name}`} `` | Already present |

**Before:**
```
className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all"
```
**After:**
```
className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

### 5. Delete `<button>` (L447) — **ring-ONLY**

| Token | Decision | Why |
|-------|----------|-----|
| Press | NONE (ring-ONLY) | Already `active:scale-90` |
| Ring | OUTWARD `ring-white/70` | Same as #4 — ~8px inset from clipped edge, over cover image |
| Transition | Leave as-is (`transition-all`) | No new animated CSS prop |
| Aria | Keep `` aria-label={`Delete ${a.name}`} `` | Already present |

**Before:**
```
className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all"
```
**After:**
```
className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

---

## Guard tally

| Metric | Count |
|--------|-------|
| className edits | **5** |
| New aria-pressed | 0 |
| New aria-label | 0 |
| aria-expanded | 0 |
| `focus-visible:ring` | 5 total |
| → `ring-ring` (OUTWARD) | 1 (#1) |
| → `ring-white/70` (OUTWARD) | 2 (#4, #5) |
| → `ring-white/70` (INSET) | 2 (#2, #3) |
| → `ring-inset` | 2 (#2, #3) |
| `active:scale` new | 1 (#1 `scale-95`) |
| `active:scale` kept | 2 (#4, #5 `scale-90`) |
| Ring-only (no new scale) | 3 (#2, #3, #4, #5) — actually 4 |
| FLIPs | 0 |
| Fresh transitions | 1 (#1 `transition-all`) |
| Competing 2nd press | 0 |
| Logic lines touched | **0** |

---

## Specific resolutions to your questions

1. **Cancel** → `transition-all` (has `hover:bg-secondary` = color change, so scale alone isn't the only animated prop). `ring-ring` OUTWARD (neutral `bg-card` parent). ✓

2. **Post-picker tile** → ring-ONLY (already `active:opacity-80`). INSET `ring-white/70` — it's a media tile in a `gap-1.5` near-gapless grid (the "flush media tile in a near-gapless grid" clause), and its own surface is image-dominant. An outward ring would bleed into the 6px gap but the near-gapless grid rule directs to inset. ✓

3. **Album-cover** → ring-ONLY (already `active:opacity-80`). INSET `ring-white/70` — flush child of the `rounded-2xl overflow-hidden` parent, image/gradient-dominant own surface. An outward ring would be clipped by `overflow-hidden`. ✓

4. **Rename** → ring-ONLY (already `active:scale-90` + `transition-all`). OUTWARD `ring-white/70` — inset ~8px from the card edge, not flush, so outward survives the `overflow-hidden`; the ring renders over the cover image background. ✓

5. **Delete** → identical reasoning as #4. ✓

---

## Diff

```diff
--- a/src/pages/PostAlbumsPage.tsx
+++ b/src/pages/PostAlbumsPage.tsx
@@ Cancel button (L289)
-                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
+                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

@@ Post-picker tile (L319)
-                          className="relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity"
+                          className="relative aspect-square rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"

@@ Album-cover (L400)
-                    className="w-full aspect-square relative active:opacity-80 transition-opacity"
+                    className="w-full aspect-square relative active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"

@@ Rename (L439)
-                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all"
+                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"

@@ Delete (L447)
-                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all"
+                      className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

---

## Owner flags (OUT OF SCOPE — not applied)

- **Sub-44px tap targets:** The Cancel, Rename, and Delete buttons are `h-8 w-8`/`h-7 w-7` (~32px/~28px) — below the 44px guideline. Consistent with repo-wide compact floating-action scale. Flagged for owner-wide tap-target sweep, not changed here.
- **Post-picker `overflow-hidden` + ring interaction:** The tile itself has `overflow-hidden` and the ring is inset — verify visually that the `ring-white/70` inset ring is visible over the `bg-ig-gradient` selection overlay (the gradient is `p-[2px]` with the image inside `inset-[2px]`, so the ring should render at the outer edge of the tile, above the gradient overlay). Preview at 375px to confirm.
- **Album-cover edit input (`focus:outline-none` only):** The rename inline `<input>` has `focus:outline-none` with no ring — this is a form-field carveout (LEAVE), but it means there's no visible focus indicator when editing. Flagged, not changed.
- Shadcn `<Button>`s (Back, New, Create, "Create your first album") — all LEFT per rule.

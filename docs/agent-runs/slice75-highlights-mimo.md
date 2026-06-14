# MiMo run — 2026-06-14T08:12:38.464Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/HighlightsPage.tsx (439-line "Highlights" — Instagram-style Story Highlights manager at /highlights. REAL Supabase + @tanstack/react-query: useQuery over `story_highlights` (by user_id, ordered sort_order) + a second useQuery over archived `stories` (gated behind `creating`); createMutation/renameMutation/deleteMutation; toggleStorySelect Set state; useMemo totalStoriesPinned; useState creating/title/selectedStories/editingId/editTitle. Renders sticky header [shadcn ghost Back + Star badge + title + shadcn "New" Button] + a gradient banner + an AnimatePresence create panel [raw Cancel-X + raw <input> title + a grid of raw story-tile buttons + shadcn "Pin" Button] + a loading skeleton + an empty-state [shadcn "Create your first" Button] + a profile bubble row [raw circular bubble buttons] + a "Manage" list [each row: cover + inline-rename raw <input> + raw Save-check OR raw Rename-pencil + raw Delete-trash]. RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, mutations, useQuery keys, setState, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>s (own focus/scale tokens). Don't churn raw <input>s (own native focus:ring-rose-500/30). Don't add role/tabIndex/onKeyDown (out of scope — note the rename input ALREADY has onKeyDown, that's existing logic, leave it). Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a NEAR-GAPLESS grid (gap-0.5/2px inset; gap-2/gap-3 outward; gap-1.5/6px is borderline — decide).
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or ring over media) = ring-white/70. A gradient-FILLED button (bg-ig-gradient) on a NEUTRAL parent still uses ring-ring (the OUTWARD ring renders against the neutral parent, NOT the button's own gradient fill). For an INSET ring it renders over the control's OWN content/surface — an image-dominant tile → ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select picker active:scale-[0.97]; wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]. Don't renumber an existing scale.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all (a transform isn't covered by transition-colors). ALREADY transition-all → append without flipping. NO transition + scale-only + NO hover ON THE BUTTON → transition-transform NEW. Adding ONLY a focus ring (no new animated prop) → leave the existing transition class as-is.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way multi-select toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, cancel, save, rename, delete, create).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L237 CREATE-PANEL Cancel-X button (raw <button>, icon-only X, one-shot onClick resets creating/title/selectedStories, ALREADY aria-label="Cancel", base `h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground`, NO transition/scale/focus). Parent = the create panel `rounded-2xl bg-card border border-border` (neutral). → my plan: KEEP aria-label="Cancel" + APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only scale-95; transition-all NEW — button has hover:bg-secondary AND gains a scale transform, both animate → transition-all not transition-transform; OUTWARD ring-ring on neutral bg-card; no aria-pressed — one-shot cancel). Confirm transition-all (not transition-transform, because of the existing hover:bg-secondary) + scale-95 + keep-aria.

B) L266 STORY-TILE picker button (raw <button>, MAPPED over archivedStories, MULTI-select toggle, ALREADY aria-pressed={sel} + aria-label, base `relative aspect-[9/16] rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity`, ALREADY active:opacity-80 + transition-opacity [press via OPACITY], NO focus. CONTAINS the story <img>/<video> + a selected-state bg-ig-gradient p-[2px] border overlay + a Check badge). Grid = `grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-72 overflow-y-auto` (gap-1.5 = 6px; the grid is a vertical SCROLL container overflow-y-auto). → my plan: ring-ONLY append (DON'T add a scale — it ALREADY presses via active:opacity-80; adding only a ring = no new animated prop → leave transition-opacity as-is; KEEP aria-pressed + aria-label). Ring placement: `focus-visible:ring-inset` — flush media tile in a tight gap-1.5 grid inside an overflow-y-auto scroll container (an outward ring risks clipping at the scroll-container edge); inset is safe. Ring color: inset ring renders over the tile's OWN content = the story IMAGE/VIDEO (media-dominant) → `ring-white/70`. So APPEND `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`. Confirm: ring-inset (tight grid + scroll container) + ring-white/70 (media tile) + NO new scale (keep active:opacity-80 + transition-opacity) + keep existing aria-pressed/aria-label.

C) L337 PROFILE-BUBBLE button (raw <button>, image/icon-only — the visible title is a SIBLING <p> OUTSIDE the button, ALREADY aria-label={`Open highlight ${h.title}`}, base `block w-[72px] h-[72px] rounded-full bg-ig-gradient p-[3px] mx-auto active:scale-95 transition-transform`, ALREADY active:scale-95 + transition-transform, NO hover/focus. CONTAINS a rounded-full image/placeholder inside the gradient ring border). Parent = `flex gap-4 overflow-x-auto scrollbar-hide` on bg-background (neutral; gap-4 generous). → my plan: ring-ONLY append (already has press scale + transition-transform; no new animated prop → leave transition-transform; KEEP active:scale-95; KEEP aria-label). Ring placement: OUTWARD — gap-4 is generous, the bubble is round, the OUTWARD circular ring renders in the gap against the neutral bg-background (NOT clipped). Ring color: OUTWARD ring renders against the neutral bg-background parent → `ring-ring` (the bg-ig-gradient is the button's OWN fill, the outward ring does not render over it). So APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: ring-only + OUTWARD ring-ring (gradient is own fill, ring renders on neutral parent) + keep scale-95 + keep transition-transform + keep aria-label.

D) L393 INLINE-RENAME Save-check button (raw <button>, icon-only Check, one-shot onClick renameMutation.mutate, ALREADY aria-label="Save", base `h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center`, NO transition/scale/hover/focus). Parent = the inline-edit `flex items-center gap-1.5` inside the manage row `rounded-2xl bg-card border` (neutral). → my plan: KEEP aria-label="Save" + APPEND `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only scale-95; transition-transform NEW — bg-ig-gradient is a STATIC fill, NO hover on the button, scale is the SOLE animated prop, no prior transition → NEW not flip; OUTWARD ring-ring — gradient fill on neutral bg-card parent; no aria-pressed — one-shot save). Confirm transition-transform (not transition-all — no hover on this button) + scale-95 + OUTWARD ring-ring + keep-aria.

E) L413 Rename-pencil button (raw <button>, icon-only Pencil, one-shot onClick sets editingId/editTitle, ALREADY aria-label={`Rename ${h.title}`}, base `h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors`, ALREADY transition-colors + hover:bg-secondary, NO scale/focus). Parent = the manage-row action cluster on bg-card (neutral). → my plan: KEEP aria-label + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` AND FLIP `transition-colors`→`transition-all` (icon-only scale-95; FLIP REQUIRED — gains a new active:scale transform NOT covered by transition-colors, and the hover:bg color wash must keep animating; OUTWARD ring-ring on neutral bg-card; no aria-pressed — one-shot). Confirm FLIP transition-colors→transition-all + scale-95 + keep-aria.

F) L421 Delete-trash button (raw <button>, icon-only Trash2, one-shot onClick deleteMutation.mutate, ALREADY aria-label={`Delete ${h.title}`}, base `h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors`, ALREADY transition-colors + hover:bg-destructive/10 + hover:text-destructive, NO scale/focus). Parent = the manage-row action cluster on bg-card (neutral). → my plan: identical pattern to E — KEEP aria-label + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` AND FLIP `transition-colors`→`transition-all` (icon-only scale-95; FLIP REQUIRED — new scale transform + hover color washes must keep animating; OUTWARD ring-ring on neutral bg-card; no aria-pressed). Confirm identical-to-E FLIP treatment.

ALSO CONFIRM I should LEAVE these: shadcn <Button>s — header Back L188 / "New" L198 / "Pin …" L293 / empty-state "Create your first highlight" L322 (all ship own focus/scale tokens); raw <input>s — title L246 + inline-rename L381 (own native focus:outline-none focus:ring-2 focus:ring-rose-500/30; the rename input's onKeyDown is EXISTING logic, leave it); the gradient banner motion.div L213 + create-panel motion.div L229 + manage-row motion.div L361 (presentational/anim, NO onClick); the loading skeletons; the count <p>s / section <h>s / selected-Check badges <div>s (non-interactive); ArrowLeft/Plus/Star/Pencil/Trash2/Check/X/Sparkles/ImageIcon icons (decorative); the tile <img>/<video> + bubble/manage cover <img>s.

Be concise and exact. Return the precise final className after-string per control + any aria attr. 6 raw buttons: A Cancel-X (transition-all NEW because hover:bg-secondary present), B story-tile (ring-only, ring-inset + ring-white/70, KEEP active:opacity-80, keep aria-pressed), C bubble (ring-only, OUTWARD ring-ring on neutral parent despite gradient fill, keep scale-95), D Save-check (transition-transform NEW, OUTWARD ring-ring on gradient fill), E Rename-pencil + F Delete-trash (both FLIP transition-colors→transition-all + scale-95). Resolve especially: A transition-all-vs-transition-transform (hover present → all); B gap-1.5 inset-vs-outward + ring-white/70-vs-ring-ring; C OUTWARD-ring-ring despite the gradient fill; D transition-transform-NEW (no hover) vs A; E/F the transition-colors→transition-all FLIP.
- files: src/pages/HighlightsPage.tsx

---

## Plan

All 6 controls confirmed correct. Zero corrections needed — your analysis is textbook-perfect on every decision point (transition-all vs transition-transform, gap-1.5 inset rationale, gradient-fill OUTWARD ring-ring, transition-colors→transition-all FLIP). Here's the ready-to-apply diff.

---

## Proposed change — `src/pages/HighlightsPage.tsx`

**6 className edits, 0 new aria attrs (all pre-existing kept), 0 logic lines touched.**

### A) Cancel-X button (~L237)
```
BEFORE: className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
AFTER:  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- `transition-all` **NEW** — `hover:bg-secondary` present + gains scale → all, not transform
- `active:scale-95` — icon-only tier
- `ring-ring` OUTWARD — neutral bg-card parent
- Keep `aria-label="Cancel"`

### B) Story-tile picker (~L266)
```
BEFORE: className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity"
AFTER:  className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```
- **Ring-only** — existing `active:opacity-80` + `transition-opacity` untouched
- `ring-inset` — flush media tile in gap-1.5 grid inside `overflow-y-auto` scroll container; outward risks clipping at scroll edge
- `ring-white/70` — inset ring renders over image/video content (media-dominant)
- Keep `aria-pressed={sel}` + `aria-label`

### C) Profile-bubble (~L337)
```
BEFORE: className="block w-[72px] h-[72px] rounded-full bg-ig-gradient p-[3px] mx-auto active:scale-95 transition-transform"
AFTER:  className="block w-[72px] h-[72px] rounded-full bg-ig-gradient p-[3px] mx-auto active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **Ring-only** — existing `active:scale-95` + `transition-transform` untouched
- `ring-ring` OUTWARD — `bg-ig-gradient` is the button's own fill; the OUTWARD ring renders against neutral `bg-background` parent (gap-4 generous)
- Keep `aria-label`

### D) Save-check (~L393)
```
BEFORE: className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center"
AFTER:  className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- `transition-transform` **NEW** — `bg-ig-gradient` is static fill, no hover on button, scale is sole animated prop
- `active:scale-95` — icon-only tier
- `ring-ring` OUTWARD — gradient fill on neutral bg-card parent
- Keep `aria-label="Save"`

### E) Rename-pencil (~L413)
```
BEFORE: className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
AFTER:  className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **FLIP** `transition-colors` → `transition-all` — gains `active:scale` transform not covered by `transition-colors`; `hover:bg-secondary` color wash keeps animating
- `active:scale-95` — icon-only tier
- `ring-ring` OUTWARD on neutral bg-card
- Keep `aria-label`

### F) Delete-trash (~L421)
```
BEFORE: className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
AFTER:  className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
- **FLIP** `transition-colors` → `transition-all` — identical rationale to E
- `active:scale-95` — icon-only tier
- `ring-ring` OUTWARD on neutral bg-card
- Keep `aria-label`

---

## Guard-grep diff stats

| Metric | Count |
|--------|-------|
| className edits | 6 |
| New aria attrs | 0 (all 4 pre-existing kept) |
| `focus-visible:ring` | 6 |
| `ring-ring` (OUTWARD) | 5 (A, C, D, E, F) |
| `ring-white/70` (INSET) | 1 (B) |
| `ring-inset` | 1 (B) |
| `active:scale-95` new | 4 (A, D, E, F) + 1 pre-existing kept (C) |
| `active:opacity-80` kept | 1 (B) |
| FLIPs (`transition-colors`→`transition-all`) | 2 (E, F) |
| NEW transitions | 2 (A `transition-all`, D `transition-transform`) |
| `transition-colors` removed | 2 (E, F — flipped) |
| Logic lines touched | 0 |

## LEAVE list (confirmed correct)

- **shadcn `<Button>`s**: header Back L188, "New" L198, "Pin" L293, "Create your first" L322 — own focus/scale tokens
- **Raw `<input>`s**: title L246, inline-rename L381 — native `focus:ring-2 focus:ring-rose-500/30`; rename's `onKeyDown` is existing logic
- **`motion.div` wrappers**: gradient banner, create panel, manage rows — presentational anim, no onClick
- Loading skeletons, count `<p>`s, section `<h>`s, selected-check badge `<div>`s — non-interactive
- All icons (`ArrowLeft`/`Plus`/`Star`/`Pencil`/`Trash2`/`Check`/`X`/`Sparkles`/`ImageIcon`) — decorative
- Tile `<img>`/`<video>` + bubble/manage cover `<img>`s — have `alt`

## Owner verification

1. Run `npm run update` — must exit 0 (type-check + worker type-check + build).
2. Preview at 375/768/1280: verify the Cancel-X ring on the create panel, the story-tile inset ring on selected tiles (white/70 over media), the bubble ring in the horizontal rail, the Save-check ring inside the inline-edit, and the Rename/Delete rings in the manage rows.
3. No commit/deploy unless owner asks.

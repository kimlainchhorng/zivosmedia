# DeepSeek run — 2026-06-14T08:11:39.009Z

- model: deepseek-chat
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

# HighlightsPage — Premium Interaction + A11y Pass

## Plan

6 raw `<button>` controls need interaction tokens. All are DON'T-CHURN ring-only or ring+scale appends — no logic touched, no shadcn churned, no `<input>` churned.

## Per-Control Analysis

### A) L237 Cancel-X button
- **Final className:** `h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** OUTWARD `ring-ring` (neutral `bg-card` parent)
- **Press:** `active:scale-95` (icon-only tier)
- **Transition:** `transition-all` NEW — button has `hover:bg-secondary` AND gains scale → both animate
- **Aria:** KEEP existing `aria-label="Cancel"` (icon-only)
- **No `aria-pressed`** — one-shot cancel

### B) L266 Story-tile picker button
- **Final className:** `relative aspect-[9/16] rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`
- **Ring:** INSET `ring-white/70` — flush media tile in tight `gap-1.5` grid inside `overflow-y-auto` scroll container; inset ring renders over the tile's own image/video content
- **Press:** KEEP existing `active:opacity-80` (DO NOT add scale — already presses via opacity)
- **Transition:** KEEP existing `transition-opacity` (ring-only append, no new animated prop)
- **Aria:** KEEP existing `aria-pressed={sel}` + `aria-label="Toggle story ${s.id}"`

### C) L337 Profile-bubble button
- **Final className:** `block w-[72px] h-[72px] rounded-full bg-ig-gradient p-[3px] mx-auto active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** OUTWARD `ring-ring` — `gap-4` generous, ring renders against neutral `bg-background` parent (NOT the button's own gradient fill)
- **Press:** KEEP existing `active:scale-95`
- **Transition:** KEEP existing `transition-transform` (ring-only append)
- **Aria:** KEEP existing `aria-label="Open highlight ${h.title}"`

### D) L393 Save-check button
- **Final className:** `h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** OUTWARD `ring-ring` (gradient fill on neutral `bg-card` parent)
- **Press:** `active:scale-95` (icon-only tier)
- **Transition:** `transition-transform` NEW — `bg-ig-gradient` is static fill, NO hover on button, scale is sole animated prop
- **Aria:** KEEP existing `aria-label="Save"`
- **No `aria-pressed`** — one-shot save

### E) L413 Rename-pencil button
- **Final className:** `h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** OUTWARD `ring-ring` (neutral `bg-card` parent)
- **Press:** `active:scale-95` (icon-only tier)
- **Transition:** FLIP `transition-colors` → `transition-all` — gains new `active:scale` transform NOT covered by `transition-colors`, and `hover:bg-secondary` must keep animating
- **Aria:** KEEP existing `aria-label="Rename ${h.title}"`
- **No `aria-pressed`** — one-shot rename

### F) L421 Delete-trash button
- **Final className:** `h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** OUTWARD `ring-ring` (neutral `bg-card` parent)
- **Press:** `active:scale-95` (icon-only tier)
- **Transition:** FLIP `transition-colors` → `transition-all` — gains new `active:scale` + `hover:bg-destructive/10` + `hover:text-destructive` all must animate
- **Aria:** KEEP existing `aria-label="Delete ${h.title}"`
- **No `aria-pressed`** — one-shot delete

## Controls LEFT (no changes)

- **shadcn `<Button>`s** (L188 Back, L198 "New", L293 "Pin…", L322 "Create your first highlight") — own focus/scale tokens
- **raw `<input>`s** (L246 title, L381 inline-rename) — own `focus:ring-rose-500/30`; rename's `onKeyDown` is existing logic
- **`motion.div` wrappers** (L213 banner, L229 create panel, L361 manage row) — presentational
- **Loading skeletons, count `<p>`s, section `<h>`s, badges, icons, `<img>`/`<video>`** — non-interactive

## Diff

```diff
--- a/src/pages/HighlightsPage.tsx
+++ b/src/pages/HighlightsPage.tsx
@@ -234,7 +234,7 @@ export default function HighlightsPage() {
                 <button
                   type="button"
                   aria-label="Cancel"
-                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
+                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   onClick={() => { setCreating(false); setTitle(""); setSelectedStories(new Set()); }}
                 >
                   <X className="h-4 w-4" />
@@ -263,7 +263,7 @@ export default function HighlightsPage() {
                         <button
                           key={s.id}
                           type="button"
-                          className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity"
+                          className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted active:opacity-80 transition-opacity focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                           onClick={() => toggleStorySelect(s.id)}
                           aria-pressed={sel}
                           aria-label={`Toggle story ${s.id}`}
@@ -334,7 +334,7 @@ export default function HighlightsPage() {
                 <div key={h.id} className="shrink-0 w-[72px] text-center">
                   <button
                     type="button"
-                    className="block w-[72px] h-[72px] rounded-full bg-ig-gradient p-[3px] mx-auto active:scale-95 transition-transform"
+                    className="block w-[72px] h-[72px] rounded-full bg-ig-gradient p-[3px] mx-auto active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     aria-label={`Open highlight ${h.title}`}
                   >
                     <div className="w-full h-full rounded-full overflow-hidden bg-card ring-2 ring-background">
@@ -390,7 +390,7 @@ export default function HighlightsPage() {
                         <button
                           type="button"
                           aria-label="Save"
-                          className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center"
+                          className="h-8 w-8 rounded-full bg-ig-gradient text-white flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                           onClick={() => renameMutation.mutate({ id: h.id, newTitle: editTitle.trim() || h.title })}
                         >
                           <Check className="h-3.5 w-3.5" strokeWidth={3} />
@@ -410,14 +410,14 @@ export default function HighlightsPage() {
                       <button
                         type="button"
                         aria-label={`Rename ${h.title}`}
-                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
+                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                         onClick={() => { setEditingId(h.id); setEditTitle(h.title); }}
                       >
                         <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                       </button>
                       <button
                         type="button"
                         aria-label={`Delete ${h.title}`}
-                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
+                        className="h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                         onClick={() => deleteMutation.mutate(h.id)}
                       >
                         <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
```

## Guard Grep

| Metric | Count |
|--------|-------|
| className edits | 6 |
| aria attrs added | 0 (all 6 pre-existing, kept) |
| `focus-visible:ring` | 6 |
| `ring-ring` | 5 (A, C, D, E, F — all OUTWARD on neutral parent) |
| `ring-white/70` | 1 (B — INSET over media tile) |
| `ring-inset` | 1 (B) |
| `active:scale-95` | 4 new (A, D, E, F) + 2 pre-existing kept (B none, C kept) |
| FLIPs | 2 (E, F: `transition-colors`→`transition-all`) |
| NEW transitions | 2 (A: `transition-all`, D: `transition-transform`) |
| Logic lines touched | 0 |

## Owner Verify

Run `npm run update` — must pass (type-check + worker type-check + production build). Preview at `/highlights` on localhost (auth-gated — needs a logged-in user with `story_highlights` rows).

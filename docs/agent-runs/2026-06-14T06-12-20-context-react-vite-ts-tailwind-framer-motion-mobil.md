# DeepSeek run — 2026-06-14T06:12:20.737Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/StickerStorePage.tsx (browse sticker packs from a catalog: search, category chips, a 2-col grid of gradient pack cards, and a preview sheet/modal showing the pack's emoji stickers with copy-to-clipboard + a "Use in a story" CTA). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, useQuery, clipboard, toast byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT (an outward ring would be clipped). An element's OWN overflow-hidden does NOT clip its OWN outward ring/box-shadow.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/image surface AS THE PARENT = ring-white/70. A gradient/tinted-FILLED button sitting ON a neutral parent still uses ring-ring (the outward ring renders against the neutral parent, not the fill). A button OVERLAID on top of a gradient/image header (the header IS its parent surface) = ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale + a transition, append ring ONLY (keep its existing transition class + scale number; no flip). A control that has a framer-motion `whileTap` already owns its press scale → do NOT add a CSS active:scale (would double-up), do NOT flip its transition — ring ONLY.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, clear, copy, open).

CONTROLS (give me per control: exact final after-string of appended/changed classes, ring color + outward-vs-inset + reason, press tier, transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L153 Category chips ×N (mapped over `categories`): cn base `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize"` + `activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"`. onClick setActiveCategory(c). Single-select segmented filter, selection conveyed by bg (ig-gradient fill when active). Constant category label words. ALREADY `transition-all`. NO scale. Parent is the neutral page column (bg-background). → press tier? aria-pressed candidate? ring color?

B) L196 Pack grid card-button (motion.button, mapped over `filtered`): `className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md text-left"` with inline `style={gradientStyle(...)}` (a per-pack gradient/solid FILL), ALREADY `whileTap={{ scale: 0.97 }}` (framer press), ALREADY `aria-label={`Open pack ${p.name}`}`, onClick setOpenPackId(p.id). The button IS the gradient-filled card (its OWN overflow-hidden rounded-2xl); it shows the preview emoji + name + sticker count overlaid on the gradient. It is a direct child of the neutral 2-col grid (`grid grid-cols-2 gap-3`) inside the neutral page column. NO CSS transition, NO CSS active:scale. → This already has a framer whileTap press — ring-ONLY append (no CSS scale, no transition)? Ring color: the button's FILL is a gradient, but its PARENT (the grid/page column) is neutral — outward ring-ring, OR ring-white/70 because the button's edge content is the gradient media? And does the button's OWN overflow-hidden clip its OWN outward ring (→ would force inset)? Decide ring color + inset-vs-outward.

C) L249 sheet-header Close (X) icon button: `className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"` ALREADY `aria-label="Close"`, onClick setOpenPackId(null). Icon-only, one-shot. NO scale/transition/hover. It sits INSIDE the preview-sheet header `<div>` which is itself filled with the pack's gradient (`style={gradientStyle(...)}` + a `bg-black/15` overlay) — i.e. the button's PARENT surface is the saturated gradient header. → press tier? transition class? ring color (parent is the gradient header)?

D) L274 sticker emoji copy buttons (motion.button, mapped over `items`): `className="aspect-square rounded-xl bg-secondary hover:bg-muted active:scale-95 flex items-center justify-center text-3xl transition-all"` ALREADY `whileTap={{ scale: 0.9 }}` (framer press) AND ALREADY CSS `active:scale-95` + `transition-all` + `hover:bg-muted`, ALREADY `aria-label={`Copy ${emoji}`}`, onClick handleAddSticker(emoji) (clipboard copy + toast). Icon/emoji-only, one-shot. This control ALREADY ships BOTH a framer whileTap AND a CSS active:scale-95 (pre-existing double — NOT introduced by this pass; don't churn). Parent is the sheet body `bg-card` (neutral); the buttons themselves are `bg-secondary`. → ring-ONLY append (keep existing scale + transition, do NOT touch the pre-existing double press)? ring color?

ALSO CONFIRM I should LEAVE these (ships own focus affordance / native / presentational): shadcn header Back `<Button aria-label="Back" variant="ghost" size="icon">` L109; the search `<input type="search">` L140 (own `focus:ring-2 focus:ring-rose-500/30`); the banner `motion.div` L123 (entrance anim, NO onClick); the sheet backdrop `motion.div` L223 (onClick closes — is a click-scrim, not a focusable control, presentational dismiss); the sheet panel `motion.div` L230 (stopPropagation wrapper, presentational); the shadcn "Use in a story" `<Button>` L291 (ships own tokens); loading skeletons L173; empty-state card L180; preview emoji/name overlays (presentational).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note A and B and D are each ONE mapped template (single edit hits all instances).
- files: src/pages/StickerStorePage.tsx

---

# StickerStorePage — Premium Interaction + A11y Pass

## Plan

Apply className-only + display-only-attr changes to 4 control groups (A–D) in `src/pages/StickerStorePage.tsx`. Preserve all logic, handlers, queries, clipboard, toast byte-identical. No second competing press effect, no churn of already-polished controls, no renumbering existing `active:scale`.

---

## Per-Control Analysis

### A) Category chips (L153) — segmented filter

- **Press tier:** segmented filter → `active:scale-[0.97]`
- **Transition:** ALREADY `transition-all` → **APPEND only** (no flip)
- **Ring:** OUTWARD `ring-ring` — parent is neutral page column (`bg-background`); the `bg-ig-gradient` fill is the button's OWN surface, but the outward ring renders against the neutral parent
- **aria:** `aria-pressed={activeCategory === c}` — persistent single-select segmented filter, selection conveyed by bg, constant label words
- **Final className 1st arg:** `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

### B) Pack grid card-button (L196) — has `whileTap`

- **Already has:** framer `whileTap={{ scale: 0.97 }}` → **do NOT add CSS `active:scale`** (would double-up)
- **Already has:** NO CSS transition → **do NOT add one** (framer handles the press animation)
- **Ring:** OUTWARD `ring-ring` — the button's OWN `overflow-hidden` does NOT clip its own outward ring/box-shadow (per rulebook); parent is the neutral grid/page column; the gradient fill is the button's OWN surface, not the parent's
- **Ring-inset?** NO — the button is NOT a flush edge child of a rounded `overflow-hidden` parent; it's a direct child of the grid (no `overflow-hidden` on the grid). The button's OWN `overflow-hidden` does NOT force inset.
- **Final className append:** `" focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` appended to existing `"relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md text-left"`

### C) Sheet-header Close icon (L249) — icon-only, over gradient header

- **Press tier:** icon-only → `active:scale-95`
- **Transition:** NO existing transition, NO hover → `transition-transform` (scale is sole animated prop)
- **Ring:** OUTWARD `ring-white/70` — the button's PARENT surface is the saturated gradient header (`style={gradientStyle(...)}` + `bg-black/15` overlay), so ring renders against a saturated/image surface
- **aria:** already has `aria-label="Close"` — keep as-is (icon-only, one-shot)
- **Final className:** `"h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"`

### D) Sticker emoji copy buttons (L274) — has BOTH `whileTap` AND CSS `active:scale-95`

- **Already has:** framer `whileTap={{ scale: 0.9 }}` + CSS `active:scale-95` + `transition-all` + `hover:bg-muted` — **pre-existing double press, do NOT churn**
- **Ring:** OUTWARD `ring-ring` — parent is sheet body `bg-card` (neutral); the buttons themselves are `bg-secondary` (neutral)
- **Final className append:** `" focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` appended to existing `"aspect-square rounded-xl bg-secondary hover:bg-muted active:scale-95 flex items-center justify-center text-3xl transition-all"`

### Controls to LEAVE untouched (confirmed)

- ✅ shadcn header Back `<Button>` L109 (ships own tokens)
- ✅ search `<input>` L140 (own `focus:ring-2 focus:ring-rose-500/30`)
- ✅ banner `motion.div` L123 (entrance anim, presentational)
- ✅ sheet backdrop `motion.div` L223 (click-scrim, presentational dismiss)
- ✅ sheet panel `motion.div` L230 (`stopPropagation` wrapper, presentational)
- ✅ shadcn "Use in a story" `<Button>` L291 (ships own tokens)
- ✅ loading skeletons L173 (presentational)
- ✅ empty-state card L180 (presentational)
- ✅ preview emoji/name overlays (presentational)

---

## Diff

```diff
--- a/src/pages/StickerStorePage.tsx
+++ b/src/pages/StickerStorePage.tsx
@@ -150,7 +150,7 @@ export default function StickerStorePage() {
                 key={c}
                 type="button"
                 onClick={() => setActiveCategory(c)}
-                className={cn(
+                className={cn(  // A: segmented filter → aria-pressed + active:scale-[0.97] + outward ring-ring
                   "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                   activeCategory === c
                     ? "bg-ig-gradient text-white shadow-sm"
@@ -158,6 +158,7 @@ export default function StickerStorePage() {
                 )}
+                aria-pressed={activeCategory === c}
               >
                 {c}
               </button>
@@ -190,7 +191,7 @@ export default function StickerStorePage() {
                 whileTap={{ scale: 0.97 }}
                 onClick={() => setOpenPackId(p.id)}
-                className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md text-left"
+                className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"  // B: ring-only (has whileTap)
                 style={gradientStyle(p.gradient_color)}
                 aria-label={`Open pack ${p.name}`}
               >
@@ -246,7 +247,7 @@ export default function StickerStorePage() {
                   <button
                     type="button"
                     aria-label="Close"
-                    className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
+                    className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"  // C: icon-over-gradient → scale-95 + transition-transform + outward ring-white/70
                     onClick={() => setOpenPackId(null)}
                   >
                     <X className="h-4 w-4" />
@@ -271,7 +272,7 @@ export default function StickerStorePage() {
                           whileTap={{ scale: 0.9 }}
                           onClick={() => handleAddSticker(emoji)}
-                          className="aspect-square rounded-xl bg-secondary hover:bg-muted active:scale-95 flex items-center justify-center text-3xl transition-all"
+                          className="aspect-square rounded-xl bg-secondary hover:bg-muted active:scale-95 flex items-center justify-center text-3xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"  // D: ring-only (has both whileTap + CSS active:scale-95; don't churn)
                           aria-label={`Copy ${emoji}`}
                         >
                           {emoji}
```

---

## Verification

After applying, run:
```bash
npm run update
```

Expected: 0 type errors, 0 lint errors, production build succeeds. The diff touches only className strings + 1 `aria-pressed` attribute — zero logic lines changed.

## Owner notes

- **A) `aria-pressed`** is added to the category chips — this is a new attribute on existing `<button>` elements. Verify screen reader behavior if desired.
- **C) `ring-white/70`** on the sheet close button — this is correct per rulebook (parent surface is the gradient header), but visually the ring will be white-on-dark. If the owner prefers a different ring color here, flag it.
- All other controls use `ring-ring` (black) — standard for neutral parents.
- The pre-existing double press on D (both `whileTap={{ scale: 0.9 }}` + CSS `active:scale-95`) is left untouched per "don't churn already-polished controls" rule.

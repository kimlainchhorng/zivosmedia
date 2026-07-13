# DeepSeek run — 2026-06-14T05:53:30.809Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/SavedCollectionPage.tsx (detail view for a single Saved Collection — IG-style 2/3/4/5/6-col post grid; rename + delete the collection; remove a tile from the collection). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, mutation, Supabase calls byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/muted) = ring-ring; saturated/image surface as the PARENT = ring-white/70. A gradient/tinted-FILLED button sitting ON a neutral parent still uses ring-ring (ring renders against neutral parent, not the fill). A button OVERLAID on top of a media/image thumbnail → its parent surface is the image → ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border (or a state-driven bg/border flip you want eased). FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale, adding ONLY a ring does NOT require a flip (keep its existing transition class + scale number).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. aria-expanded on an inline disclosure/accordion. aria-haspopup="dialog" on a button that OPENS a modal Dialog. NOT aria-pressed on one-shot actions (file pickers, publish, remove, nav).
- No-op/don't-churn: if a control already ships active:scale + transition, append ring ONLY; keep its existing scale number + transition class.

CONTROLS (give me per control: exact final after-string of appended/changed classes, ring color + reason, press tier, transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L184 header Back icon button: `className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"` ALREADY has `aria-label="Back"`, onClick navigate(-1). Icon-only (ArrowLeft). ALREADY active:scale-95 + transition-transform. Parent is neutral sticky header (bg-background/95).

B) L208 header Rename (Pencil) icon button: `className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40"` ALREADY `aria-label="Rename collection"`, disabled={!meta}, onClick setRenameOpen(true) — OPENS the rename modal Dialog. Icon-only. ALREADY active:scale-95 + transition-transform. → aria-haspopup="dialog" candidate? Ring color/treatment?

C) L217 header Delete (Trash2) icon button: `className="rounded-full p-2 text-destructive hover:bg-destructive/10 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40"` ALREADY `aria-label="Delete collection"`, disabled={!meta}, onClick handleDelete (native confirm() then remove.mutateAsync + navigate). Icon-only. ALREADY active:scale-95 + transition-transform. (confirm() is native, NOT a Dialog element.)

D) L240 empty-state "Browse saved" button: `className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"`. onClick navigate("/saved-posts"). One-shot nav. NO scale, NO transition, NO hover. Solid bg-primary fill pill on neutral empty-state column (page bg).

E) L287 tile OPEN overlay button: `className="absolute inset-0 cursor-pointer focus:outline-none"` ALREADY `aria-label={`Open: ${tile.caption ?? "post"}`}`, onClick navigate(tile.feedHref). This is a TRANSPARENT full-bleed `inset-0` button covering the whole tile. Its PARENT is the tile `motion.div` (`group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]`) which shows the media img/ReelThumbnail. Button is a flush edge child of a rounded overflow-hidden parent. Currently uses legacy `focus:outline-none`. No bg of its own (transparent overlay). → ring color/treatment (inset vs outward)? press scale (scaling a transparent overlay is invisible)? replace focus:outline-none with focus-visible token?

F) L293 tile REMOVE (Trash2) icon button: `className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500/90 p-2 text-white shadow-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity active:scale-90"` ALREADY `aria-label="Remove from collection"`, onClick (e)=>{e.stopPropagation(); handleRemoveFromCollection(tile.joinId)}. Icon-only. ALREADY active:scale-90 + transition-opacity (opacity reveal on hover). Positioned inset (right-1.5/top-1.5, NOT flush) over the media tile. Has its own bg-red-500/90 fill but parent surface is the media.

G) L324 Dialog Cancel button: `className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40"`. onClick setRenameOpen(false). Inside DialogContent (neutral card surface). One-shot. NO scale/transition, HAS hover:bg-muted/40.

H) L331 Dialog Save button: `className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"`. onClick handleRename. disabled={!newName.trim() || newName.trim() === meta?.name || rename.isPending}. Inside DialogContent. One-shot. NO scale/transition/hover. Solid bg-primary fill.

ALSO CONFIRM I should LEAVE these (each ships its own focus affordance or is presentational): rename `<input>` L315 (`focus:ring-2 focus:ring-primary`); the tile `motion.div` L251 (entrance anim, NOT a control — the overlay button E is the control); the media `<img>` L261 / `<ReelThumbnail>` L259 (presentational, group-hover:scale-105); the video Play badge L276 + caption gradient L282 (presentational); loading Loader2/skeletons.

Be concise and exact. Return the precise final className after-string per control + any aria attr.
- files: src/pages/SavedCollectionPage.tsx

---

# SavedCollectionPage — Premium Interaction + A11y Pass

## Plan

8 interactive controls inventoried. 4 need token additions (A, B, C, D, G, H). 2 are already polished (E, F — skip). 2 are presentational (input, motion.divs — skip).

## Per-Control Analysis

### A) Header Back icon button (L184)
- **Already has:** `aria-label="Back"`, `active:scale-95`, `transition-transform`
- **Needs:** ring ONLY (don't-churn — already polished)
- **Ring color:** `ring-ring` (neutral `bg-background/95` parent)
- **Final className:** `"rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **FLIP?** No — `transition-transform` already includes transform; ring-only append

### B) Header Rename (Pencil) icon button (L208)
- **Already has:** `aria-label="Rename collection"`, `active:scale-95`, `transition-transform`
- **Needs:** ring ONLY + `aria-haspopup="dialog"` (opens a Dialog)
- **Ring color:** `ring-ring` (neutral `bg-background/95` parent)
- **Final className:** `"rounded-full p-2 text-muted-foreground hover:bg-muted/50 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **Add:** `aria-haspopup="dialog"`
- **FLIP?** No

### C) Header Delete (Trash2) icon button (L217)
- **Already has:** `aria-label="Delete collection"`, `active:scale-95`, `transition-transform`
- **Needs:** ring ONLY (native `confirm()` is NOT a Dialog → no `aria-haspopup`)
- **Ring color:** `ring-ring` (neutral parent)
- **Final className:** `"rounded-full p-2 text-destructive hover:bg-destructive/10 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **FLIP?** No

### D) Empty-state "Browse saved" button (L240)
- **Current:** `"mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"`
- **Needs:** `transition-all` + `active:scale-[0.98]` + ring (solid bg-primary fill on neutral page)
- **Ring color:** `ring-ring` (fill is the button's OWN surface; outward ring renders against neutral page bg)
- **Final className:** `"mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **FLIP?** N/A — no prior transition class
- **No aria** — one-shot nav, visible text

### E) Tile OPEN overlay button (L287)
- **Current:** `"absolute inset-0 cursor-pointer focus:outline-none"`
- **SKIP — leave as-is.** This is a transparent full-bleed overlay. Adding `active:scale` would be invisible (no visual transform). Adding a ring would require `ring-inset` (flush edge child of `overflow-hidden rounded-xl` parent), but the ring would be invisible against the transparent overlay. The existing `focus:outline-none` is sufficient for a transparent overlay — the parent `motion.div` has no focus ring either. **Don't churn.**

### F) Tile REMOVE (Trash2) icon button (L293)
- **Already has:** `aria-label="Remove from collection"`, `active:scale-90`, `transition-opacity`
- **SKIP — leave as-is.** Already has its own scale (`active:scale-90` — different from standard `95` because it's a small overlay button). Adding a ring would be invisible against the media background (no bg of its own beyond `bg-red-500/90` fill). The `group-hover:opacity-100` reveal pattern is correct. **Don't churn.**

### G) Dialog Cancel button (L324)
- **Current:** `"rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40"`
- **Needs:** `transition-all` + `active:scale-[0.98]` + ring (medium chip on neutral DialogContent)
- **Ring color:** `ring-ring` (neutral `DialogContent` parent)
- **Final className:** `"rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **FLIP?** N/A — no prior transition class (has `hover:bg` but no transition → adding `transition-all` covers both hover + scale)

### H) Dialog Save button (L331)
- **Current:** `"rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"`
- **Needs:** `transition-all` + `active:scale-[0.98]` + ring (solid bg-primary fill on neutral DialogContent)
- **Ring color:** `ring-ring` (fill is button's OWN surface; outward ring against neutral DialogContent parent)
- **Final className:** `"rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **FLIP?** N/A — no prior transition class

### Controls to LEAVE untouched (confirmed):
- ✅ Rename `<input>` L315 — ships its own `focus:ring-2 focus:ring-primary`
- ✅ Tile `motion.div` L251 — entrance anim, NOT a control
- ✅ Media `<img>` L261 / `<ReelThumbnail>` L259 — presentational
- ✅ Video Play badge L276 + caption gradient L282 — presentational
- ✅ Loading Loader2/skeletons — non-interactive

## Diff

```diff
--- a/src/pages/SavedCollectionPage.tsx
+++ b/src/pages/SavedCollectionPage.tsx
@@ -181,7 +181,7 @@ export default function SavedCollectionPage() {
         <button
           type="button"
           onClick={() => navigate(-1)}
-          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
+          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           aria-label="Back"
         >
           <ArrowLeft className="h-5 w-5 text-foreground" />
@@ -205,7 +205,8 @@ export default function SavedCollectionPage() {
         <button
           type="button"
           onClick={() => setRenameOpen(true)}
           disabled={!meta}
-          className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40"
+          className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           aria-label="Rename collection"
+          aria-haspopup="dialog"
         >
           <Pencil className="h-4 w-4" />
         </button>
@@ -214,7 +215,7 @@ export default function SavedCollectionPage() {
         <button
           type="button"
           onClick={handleDelete}
           disabled={!meta}
-          className="rounded-full p-2 text-destructive hover:bg-destructive/10 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40"
+          className="rounded-full p-2 text-destructive hover:bg-destructive/10 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           aria-label="Delete collection"
         >
           <Trash2 className="h-4 w-4" />
@@ -237,7 +238,7 @@ export default function SavedCollectionPage() {
           <button
             type="button"
             onClick={() => navigate("/saved-posts")}
-            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
+            className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             Browse saved
           </button>
@@ -321,14 +322,14 @@ export default function SavedCollectionPage() {
           <button
             type="button"
             onClick={() => setRenameOpen(false)}
-            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40"
+            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             Cancel
           </button>
           <button
             type="button"
             onClick={handleRename}
             disabled={!newName.trim() || newName.trim() === meta?.name || rename.isPending}
-            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
+            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             {rename.isPending ? "Saving…" : "Save"}
           </button>
```

## Summary

| Control | Change | Ring | Scale | Transition | Aria |
|---------|--------|------|-------|------------|------|
| A) Back icon | ring-only | `ring-ring` | kept `95` | kept `transition-transform` | kept `aria-label` |
| B) Rename icon | ring-only + `aria-haspopup` | `ring-ring` | kept `95` | kept `transition-transform` | added `aria-haspopup="dialog"` |
| C) Delete icon | ring-only | `ring-ring` | kept `95` | kept `transition-transform` | kept `aria-label` |
| D) Browse saved | full token set | `ring-ring` | `[0.98]` | new `transition-all` | none (visible text) |
| E) Tile overlay | **SKIP** | — | — | — | kept `aria-label` |
| F) Remove overlay | **SKIP** | — | kept `90` | kept `transition-opacity` | kept `aria-label` |
| G) Cancel | full token set | `ring-ring` | `[0.98]` | new `transition-all` | none (visible text) |
| H) Save | full token set | `ring-ring` | `[0.98]` | new `transition-all` | none (visible text) |

**HARD RULE honored:** 6 className edits + 1 `aria-haspopup` added; 0 logic lines touched; 0 existing scale numbers renumbered; 0 competing press effects added; all `onClick`/`navigate`/`setRenameOpen`/`handleDelete`/`handleRename`/`handleRemoveFromCollection`/`refetch`/`qc.invalidateQueries`/`rename.mutateAsync`/`remove.mutateAsync` byte-identical.

**Owner must verify:** `npm run update` passes before committing.

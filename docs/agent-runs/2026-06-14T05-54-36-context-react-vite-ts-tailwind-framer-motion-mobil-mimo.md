# MiMo run — 2026-06-14T05:54:36.873Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

8 controls need tokens (A–H). 5 are ring-only appends on already-polished controls (A/B/C/F + aria-haspopup on B). 3 are fresh token additions (D/E/G/H). 1 accessibility fix: make tile-remove button F visible on keyboard focus. Zero logic lines touched.

## Precise per-control after-strings

**A) Back icon** — RING-ONLY. Neutral header → `ring-ring`.
```
className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**B) Rename (Pencil) icon** — RING-ONLY + `aria-haspopup="dialog"`. Neutral header → `ring-ring`.
```
className="rounded-full p-2 text-muted-foreground hover:bg-muted/50 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Add attr: `aria-haspopup="dialog"`

**C) Delete (Trash2) icon** — RING-ONLY. Neutral header → `ring-ring`. No `aria-haspopup` (native `confirm()`, not a `<Dialog>`).
```
className="rounded-full p-2 text-destructive hover:bg-destructive/10 active:scale-95 transition-transform min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**D) "Browse saved" pill** — FRESH. No hover → `transition-transform`. Saturated `bg-primary` fill on neutral empty-state column → `ring-ring`. Medium pill → `[0.98]`.
```
className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**E) Tile OPEN overlay** — Replace legacy `focus:outline-none`. Flush edge child of `overflow-hidden rounded-xl` → **`ring-inset`**. Parent surface is media → `ring-white/70`. No scale (transparent overlay — invisible).
```
className="absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

**F) Tile REMOVE (Trash2) icon** — RING-ONLY + a11y visibility fix. Keep existing `active:scale-90` + `transition-opacity` (don't churn). Over media → `ring-white/70`. Not flush edge (offset right-1.5/top-1.5) → outward. Add `focus-visible:opacity-100` so keyboard users can *see* the button (currently `opacity-0` with only `group-hover`/`group-active` reveal).
```
className="absolute right-1.5 top-1.5 z-10 rounded-full bg-red-500/90 p-2 text-white shadow-lg opacity-0 group-hover:opacity-100 group-active:opacity-100 focus-visible:opacity-100 transition-opacity active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

**G) Dialog Cancel** — FRESH. Has `hover:bg-muted/40` → `transition-all` (not `transition-transform`). Neutral DialogContent → `ring-ring`. Medium button → `[0.98]`.
```
className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**H) Dialog Save** — FRESH. No hover, solid `bg-primary` fill → `transition-transform`. Neutral DialogContent → `ring-ring`. Medium button → `[0.98]`.
```
className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

## Leave untouched (confirmed)

- Rename `<input>` L315 — ships `focus:ring-2 focus:ring-primary`
- Tile `motion.div` L251 — entrance anim, not a control (E is the control)
- `<img>` L261 / `<ReelThumbnail>` L259 — presentational, `group-hover:scale-105`
- Video Play badge L276 + caption gradient L282 — presentational
- Loading `Loader2` / skeletons — non-interactive

## Summary diff

| Control | Scale | Transition | Ring | aria added |
|---------|-------|-----------|------|------------|
| A Back | keep 95 | keep `transform` | append `ring-ring` | — |
| B Rename | keep 95 | keep `transform` | append `ring-ring` | `aria-haspopup="dialog"` |
| C Delete | keep 95 | keep `transform` | append `ring-ring` | — |
| D Browse | FRESH `[0.98]` | FRESH `transform` | FRESH `ring-ring` | — |
| E Overlay | none | none | FRESH `ring-inset` + `ring-white/70` | — |
| F Remove | keep 90 | keep `opacity` | append `ring-white/70` | — (+ `focus-visible:opacity-100`) |
| G Cancel | FRESH `[0.98]` | FRESH `all` | FRESH `ring-ring` | — |
| H Save | FRESH `[0.98]` | FRESH `transform` | FRESH `ring-ring` | — |

**Totals:** 5 ring-only appends, 3 fresh scale/ring additions, 1 `aria-haspopup`, 1 a11y opacity fix. 0 logic lines, 0 import changes, 0 onClick/navigate/mutation touched.

## Verify

Run `npm run update` (type-check + worker type-check + production build — must exit 0). Preview at 375/768/1280 to confirm: (a) focus ring visible on keyboard Tab through all 8 controls; (b) tile-remove button reveals on `:focus-visible` (not just hover); (c) rename dialog buttons scale on press; (d) overlay ring hugs tile edges inset (not overflowing the rounded corners).

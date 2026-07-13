# MiMo run — 2026-06-14T06:13:23.588Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Four mapped-template edits + one aria attr. No logic, no imports, no new components. All four are single-instance edits that propagate across N rendered items.

| # | Control | Action | Press | Transition | Ring | aria |
|---|---------|--------|-------|------------|------|------|
| A | Category chips | APPEND `active:scale-[0.97]` + ring | segmented `[0.97]` | kept `transition-all` (no flip) | OUTWARD `ring-ring` (neutral parent) | ADD `aria-pressed={activeCategory === c}` |
| B | Pack card-button | ring-ONLY | none (framer `whileTap` owns) | none needed | OUTWARD `ring-ring` (gradient fill ON neutral parent) | kept `aria-label` |
| C | Close (X) | ADD `transition-transform` + `scale-95` + ring | icon `95` | `transition-transform` (scale sole prop) | OUTWARD `ring-white/70` (parent IS the gradient header) | kept `aria-label` |
| D | Sticker emoji button | ring-ONLY | kept existing `active:scale-95` + `whileTap` double (don't churn) | kept `transition-all` | OUTWARD `ring-ring` (neutral `bg-card` parent) | kept `aria-label` |

**Skipped** (confirmed): shadcn Back Button L109; `<input type="search">` L140; banner `motion.div` L123; sheet backdrop L223; sheet panel L230; shadcn "Use in a story" L291; skeletons L173; empty-state L180; overlays — all presentational / ship own tokens.

---

## Diff — `src/pages/StickerStorePage.tsx`

### A) Category chips — L153 `<button>` (1 className edit + 1 aria attr)

```diff
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
+               aria-pressed={activeCategory === c}
                className={cn(
-                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
+                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeCategory === c
```

### B) Pack card-button — L196 `className` (ring-only, 1 className edit)

```diff
-                className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md text-left"
+                className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### C) Close (X) button — L249 `className` (1 className edit)

```diff
-                    className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
+                    className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

### D) Sticker emoji copy buttons — L274 `className` (ring-only, 1 className edit)

```diff
-                          className="aspect-square rounded-xl bg-secondary hover:bg-muted active:scale-95 flex items-center justify-center text-3xl transition-all"
+                          className="aspect-square rounded-xl bg-secondary hover:bg-muted active:scale-95 flex items-center justify-center text-3xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## Ring-inset vs outward rationale

**B (pack card):** The button has its own `overflow-hidden rounded-2xl`, but per the house rule, *an element's own overflow-hidden does NOT clip its own outward ring/box-shadow*. It is NOT a flush-edge child of a rounded overflow-hidden parent (it's a direct child of the grid cell with `gap-3`). → **Outward**, not inset.

**C (close button):** Absolutely not flush-edge — it's inside a flex row (`gap-3`) within the header. → **Outward**.

---

## Guard grep expectations (post-apply)

| Pattern | Expected |
|---------|----------|
| `focus-visible:ring` | 4 (all four controls) |
| `aria-pressed` | 1 (category chips only) |
| `active:scale-[0.97]` | 1 new (A) |
| `active:scale-95` | 2 kept (C new, D kept — D's existing 95 not renumbered) |
| `ring-inset` | 0 |
| `ring-white/70` | 1 (C only — over gradient header) |
| `transition-transform` | 1 new (C) |
| `whileTap` | 2 kept (B, D — untouched) |
| FLIPs | 0 |

## Owner verification

1. Apply the 4 edits above (one file, 4 spots).
2. Run `npm run update` — must exit 0 (0 type errors + build passes).
3. Preview at 375/768/1280: Tab through the page → category chips should show a ring and compress on press (aria-pressed toggles on the active one); pack cards should show a ring on keyboard focus (no visual change on tap — framer `whileTap` unchanged); open a pack → Close (X) should scale + ring over the gradient header; sticker emojis should show a ring on focus (existing press double untouched); "Use in a story" / Back / search all behave as before.

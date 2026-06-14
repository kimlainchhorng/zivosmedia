# MiMo run — 2026-06-14T01:15:19.515Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 25 — ConciergePage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO new framer props (do NOT add whileTap — out of scope; if a press-scale is unreliable, FLAG it). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:opacity (color/opacity fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring. If a raw control has active:scale but NO transition utility (scale snaps), ADD transition-transform. If a raw control has transition-colors AND hover:bg-* AND we are adding active:scale, FLIP transition-colors -> transition-all (transition-colors won't ease a transform).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- framer-motion motion.button WITH whileTap -> focus RING ONLY (CSS active:scale is DEAD under motion's inline transform). motion.button WITHOUT whileTap -> CSS active:scale is LIVE.
- Non-interactive div/span/img with no onClick -> NOTHING. Click-catcher backdrop/dismiss-on-click elements (e.g. <main onClick={cancel}>) -> leave alone (the explicit Cancel button provides the accessible dismiss).
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, not its OWN box-shadow/ring. ring-inset is needed when the focusable control sits INSIDE a SEPARATE overflow-hidden rounded ancestor (its outward ring would be clipped), OR a tight grid gutter would bleed.
- Toggle/selection controls whose pressed-state is conveyed ONLY by background also get aria-pressed (display-only). Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label.

PAGE: src/pages/ConciergePage.tsx (316 lines, /concierge, public, NOT ProtectedRoute). AI trip orchestrator: type a sentence -> 3-step deep-link plan.

SKIP (confirm): voice/mic shadcn <Button> L206 (ships tokens, already aria-label + aria-pressed={listening}); Plan/Send shadcn <Button> L218 (ships tokens); search <Input> L195 (shadcn ships focus); <main onClick={cancelAutorun}> L160 (click-catcher tap-anywhere-to-cancel — leave alone; the explicit Cancel button = control B provides accessible dismiss); all presentational divs/labels/listening-indicator/banner-wrapper motion.div (no onClick).

FOUR controls:

(A) Back button, L142-148 — RAW <button type="button">, onClick={() => navigate(-1)}, aria-label="Back" ALREADY. className = "w-10 h-10 rounded-xl bg-muted flex items-center justify-center". Icon-only (ChevronLeft). NO transition, NO scale, NO ring, NO hover-bg. In sticky header `flex items-center gap-3`, NOT overflow-hidden.
Q-A: add `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon tier; transition-transform because no hover-bg -> pure icon-scale), normal OUTWARD ring (rounded-xl gives the ring rounded corners; header not overflow-hidden), aria-label already present (no change)? Confirm.

(B) Cancel autorun button, L178-186 — RAW <button type="button">, onClick={(e) => { e.stopPropagation(); cancelAutorun(); }}, visible text "Cancel" = accessible name. className = "text-[11px] font-bold text-emerald-700 px-2 py-1". NO rounding, NO transition, NO scale, NO ring, NO hover-color. Sits in the autorun banner motion.div `rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-3` (LIGHT emerald bg, NOT overflow-hidden).
Q-B1: add `transition-transform active:scale-[0.97] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — small text-link tier [0.97]; transition-transform (no hover-color -> pure scale); rounded-md added so the ring has a shape around the px-2 py-1 box; normal OUTWARD ring (banner not overflow-hidden, fits within p-3); visible text -> NO aria-label, NO aria-pressed (it's an action/dismiss, not a toggle)? Confirm — and is rounded-md the right radius (vs rounded-sm) for a px-2 py-1 text button?
Q-B2: ring color — the banner is LIGHT emerald (bg-emerald-500/10), so ring-ring (which is --ring = pure black in this repo) is plenty visible here -> keep ring-ring (NOT the dark-overlay ring-white/70 exception). Confirm.

(C) Example chips, L237-244 — RAW <button type="button">, .map over EXAMPLES, onClick={() => submit(s)}, visible example text = accessible name. className = "rounded-full bg-muted hover:bg-muted/70 px-2.5 py-1 text-[11px] font-bold text-foreground transition-colors". Has transition-colors + hover:bg-muted/70. Parent `flex flex-wrap gap-1.5`, NOT overflow-hidden. These submit a query (action), NOT a toggle.
Q-C: FLIP transition-colors -> transition-all (so the new active:scale eases alongside the hover:bg fade) + append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (chip tier [0.97]); normal OUTWARD ring (flex-wrap, not overflow-hidden); visible text -> NO aria-label; NO aria-pressed (action, not toggle)? Confirm the transition-colors->transition-all flip.

(D) Plan step rows, L276-301 — motion.button WITH whileTap={{ scale: 0.99 }}, onClick={() => navigate(s.to)}, visible step title/detail text = accessible name. className (template literal) = `w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors touch-manipulation ${i > 0 ? "border-t border-border/40" : ""}`. Has transition-colors + hover:bg-muted/40 + whileTap (framer owns the scale). These are full-width rows that are DIRECT children of a SEPARATE container `div className="rounded-2xl border border-border/50 bg-card overflow-hidden"` (L264) — the rows fill it edge-to-edge.
Q-D1: motion.button WITH whileTap -> focus RING ONLY (no active:scale — dead under framer's inline transform). Keep transition-colors as-is (it eases the hover:bg fade; framer owns the scale so we do NOT need transition-all and do NOT flip). Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm.
Q-D2: ring-inset OR outward? The rows are full-width children INSIDE the overflow-hidden rounded-2xl container — a 2px OUTWARD ring's left/right edges (and the first/last rows' top/bottom near the rounded corners) get CLIPPED by the container's overflow-hidden. So I lean `focus-visible:ring-inset` (SavedPostsPage/ChatWallpapers precedent: focusable control inside a separate overflow-hidden rounded card). Confirm ring-inset — and confirm NO aria-label (visible text) and NO aria-pressed (nav action, not toggle).

============================================================
DELIVERABLE: For each control (A)(B)(C)(D) give the EXACT final className string + any attrs. Note where you DIVERGE from my proposals and why. Resolve B1/C/D2 explicitly. Flag any keyboard/logic gaps for the owner (out of my scope). Keep it tight.
- files: src/pages/ConciergePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan (4 controls, 4 className edits, 0 new attributes)

**File:** `src/pages/ConciergePage.tsx`

All four proposals confirmed. Zero divergences. Only correction: **B1** — `rounded-md` is correct for `px-2 py-1` (6px radius frames the small text box cleanly; `rounded-sm` at 4px would feel too tight for a readable text button).

---

## Exact diffs

### (A) Back button — L145

```diff
-            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
+            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** icon tier `scale-95`; `transition-transform` (no hover-bg → pure icon-scale); `rounded-xl` gives ring rounded corners; header not overflow-hidden → outward ring; `aria-label="Back"` already present → no attr change.

---

### (B) Cancel autorun — L183

```diff
-              className="text-[11px] font-bold text-emerald-700 px-2 py-1"
+              className="text-[11px] font-bold text-emerald-700 px-2 py-1 rounded-md transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** small text-link tier `[0.97]`; `transition-transform` (no hover-color); `rounded-md` added so ring has shape around `px-2 py-1` box; normal outward ring (banner not overflow-hidden, `p-3` gives clearance); light emerald bg → `ring-ring` (pure black) is high-contrast ✓; visible "Cancel" text → no `aria-label`; action/dismiss → no `aria-pressed`.

---

### (C) Example chips — L240

```diff
-                className="rounded-full bg-muted hover:bg-muted/70 px-2.5 py-1 text-[11px] font-bold text-foreground transition-colors"
+                className="rounded-full bg-muted hover:bg-muted/70 px-2.5 py-1 text-[11px] font-bold text-foreground transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** chip tier `[0.97]`; **`transition-colors` → `transition-all` FLIP** (the `hover:bg-muted/70` fade must ease alongside the new `active:scale`); `rounded-full` gives ring shape; `flex flex-wrap gap-1.5` not overflow-hidden → outward ring; visible text → no `aria-label`; action (submits query) → no `aria-pressed`.

---

### (D) Plan step rows — L279

```diff
-                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors touch-manipulation ${
+                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                         i > 0 ? "border-t border-border/40" : ""
```

**Rationale:** `motion.button` WITH `whileTap={{ scale: 0.99 }}` → CSS `active:scale` is dead under framer's inline transform → **ring ONLY**; keep `transition-colors` as-is (eases `hover:bg-muted/40`, no transform to add); **`ring-inset`** because the rows are full-width children inside a separate `overflow-hidden rounded-2xl` container (L264) — an outward ring's edges get clipped; `ring-ring` (black) visible on white `bg-card` ✓; visible text → no `aria-label`; nav action → no `aria-pressed`.

---

## Summary table

| Control | Tier | `active:scale` | Transition | Ring | Attrs added |
|---------|------|----------------|------------|------|-------------|
| A — Back | icon `scale-95` | ✓ | `transition-transform` | outward | 0 |
| B — Cancel | small text `[0.97]` | ✓ | `transition-transform` | outward | 0 |
| C — Chips | chip `[0.97]` | ✓ | `transition-colors`→`transition-all` | outward | 0 |
| D — Step rows | wide/`whileTap` | ✗ (ring only) | keep `transition-colors` | **inset** | 0 |

**Diff footprint:** 4 ins / 4 del, +0 net. All className-only. Zero new attributes.

---

## Owner flags (NOT fixed — out of scope)

1. **Plan step rows' `whileTap={{ scale: 0.99 }}`** — the 0.99 scale is nearly imperceptible (1% shrink). Consider bumping to 0.98 or 0.97 for meaningful press feedback.
2. **Sub-44px tap targets (established repo compact pattern):** Cancel button `px-2 py-1` ~24px tall; example chips `py-1` ~24px. Below the 44px WCAG target, but this is a repo-wide pattern, not page-specific.
3. **No keyboard gaps flagged** — all 4 controls are raw `<button>` or `motion.button` (renders real `<button>`), natively focusable. The added rings are functional.

---

## Verify

Run before marking done:
```bash
npm run update
```

Must pass (type-check + worker type-check + production build) with 0 errors.

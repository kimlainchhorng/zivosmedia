# MiMo run — 2026-06-14T10:55:50.110Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/AiContentSuite.tsx (302-line merchant AI reel-generation studio inside <AppLayout>: Step 1 product-photo uploader (up to 3, hidden file <input>, remove-photo X, add-photo dropzone), Step 2 mood-grid + suggested music-track list, Generate button with isGenerating Progress, animated preview collage (framer-motion), Save Draft (blob download) + Post as Reel (navigate). useState/useRef; shadcn Button/Card/Progress; framer-motion motion/AnimatePresence; sonner toast). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useState, useRef, setState, onChange, disabled, blob download byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardContent/Progress (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF. FLIP transition-colors->transition-all when adding a scale to an element that ALSO has a hover color/border pseudo.
- DON'T-CHURN: control ALREADY has whileTap + transition-all -> add ring (+aria) ONLY; KEEP whileTap, do NOT add a competing CSS active:scale, do NOT downgrade transition-all.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle (marks EXACT selected value). aria-expanded on a disclosure.

FOUR edits applied — confirm CORRECT or NEEDS-FIX:

A) L125 remove-photo X button — icon-only X glyph, absolute top-1 right-1 over an <img> inside a `relative rounded-xl overflow-hidden aspect-square` parent (button is INSET top-1 right-1, NOT flush edge child). Before className: `absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center` (no hover/transition/scale/ring/aria). ADDED aria-label="Remove photo" + appended `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. (icon tier scale-95; no hover pseudo on element -> transition-transform; inset NOT flush -> OUTWARD ring-ring, NOT ring-inset.)

B) L137 add-photo dropzone button — visible text "Add Photo" (NO aria-label). Before className: `aspect-square rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors`. FLIPPED transition-colors->transition-all (has hover:border-primary/50 pseudo on element) + added `active:scale-[0.97]` (card-tile tier) + ring. After: `aspect-square rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

C) L163 mood motion.button — DON'T-CHURN (already whileTap={{scale:0.95}} + transition-all). Before className: `rounded-2xl p-3 text-center border-2 transition-all ${selectedMood===m.id ? "border-primary bg-primary/5" : "border-border/40 bg-card"}`. ADDED aria-pressed={selectedMood === m.id} + ring into static part: `rounded-2xl p-3 text-center border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${...}`. KEPT whileTap 0.95, KEPT transition-all, NO competing CSS scale.

D) L184 music-track row button — full-width WITH own surface (bg-muted/30 or bg-primary/10). Before className: `w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all text-sm ${selectedTrack===i ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"}`. ADDED aria-pressed={selectedTrack === i} + `active:scale-[0.98]` (full-width with own surface) + ring; KEPT transition-all (hover:bg-muted/50 pseudo present). After: `w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-[0.98] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${...}`.

SKIP confirmed: L94 Back shadcn Button (already aria-label="Back"); L210 Generate shadcn Button; L280 "Save Draft" shadcn Button (onClick blob download = logic); L290 "Post as Reel" shadcn Button (onClick navigate = logic); L120 hidden native file <input> (onChange logic, hidden); L205 Progress shadcn; all preview-collage motion.div (presentational, no onClick); all lucide icons (decorative); all text.

KEY QUESTIONS: (1) all FOUR edits correct (tiers, FLIP on B, DON'T-CHURN on C, scale-[0.98] on D, OUTWARD ring on A inset-not-flush)? (2) did I miss any raw interactive control or mis-tier any? Be concise and exact; return precise final className after-strings + aria attrs.
- files: src/pages/app/shop/AiContentSuite.tsx

---

## Audit Result: ALL FOUR EDITS CORRECT ✅ — Zero fixes needed

### (1) Per-edit verification

| Edit | Control | Tier | Transition | Ring | Aria | Verdict |
|------|---------|------|------------|------|------|---------|
| **A** L125 | remove-photo X `<button>` | icon-only → `scale-95` ✅ | `transition-transform` (no hover pseudo on element) ✅ | OUTWARD `ring-ring` (inset by `top-1 right-1` = 4px inside parent — ring's 2px outward stays inside parent's bounds, not clipped by `overflow-hidden`) ✅ | `aria-label="Remove photo"` (icon-only) ✅ | **CORRECT** |
| **B** L137 | add-photo dropzone `<button>` | card-tile (aspect-square in grid) → `scale-[0.97]` ✅ | FLIP `transition-colors`→`transition-all` (`hover:border-primary/50` pseudo on element + adding scale) ✅ | OUTWARD `ring-ring` (neutral parent CardContent) ✅ | none (visible text "Add Photo") ✅ | **CORRECT** |
| **C** L163 | mood `motion.button` | DON'T-CHURN: already `whileTap 0.95` + `transition-all` → ring+aria ONLY ✅ | KEPT `transition-all`, KEPT `whileTap`, NO competing CSS `active:scale` ✅ | OUTWARD `ring-ring` (neutral parent) ✅ | `aria-pressed={selectedMood === m.id}` (single-select, exact value) ✅ | **CORRECT** |
| **D** L184 | music-track `<button>` | full-width WITH own surface → `scale-[0.98]` ✅ | KEPT `transition-all` (has `hover:bg-muted/50` on element; already `transition-all`, no flip) ✅ | OUTWARD `ring-ring` ✅ | `aria-pressed={selectedTrack === i}` (single-select, exact value) ✅ | **CORRECT** |

### (2) Missed controls scan — NONE

Re-scanned all 302 lines. Every remaining interactive surface is correctly **SKIPPED**:

- **L94** Back `<Button>` — shadcn, already `aria-label="Back"` ✅
- **L120** hidden `<input type="file">` — native, hidden, `onChange` is logic ✅
- **L210** Generate `<Button>` — shadcn, `disabled` + visible text ✅
- **L280** "Save Draft" `<Button>` — shadcn, `onClick` blob-download is logic ✅
- **L290** "Post as Reel" `<Button>` — shadcn, `onClick` navigate is logic ✅
- **L205** `<Progress>` — shadcn ✅
- All preview-collage `motion.div` — presentational, no `onClick` ✅
- All scene-breakdown `<div>` — plain text, no `onClick` ✅
- All lucide icons — decorative ✅
- All text elements ✅

**No raw `<button>`, `<a>`, or `onClick`/`cursor-pointer` divs missed.**

### (3) Final after-strings

**A)** `absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Remove photo"`

**B)** `aspect-square rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**C)** `rounded-2xl p-3 text-center border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedMood === m.id ? "border-primary bg-primary/5" : "border-border/40 bg-card"}` + `aria-pressed={selectedMood === m.id}` (whileTap 0.95 kept unchanged)

**D)** `w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all active:scale-[0.98] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedTrack === i ? "bg-primary/10 border border-primary/30" : "bg-muted/30 hover:bg-muted/50"}` + `aria-pressed={selectedTrack === i}`

### (4) Guard-grep tally

| Metric | Count |
|--------|-------|
| className edits | **4** |
| New aria attrs | **4** (1 `aria-label` + 3 `aria-pressed`; 0 `aria-expanded`) |
| `focus-visible:ring` | **4** (all) |
| `ring-ring` OUTWARD | **4** |
| `ring-inset` | **0** |
| `active:scale-95` new | **1** (A, icon) |
| `active:scale-[0.97]` new | **1** (B, card-tile) |
| `active:scale-[0.98]` new | **1** (D, wide+surface) |
| FLIPs | **1** (B: `transition-colors`→`transition-all`) |
| DON'T-CHURN preserved | **1** (C: whileTap + transition-all kept) |
| `disabled` touched | **0** |
| Logic lines touched | **0** |

### (5) Verify

File is ready as-is in the working tree. Run `npm run update` to confirm green gate before marking done. No diff to apply — the working tree already contains all four edits.

# MiMo run — 2026-06-14T10:18:36.029Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopTrainingPage.tsx (233-line merchant "Training" page inside <AppLayout title="Training" hideHeader>; useAuth + react-query useQuery "shop-training" (feedback_submissions category=shop_training); handleSave + handleQuickLog via supabase.functions.invoke("shop-ops-record-submit"); a quick-log form with a single-select status chip group; DEFAULT_MODULES quick-log rows; framer-motion AnimatePresence). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, functions.invoke, react-query keys, disabled, prompt(), setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn AppLayout. LEAVE raw native form fields with their existing focus ring.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring. An OUTWARD ring on a control with its OWN tinted/gradient fill STILL renders against the neutral PARENT → ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF (or an existing transition-colors animating such a change ON ITSELF).
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border pseudo ON ITSELF → use transition-all (FLIP). A render-driven conditional (ternary) selected-bg with NO transition utility and NO hover/active pseudo is NOT a FLIP trigger → keep transition-transform (preserve the author's instant color snap).
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

SIX edits applied — confirm each CORRECT or NEEDS-FIX:

A) L115 BACK icon button — was `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center` (icon-only ArrowLeft; navigate(-1); NO hover/transition/scale/ring; NO aria) → ADDED aria-label="Go back" + active:scale-95 + transition-transform (scale sole prop → NOT flip) + ring. Final: `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back".

B) L119 PLUS/open-form icon button — was `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center` (icon-only Plus; setShowForm(true); own tinted fill; NO aria) → ADDED aria-label="Log training record" + active:scale-95 + transition-transform + ring (OUTWARD ring-ring against neutral header despite own bg-primary/10). Final: `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Log training record".

C) L150 X-CLOSE icon button — was a BARE `<button onClick={() => setShowForm(false)}>` with NO className (icon-only X glyph; in the form card header bg-card) → ADDED className from scratch: rounded-full (tight ring trace, no padding → layout byte-identical) + aria-label="Close" + active:scale-95 + transition-transform + ring. Final className: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Close".

D) L158 STATUS chips (completed/in_progress/not_started) — was `cn("px-3 py-1 rounded-full text-xs font-medium border", form.status === s ? "bg-ig-gradient text-white border-primary" : "border-border bg-muted/40")` (PERSISTENT SINGLE-SELECT status toggle; setForm status; visible text; **NO existing transition, NO hover/active pseudo — only a render-driven ternary selected-bg**; NO scale/ring/aria) → ADDED aria-pressed={form.status === s} (single-select segmented toggle) + chip-tier active:scale-[0.97] + transition-transform (**NOT a FLIP: there is NO hover/active pseudo ON ITSELF and NO existing transition-colors → the ternary selected-bg is render-driven and stays instant, faithful to the author; scale is the sole CSS-animated prop → transition-transform**) + ring (OUTWARD ring-ring against the bg-card form parent). Final base: `px-3 py-1 rounded-full text-xs font-medium border transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional + aria-pressed={form.status === s}. **CONFIRM: transition-transform (NOT transition-all/FLIP) is correct here because the chip has no hover/active color pseudo and no prior transition-colors — distinct from chips that already shipped transition-colors. Or should it be transition-all to also smooth the ternary selected-bg?**

E) L167 SAVE button (form) — was `w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50` (visible text; handleSave; disabled={saving}; w-full with own gradient surface; has disabled:opacity-50) → ADDED active:scale-[0.98] (full-width WITH own surface tier) + transition-transform (scale sole INTERACTIVE prop; disabled:opacity is a static state pseudo, not interactive → NOT flip) + ring; NO aria (visible text). Final: `w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

F) L180 STANDARD-MODULE quick-log rows — was `w-full flex items-center gap-3 px-3.5 py-3 hover:bg-muted/30 text-left transition-colors` (full-width row button; handleQuickLog(mod) which calls prompt(); visible text = module title; **hover:bg-muted/30 pseudo ON ITSELF**; transition-colors; **NO base bg fill — transparent, shows the container; it is a FLUSH EDGE CHILD of the parent `rounded-xl border border-border/30 overflow-hidden divide-y divide-border/20` container at L178**; NO scale/ring/aria) → ADDED active:scale-[0.99] (bare full-width row, NO own surface tier) + FLIP transition-colors→transition-all (hover:bg-muted/30 pseudo ON ITSELF + new scale) + **ring-inset** (the row is a flush edge child of a rounded OVERFLOW-HIDDEN parent → an outward ring would be clipped → focus-visible:ring-inset) + ring; NO aria (visible text, and it's an ACTION not a toggle → no aria-pressed). Final: `w-full flex items-center gap-3 px-3.5 py-3 hover:bg-muted/30 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`. **CONFIRM: (1) scale-[0.99] bare-full-width-row tier correct (no base bg fill — hover:bg only); (2) ring-inset correct (flush edge child of rounded overflow-hidden parent); (3) FLIP transition-colors→transition-all correct (real hover:bg pseudo ON ITSELF + new scale); (4) NO aria correct (visible text, action not toggle).**

ALSO CONFIRM I should LEAVE: L152 + L154 + L165 raw native `<input>` fields (employee name / module title / date — they ALREADY have `focus:ring-1 focus:ring-primary/30`; house standard = LEAVE native form fields, do NOT swap to focus-visible:ring-ring, do NOT add press/scale); AppLayout shell; the 3 stats cards L132 (presentational divs, no onClick); all motion.div wrappers with no onClick (form L142, list items L204 — animation only); all lucide icons (decorative); the module-row avatar div L182 + record-row avatar div L206 (presentational); the h1 + all <p> text; the loading + empty-state. No clickable divs with onClick beyond those edited.

Be concise and exact. Return the precise final className after-string for each of A–F + every aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) D — transition-transform (NOT transition-all/FLIP) for the no-prior-transition single-select status chip (render-driven ternary bg, no hover/active pseudo) — correct? (2) F — scale-[0.99] bare-row tier + ring-inset (flush child of rounded overflow-hidden container) + FLIP transition-all (real hover:bg pseudo) — all correct? (3) E — transition-transform despite disabled:opacity-50 — correct? (4) the 3 native inputs L152/154/165 — confirm LEAVE with existing focus:ring-1.
- files: src/pages/app/shop/ShopTrainingPage.tsx

---

## Audit — all six edits confirmed correct. No missed controls.

### A) L115 BACK icon button ✅ CORRECT
```
className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Go back"
```
Icon-only, no prior transition, no hover/active pseudo → `transition-transform` (scale sole prop). `scale-95` icon tier. OUTWARD `ring-ring` against neutral `bg-background/80` header.

### B) L119 PLUS icon button ✅ CORRECT
```
className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Log training record"
```
Same logic as A. Own tinted `bg-primary/10` fill doesn't affect ring color — OUTWARD ring renders against the neutral header parent → `ring-ring`.

### C) L150 X-CLOSE icon button ✅ CORRECT
```
className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Close"
```
Bare button → className from scratch. `rounded-full` + no padding = tight ring trace, layout byte-identical. Ring against `bg-card` form parent.

### D) L158 STATUS chips ✅ CORRECT
```
aria-pressed={form.status === s}
base: "px-3 py-1 rounded-full text-xs font-medium border transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
conditional: form.status === s ? "bg-ig-gradient text-white border-primary" : "border-border bg-muted/40"
```

**Your D-question answered: `transition-transform` (NOT `transition-all`) is CORRECT.** The chip has zero hover/active pseudo and zero prior transition utility. The ternary `bg-ig-gradient` ↔ `bg-muted/40` swap is a render-driven conditional with no CSS transition — that's the author's instant snap. Per the house standard: *"A render-driven conditional (ternary) selected-bg with NO transition utility and NO hover/active pseudo is NOT a FLIP trigger → keep transition-transform."* Using `transition-all` would cause a 150ms cross-fade between the gradient and the muted fill, which looks wrong. The instant color swap is intentional UX. `transition-transform` animates only the scale press.

`aria-pressed` correct for persistent single-select segmented toggle. `scale-[0.97]` chip tier. OUTWARD `ring-ring` against `bg-card` form.

### E) L167 SAVE button ✅ CORRECT
```
className="w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Your E-question answered: `transition-transform` despite `disabled:opacity-50` is CORRECT.** `disabled:opacity-50` is a static **disabled-state** pseudo-class (`:disabled`), NOT an interactive `hover:`/`active:` change. Scale is the sole interactive animated prop → `transition-transform`, not a flip. Same pattern confirmed on 100+ prior slices.

`scale-[0.98]` full-width-WITH-own-surface tier. OUTWARD `ring-ring` against `bg-card` form parent (not against the gradient fill). No aria needed (visible text).

### F) L180 STANDARD-MODULE quick-log rows ✅ CORRECT
```
className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-muted/30 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
```

**Your F-question — all four sub-points confirmed:**
1. **`scale-[0.99]` bare-full-width-row tier** ✅ — no base bg fill (transparent), only `hover:bg` → bare row tier.
2. **`ring-inset`** ✅ — flush edge child of `rounded-xl overflow-hidden` container at L178 → outward ring would be clipped.
3. **FLIP `transition-colors`→`transition-all`** ✅ — `hover:bg-muted/30` is a real hover pseudo ON ITSELF + new scale → both need to animate.
4. **No aria** ✅ — visible text, action (quick-log → `prompt()`), not a toggle → no `aria-label`, no `aria-pressed`.

### Leave list ✅ ALL CORRECT
- **L152 + L154 + L165 native `<input>`** — existing `focus:ring-1 focus:ring-primary/30` → LEAVE. House standard: don't touch native form field focus rings.
- **AppLayout shell** — SKIP.
- **Stats cards L132** — presentational `<div>`s, no `onClick`. Leave.
- **`motion.div` wrappers** (form L142, list items L204) — animation only, no `onClick`. Leave.
- **All lucide icons** — decorative. Leave.
- **Avatar divs L182 + L206** — presentational colored circles, no `onClick`. Leave.
- **h1 + all `<p>`/`<span>`** — non-interactive text. Leave.
- **Loading + empty-state** — non-interactive. Leave.

### Missed controls scan: **NONE**

Scanned the full file for any `onClick`, `<a href>`, `cursor-pointer`, `role="button"`:
- 6 `<button>`s — all six covered (A–F)
- 3 `<input>`s — all three left (native form fields)
- 0 `<a>` tags
- 0 clickable divs
- 0 `cursor-pointer` or `role="button"` elements

### Guard grep summary
| Metric | Count |
|--------|-------|
| className edits | 6 (A–B: append, C: from-scratch, D: append to cn base, E: append, F: FLIP+append) |
| New aria-label | 3 (A, B, C — all icon-only) |
| New aria-pressed | 1 (D — single-select toggle) |
| focus-visible:ring | 6 (all) |
| ring-ring | 6 (all OUTWARD — A/B against header, C/D/E against bg-card, F is ring-inset) |
| ring-inset | 1 (F only — flush child of overflow-hidden) |
| FLIPs | 1 (F — transition-colors→transition-all) |
| active:scale-95 | 3 (A, B, C — icon-only) |
| active:scale-[0.97] | 1 (D — chip) |
| active:scale-[0.98] | 1 (E — full-width own surface) |
| active:scale-[0.99] | 1 (F — bare row) |
| Logic lines touched | 0 |

**No diff needed — the file as provided already has all six edits applied correctly. No changes required.**

### Owner verify/deploy
Run `npm run update` (type-check + worker type-check + production build — must pass true exit 0). This page hits live Supabase reads (auth/RLS-gated) + `shop-ops-record-submit` edge function, so runtime preview requires a signed-in store owner.

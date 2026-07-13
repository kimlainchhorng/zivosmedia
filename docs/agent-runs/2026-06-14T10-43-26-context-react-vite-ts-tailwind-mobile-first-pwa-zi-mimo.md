# MiMo run — 2026-06-14T10:43:26.393Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/SandboxModePage.tsx (290-line admin Meta CAPI sandbox tester inside <AppLayout>: pick a transaction type (truck_sale | ride), enter amount/currency, run a test that inserts a truck_sales row (DB trigger fires Meta Purchase) or fires sendMetaConversionEvent directly; results log; useState + supabase insert + sendMetaConversionEvent; framer-motion motion.div/AnimatePresence). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, onChange, navigate, supabase, insert, sendMetaConversionEvent, useState, setState, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardContent/Input/Label/Badge (own tokens).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/cards active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF.
- FLIP rule: ADDING a new scale to a control that ALSO has a hover/active color/bg/border pseudo ON ITSELF → must be transition-all.
- Render-driven ternary refinement: a render-driven conditional selected-bg with NO transition utility and NO hover/active pseudo is NOT a flip trigger → keep transition-transform. But if the element already carries transition-all AND a hover pseudo on itself, keep transition-all.
- Adding a className FROM SCRATCH to a bare icon button (NO className attribute) IS in-scope (a className edit, not logic). Use rounded-full + scale + ring with no padding so layout stays byte-identical.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

THREE edits applied — confirm CORRECT or NEEDS-FIX:

1) L128 BACK button — was BARE `<button type="button" onClick={() => navigate(-1)}>` with NO className (icon-only ArrowLeft glyph; in sticky `bg-background/95 backdrop-blur-md border-b` header; NO hover/transition/scale/ring/aria) → ADDED className-from-scratch: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back". (icon tier scale-95; transition-transform = scale sole prop, no hover pseudo on element → NOT flip; OUTWARD ring-ring against bg-background header.)

2) L157 "Truck Sale" type-selector button — raw `<button>` single-select toggle, className was `p-4 rounded-2xl border-2 transition-all ${testType === "truck_sale" ? "border-primary bg-primary/5" : "border-border/40 hover:border-border"}` (ALREADY transition-all; has a `hover:border-border` pseudo on the element itself + a render-driven conditional bg). → ADDED `active:scale-[0.97]` (card/chip tier) + ring + aria-pressed={testType === "truck_sale"}; KEPT transition-all (justified: hover:border-border pseudo on the element). Final: `p-4 rounded-2xl border-2 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${...}`.

3) L169 "Ride" type-selector button — identical treatment, aria-pressed={testType === "ride"}.

ALSO CONFIRM I should LEAVE/SKIP: L190/L201 shadcn `<Input>` (amount/currency, own tokens — onChange is logic, do NOT touch); L211 "Run Test" shadcn `<Button disabled={running || !amount}>` (own tokens, visible text); L230 "Open Meta Events Manager" shadcn `<Button variant="outline">` (own tokens, onClick window.open = logic, visible text); all `<Label>` (shadcn); all `<Badge>` (shadcn TEST + status chips); all Card/CardContent (shadcn); all motion.div/AnimatePresence (animation only, no onClick); the results-log rows (presentational, no onClick); all lucide icons (decorative); h1 + all <p>/<span> text. No other raw <button>, no raw <a>, no onClick divs, no role="button"/cursor-pointer divs.

KEY QUESTIONS: (1) Back button className-from-scratch + scale-95 + transition-transform + ring + aria-label="Go back" correct? (2) the two type-selector toggles — active:scale-[0.97] card tier + KEEP transition-all (hover:border-border pseudo on element) + ring + aria-pressed on exact selected value — correct, or should they be a different scale tier / a FLIP concern? (3) all shadcn correctly SKIPPED, any raw interactive control missed? Be concise and exact; return precise final className after-strings + aria attrs.
- files: src/pages/app/shop/SandboxModePage.tsx

---

## Audit: CORRECT ✅ (all 3 edits) — zero fixes needed

**3 edits, 3 new aria, 0 logic lines touched.** All three match the house standard exactly.

---

### Edit-by-edit

| # | Control | Edit | Verdict |
|---|---------|------|---------|
| **1** | L128 BACK (bare `<button>`, no className) | **className-from-scratch:** `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"` | ✅ `rounded-full` no padding → layout identical; `scale-95` icon tier; `transition-transform` (scale sole prop, no hover pseudo → NOT flip); OUTWARD `ring-ring` against `bg-background/95` header; `aria-label` icon-only. |
| **2** | L157 "Truck Sale" toggle | **Modified:** added `active:scale-[0.97]` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-pressed={testType === "truck_sale"}`; **KEPT** `transition-all` | ✅ `hover:border-border` pseudo ON THE ELEMENT justifies keeping `transition-all` (no transition change → NOT a FLIP); `scale-[0.97]` card tier; OUTWARD ring against neutral parent; `aria-pressed` on exact selected value for single-select. |
| **3** | L169 "Ride" toggle | Identical treatment, `aria-pressed={testType === "ride"}` | ✅ Same reasoning as #2. |

### Guard-grep tally

| Metric | Count |
|--------|-------|
| className edits | 3 (1 from-scratch + 2 modified) |
| new aria | 3 (1 `aria-label` + 2 `aria-pressed`) |
| `focus-visible:ring` | 3 |
| `ring-ring` | 3 (all OUTWARD) |
| `ring-inset` | 0 |
| `aria-expanded` | 0 |
| `active:scale-95` new | 1 (#1 icon-only) |
| `active:scale-[0.97]` new | 2 (#2/#3 card/chip) |
| FLIPs | 0 (`transition-all` already present on #2/#3; `transition-transform` on #1 is NOT a flip) |
| non-FLIP `transition-transform` | 1 (#1) |
| `disabled` touched | 0 |
| logic lines touched | 0 |

### SKIPs confirmed ✅

- **L190/L201** shadcn `<Input>` — own tokens, `onChange` = logic. **SKIP.**
- **L211** "Run Test" shadcn `<Button disabled={running || !amount}>` — own tokens, visible text. **SKIP.**
- **L230** "Open Meta Events Manager" shadcn `<Button variant="outline">` — own tokens, visible text, `window.open` = logic. **SKIP.**
- All `<Label>`, `<Badge>`, `Card`/`CardContent` — shadcn. **SKIP.**
- All `motion.div`/`AnimatePresence` — animation only, no `onClick`. **SKIP.**
- Results-log rows — presentational, no `onClick`. **SKIP.**
- All lucide icons — decorative. **SKIP.**
- `<h1>` + all `<p>`/`<span>` text. **SKIP.**

### Missed raw controls scan

**NONE.** The file has exactly 3 raw interactive controls (all edited) + 2 shadcn Buttons + 2 shadcn Inputs + shadcn Labels/Badges. No raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs.

---

### Verification required

Run `npm run update` → must exit 0 (type-check + worker type-check + production build).

```
npm run update
```

No deploy — owner commits.

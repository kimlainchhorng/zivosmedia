# DeepSeek run — 2026-06-14T10:42:57.864Z

- model: deepseek-chat
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

## Review: SandboxModePage.tsx — 3 edits confirmed correct

### Short plan

Three raw-control edits applied to `src/pages/app/shop/SandboxModePage.tsx`:
1. **L128 Back button** — className-from-scratch on bare icon button (in-scope)
2. **L157 "Truck Sale" type-selector** — ring + scale + aria-pressed, kept `transition-all`
3. **L169 "Ride" type-selector** — identical treatment

All shadcn primitives correctly skipped. No missed raw controls.

---

### Edit-by-edit confirmation

| # | Site | Before | After | Verdict |
|---|------|--------|-------|---------|
| **1** | L128 Back button | Bare `<button>` with NO className | `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"` | ✅ **CORRECT** — className-from-scratch is in-scope; `rounded-full` keeps layout byte-identical (no padding); `scale-95` icon tier; `transition-transform` (scale sole prop, no hover pseudo on element → NOT flip); OUTWARD `ring-ring` against `bg-background/95` header |
| **2** | L157 "Truck Sale" | `p-4 rounded-2xl border-2 transition-all ${...}` (has `hover:border-border` pseudo) | Added `active:scale-[0.97]` + ring + `aria-pressed={testType === "truck_sale"}`; **KEPT** `transition-all` | ✅ **CORRECT** — `scale-[0.97]` card/chip tier; `transition-all` **must stay** because `hover:border-border` pseudo is ON THE ELEMENT ITSELF (FLIP rule: adding scale to a control with an existing hover pseudo → keep `transition-all`); `aria-pressed` on exact selected value (single-select toggle) |
| **3** | L169 "Ride" | Same as #2 | Same treatment | ✅ **CORRECT** — identical pattern, same justification |

---

### SKIP list — all correct

| Control | Lines | Reason |
|---------|-------|--------|
| shadcn `<Input>` (amount) | L190 | Own tokens; `onChange` is logic |
| shadcn `<Input>` (currency) | L201 | Own tokens; `onChange` is logic |
| shadcn `<Button>` "Run Test" | L211 | Own tokens; visible text; `disabled` is logic |
| shadcn `<Button>` "Open Meta Events Manager" | L230 | Own tokens; visible text; `onClick window.open` is logic |
| `<Label>` | L180, L195, L200 | shadcn primitive |
| `<Badge>` | L140, L250+ | shadcn primitive |
| `<Card>` / `<CardContent>` | L143, L247+ | shadcn primitives |
| `motion.div` / `AnimatePresence` | L244+ | Animation only, no onClick |
| Results log rows | L248+ | Presentational divs, no onClick |
| All lucide icons | — | Decorative |
| `<h1>`, `<p>`, `<span>` text | — | Presentational |

**No other raw `<button>`, no raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs found.**

---

### Key questions answered

**Q1: Back button className-from-scratch + scale-95 + transition-transform + ring + aria-label correct?**
✅ **Yes.** Bare icon button with no className → adding `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"` is the textbook pattern (matches Slices 108–153). No padding added, layout byte-identical. `transition-transform` correct (no hover pseudo on element).

**Q2: Type-selector toggles — scale-[0.97] + KEEP transition-all + ring + aria-pressed correct?**
✅ **Yes.** Both have `hover:border-border` pseudo ON THE ELEMENT → FLIP rule requires keeping `transition-all` (not downgrading to `transition-transform`). `scale-[0.97]` is the correct card/chip tier. `aria-pressed={testType === "truck_sale"}` on the exact selected value (not cumulative) is correct for single-select.

**Q3: Any missed raw interactive controls?**
✅ **None.** Full scan confirms all interactive controls are either (a) the 3 edited raw `<button>`s, or (b) shadcn primitives correctly skipped. No raw `<a>`, no `onClick` divs, no `role="button"`/`cursor-pointer` divs.

---

### Final diff (exact file path: `src/pages/app/shop/SandboxModePage.tsx`)

```diff
--- a/src/pages/app/shop/SandboxModePage.tsx
+++ b/src/pages/app/shop/SandboxModePage.tsx
@@ -125,7 +125,7 @@ export default function SandboxModePage() {
         <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/30 px-4 py-3 pt-safe">
           <div className="flex items-center gap-3">
-            <button type="button" onClick={() => navigate(-1)}>
+            <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
               <ArrowLeft className="h-5 w-5" />
             </button>
             <TestTube className="h-5 w-5 text-amber-500" />
@@ -154,7 +154,8 @@ export default function SandboxModePage() {
             <div className="grid grid-cols-2 gap-3">
               <button type="button"
                 onClick={() => setTestType("truck_sale")}
-                className={`p-4 rounded-2xl border-2 transition-all ${
+                aria-pressed={testType === "truck_sale"}
+                className={`p-4 rounded-2xl border-2 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                   testType === "truck_sale"
                     ? "border-primary bg-primary/5"
                     : "border-border/40 hover:border-border"
@@ -166,7 +167,8 @@ export default function SandboxModePage() {
               </button>
               <button type="button"
                 onClick={() => setTestType("ride")}
-                className={`p-4 rounded-2xl border-2 transition-all ${
+                aria-pressed={testType === "ride"}
+                className={`p-4 rounded-2xl border-2 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                   testType === "ride"
                     ? "border-primary bg-primary/5"
                     : "border-border/40 hover:border-border"
```

---

### Owner verification

- **3 className edits + 3 new aria** (1 `aria-label`, 2 `aria-pressed`)
- **0 logic lines touched** — every `onClick`/`navigate`/`supabase`/`.insert`/`sendMetaConversionEvent`/`useState`/`setState`/`disabled` byte-identical
- **0 FLIPs** — #1 has no hover pseudo (transition-transform); #2/#3 keep existing `transition-all` (hover pseudo present)
- **ring-inset=0** — all outward `ring-ring` against neutral parent surfaces
- Must pass `npm run update` before committing

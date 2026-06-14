# DeepSeek run — 2026-06-14T09:59:01.292Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopPayrollPage.tsx (186-line merchant "Payroll" page rendered inside <AppLayout title="Payroll" hideHeader>; useState loading/storeId/basePay/truckPct/ridesPct/rows/roi; loadData() fetches store_profiles + store_payroll_configs + RPCs get_employee_payroll_summary/get_merchant_roi via supabase; saveConfig() supabase.functions.invoke("store-payroll-config-update"); useMemo totals; loading + no-store guards). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, functions.invoke, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only, DON'T renumber). Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn AppLayout (own tokens). LEAVE raw native form fields (native focus outline = house standard).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring. An OUTWARD ring on a gradient/colored-fill button (bg-ig-gradient) STILL renders against the neutral PARENT → ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. Back-icon-buttons already shipping active:scale-90 keep it (DON'T renumber).
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- DON'T-CHURN: control ALREADY has press (active:scale) + transition → ADD ring (+aria) ONLY; don't renumber, no flip.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L115 BACK button — was `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` and ALREADY had `aria-label="Go back"` (icon-only ArrowLeft; ALREADY ships active:scale-90 + transition-transform; NO ring; on page background neutral) → DON'T-CHURN: APPENDED ring ONLY (kept active:scale-90 [DON'T renumber], kept transition-transform — scale is the only animated prop, kept existing aria-label). Final: `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"`. Confirm: DON'T-CHURN ring-only is correct (no renumber, no flip, no aria churn).

B) L136 "Save Payroll Rules" button — was `mt-2 h-9 w-full rounded-lg bg-ig-gradient text-white text-xs font-semibold` (VISIBLE text; onClick saveConfig; FULL-WIDTH w-full with its OWN gradient surface bg-ig-gradient; NO hover, NO transition, NO scale, NO ring; rounded-lg; inside a bg-card config panel neutral) → ADDED `active:scale-[0.98]` (wide full-width WITH own surface tier) + `transition-transform` (scale is the ONLY animated prop — no hover color on the element → transition-transform NOT transition-all, so NO flip) + ring; NO aria (visible text). Final: `mt-2 h-9 w-full rounded-lg bg-ig-gradient text-white text-xs font-semibold transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: (1) scale-[0.98] full-width-with-own-surface tier correct; (2) transition-transform (NOT transition-all) correct — scale is the sole animated prop, no hover/bg/color change on the element → NOT a flip; (3) OUTWARD ring-ring correct against the neutral bg-card parent even though the button's own fill is the ig-gradient; (4) NO aria-label correct (visible text).

ALSO CONFIRM I should LEAVE: AppLayout shell; the THREE raw native `<input type="number">` L132/133/134 (basePay/truckPct/ridesPct — raw native form fields with `h-9 rounded-lg border border-border/40 px-2 text-xs`, NO focus ring — house standard is to LEAVE native form fields with their native focus outline; they have onChange setState — existing logic); all the data-display divs (payroll breakdown rows L149, totals L162, ROI L175 — NO onClick, presentational); all lucide icons (decorative); the loading + no-store guard text; the h1 + all <p>/<span> text. No clickable divs with onClick. No raw <a>.

Be concise and exact. Return the precise final className after-string for A + B + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) the 3 raw native number inputs — confirm LEAVE (native form fields, house standard) and that I should NOT add a focus-visible ring to them; (2) B — transition-transform (not transition-all/no flip) because scale is the sole animated prop — correct?; (3) B — OUTWARD ring-ring against the neutral bg-card parent despite the ig-gradient fill — correct?
- files: src/pages/app/shop/ShopPayrollPage.tsx

---

## Plan

Two DON'T-CHURN edits already applied correctly on `src/pages/app/shop/ShopPayrollPage.tsx`. No other raw interactive controls in scope. No logic touched.

## Edit A — Back button (L115)

**Before:**
```tsx
className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
```
**After:**
```tsx
className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**aria:** `aria-label="Go back"` (pre-existing, unchanged)

**Verdict: CORRECT.** DON'T-CHURN ring-only — kept `active:scale-90` (no renumber), kept `transition-transform` (scale is sole animated prop), kept existing aria-label.

## Edit B — "Save Payroll Rules" button (L136)

**Before:**
```tsx
className="mt-2 h-9 w-full rounded-lg bg-ig-gradient text-white text-xs font-semibold"
```
**After:**
```tsx
className="mt-2 h-9 w-full rounded-lg bg-ig-gradient text-white text-xs font-semibold transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**aria:** none (visible text)

**Verdict: CORRECT.** 
1. `active:scale-[0.98]` — correct wide full-width WITH own surface tier (`w-full` + `bg-ig-gradient`)
2. `transition-transform` — correct (scale is sole animated prop; no `hover:bg`/`hover:text`/`hover:border` on the element → NOT a flip)
3. OUTWARD `ring-ring` — correct (renders against neutral `bg-card` parent, not the button's own `bg-ig-gradient` fill)
4. No aria-label — correct (visible text "Save Payroll Rules")

## Controls to LEAVE (confirmed)

- **AppLayout shell** — shadcn, own tokens
- **3 raw native `<input type="number">`** (L132-134) — native form fields, house standard is LEAVE with native focus outline; do NOT add custom focus-visible ring
- **All data-display divs** (payroll breakdown rows L149, totals L162, ROI L175) — no onClick, presentational
- **All lucide icons** — decorative
- **Loading + no-store guard text**
- **h1 + all `<p>`/`<span>` text**

## Missed controls scan

**Zero missed.** No clickable divs with onClick, no raw `<a>`, no raw `<button>` besides the two already edited. The 3 native inputs are correctly left untouched.

## Owner verify

- Both edits are className-only + display-only aria (no new aria on B — visible text)
- `npm run update` must pass before commit
- No logic, onClick, navigate, supabase, functions.invoke, or setState touched

# DeepSeek run — 2026-06-14T11:14:53.846Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopEmployeeSchedulePage.tsx (389-line merchant **Employee Schedule** page, INSIDE `<AppLayout title="Employee Schedule" hideHeader>` with its own `flex flex-col px-4 pt-3 pb-24 max-w-2xl mx-auto` body: a top row with a raw round Back `<button>` + title + a shadcn "Add Shift" `<Button size="sm" disabled={!employees.length}>`; a week-nav row with two raw round chevron `<button>`s (prev/next week) flanking a week label; an `AnimatePresence` add-shift form Card with a raw close-X `<button>` + native `<select>`×3 (employee/day/role) + native `<input type="time">`×2 + a shadcn "Add Shift" submit `<Button disabled={saving || !form.employee_id}>`; a `DAYS.map` list of day Cards each rendering shift chips (colored `cn(...)` divs) with a raw remove-X `<button>` per chip; a "Weekly hours by employee" summary of Cards; empty-state Cards with shadcn Buttons. `useEffect`/`useMemo`/`useState`; `supabase.auth.getUser`, `(supabase as any).from(...)`, `supabase.functions.invoke("employee-shift-manage", {action:create|delete})`; sonner toast; framer-motion `motion`/`AnimatePresence`; `cn()`). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useState/useEffect/useMemo, setState, setForm, functions.invoke, supabase calls, onChange, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card (own tokens); LEAVE native `<select>`/`<input type="time">` (onChange logic, native form fields, keep existing focus:outline-none).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. Back-icon-buttons already shipping active:scale-90 keep it.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF. FLIP transition-colors->transition-all when adding a scale to an element that ALSO has a hover color/bg/border/opacity pseudo.
- DON'T-CHURN: control ALREADY has press (active:scale OR whileTap) + transition -> add ring (+aria) ONLY; KEEP existing scale/transition, do NOT add a competing 2nd scale, do NOT downgrade.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle. aria-expanded on a disclosure.

FIVE edits applied — confirm CORRECT or NEEDS-FIX:

1) L189 Back round `<button>` (icon-only ArrowLeft, no visible text) — **DON'T-CHURN** (already `active:scale-90 transition-transform`, bg-muted/60 static, NO hover pseudo on itself so scale is the SOLE animated prop → KEEP transition-transform). Had NO aria-label/ring. ADDED `aria-label="Go back"` + ring ONLY. After: `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. OUTWARD ring-ring (parent is neutral page body).

2) L199 prev-week round `<button>` (icon-only ChevronLeft) — had `hover:bg-muted/60 transition-colors`, NO scale/ring/aria. ADDED `aria-label="Previous week"` + icon-only `active:scale-95` + ring, **FLIP transition-colors→transition-all** (has hover:bg pseudo on itself + adding scale). After: `w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. OUTWARD ring-ring.

3) L214 next-week round `<button>` (icon-only ChevronRight) — identical treatment to #2, `aria-label="Next week"`. After: `w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

4) L240 close-form X `<button>` (icon-only X) — had `p-1 rounded-lg hover:bg-muted/60`, NO transition/scale/ring/aria. ADDED `aria-label="Close"` + icon-only `active:scale-95` + ring + `transition-all` (has hover:bg pseudo + adding scale → transition-all, was no transition). After: `p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. OUTWARD ring-ring (parent Card neutral).

5) L335 remove-shift X `<button>` (icon-only X, per shift chip) — had `ml-1 opacity-60 hover:opacity-100`, NO transition/scale/ring/aria. ADDED `aria-label="Remove shift"` + icon-only `active:scale-95` + ring + `transition-all` (has hover:opacity pseudo + adding scale → transition-all, was no transition). After: `ml-1 opacity-60 hover:opacity-100 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. NOTE on ring direction: this button sits inside a colored shift chip div (`colorForEmployee` → bg-blue-500/20 border etc, `rounded-lg border`, NOT overflow-hidden) → OUTWARD ring-ring (button is not a flush edge child of a rounded overflow-hidden parent; --ring black renders fine against the translucent colored chip).

SKIP confirmed: L193 "Add Shift" shadcn `<Button size="sm" disabled={!employees.length}>` (own tokens, visible text); L228 "Manage team" shadcn `<Button>` (navigate); L244/L259/L273 native `<select>` (onChange setForm logic, native field, keep focus:outline-none); L287/L296 native `<input type="time">` (onChange setForm logic, native field); L304 "Add Shift" submit shadcn `<Button disabled={saving || !form.employee_id}>`; L379 "Add First Shift" shadcn `<Button>`; all `<Card>`; the colored shift-chip divs (presentational, no onClick); the weekly-hours Cards (presentational); all lucide icons (decorative); the "Today" badge `<span>` (no onClick); all `<p>`/`<span>` text.

KEY QUESTIONS: (1) all 5 edits correct (1 DON'T-CHURN keep transition-transform add aria+ring; 2&3 FLIP transition-colors→transition-all + icon-only scale-95 + ring; 4&5 add transition-all + icon-only scale-95 + ring on no-transition hover-pseudo buttons; all OUTWARD ring-ring incl. #5 inside a colored non-overflow-hidden chip)? (2) for #1 — is keeping transition-transform correct since bg-muted/60 is a static (non-hover) fill so scale is the sole ANIMATED prop, or should it be transition-all? (3) did I miss any raw interactive control or mis-tier any? Are the native `<select>`/`<input type="time">` correctly LEFT (native form fields, onChange logic)? Be concise and exact; return precise final className after-strings + aria attrs.
- files: src/pages/app/shop/ShopEmployeeSchedulePage.tsx

---

# Review: ShopEmployeeSchedulePage.tsx — Premium Interaction + A11y Pass

## (1) Short Plan

Five raw `<button>` controls need the standard press-scale + ring + aria treatment. All five edits are **correct as-is** — no fixes needed. The file already has the edits applied in the source you provided.

## (2) Verification — All 5 Edits Confirmed Correct ✅

| # | Line | Control | Pattern | Tier | Transition | Ring | Aria | Verdict |
|---|------|---------|---------|------|------------|------|------|---------|
| 1 | L189 | Back (ArrowLeft) | **DON'T-CHURN** | icon | `transition-transform` KEPT ✅ | OUTWARD `ring-ring` ✅ | `aria-label="Go back"` ✅ | **CORRECT** |
| 2 | L199 | Prev week (ChevronLeft) | FLIP + new scale | icon | `transition-colors`→`transition-all` ✅ | OUTWARD `ring-ring` ✅ | `aria-label="Previous week"` ✅ | **CORRECT** |
| 3 | L214 | Next week (ChevronRight) | FLIP + new scale | icon | `transition-colors`→`transition-all` ✅ | OUTWARD `ring-ring` ✅ | `aria-label="Next week"` ✅ | **CORRECT** |
| 4 | L240 | Close X | new transition + scale | icon | `transition-all` (was none) ✅ | OUTWARD `ring-ring` ✅ | `aria-label="Close"` ✅ | **CORRECT** |
| 5 | L335 | Remove shift X | new transition + scale | icon | `transition-all` (was none) ✅ | OUTWARD `ring-ring` ✅ | `aria-label="Remove shift"` ✅ | **CORRECT** |

### Key Questions Answered

**(1) All 5 edits correct?** ✅ Yes. Each follows the exact house standard:
- #1: `active:scale-90` already present → DON'T-CHURN (keep `transition-transform`, add ring + aria only)
- #2/#3: `hover:bg-muted/60` pseudo on element → FLIP `transition-colors→transition-all` + `active:scale-95` + ring + aria
- #4/#5: no transition, has hover pseudo → add `transition-all` + `active:scale-95` + ring + aria

**(2) #1 — keep `transition-transform` correct?** ✅ **Yes.** The `bg-muted/60` is a **static** fill (no `hover:` pseudo on the element itself). The only animated prop is `scale` (via `active:scale-90`). Per the rule: *"transition-transform when scale is the ONLY animated prop ON THE ELEMENT"* — this is correct. No flip needed.

**(3) Missed controls?** ✅ **None.** All raw `<button>`s covered:
- L193 shadcn `<Button>` — correctly SKIPPED (own tokens, visible text)
- L228 shadcn `<Button>` — correctly SKIPPED
- L244/L259/L273 native `<select>` — correctly LEFT (native form fields, `onChange` logic)
- L287/L296 native `<input type="time">` — correctly LEFT (native form fields, `onChange` logic)
- L304 shadcn `<Button>` — correctly SKIPPED
- L379 shadcn `<Button>` — correctly SKIPPED
- All `<Card>`, shift-chip divs, weekly-hours Cards, lucide icons, text — correctly SKIPPED

**Ring direction for #5 (inside colored chip):** ✅ OUTWARD is correct. The chip div has `rounded-lg border` but is **not** `overflow-hidden`, so the button is not a flush edge child of a rounded overflow-hidden parent. `--ring` (black) renders fine against the translucent colored chip background.

## (3) Owner Verification

**Status: READY TO COMMIT.** The file already has all 5 edits applied in the working tree. No further changes needed.

**Guard grep tally** (from the source you provided):
- className edits: 5 (all correct)
- New aria: 5 (3 `aria-label` + 0 `aria-pressed` + 0 `aria-expanded)
- `focus-visible:ring-2`: 5
- `ring-ring`: 5 (all OUTWARD)
- `ring-inset`: 0
- `active:scale-90` KEPT: 1 (#1 DON'T-CHURN)
- `active:scale-95` new: 4 (#2, #3, #4, #5)
- FLIPs: 2 (#2, #3)
- `transition-all` new: 2 (#4, #5)
- `disabled` touched: 0
- Logic lines touched: 0

**Run `npm run update`** to verify type-check + worker + build pass before committing.

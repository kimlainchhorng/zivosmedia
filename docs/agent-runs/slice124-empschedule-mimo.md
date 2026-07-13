# MiMo run — 2026-06-14T11:16:08.788Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verification: All 5 Edits CORRECT ✅ — Zero Fixes Needed

### Per-edit audit

| # | Control | Tier | transition | scale | aria | ring | Verdict |
|---|---------|------|-----------|-------|------|------|---------|
| 1 | Back button | icon-only | KEEP `transition-transform` (sole animated prop — `bg-muted/60` is static, no hover pseudo) | KEEP `active:scale-90` | `aria-label="Go back"` | OUTWARD `ring-ring` | ✅ DON'T-CHURN correct |
| 2 | Prev-week chevron | icon-only | FLIP `transition-colors`→`transition-all` (`hover:bg` pseudo + adding scale) | NEW `active:scale-95` | `aria-label="Previous week"` | OUTWARD `ring-ring` | ✅ FLIP correct |
| 3 | Next-week chevron | icon-only | FLIP `transition-colors`→`transition-all` | NEW `active:scale-95` | `aria-label="Next week"` | OUTWARD `ring-ring` | ✅ FLIP correct |
| 4 | Close-form X | icon-only | ADD `transition-all` from scratch (`hover:bg` pseudo + adding scale, had no prior transition) | NEW `active:scale-95` | `aria-label="Close"` | OUTWARD `ring-ring` | ✅ Correct |
| 5 | Remove-shift X | icon-only | ADD `transition-all` from scratch (`hover:opacity` pseudo + adding scale, had no prior transition) | NEW `active:scale-95` | `aria-label="Remove shift"` | OUTWARD `ring-ring` | ✅ Correct |

### Key questions answered

**(1) All 5 correct?** Yes. Every transition/aria/ring/direction is textbook. #1 DON'T-CHURN preserves the existing `active:scale-90` + `transition-transform` and only adds aria + ring. #2/#3 correctly FLIP `transition-colors`→`transition-all`. #4/#5 correctly add `transition-all` from scratch on elements that had hover pseudos but no prior transition class.

**(2) `transition-transform` on #1?** Confirmed correct. `bg-muted/60` is a **static** fill — there is no `hover:bg-muted/60`, `active:`, or any other interactive pseudo on that element. The only animated prop is `active:scale-90` (transform). `transition-transform` is the precise match per the token vocabulary. (`transition-all` would also work functionally but would be imprecise.)

**(3) Missed controls?** Zero. Full scan:

- 5 raw `<button>`s — all 5 edited ✅
- 4 shadcn `<Button>`s (Add Shift ×2, Manage team, Add First Shift) — own tokens, correctly SKIPPED ✅
- 3 native `<select>` — onChange/setForm logic, native form fields, `focus:outline-none` preserved, correctly SKIPPED ✅
- 2 native `<input type="time">` — same treatment, correctly SKIPPED ✅
- No raw `<a>`, no clickable `onClick` divs, no `role="button"`/`cursor-pointer` divs ✅
- Shift chip `<div>`s are presentational (no onClick, remove-X button inside handles the action) ✅
- "Today" badge `<span>` is presentational ✅

### Final after-strings (exact)

```
#1  w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    aria-label="Go back"

#2  w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    aria-label="Previous week"

#3  w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    aria-label="Next week"

#4  p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    aria-label="Close"

#5  ml-1 opacity-60 hover:opacity-100 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
    aria-label="Remove shift"
```

### Guard-grep tally

| Metric | Count |
|--------|-------|
| className edits | 5 |
| New aria attrs | 5 (5 `aria-label`, 0 `aria-pressed`, 0 `aria-expanded`) |
| `focus-visible:ring` | 5 |
| `ring-ring` (all OUTWARD) | 5 |
| `ring-inset` | 0 |
| `active:scale-95` new | 4 (#2,#3,#4,#5) |
| `active:scale-90` kept (DON'T-CHURN) | 1 (#1) |
| FLIPs (`transition-colors`→`transition-all`) | 2 (#2,#3) |
| Add-from-scratch `transition-all` | 2 (#4,#5) |
| KEEP `transition-transform` (DON'T-CHURN) | 1 (#1) |
| Competing 2nd press added | 0 |
| `disabled` touched | 0 |
| Logic lines touched | 0 |

### Owner notes

- **Verify gate:** run `npm run update` (type-check + worker type-check + production build) before committing.
- **No logic changed.** Every `onClick`/`navigate`/`useState`/`useEffect`/`useMemo`/`setForm`/`functions.invoke`/`supabase`/`disabled`/`onChange` byte-identical.
- **File ready to commit as-is.** No diff needed — the working tree file already contains all 5 correct edits.

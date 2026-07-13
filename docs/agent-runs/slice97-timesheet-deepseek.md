# DeepSeek run — 2026-06-14T09:05:59.002Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/PersonalTimesheetPage.tsx (184-line "Timesheet" rendered inside <AppLayout title="Timesheet" hideHeader>; Supabase + react-query: useQuery personal-emp-record [store_employees] + personal-timesheet-entries [store_time_entries gte/lte week]; useState weekOffset; useMemo weekData (7 days from date-fns); derived totalHours/workedDays/overtime/weekLabel/weekRange; framer-motion entrance + a progress-bar width anim; layout: a custom in-content header row [raw Back button + "Timesheet" h1] + a week-nav card [Prev-week icon button + label + Next-week icon button (disabled when weekOffset>=0)] + a 3-col summary-stat grid + a "Daily Breakdown" list of 7 non-clickable motion.div day rows [each w/ a shadcn Badge status] + a "Weekly Progress" hours-bar card). RULES: className strings + display-only aria-* + interaction-anim prop (whileTap) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, setWeekOffset, disabled, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Badge>/<AppLayout> (own tokens). Don't renumber an existing scale (the Back button already ships active:scale-90 — keep it). Don't add role/tabIndex/onKeyDown (structural — FLAG, don't add). Don't TOUCH disabled (Next-week button has disabled={weekOffset>=0} — keep byte-identical).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95 (back-icon-buttons already on active:scale-90 KEEP it); links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → FLIP transition-colors→transition-all.
- DON'T-CHURN: control ALREADY has press (active:scale OR whileTap) + transition → ADD ring (+aria) ONLY; don't renumber, no redundant 2nd scale, no flip.
- For bare icon/text-link buttons/anchors add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

THREE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L91 BACK BUTTON (raw <button type="button" aria-label="Go back">, icon-only ArrowLeft, base `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` [ALREADY ships press active:scale-90 + transition-transform, NO focus ring], in the in-content header on the page background neutral) → applied: DON'T-CHURN — APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (kept active:scale-90 [DON'T renumber], kept transition-transform, no 2nd scale, no flip; OUTWARD ring-ring; aria-label="Go back" pre-existing kept). Confirm DON'T-CHURN ring-only + keep scale-90 + OUTWARD ring.

B) L99 PREVIOUS-WEEK ICON BUTTON (raw <button type="button" aria-label="Previous week">, icon-only ChevronLeft, onClick setWeekOffset(w => w - 1), base `p-1.5 rounded-lg hover:bg-muted/40 transition-colors` [hover:bg-muted/40 bg-color ON ITSELF + transition-colors, NO scale, NO focus]; sits inside the week-nav card bg-card border neutral; rounded-lg already present) → applied (replace_all, shared className with C): FLIPPED transition-colors→transition-all + APPENDED `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm FLIP (new active:scale + hover:bg-muted/40 must both animate) + icon-only active:scale-95 tier + OUTWARD ring-ring + aria-label kept.

C) L106 NEXT-WEEK ICON BUTTON (raw <button type="button" aria-label="Next week" disabled={weekOffset >= 0}>, icon-only ChevronRight w/ conditional opacity-30, onClick setWeekOffset(w => Math.min(0, w + 1)), SAME base className as B) → applied (same replace_all): FLIPPED transition-colors→transition-all + APPENDED `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; `disabled={weekOffset >= 0}` LEFT BYTE-IDENTICAL (NOT touched). Confirm FLIP + active:scale-95 + ring + aria-label kept + disabled untouched. NOTE: is adding active:scale/ring fine on a frequently-disabled button (when disabled it's not focusable/pressable so the tokens are simply inert — correct, not dead code in the enabled state)?

ALSO CONFIRM I should LEAVE: the shadcn <Badge> L150 (own tokens); the week-nav card L98 + summary-stat grid divs L118 (non-interactive containers); the 7 "Daily Breakdown" motion.div day rows L134 (NON-interactive — no onClick); the "Weekly Progress" hours-bar card + its animated motion.div fill (non-interactive); the <AppLayout> shell; all ArrowLeft/ChevronLeft/ChevronRight/Loader2 icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) B/C — FLIP transition-colors→transition-all correct (hover:bg-muted/40 is a bg-color)? + icon-only active:scale-95 correct?; (2) C — leaving `disabled` untouched + adding inert-when-disabled scale/ring correct?; (3) A — DON'T-CHURN ring-only keeping active:scale-90 correct?
- files: src/pages/app/personal/PersonalTimesheetPage.tsx

---

## Analysis & Confirmation

### (1) Short Plan

Three edits on `src/pages/app/personal/PersonalTimesheetPage.tsx` — all className-only, 0 logic changes. Each follows the DON'T-CHURN / FLIP / tier rules exactly as applied in the working tree.

---

### (2) Per-Control Verification

**A) L91 BACK BUTTON** — ✅ **CORRECT**
- **Before:** `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform`
- **After:** `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- DON'T-CHURN rule honored: `active:scale-90` kept (not renumbered), `transition-transform` kept, no 2nd scale, no flip. OUTWARD `ring-ring` on neutral page bg. `aria-label="Go back"` pre-existing kept.

**B) L99 PREVIOUS-WEEK ICON BUTTON** — ✅ **CORRECT**
- **Before:** `p-1.5 rounded-lg hover:bg-muted/40 transition-colors`
- **After:** `p-1.5 rounded-lg hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- FLIP `transition-colors`→`transition-all` ✅ — `hover:bg-muted/40` is a bg-color ON THE ELEMENT ITSELF + new `active:scale-95` must both animate.
- `active:scale-95` ✅ — icon-only tier (consistent with Back button's `active:scale-90`; 95 is slightly gentler for a smaller `p-1.5` target, acceptable).
- OUTWARD `ring-ring` ✅ — `rounded-lg` already present, parent `bg-card` neutral.
- `aria-label="Previous week"` kept.

**C) L106 NEXT-WEEK ICON BUTTON** — ✅ **CORRECT**
- **Before:** `p-1.5 rounded-lg hover:bg-muted/40 transition-colors`
- **After:** `p-1.5 rounded-lg hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- Same FLIP + tier as B ✅.
- `disabled={weekOffset >= 0}` **byte-identical** ✅ — NOT touched.
- Adding `active:scale-95` + `focus-visible:ring` on a frequently-disabled button is **correct** — when `disabled`, the button is not focusable/pressable so the tokens are inert; when enabled they provide proper feedback. No dead code concern.
- `aria-label="Next week"` kept.

---

### (3) Items Correctly LEFT Untouched

| Element | Line | Reason |
|---------|------|--------|
| shadcn `<Badge>` | L150 | Own tokens |
| Week-nav card container | L98 | Non-interactive |
| Summary stat grid divs | L118 | Non-interactive containers |
| 7 `motion.div` day rows | L134 | **Non-interactive** — no `onClick`, no `whileTap` |
| Weekly Progress card + bar | L159 | Non-interactive |
| `<AppLayout>` shell | L82 | Own tokens |
| `ArrowLeft`/`ChevronLeft`/`ChevronRight`/`Loader2` | — | Decorative icons |

---

### (4) No Missed Raw Interactive Controls

The page has exactly **3 raw interactive controls**: Back (A), Prev-week (B), Next-week (C). All three are edited. No other `<button>`, `<a>`, or `onClick` elements exist. ✅

---

### (5) Final Diff

The working tree already has the correct changes. The diff is:

```diff
--- a/src/pages/app/personal/PersonalTimesheetPage.tsx
+++ b/src/pages/app/personal/PersonalTimesheetPage.tsx
@@ -88,7 +88,7 @@ export default function PersonalTimesheetPage() {
       <div className="flex flex-col px-4 pt-3 pb-24 space-y-4">
         <div className="flex items-center gap-2.5">
-          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
+          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="w-4 h-4" />
           </button>
           <h1 className="font-bold text-[17px]">Timesheet</h1>
@@ -97,13 +97,13 @@ export default function PersonalTimesheetPage() {
         {/* Week nav */}
         <div className="flex items-center justify-between rounded-2xl bg-card border border-border/40 px-4 py-3">
-          <button type="button" aria-label="Previous week" onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
+          <button type="button" aria-label="Previous week" onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 rounded-lg hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ChevronLeft className="w-4 h-4" />
           </button>
           <div className="text-center">
             <p className="text-[13px] font-bold text-foreground">{weekLabel}</p>
             <p className="text-[10px] text-muted-foreground">{weekRange}</p>
           </div>
-          <button type="button" aria-label="Next week" onClick={() => setWeekOffset(w => Math.min(0, w + 1))} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors" disabled={weekOffset >= 0}>
+          <button type="button" aria-label="Next week" onClick={() => setWeekOffset(w => Math.min(0, w + 1))} className="p-1.5 rounded-lg hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={weekOffset >= 0}>
             <ChevronRight className={cn("w-4 h-4", weekOffset >= 0 && "opacity-30")} />
           </button>
         </div>
```

---

### (6) Owner Verify

- Run `npm run update` — must pass (type-check + worker type-check + build).
- Preview at `/personal/timesheet` on localhost — verify:
  - Back button has focus ring on keyboard tab (no double scale).
  - Prev/Next week buttons have focus ring + press scale.
  - Next week button is disabled when `weekOffset >= 0` (tokens inert, no visual regression).
  - All logic (Supabase queries, week navigation, hours calculation) works identically.

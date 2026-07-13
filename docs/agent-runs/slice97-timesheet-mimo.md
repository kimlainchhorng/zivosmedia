# MiMo run — 2026-06-14T09:06:29.841Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Verify the 3-edit premium interaction + a11y pass on `PersonalTimesheetPage.tsx`. The edits are already applied in the working tree. Confirm correctness per the token vocabulary and flag anything missed.

## Verification — all three edits CORRECT

### A — Back button (L91) ✅

| | |
|---|---|
| **Final className** | `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **aria** | `aria-label="Go back"` (pre-existing, kept) |

DON'T-CHURN confirmed: `active:scale-90` + `transition-transform` pre-existing → ring appended only. No renumber, no flip, no 2nd scale. OUTWARD ring against neutral page bg. ✓

### B — Previous-week button (L99) ✅

| | |
|---|---|
| **Final className** | `p-1.5 rounded-lg hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **aria** | `aria-label="Previous week"` (pre-existing, kept) |

FLIP confirmed: `hover:bg-muted/40` is a bg-color ON THE ELEMENT → `transition-colors`→`transition-all` required so new `active:scale` (transform) + existing hover color both animate. Icon-only tier `active:scale-95`. `rounded-lg` already present. OUTWARD ring against the week-nav card's `bg-card` neutral surface. ✓

### C — Next-week button (L106) ✅

| | |
|---|---|
| **Final className** | `p-1.5 rounded-lg hover:bg-muted/40 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **aria** | `aria-label="Next week"` (pre-existing, kept) |
| **disabled** | `disabled={weekOffset >= 0}` — byte-identical, untouched |

Same shared className as B (via replace_all). When disabled: native `disabled` makes the button neither focusable nor pressable → `active:scale`/`focus-visible:ring` are inert in that state but fully valid in the enabled state. Correct — not dead code. ✓

### Answers to specific questions

**(1) B/C FLIP + icon-only tier:** Yes, both correct. `hover:bg-muted/40` is a bg-color triggering `transition-all`; `active:scale-95` is the icon-only tier.

**(2) C disabled + inert tokens:** Yes. Native `disabled` removes focusability/pressability — the tokens are simply inactive when disabled, not dead code. `disabled` left byte-identical.

**(3) A DON'T-CHURN:** Yes. Already has `active:scale-90` + `transition-transform` → only the missing focus ring added. No renumber, no redundant 2nd scale, no flip.

### Leave list — all confirmed correct

| Control | Reason |
|---|---|
| `<Badge>` L150 | Shadcn own tokens — don't churn |
| Week-nav card L98, summary grid divs L118 | Non-interactive containers |
| 7 `motion.div` day rows L134 | Non-interactive — no `onClick` |
| Weekly Progress card + animated fill | Non-interactive |
| `<AppLayout>` shell | Own tokens |
| All `ArrowLeft`/`ChevronLeft`/`ChevronRight`/`Loader2` icons | Decorative |

### Missed controls scan

**No additional raw interactive controls found.** The only interactive elements in this page are A, B, and C. The shadcn `<Badge>` has its own tokens. All `motion.div` day rows are purely presentational.

## Guard-grep summary

```
className edits:    3  (A + B + C)
new aria:           0  (all pre-existing kept)
focus-visible:ring: 3  (A + B + C)
ring-ring:          3  (all OUTWARD)
ring-inset:         0
active:scale-90:    1  (A, kept, not renumbered)
active:scale-95:    2  new (B + C)
FLIPs:              2  (B + C, transition-colors→transition-all)
NEW transitions:    0
competing 2nd:      0
logic lines touched: 0
disabled touched:   0
```

## Owner action

Run `npm run update` to verify. If green, the slice is ready to commit. No logic, no Supabase keys, no `disabled` prop, no query keys were touched — display + interaction tokens only.

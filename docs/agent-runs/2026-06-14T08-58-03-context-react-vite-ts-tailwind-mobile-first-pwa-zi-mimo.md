# MiMo run — 2026-06-14T08:58:03.242Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/MyApplicationsPage.tsx (118-line "My job applications" at /personal/my-applications; Supabase-backed: useEffect loads career_applications.select(...).eq(applicant_id).order(created_at desc); useState apps/loading/filterStatus; useMemo filteredApps; handleWithdraw(id,e) does e.stopPropagation()+nativeConfirm+supabase.update status=withdrawn+optimistic setApps; layout: sticky header [shadcn ghost Back Button + title + "{n} total" span] + an overflow-x-auto status-filter chip row + loading/empty-state Card [shadcn Browse Jobs Button] + a list of clickable shadcn Card application items navigating to /personal/jobs/:id, each with a status <span> badge + a conditional raw "Withdraw" <button>). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, supabase, stopPropagation, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button> (own tokens). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown (structural — FLAG, don't add). Don't touch disabled.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → FLIP transition-colors→transition-all.
- For bare icon/text-link buttons/anchors add a `rounded`/`rounded-full` so the ring traces tightly.
- A clickable shadcn <Card> is a DIV — NOT keyboard-focusable without tabIndex, so a focus-visible ring would be DEAD CODE; add press-scale only + FLAG the keyboard-a11y gap (adding tabIndex/role/onKeyDown is structural/out-of-scope).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

THREE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L72 STATUS FILTER CHIP (raw <button type="button"> MAPPED over STATUS_OPTIONS, persistent single-select segmented filter, onClick={() => setFilterStatus(s)}, base `shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors` + conditional active=`bg-foreground text-background` / inactive=`bg-muted text-muted-foreground hover:bg-muted/80`; lives in an overflow-x-auto scroller with px padding [NOT a flush overflow-hidden child]) → applied: ADDED `aria-pressed={filterStatus === s}` + FLIPPED transition-colors→transition-all + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm aria-pressed (segmented filter) + FLIP + [0.97] chips tier + OUTWARD ring-ring.

B) L90 APPLICATION CARD (shadcn <Card> used as CLICKABLE DIV, MAPPED, cursor-pointer + onClick navigate(`/personal/jobs/${a.career_jobs?.id}`), base `cursor-pointer p-3 transition-colors hover:bg-accent`, full-width list item WITH own surface bg-card; a <Card> is a DIV, NOT keyboard-focusable) → applied: FLIPPED transition-colors→transition-all + APPENDED `active:scale-[0.98]` ONLY (NO ring — non-focusable div; keyboard-a11y FLAGGED for owner). Confirm FLIP + [0.98] + NO-ring + keyboard FLAG.

C) L105 WITHDRAW BUTTON (real raw <button type="button"> nested inside the clickable Card, conditional [status !== withdrawn && !== hired], onClick={(e) => handleWithdraw(a.id, e)} [handleWithdraw e.stopPropagation()s so the Card navigate doesn't fire], base `text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-colors` [hover:text-color ON ITSELF + transition-colors, NO scale/focus]; an inline text button; nested in a Card surface [neutral bg-card, though card has hover:bg-accent]) → applied: PREPENDED `rounded` + FLIPPED transition-colors→transition-all + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm rounded + FLIP (hover:text-rose-600 is a text-COLOR → triggers transition-all) + [0.97] links tier + OUTWARD ring-ring + no-aria (visible "Withdraw" text) + onClick/stopPropagation untouched.

ALSO CONFIRM I should LEAVE: shadcn ghost Back <Button> L61 (own tokens, aria-label="Back"); shadcn Browse Jobs <Button> L86 (own tokens); the "{n} total" header span (non-interactive); the status badge <span> L101 (non-interactive); Briefcase/ArrowLeft icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) C — is the Withdraw button's FLIP to transition-all correct given hover:text-rose-600 is a text-COLOR (in the {bg,text-color,border,opacity} set)?; (2) B — clickable <Card> div scale-only no-ring + FLAG correct?; (3) A — aria-pressed correct for a single-select segmented filter chip + OUTWARD ring in an overflow-x-auto scroller?
- files: src/pages/app/personal/MyApplicationsPage.tsx

---

## Verdict: All three edits are **CORRECT** — zero changes needed.

### Per-control verification

**A) Status filter chip — `aria-pressed` + FLIP + `[0.97]` + OUTWARD ring ✅**

Final className (after the cn() base):
```
shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
- `aria-pressed={filterStatus === s}` ✅ — persistent single-select segmented filter, bg-conveyed state.
- FLIP `transition-colors`→`transition-all` ✅ — inactive branch has `hover:bg-muted/80` (bg-color ON ITSELF) + new `active:scale` → both must animate.
- `[0.97]` ✅ — chips/pills tier.
- OUTWARD `ring-ring` ✅ — chip sits in `overflow-x-auto` scroller with `px-1` padding, NOT a flush child of an `overflow-hidden` parent. Active chip's own `bg-foreground` fill but ring renders against the neutral parent. No inset.

**B) Application Card — FLIP + `[0.98]` + NO ring + FLAG ✅**

Final className:
```
cursor-pointer p-3 transition-all hover:bg-accent active:scale-[0.98]
```
- FLIP `transition-colors`→`transition-all` ✅ — `hover:bg-accent` (bg-color ON ITSELF) + new `active:scale` → both must animate.
- `[0.98]` ✅ — wide full-width WITH own surface (`bg-card` implicit from shadcn Card).
- NO ring ✅ — `<Card>` renders as `<div>`, NOT keyboard-focusable without `tabIndex`; ring would be dead code.
- Keyboard-a11y FLAG ✅ — `<div>` with `onClick` but no `tabIndex`/`role`/`onKeyDown`; owner should wrap in `<button>`/`<a>` or add `tabIndex={0} role="link" onKeyDown` then a ring can be added. Structural → flagged, not changed.

**C) Withdraw button — `rounded` + FLIP + `[0.97]` + OUTWARD ring ✅**

Final className:
```
rounded text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
- `rounded` prepended ✅ — inline text button needs it so the ring traces tightly.
- FLIP `transition-colors`→`transition-all` ✅ — `hover:text-rose-600` is a **text-COLOR**, which IS in the `{bg, text-color, border, opacity}` set → triggers `transition-all`. (This answers your question #1 directly: yes, text-color hover triggers the flip.)
- `[0.97]` ✅ — links/chips/pills tier for an inline text button.
- OUTWARD `ring-ring` ✅ — button has no fill bg at rest; parent Card is `bg-card` (neutral at rest; `hover:bg-accent` is hover-state only). Ring renders against the neutral parent surface.
- No aria ✅ — visible "Withdraw" text.
- `onClick={(e) => handleWithdraw(a.id, e)}` / `e.stopPropagation()` — byte-identical, untouched ✅.

### Leave list ✅

| Control | Reason to leave |
|---------|----------------|
| shadcn ghost Back `<Button>` L61 | Own tokens, already `aria-label="Back"` |
| shadcn Browse Jobs `<Button>` L86 | Own tokens |
| `"{n} total"` header `<span>` | Non-interactive |
| Status badge `<span>` L101 | Non-interactive |
| `Briefcase` / `ArrowLeft` icons | Decorative |

### Missed controls scan

No other raw interactive controls in scope. The file has exactly 3 raw `<button>` sites (the 7 filter chips are one mapped site, the Withdraw button is one mapped site) + 1 clickable `<Card>` div (mapped). All covered. The empty-state `<Card>` has no `onClick` — non-interactive.

### Guard-grep summary

| Metric | Count |
|--------|-------|
| className edits | 3 (A + B + C) |
| New `aria-pressed` | 1 (A) |
| `focus-visible:ring` | 2 (A + C; B correctly OMITTED) |
| `ring-ring` | 2 (both OUTWARD) |
| `ring-inset` | 0 |
| `ring-white/70` | 0 |
| `aria-label` new | 0 |
| `aria-expanded` | 0 |
| `active:scale-[0.97]` new | 2 (A + C) |
| `active:scale-[0.98]` new | 1 (B) |
| FLIPs | 3 (A + B + C) |
| NEW transitions (not flips) | 0 |
| Logic lines touched | 0 |
| `onClick`/`navigate`/`supabase`/`stopPropagation` | all byte-identical |

### Answers to your three questions

1. **C — FLIP correct for `hover:text-rose-600`?** Yes. Text-color is in the `{bg, text-color, border, opacity}` set that `transition-all` covers and `transition-colors` alone does not animate alongside a new transform. Flip is correct.
2. **B — clickable `<Card>` div scale-only no-ring + FLAG?** Yes. A `<div>` without `tabIndex` cannot receive keyboard focus, so `focus-visible:ring` is dead code. Scale-only gives valid touch feedback. The keyboard-a11y gap is flagged correctly for the owner.
3. **A — `aria-pressed` correct + OUTWARD ring in `overflow-x-auto`?** Yes. `aria-pressed` conveys the persistent single-select state of the segmented filter. The `overflow-x-auto` scroller is not `overflow-hidden` with rounded corners clipping children — the chips have horizontal scroll room and `px-1` padding — so outward ring is correct (no inset needed).

### What the owner must verify/deploy

- Run `npm run update` to confirm 0 type-errors + green build (the file was already verified as part of the diff, but the owner should re-confirm on their working tree).
- **Owner flag**: the clickable application `<Card>` divs (B) are keyboard-inaccessible — recommend wrapping in `<button>`/`<a>` or adding `tabIndex={0} role="link" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(...) }}` (then a focus ring can be added). Structural → not changed here.
- **Owner flag**: `handleWithdraw` does a live `supabase.update` — confirm RLS on `career_applications` gates `update` by `applicant_id = auth.uid()`.
- **Owner flag**: the `(supabase as any)` casts bypass typing — regenerate types when possible.

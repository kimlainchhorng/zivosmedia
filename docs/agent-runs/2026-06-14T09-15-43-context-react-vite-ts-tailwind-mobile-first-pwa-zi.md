# DeepSeek run — 2026-06-14T09:15:43.077Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/EmployerDashboardPage.tsx (564-line "Employer dashboard — partner accounts manage their company + post/manage jobs" at /personal/employer; Supabase-backed: useEffect loads career_companies (owner_id) + career_jobs (with career_applications(count)); company create/edit forms (Input/Textarea + native checkbox + native selects); job create/edit forms with a custom skill-chip input (cursor-text wrapper div that focuses a native <input>, chips each with an icon-only remove <button>); a jobs list of shadcn Cards each with a clickable job-title div [navigate to /personal/jobs/:id] + shadcn Edit/View/Close-Reopen Buttons + an inline toggle-confirm row; an Applicants inbox shadcn Sheet with Shortlist/Hire/Reject shadcn Buttons). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, supabase, onChange, onKeyDown, disabled, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Badge>/<Input>/<Textarea>/<Sheet> (own tokens). Don't add role/tabIndex/onKeyDown (structural — FLAG, don't add). Don't touch disabled. LEAVE native form fields (checkboxes, selects, text inputs — native focus outline + existing aria-label).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → use transition-all (FLIP from transition-colors, or ADD transition-all where there was no transition class).
- For bare icon/text-link buttons/anchors add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.
- Clickable DIV (not a <button>/<a>): NOT keyboard-focusable without tabIndex → focus-visible:ring would be DEAD CODE. So add press-scale + correct transition, OMIT the focus ring, and FLAG the keyboard-a11y gap (tabIndex/role/onKeyDown is structural/out-of-scope).

THREE edits applied — confirm CORRECT or NEEDS-FIX:

A) L346 SKILL-REMOVE BUTTON (create-job form) — raw icon-only `<button type="button" aria-label={`Remove ${s}`} onClick={() => setJSkillsArr(...)}>` wrapping an `<X className="h-3 w-3 text-muted-foreground hover:text-foreground" />`. BEFORE: NO className at all on the button (no rounded, no transition, no scale, no focus). The hover:text-foreground is on the X ICON (child), NOT on the button element. The button sits inside a skill chip `inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2.5 py-0.5` (neutral secondary surface). → applied: ADDED `className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`. Confirm: transition-transform (scale is the ONLY animated prop ON THE BUTTON — the hover:text-foreground is on the child icon, not the button) + icon-only active:scale-95 tier + rounded-full so the ring traces the tiny X + OUTWARD ring-ring on neutral bg-secondary chip + NO new aria (aria-label already present) + onClick byte-identical.

B) L402 SKILL-REMOVE BUTTON (edit-job form) — IDENTICAL to A except onClick={() => setEditJSkillsArr(...)}. Same className added. Confirm same as A.

C) L448 CLICKABLE JOB-TITLE DIV — `<div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/personal/jobs/${j.id}`)}>` (a clickable DIV, NOT a button/anchor; sits inside an applicant/job shadcn Card `p-3`; it's the `flex-1` title block in a row alongside shadcn Edit/View/Close Buttons; NO own surface [transparent inside the Card], NO hover bg/color on itself, just cursor-pointer). → applied: APPENDED `transition-transform active:scale-[0.99]` (transition-transform — scale is the only animated prop, no hover color; active:scale-[0.99] "bare row NO own surface" tier since the div is surfaceless flex-1 content; NO focus ring — a DIV is not keyboard-focusable so a ring would be dead code; keyboard a11y FLAGGED for owner — tabIndex/role/onKeyDown is structural/out-of-scope; navigate byte-identical).

ALSO CONFIRM I should LEAVE: all shadcn `<Button>` (Apply-Partner, Create/Save/Cancel company, Post-Job toggle, Create/Save/Cancel job, Edit-company icon ghost, Edit-job icon ghost, View, Close/Reopen, toggle-confirm Confirm/Cancel, Shortlist/Hire/Reject) — own tokens; the shadcn `<Badge>`, `<Input>`, `<Textarea>`, `<Sheet>`/`SheetContent` — own tokens; the native checkbox `<input type="checkbox">` (L368, L424) + native `<select>` (employment type L370/L426, salary currency L378/L434) + the native skills text `<input>` (L349, L405) — native form fields, LEAVE (native focus outline is house standard); the skills-chip cursor-text WRAPPER div (L342, L398) `rounded-md border border-input bg-background p-2 min-h-[42px] flex flex-wrap gap-1.5 cursor-text` with onClick={focus the input} — this is a TEXT-INPUT wrapper (behaves as the input's click target), NOT a press target → a press-scale is INAPPROPRIATE, LEAVE; the company logo `<img>` (L301, alt="") + Building2 fallback (decorative); all lucide icons (decorative).

Be concise and exact. Return the precise final className after-string for A/B/C + any aria. Flag any other in-scope raw interactive control I missed. Note especially: (1) A/B — is transition-transform correct given the hover:text-foreground is on the CHILD icon not the button? + is active:scale-95 + rounded-full + OUTWARD ring-ring on the bg-secondary chip correct?; (2) C — is active:scale-[0.99] the right tier for a SURFACELESS flex-1 clickable content div (vs [0.98])? + is OMITTING the ring + FLAGGING keyboard correct for a clickable DIV? + transition-transform correct (no hover color)?; (3) the skills cursor-text wrapper div — LEAVE (it's an input click-target, not a press target), correct?
- files: src/pages/app/personal/EmployerDashboardPage.tsx

---

## Review: EmployerDashboardPage.tsx — 3 edits confirmed CORRECT

### A) L346 Skill-remove button (create-job form)

**Final className:** `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Verdict: CORRECT.** All design tokens match:
- `transition-transform` — scale is the ONLY animated prop ON THE BUTTON element. The `hover:text-foreground` is on the child `<X>` icon, NOT on the button. ✅
- `active:scale-95` — correct icon-only tier. ✅
- `rounded-full` — ring traces the tiny X button tightly. ✅
- OUTWARD `ring-ring` — button sits inside a `bg-secondary border border-border` chip (neutral parent). ✅
- `aria-label` already present. ✅
- `onClick` byte-identical. ✅

### B) L402 Skill-remove button (edit-job form)

**Final className:** `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**Verdict: CORRECT.** Identical to A. Same reasoning applies. ✅

### C) L448 Clickable job-title DIV

**Final className:** `min-w-0 flex-1 cursor-pointer transition-transform active:scale-[0.99]`

**Verdict: CORRECT.** All design tokens match:
- `transition-transform` — scale is the only animated prop (no hover color/bg on the div itself). ✅
- `active:scale-[0.99]` — correct "bare row NO own surface" tier. The div is a surfaceless `flex-1` content block inside the Card, no border/rounded/bg of its own. ✅
- NO focus ring — correct for a clickable `<div>` (not keyboard-focusable without `tabIndex`; ring would be dead code). ✅
- Keyboard a11y FLAG is correct — structural change (tabIndex/role/onKeyDown) is out of scope. ✅
- `onClick`/`navigate` byte-identical. ✅

### Leave list — CONFIRMED CORRECT

| Control | Reason |
|---------|--------|
| All shadcn `<Button>` (Apply-Partner, Create/Save/Cancel company, Post-Job, Create/Save/Cancel job, Edit-company ghost, Edit-job ghost, View, Close/Reopen, Confirm/Cancel, Shortlist/Hire/Reject) | Own tokens |
| shadcn `<Badge>`, `<Input>`, `<Textarea>`, `<Sheet>`/`<SheetContent>` | Own tokens |
| Native checkbox `<input type="checkbox">` (L368, L424) | Native form field — house standard |
| Native `<select>` (L370, L378, L426, L434) | Native form field — house standard |
| Native skills text `<input>` (L349, L405) | Native form field — house standard |
| Skills-chip cursor-text wrapper div (L342, L398) | Text-input click-target, NOT a press target — press-scale inappropriate |
| Company logo `<img>` (L301) | Decorative (`alt=""`) |
| All lucide icons | Decorative |

### No other raw interactive controls missed

I scanned every `<button>`, `<a>`, `<div onClick>`, `<span onClick>` in the file. The only raw interactive controls are the 3 edited above. All other interactive elements are shadcn components (own tokens) or native form fields (leave).

### Summary

All 3 edits are **CORRECT**. No changes needed. The diff is ready to apply.

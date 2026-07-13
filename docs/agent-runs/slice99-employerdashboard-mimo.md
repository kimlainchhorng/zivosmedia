# MiMo run — 2026-06-14T09:16:49.321Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verdict: All three edits CORRECT. Leave-list complete. No missed controls.

---

### A — Skill-remove button (create-job form, ~L346)

**Final className:** `"rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

| Check | Result |
|---|---|
| `transition-transform` (not `transition-all`) | ✅ `hover:text-foreground` is on the child `<X>` icon, **not** on the `<button>` — scale is the sole animated prop on the button element |
| `active:scale-95` | ✅ icon-only tier (wraps a single `h-3 w-3` X icon) |
| `rounded-full` | ✅ traces the tiny icon button tightly for ring |
| OUTWARD `ring-ring` | ✅ neutral `bg-secondary` chip parent |
| No new aria | ✅ `aria-label={`Remove ${s}`}` pre-existing kept |
| `onClick` byte-identical | ✅ className-only edit |

### B — Skill-remove button (edit-job form, ~L402)

**Final className:** identical to A.

Same analysis. `onClick={() => setEditJSkillsArr(...)}` byte-identical. ✅

### C — Clickable job-title div (~L448)

**Final className:** `"min-w-0 flex-1 cursor-pointer transition-transform active:scale-[0.99]"`

| Check | Result |
|---|---|
| `transition-transform` (not `transition-all`) | ✅ no hover bg/color/border on the element (`cursor-pointer` is not an animated prop) → scale is sole animated prop |
| `active:scale-[0.99]` | ✅ bare surfaceless flex-1 content div — "bare full-width row NO own surface" tier; NOT `[0.98]` (that's for elements with own surface/border) |
| No focus ring | ✅ `<div>` is not keyboard-focusable without `tabIndex` → ring would be dead code |
| Keyboard a11y gap | **FLAG** — `tabIndex={0} role="link" onKeyDown` is structural/out-of-scope; owner should consider wrapping in `<a>` or adding those attrs |
| `navigate` byte-identical | ✅ className-only append |

---

### Leave-list — all CORRECT, nothing missed

| Control | Rationale | Verdict |
|---|---|---|
| All shadcn `<Button>` (20+ instances: Back, Apply-Partner, Create/Save/Cancel company, Post-Job toggle, Create/Save/Cancel job, Edit/View/Close-Reopen, Confirm/Cancel toggle, Shortlist/Hire/Reject) | Own tokens | ✅ LEAVE |
| `<Badge>`, `<Input>`, `<Textarea>`, `<Sheet>`/`<SheetContent>` | Own tokens | ✅ LEAVE |
| Native `<input type="checkbox">` (×2) | Native form field, native focus outline = house standard | ✅ LEAVE |
| Native `<select>` (×4: employment type ×2, salary currency ×2) | Native form field | ✅ LEAVE |
| Native skills text `<input>` (×2) | Native form field, `onKeyDown` handler untouched | ✅ LEAVE |
| Skills-chip cursor-text wrapper `<div>` (×2, `cursor-text` + `onClick` focuses inner input) | Text-input click-target, NOT a press target — press-scale would bounce on every click-to-type | ✅ LEAVE |
| Company logo `<img alt="">` + `Building2` fallback | Decorative | ✅ LEAVE |
| All lucide icons | Decorative | ✅ LEAVE |

**No other raw interactive controls exist in this file** — every remaining clickable element is either a shadcn `<Button>` (own tokens) or inside the applicant Sheet (also shadcn Buttons).

---

### Guard-grep summary

```
className edits:      2 (A + B via identical pattern, C)
new aria attributes:  0
focus-visible:ring:   2 (A + B; C correctly OMITTED — non-focusable div)
ring-ring:            2 (both OUTWARD on neutral bg-secondary)
ring-inset:           0
active:scale-95:      2 (A + B)
active:scale-[0.99]:  1 (C)
FLIPs:                0 (A/B had no prior transition; C had no prior transition)
NEW transitions:      3 (A transition-transform, B transition-transform, C transition-transform)
disabled touched:     0
onClick/navigate/supabase byte-identical: yes, 0 logic lines touched
```

### Owner action

No code changes needed — edits A, B, C are already applied and verified correct. Run `npm run update` to gate, then commit when ready. The keyboard-a11y gap on the clickable job-title `<div>` (C) is flagged: consider wrapping it in a `<a>` or adding `tabIndex={0} role="link" onKeyDown` in a future structural pass.

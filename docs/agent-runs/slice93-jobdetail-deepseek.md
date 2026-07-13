# DeepSeek run — 2026-06-14T08:48:21.026Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/JobDetailPage.tsx (264-line "Job detail + Apply flow" — a single job at /personal/jobs/:id; Supabase-backed: a useEffect loads the job via career_jobs.select(...).eq(id).maybeSingle(), increments view_count once via a useRef guard, fetches similarJobs from same company, checks hasApplied + cvId for the signed-in user; handleApply uploads a resume PDF to supabase.storage + inserts into career_applications; toggleSave persists to localStorage("saved_jobs"); useState job/loading/hasApplied/applying/coverNote/resumeFile/cvId/similarJobs/isSaved; layout: a sticky header [shadcn ghost Back Button + truncated title + a view-count span + shadcn ghost Bookmark/save Button] + content Cards [company header w/ a raw company-name link button, About/Responsibilities/Requirements/Skills cards, a "More from this company" card w/ raw similar-job row buttons] + an Apply card [shadcn Textarea + a hidden file <input> + shadcn Upload/Create-CV/Submit Buttons]). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, toggleSave, handleApply, supabase, localStorage, useRef, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Textarea> (own tokens). Don't churn the hidden file <input> (has aria-label, hidden). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown. Don't touch disabled.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented-filter active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE BUTTON ITSELF. (hover:underline is text-decoration, NOT in that list, NOT smoothly transitionable → does NOT trigger transition-all.)
- FLIP: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → FLIP transition-colors→transition-all.
- For bare icon/text-link buttons add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L153 COMPANY-NAME link button (raw <button>, one-shot onClick={() => navigate(`/personal/companies/${job.career_companies?.id}`)}, VISIBLE text the company name, base `text-sm font-semibold hover:underline` [has hover:underline text-decoration ON ITSELF but NO transition/scale/focus]; an inline text link inside the company-header Card bg-card neutral) → applied: APPENDED `rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (links tier [0.97]; transition-transform NEW — scale is the SOLE animated prop [hover:underline is text-decoration, not bg/text-color/border/opacity, not smoothly transitionable → does NOT trigger transition-all], no prior transition; `rounded` so the ring traces the inline text link tightly; OUTWARD ring-ring on the neutral bg-card; NO aria — visible text). Confirm [0.97] + transition-transform NEW (NOT transition-all — hover:underline doesn't count) + rounded + OUTWARD ring-ring + no-aria.

B) L199 SIMILAR-JOB row button (raw <button>, MAPPED over similarJobs, one-shot onClick={() => navigate(`/personal/jobs/${j.id}`)}, VISIBLE text job title/meta, base `w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent transition-colors` [has hover:bg-accent bg hover ON ITSELF + transition-colors, NO scale/focus/aria], a full-width bordered row [rounded-lg border, transparent bg w/ hover:bg-accent] inside the "More from this company" Card bg-card neutral) → applied: FLIPPED `transition-colors`→`transition-all` + APPENDED `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (wide full-width WITH own surface tier [0.98] — the rounded-lg border defines a contained card-row surface; FLIP — new active:scale + the hover:bg-accent must keep animating → transition-all; OUTWARD ring-ring — rounded-lg present so the ring traces, renders against the neutral Card parent; NO aria — visible text). Confirm tier [0.98] (vs [0.99] bare row) + FLIP transition-colors→transition-all + OUTWARD ring-ring + no-aria.

ALSO CONFIRM I should LEAVE: the shadcn ghost Back <Button> L132 (own tokens, aria-label="Back"); the shadcn ghost Bookmark/save <Button> L141 (own tokens, dynamic aria-label={isSaved ? "Unsave job" : "Save job"}); the shadcn <Textarea> L231 (own tokens); the hidden file <input> L238 (hidden, ALREADY aria-label="Upload resume PDF", driven via the Upload button — don't churn); the shadcn Upload <Button> L246 / Create-CV <Button> L252 / Submit-Application <Button> L256 (own tokens, disabled untouched); the non-clickable content Cards L147/168/174/180/186/195/221/225/229 (NO onClick — content only); the view-count <span> L137 (non-interactive); the skill <span>s L189 (non-interactive); all icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) A — is transition-transform correct (NOT transition-all) given hover:underline is text-decoration not a color/bg/border/opacity prop; (2) B — is [0.98] the right tier for a full-width bordered (rounded-lg border, hover:bg-accent) row vs [0.99] bare-row.
- files: src/pages/app/personal/JobDetailPage.tsx

---

## Review of Edits A & B on `src/pages/app/personal/JobDetailPage.tsx`

### Edit A — Company-name link button (L153)

**CORRECT.** Your applied className is right:

```
text-sm font-semibold hover:underline rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- `[0.97]` ✅ — inline text link tier
- `transition-transform` ✅ — `hover:underline` is `text-decoration`, NOT a color/bg/border/opacity prop → does NOT trigger `transition-all`. Scale is the sole animated prop.
- `rounded` ✅ — tight ring trace on inline text
- OUTWARD `ring-ring` ✅ — neutral `bg-card` parent
- No `aria-label` ✅ — visible text

### Edit B — Similar-job row button (L199)

**CORRECT.** Your applied className is right:

```
w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- `[0.98]` ✅ — wide full-width WITH own surface (the `rounded-lg border` defines a contained card-row surface). NOT `[0.99]` bare-row.
- FLIP `transition-colors`→`transition-all` ✅ — new `active:scale` + existing `hover:bg-accent` must both animate
- OUTWARD `ring-ring` ✅ — `rounded-lg` present, renders against neutral `bg-card` parent
- No `aria-label` ✅ — visible text

### Controls to LEAVE (confirmed)

✅ shadcn ghost Back `<Button>` L132 — own tokens, `aria-label="Back"`
✅ shadcn ghost Bookmark `<Button>` L141 — own tokens, dynamic `aria-label`
✅ shadcn `<Textarea>` L231 — own tokens
✅ hidden file `<input>` L238 — hidden, `aria-label` present
✅ shadcn Upload/Create-CV/Submit `<Button>`s L246/252/256 — own tokens, `disabled` untouched
✅ All non-clickable content Cards — no `onClick`
✅ View-count `<span>` L137 — non-interactive
✅ Skill `<span>`s L189 — non-interactive
✅ All icons — decorative

### No other raw interactive controls missed

The page has exactly 2 raw `<button>`s (A + B). All other interactive elements are shadcn components (left untouched) or the hidden file input (left untouched).

### Summary

| Control | Tier | Scale | Transition | Ring | Aria |
|---------|------|-------|-----------|------|------|
| A — Company name link | `[0.97]` | NEW | `transition-transform` NEW (hover:underline doesn't count) | OUTWARD `ring-ring` | none |
| B — Similar job row | `[0.98]` | NEW | FLIP `transition-colors`→`transition-all` | OUTWARD `ring-ring` | none |

**Both edits are CORRECT. No changes needed.** Ready for `npm run update` verification.

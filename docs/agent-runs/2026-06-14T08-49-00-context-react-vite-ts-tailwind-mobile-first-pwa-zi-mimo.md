# MiMo run — 2026-06-14T08:49:00.944Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verdict: Both A and B are **CORRECT**. No changes needed.

### (A) Company-name link — ✅ CORRECT

| Check | Result |
|-------|--------|
| Tier `[0.97]` | ✅ inline text link → links tier |
| `transition-transform` (not `transition-all`) | ✅ `hover:underline` is text-decoration, NOT bg/text-color/border/opacity → does NOT trigger `transition-all`; scale is the sole animated prop → `transition-transform` NEW |
| `rounded` | ✅ ring traces tightly around inline text |
| OUTWARD `ring-ring` | ✅ neutral `bg-card` parent |
| no-aria | ✅ visible company name text |

### (B) Similar-job row — ✅ CORRECT

| Check | Result |
|-------|--------|
| Tier `[0.98]` (not `[0.99]`) | ✅ `rounded-lg border border-border` defines a contained card-row surface with visible border → "wide full-width WITH own surface", not a bare row |
| FLIP `transition-colors` → `transition-all` | ✅ new `active:scale-[0.98]` + existing `hover:bg-accent` both must animate |
| OUTWARD `ring-ring` | ✅ `rounded-lg` present, neutral `bg-card` parent |
| no-aria | ✅ visible title/location/type text |

### Leave-list — ✅ ALL CORRECT, no missed controls

All 11 skip categories confirmed:
- shadcn `<Button>` ×4 (Back/Bookmark/Upload/CreateCV/Submit) — own tokens
- shadcn `<Textarea>` — own tokens
- Hidden `<input type="file">` — already `aria-label="Upload resume PDF"`, `className="hidden"`
- Non-interactive: content Cards (no `onClick`), view-count `<span>`, skill `<span>`s, all icons

Scanned every raw `<button>` in the file — only 2 exist: the company-name link (A) and the similar-job row (B). Zero missed.

### Guard-grep summary

```
className edits:    2 (A + B)
new aria attrs:     0
focus-visible:ring: 2, ring-ring: 2 (both OUTWARD)
ring-inset:         0
ring-white/70:     0
active:scale-[0.97]: 1 new (A)
active:scale-[0.98]: 1 new (B)
FLIPs:              1 (B transition-colors→transition-all)
NEW transitions:    1 (A transition-transform NEW)
logic lines touched: 0
```

### Answers to the two specific questions

**(1)** A — `transition-transform` is correct, **not** `transition-all`. The token rule is explicit: `hover:underline` is text-decoration, not in the `{bg, text-color, border, opacity}` set that triggers `transition-all`. Scale-only → `transition-transform`.

**(2)** B — `[0.98]` is correct, **not** `[0.99]`. The `rounded-lg border border-border` gives a contained surface with a visible border + `hover:bg-accent` fills it → matches "wide full-width WITH own surface". A `[0.99]` bare row would be borderless/transparent with no own surface definition.

### Owner action

The working tree already has both edits applied and is ready. Run `npm run update` to confirm green, then commit.

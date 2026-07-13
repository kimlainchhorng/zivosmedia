# DeepSeek run — 2026-06-14T08:51:39.398Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/CompanyDetailPage.tsx (79-line "Company detail — shows company info and its open jobs" at /personal/companies/:id; Supabase-backed: a useEffect loads career_companies.select("*").eq(id).maybeSingle() + career_jobs (status=open) for the company; useState company/jobs/loading; layout: a sticky header [shadcn ghost Back Button + truncated company name] + a company-info Card [logo, name, a Verified badge span, industry, location span, a raw external Website <a> link] + an "Open Jobs" section [clickable shadcn Card job items navigating to /personal/jobs/:id]). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, supabase, href/target/rel, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button> (own tokens). Don't change href/target/rel. Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown (structural — FLAG, don't add). Don't touch disabled.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF. (hover:underline is text-decoration, NOT in that list, NOT smoothly transitionable → does NOT trigger transition-all.)
- FLIP: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → FLIP transition-colors→transition-all.
- For bare icon/text-link buttons/anchors add a `rounded`/`rounded-full` so the ring traces tightly.
- A clickable shadcn <Card> is a DIV — NOT keyboard-focusable without tabIndex, so a focus-visible ring would be DEAD CODE; add press-scale only + FLAG the keyboard-a11y gap (adding tabIndex/role/onKeyDown is structural/out-of-scope).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L57 WEBSITE external link (raw <a href={company.website} target="_blank" rel="noreferrer">, VISIBLE text "Website" + a Globe icon, base `inline-flex items-center gap-1 text-primary hover:underline` [has a hover:underline text-decoration ON ITSELF but NO transition/scale/focus]; an inline text link inside the company-info Card bg-card neutral; an <a> is natively keyboard-focusable) → applied: APPENDED `rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (links tier [0.97]; transition-transform NEW — scale is the SOLE animated prop [hover:underline is text-decoration, not bg/text-color/border/opacity → does NOT trigger transition-all], no prior transition; `rounded` so the ring traces the inline link tightly; OUTWARD ring-ring on the neutral bg-card; NO aria — visible "Website" text; href/target/rel byte-identical). Confirm [0.97] + transition-transform NEW (NOT transition-all — hover:underline doesn't count) + rounded + OUTWARD ring-ring + no-aria + href/target/rel untouched.

B) L69 JOB card (shadcn <Card> used as a CLICKABLE DIV, MAPPED over jobs, cursor-pointer + onClick={() => navigate(`/personal/jobs/${j.id}`)}, base `cursor-pointer p-3 transition-colors hover:bg-accent` [hover:bg-accent bg hover ON ITSELF + transition-colors, NO active/scale/focus], full-width list item WITH own surface bg-card; a <Card> is a DIV, NOT keyboard-focusable [no tabIndex]) → applied: FLIPPED `transition-colors`→`transition-all` + APPENDED `active:scale-[0.98]` ONLY (NO focus ring — a non-focusable div can't show focus-visible; adding tabIndex/role/onKeyDown is STRUCTURAL = out of scope → FLAGGED for owner; wide full-width WITH own surface tier [0.98]; FLIP — new scale + hover:bg-accent must animate → transition-all). Confirm FLIP + [0.98] + NO-ring (non-focusable div) + keyboard-a11y FLAG.

ALSO CONFIRM I should LEAVE: the shadcn ghost Back <Button> L37 (own tokens, aria-label="Back"); the Verified badge <span> L52 (non-interactive); the location <span> L56 (non-interactive); the company name/industry/description <h1>/<h2>/<p>s (non-interactive); the empty-state Card L66 (non-interactive); all ArrowLeft/Building2/Globe/MapPin/Briefcase icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) A — is transition-transform correct (NOT transition-all) given hover:underline is text-decoration; and is press-scale appropriate on a small inline external <a> link at all (vs ring-only)?; (2) B — clickable <Card> div: scale-only no-ring + FLAG correct (consistent with prior slices)?
- files: src/pages/app/personal/CompanyDetailPage.tsx

---

## Review: CompanyDetailPage.tsx — Both edits CORRECT

### (A) Website `<a>` link — **CORRECT**

- **`[0.97]`** — correct tier for an inline text link
- **`transition-transform` NEW** — correct: `hover:underline` is text-decoration, NOT in the `{bg, text-color, border, opacity}` set that triggers `transition-all`. Scale is the sole animated prop.
- **`rounded`** — correct for tight ring tracing on an inline link
- **OUTWARD `ring-ring`** — correct: the link is inside a `Card` `p-4` (not a flush edge child of an overflow-hidden parent)
- **No aria** — correct: visible "Website" text
- **`href/target/rel`** — untouched ✓

**Final className:**
```
inline-flex items-center gap-1 text-primary hover:underline rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

### (B) Clickable `<Card>` job row — **CORRECT**

- **FLIP `transition-colors`→`transition-all`** — correct: new `active:scale-[0.98]` + existing `hover:bg-accent` must both animate
- **`[0.98]`** — correct: wide full-width WITH own surface (`bg-card`)
- **NO focus ring** — correct: `<Card>` renders as a `<div>`, not keyboard-focusable without `tabIndex`. Adding a `focus-visible:ring` would be dead code.
- **Keyboard-a11y FLAG** — correct: owner should add `tabIndex={0} role="link" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(...) }}` (structural, out of scope here)

**Final className:**
```
cursor-pointer p-3 transition-all hover:bg-accent active:scale-[0.98]
```

### Controls to LEAVE (confirmed)

| Control | Reason |
|---------|--------|
| shadcn ghost Back `<Button>` L37 | Own tokens, `aria-label="Back"` ✓ |
| Verified badge `<span>` L52 | Non-interactive ✓ |
| Location `<span>` L56 | Non-interactive ✓ |
| Company name/industry/description | Non-interactive ✓ |
| Empty-state `<Card>` L66 | Non-interactive ✓ |
| All icons (`ArrowLeft`/`Building2`/`Globe`/`MapPin`/`Briefcase`) | Decorative ✓ |

### No missed raw interactive controls

The page has exactly 2 interactive raw controls (the `<a>` and the clickable `<Card>`). The shadcn `<Button>` is left per the rule. **No other in-scope controls.**

### Summary

| Control | Edit type | Scale | Ring | Flip | New transition | Aria |
|---------|-----------|-------|------|------|----------------|------|
| A: Website `<a>` | Append | `[0.97]` | OUTWARD `ring-ring` | No | `transition-transform` | None |
| B: Job `<Card>` div | Flip + append | `[0.98]` | None (non-focusable div) | `transition-colors`→`transition-all` | — | None |

**Both edits are correct. No changes needed.** The diff in the file already matches the working tree.

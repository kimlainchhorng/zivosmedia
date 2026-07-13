# MiMo run — 2026-06-14T08:44:43.517Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/FindEmployeePage.tsx (263-line "Careers" — browse companies + open jobs at the personal careers route; Supabase-backed: useEffect loads career_companies + career_jobs (status=open) via supabase.from(...).select(...), a 2nd useEffect checks isEmployer; useState tab/q/companies/jobs/loading/isEmployer/filterType/visibleCount; useMemo filteredJobs/filteredCompanies; layout: a sticky header [shadcn ghost Back Button + "Careers" + shadcn My Apps/My Jobs Buttons] + a shadcn Input search + a raw filter-chip strip + an "Are you hiring?" Card [shadcn Post Button + a raw "Apply for Partner" link button] + shadcn Tabs [Jobs/Companies/Talent] + lists of clickable shadcn Card job/company items + a shadcn Load More Button). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, setFilterType, supabase calls, useMemo, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Input>/<Tabs>/<TabsTrigger> (own tokens). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown (structural — FLAG, don't add). Don't touch disabled.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted, faint tints) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented-filter active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF.
- FLIP: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover color/bg/border ON ITSELF → FLIP transition-colors→transition-all.
- DON'T-CHURN: a control that ALREADY has active:scale + transition → ADD ring (+aria) ONLY.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

FOUR edits applied — confirm each CORRECT or NEEDS-FIX:

A) L142 FILTER chip (raw <button>, MAPPED over ["all","remote","full_time","part_time","contract"], single-select segmented filter, selection conveyed via cn() conditional `filterType === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80"` [INACTIVE branch has hover:bg-muted/80 bg-color hover ON THE BUTTON], one-shot onClick={() => setFilterType(f)}, VISIBLE text label; cn() static base `shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors` [ALREADY transition-colors], NO scale/focus/aria; container = `flex gap-2 overflow-x-auto pb-1 -mx-1 px-1` on the page bg-background neutral) → applied: ADDED `aria-pressed={filterType === f}` + FLIPPED `transition-colors`→`transition-all` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented-filter tier [0.97]; FLIP — new active:scale transform + inactive branch hover:bg-muted/80 + active bg-foreground wash must animate → transition-all; OUTWARD ring-ring — active chip's own bg-foreground fill but the outward ring renders against the neutral page; aria-pressed — persistent single-select filter). Confirm aria-pressed + FLIP + [0.97] + OUTWARD ring-ring.

B) L166 "APPLY FOR PARTNER" link button (raw <button>, one-shot onClick={() => navigate("/become-partner")}, VISIBLE text "Not a Partner yet? Apply for Partner access →", base `mt-2 w-full rounded-md bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors` [has hover:bg-emerald-500/20 bg-color hover ON ITSELF + transition-colors but NO active press/scale/focus], full-width WITH own surface bg-emerald-500/10; parent = the "Are you hiring?" shadcn Card bg-card neutral) → applied: FLIPPED `transition-colors`→`transition-all` + APPENDED `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (wide full-width WITH own surface tier [0.98]; FLIP — new active:scale + the hover:bg-emerald-500/20 must keep animating → transition-all; OUTWARD ring-ring — the button's own bg-emerald-500/10 fill but the outward ring renders against the neutral Card; NO aria — visible text). Confirm FLIP + [0.98] + OUTWARD ring-ring + no-aria.

C) L202 JOB card + L243 COMPANY card (shadcn <Card> used as a CLICKABLE DIV — cursor-pointer + onClick={() => navigate(`/personal/jobs/${j.id}`)} / navigate(`/personal/companies/${c.id}`), base `cursor-pointer p-4 transition-colors hover:bg-accent` [hover:bg-accent bg hover ON ITSELF + transition-colors, NO active/scale/focus], full-width list item WITH own surface bg-card; NOTE: a <Card> is a DIV, NOT a <button> — it is NOT keyboard-focusable [no tabIndex] so a focus-visible ring would not render) → applied to BOTH: FLIPPED `transition-colors`→`transition-all` + APPENDED `active:scale-[0.98]` ONLY (NO focus ring — a non-focusable div can't show focus-visible; adding tabIndex/role/onKeyDown is STRUCTURAL = out of scope → FLAGGED for owner; press-scale [0.98] gives touch press feedback; FLIP — new scale + hover:bg-accent must animate → transition-all). **QUESTION: Is it correct to add active:scale-[0.98] press feedback to a clickable <Card> DIV but OMIT the focus ring (since a div isn't focusable without tabIndex, which is structural/out-of-scope) and FLAG the missing keyboard a11y? Or should the clickable Cards be LEFT entirely untouched (shadcn, don't-churn)? Or should a focus ring be added anyway?**

ALSO CONFIRM I should LEAVE: the shadcn ghost Back <Button> L110 (own tokens, has aria-label="Back"); the shadcn My Apps L116 / My Jobs L121 / Post L161 / Load More L231 <Button>s (own tokens); the shadcn <Input> search L131 (own tokens); the shadcn <Tabs>/<TabsList>/<TabsTrigger>/<TabsContent> L176-194 (own tokens); the non-interactive "Are you hiring?" Card header L150 (the Card itself is non-clickable — only its inner buttons are); FindTalentTab L192 (separate component); all icons (decorative); the search <Input>'s Search icon (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) C — the clickable <Card> DIV question above (scale-only no-ring + FLAG, vs leave, vs add-ring); (2) A — is the transition-colors→transition-all FLIP correct on the filter chip given the inactive branch's hover:bg-muted/80; (3) B — is [0.98] the right tier for the full-width Partner link with its own bg-emerald-500/10 surface.
- files: src/pages/app/personal/FindEmployeePage.tsx

---

## Verdict

**All four edits are CORRECT. Zero changes needed.**

### Per-control audit

| # | Control | Edit | Verdict |
|---|---------|------|---------|
| **A** | Filter chip ×5 (`<button>`, segmented filter) | `aria-pressed` + FLIP `transition-colors`→`transition-all` + `[0.97]` + OUTWARD `ring-ring` | ✅ CORRECT. Inactive branch's `hover:bg-muted/80` + active `bg-foreground` + new `active:scale` → all must animate → FLIP is mandatory. `aria-pressed` for persistent single-select. Outward ring renders against the neutral `bg-background` page. |
| **B** | "Apply for Partner" `<button>` | FLIP + `[0.98]` + OUTWARD `ring-ring` + no-aria | ✅ CORRECT. Full-width WITH own surface (`bg-emerald-500/10`) → `[0.98]` is the right tier. `hover:bg-emerald-500/20` + new scale → FLIP mandatory. Outward ring against neutral Card parent. Visible text → no aria. |
| **C** | Job card `<Card>` L202 + Company card `<Card>` L243 | FLIP + `active:scale-[0.98]` only, NO focus ring | ✅ CORRECT. A `<Card>` is a `<div>` — without `tabIndex` it's not keyboard-focusable, so `focus-visible:ring` would be dead code. Adding `tabIndex`/`role`/`onKeyDown` is structural → correctly FLAGGED, not added. `active:scale-[0.98]` gives valid touch feedback. Full-width list item WITH own surface (`bg-card`) → `[0.98]`. FLIP mandatory (existing `hover:bg-accent` + new scale). |

### Final className strings

**A** (filter chip — inside `cn()` static part):
```
shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
+ `aria-pressed={filterType === f}`

**B** (Apply for Partner):
```
mt-2 w-full rounded-md bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**C** (Job cards + Company cards — identical):
```
cursor-pointer p-4 transition-all hover:bg-accent active:scale-[0.98]
```

### Leave list confirmed ✅

All of these are correctly left untouched:
- Shadcn ghost Back `<Button>` L110 (own tokens, already has `aria-label="Back"`)
- My Apps L116 / My Jobs L121 / Post L161 / Load More L231 `<Button>`s (own tokens)
- `<Input>` search L131 (own tokens)
- `<Tabs>`/`<TabsList>`/`<TabsTrigger>`/`<TabsContent>` L176–194 (own tokens)
- Non-interactive "Are you hiring?" Card header L150
- `FindTalentTab` L192 (separate component)
- All icons (decorative)
- Empty-state Cards L198, L229 (non-interactive)

### Missed raw interactive controls

**None.** Every raw `<button>` and clickable element is covered.

### Flags for the owner

1. **Clickable `<Card>` DIVs (C) need keyboard a11y** — both job cards (L202) and company cards (L243) are `<div>`s with `onClick` but no `tabIndex`/`role`/`onKeyDown`. A keyboard user cannot reach or activate them. Suggested fix (structural, owner-only): add `tabIndex={0}`, `role="link"`, and an `onKeyDown` handler that calls navigate on Enter/Space. Then a focus-visible ring can be added.
2. **Sub-44px tap targets** (flag, not fix) — the filter chips are `py-1` (~26px height); the "Apply for Partner" button is `py-1.5` (~28px). Both below 44px but consistent with repo-wide compact patterns.

### Guard-grep stats

- className edits: 4 (A filter chip static-string, B partner button, C job cards, C company cards)
- aria attrs: 1 new (`aria-pressed` on A; kept existing `aria-label="Back"` on Back Button)
- `focus-visible:ring` = 2 (A + B; C correctly omitted)
- `ring-ring` = 2, `ring-inset` = 0, `ring-white/70` = 0
- `active:scale-[0.97]` = 1 new (A), `active:scale-[0.98]` = 3 new (B + C×2)
- FLIPs = 3 (A + B + C — all from `transition-colors`→`transition-all`)
- `aria-pressed` = 1 new (A)
- Every `onClick`/`navigate`/`setFilterType`/`setTab`/`supabase`/`useMemo` byte-identical, 0 logic lines touched

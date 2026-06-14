# MiMo run — 2026-06-14T09:02:46.208Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/ApplyJobHubPage.tsx (204-line "Jobs Hub" at /personal/apply-job; Supabase + react-query: 3 useQuery (profile for CV readiness, career_applications count, recent open career_jobs limit 5); useMemo cvScore; framer-motion entrance anims; layout: sticky header [raw Back button + title] + a 2-col stats grid [CV Readiness motion.div w/ a "Complete profile →" link-button + Applications motion.div w/ a "View all →" link-button] + a "Quick Actions" list of 3 motion.button rows (navigate to create-cv/find-employee/employer) + a "Open Positions" section [a "See all" text button + a list of recent-job motion.button rows navigating to /personal/jobs/:id]). RULES: className strings + display-only aria-* + interaction-anim prop (whileTap) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Badge>/<Progress> (own tokens). Don't renumber an existing scale (the Back button already ships active:scale-90 — keep it). Don't add role/tabIndex/onKeyDown (structural — FLAG, don't add). Don't touch disabled.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95 (back-icon-buttons already on active:scale-90 KEEP it); links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/active:bg/text(color)/border/opacity ON THE ELEMENT ITSELF. (hover:underline is text-decoration, NOT in that set → does NOT trigger transition-all.)
- FLIP: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → FLIP transition-colors→transition-all.
- DON'T-CHURN: control ALREADY has press (active:scale OR whileTap) + transition → ADD ring (+aria) ONLY; don't renumber, no redundant 2nd scale, no flip.
- For bare icon/text-link buttons/anchors add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

FIVE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L83 BACK BUTTON (raw <button type="button" aria-label="Back">, icon-only ArrowLeft, base `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` [ALREADY has press active:scale-90 + transition-transform, NO focus ring], in the sticky header bg-background/95 neutral) → applied: DON'T-CHURN — APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (kept active:scale-90 [DON'T renumber], kept transition-transform, no 2nd scale, no flip; OUTWARD ring-ring on the neutral header; aria-label="Back" pre-existing kept). Confirm DON'T-CHURN ring-only + keep scale-90 + OUTWARD ring.

B) L100 + L112 INLINE LINK-BUTTONS ("Complete profile →" / "View all →", TWO raw <button> with IDENTICAL className, onClick navigate, base `mt-2 text-[11px] font-bold text-primary underline-offset-2 hover:underline` [hover:underline text-decoration ON ITSELF, NO transition/scale/focus]; inline text links inside the stats motion.div cards [border bg-card neutral]; real <button> natively focusable) → applied (replace_all, both sites): INSERTED `rounded` + APPENDED `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` → `mt-2 rounded text-[11px] font-bold text-primary underline-offset-2 hover:underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm rounded + transition-transform NEW (NOT transition-all — hover:underline is text-decoration, doesn't count) + [0.97] links tier + OUTWARD ring-ring + no-aria (visible text).

C) L126 QUICK-ACTION ROW (motion.button, MAPPED over `actions`, framer entrance initial/animate/transition [delay], onClick navigate(a.href), base `w-full text-left rounded-2xl border border-border bg-card p-4 flex items-center gap-4 active:bg-muted/30 transition-colors` [active:bg-muted/30 active-bg-color ON ITSELF + transition-colors, NO scale, NO whileTap, NO focus]; full-width row WITH own surface border+bg-card) → applied: FLIPPED transition-colors→transition-all + APPENDED `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm FLIP (new active:scale + active:bg-muted/30 must both animate → transition-all) + [0.98] wide-full-width-own-surface tier + OUTWARD ring-ring + no-aria (visible label). NOTE: is CSS active:scale-[0.98] the right choice on a motion.button (vs whileTap)? Is active:scale ALONGSIDE the existing active:bg-muted/30 a "second competing press effect" or complementary (color + scale)?

D) L154 "SEE ALL" BUTTON (raw <button type="button">, onClick navigate, base `text-[11px] font-bold text-primary` [NO hover, NO transition, NO scale, NO focus]; a plain text button in a section header; real <button> focusable; parent neutral) → applied: INSERTED `rounded` + APPENDED `transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm rounded + transition-transform NEW (scale sole animated prop, no hover color) + [0.97] + OUTWARD ring-ring + no-aria.

E) L160 RECENT-JOB ROW (motion.button, MAPPED over recentJobs, framer entrance, onClick navigate(`/personal/jobs/${job.id}`), base `w-full text-left rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3 active:bg-muted/30 transition-colors` [same pattern as C]; full-width row WITH own surface) → applied: FLIPPED transition-colors→transition-all + APPENDED `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm FLIP + [0.98] + OUTWARD ring-ring + no-aria.

ALSO CONFIRM I should LEAVE: the shadcn <Badge> L190 (own tokens); the shadcn <Progress> L98 (non-interactive); the stats motion.div cards L93/L107 (non-interactive containers); the company logo <img> L171 (alt="", decorative, lazy); all ArrowLeft/FileText/Search/Building2/Briefcase/ChevronRight/MapPin/Clock icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) C/E — CSS active:scale-[0.98] on a motion.button that already has active:bg-muted/30 — correct (complementary) or should I use whileTap / is active:bg a "competing press"?; (2) A — DON'T-CHURN ring-only keeping active:scale-90 correct?; (3) B/D — transition-transform NEW (not transition-all) correct for the inline/plain text buttons?
- files: src/pages/app/personal/ApplyJobHubPage.tsx

---

## Verdict: ALL 5 EDITS CORRECT ✅ — zero changes needed.

### Per-control confirmation

| # | Control | Verdict | Final className (after) |
|---|---------|---------|----------------------|
| **A** | Back button L83 | ✅ DON'T-CHURN ring-only | `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — `aria-label="Back"` kept |
| **B** | "Complete profile →" / "View all →" L100/L112 | ✅ | `mt-2 rounded text-[11px] font-bold text-primary underline-offset-2 hover:underline transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — no aria |
| **C** | Quick-action row L126 | ✅ | `w-full text-left rounded-2xl border border-border bg-card p-4 flex items-center gap-4 active:bg-muted/30 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — no aria |
| **D** | "See all" L154 | ✅ | `rounded text-[11px] font-bold text-primary transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — no aria |
| **E** | Recent-job row L160 | ✅ | `w-full text-left rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3 active:bg-muted/30 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — no aria |

### Answers to the three flagged questions

**(1) C/E — CSS `active:scale-[0.98]` alongside existing `active:bg-muted/30` on a `motion.button`:**
**CORRECT — complementary, not competing.** The `active:bg-muted/30` is a *color* wash; `active:scale-[0.98]` is a *transform*. Orthogonal feedback on the same gesture. The rule bans a *second competing press effect* (i.e. a second scale like `whileTap={{ scale }}` alongside `active:scale`). A color + a scale together are the standard pattern here (identical to every prior full-width-row-with-own-surface slice). Using CSS `active:scale` rather than framer `whileTap` is consistent with the rest of the page and avoids an inline object allocation per render.

**(2) A — DON'T-CHURN ring-only keeping `active:scale-90`:**
**CORRECT.** The control already has a press affordance (`active:scale-90`) + its transition (`transition-transform`). Adding only the missing a11y affordance (focus ring) without renumbering or duplicating the scale is textbook DON'T-CHURN.

**(3) B/D — `transition-transform` NEW (not `transition-all`):**
**CORRECT.** `hover:underline` is *text-decoration*, which is NOT in the `{bg, text-color, border, opacity}` set that triggers `transition-all`. The scale transform is the sole animated prop → `transition-transform` is correct. (Contrast with C/E where `active:bg-muted/30` IS a bg-color → needs `transition-all`.)

### Skip list — confirmed

- `<Badge>` L190 — shadcn own tokens ✓
- `<Progress>` L98 — non-interactive ✓
- Stats `motion.div` cards L93/L107 — non-interactive containers ✓
- Company logo `<img>` L171 — `alt=""`, decorative, lazy ✓
- All icons (ArrowLeft, FileText, Search, Building2, Briefcase, ChevronRight, MapPin, Clock) — decorative ✓

### No missed controls

Every raw `<button>` and `motion.button` in the file is covered: A (back), B×2 (inline link-buttons), C (quick-action rows), D (see-all), E (job rows). No other interactive raw controls exist.

### Guard grep summary

| Metric | Count |
|--------|-------|
| className edits (sites) | 5 (B applied ×2 via replace_all) |
| focus-visible:ring | 6 (A + B×2 + C + D + E) |
| ring-ring / ring-inset / ring-white·70 | 6 / 0 / 0 |
| active:scale-[0.97] | 3 (B×2 + D) |
| active:scale-[0.98] | 2 (C + E) |
| FLIPs (transition-colors→transition-all) | 2 (C + E) |
| NEW transitions (transition-transform) | 3 (B×2 + D) |
| New aria-pressed | 0 |
| New aria-label | 0 (A's pre-existing kept) |
| Logic lines touched | 0 |

### Owner action

This file is **build-ready**. After applying these edits (or confirming they're already in the working tree), run:

```bash
npm run update
```

Then move the task to **In review** in `AGENT_TASKS.md`. No structural changes, no logic touched, no new dependencies.

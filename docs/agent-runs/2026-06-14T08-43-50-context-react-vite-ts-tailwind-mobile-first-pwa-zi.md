# DeepSeek run — 2026-06-14T08:43:50.856Z

- model: deepseek-chat
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

## Analysis & Plan

**File:** `src/pages/app/personal/FindEmployeePage.tsx`

### Edits Confirmed

**A) Filter chip (L142)** — ✅ **CORRECT**
- `aria-pressed={filterType === f}` ✅ (persistent single-select filter)
- `transition-colors` → `transition-all` ✅ (FLIP required — new `active:scale-[0.97]` + existing `hover:bg-muted/80` on inactive branch)
- `active:scale-[0.97]` ✅ (segmented-filter tier)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅ (OUTWARD — chip is in an `overflow-x-auto` scroller with `-mx-1 px-1` padding, NOT a flush child of an overflow-hidden parent)
- **Final className:** `"shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` + `aria-pressed={filterType === f}`

**B) "Apply for Partner" link (L166)** — ✅ **CORRECT**
- `transition-colors` → `transition-all` ✅ (FLIP required — new `active:scale-[0.98]` + existing `hover:bg-emerald-500/20`)
- `active:scale-[0.98]` ✅ (wide full-width WITH own surface `bg-emerald-500/10`)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅ (OUTWARD — the button is inside a `<Card>` but the Card is NOT `overflow-hidden`, so outward ring renders against the neutral Card surface)
- No aria ✅ (visible text)
- **Final className:** `"mt-2 w-full rounded-md bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

**C) Clickable `<Card>` DIVs (L202, L243)** — **RECOMMENDATION: ADD `active:scale-[0.98]` + FLIP `transition-colors`→`transition-all`, OMIT focus ring, FLAG for owner**

**Reasoning:**
- Adding `active:scale-[0.98]` gives touch press feedback (consistent with the wide-full-width-with-own-surface tier — these cards have `bg-card` surface)
- FLIP `transition-colors`→`transition-all` is correct (new scale + existing `hover:bg-accent`)
- **Cannot add `focus-visible:ring`** — a `<Card>` renders as a `<div>`, which is NOT keyboard-focusable without `tabIndex={0}` + `role="button"` + `onKeyDown`. Adding those is **structural** (out of scope per rules). A `focus-visible:ring` on a non-focusable element would never render.
- **Flag for owner:** These clickable cards are keyboard-inaccessible. Owner should either: (a) wrap them in `<button>` elements, or (b) add `tabIndex={0} role="button" onKeyDown={(e) => e.key === 'Enter' && navigate(...)}` to make them keyboard-accessible.

**Final className (both cards):** `"cursor-pointer p-4 transition-all hover:bg-accent active:scale-[0.98]"`

### Controls to LEAVE (shadcn/own tokens)
✅ All shadcn `<Button>`s (Back L110, My Apps L116, My Jobs L121, Post L161, Load More L231)
✅ shadcn `<Input>` search L131
✅ shadcn `<Tabs>`/`<TabsList>`/`<TabsTrigger>`/`<TabsContent>` L176-194
✅ Non-interactive "Are you hiring?" Card header L150
✅ `FindTalentTab` L192 (separate component)
✅ All decorative icons

### Missed raw interactive controls — NONE
The only raw `<button>`s are A (filter chips) and B (partner link). All other interactive elements are shadcn components. ✅

### Diff

```diff
--- a/src/pages/app/personal/FindEmployeePage.tsx
+++ b/src/pages/app/personal/FindEmployeePage.tsx
@@ -139,7 +139,7 @@ export default function FindEmployeePage() {
         <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
           {(["all", "remote", "full_time", "part_time", "contract"] as const).map(f => (
             <button type="button" key={f} aria-pressed={filterType === f} onClick={() => setFilterType(f)}
-              className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
+              className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 filterType === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
               {f === "all" ? "All" : f === "remote" ? "Remote" : f === "full_time" ? "Full-time" : f === "part_time" ? "Part-time" : "Contract"}
             </button>
@@ -163,7 +163,7 @@ export default function FindEmployeePage() {
           {!isEmployer && (
             <button
               type="button"
-              className="mt-2 w-full rounded-md bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors"
+              className="mt-2 w-full rounded-md bg-emerald-500/10 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               onClick={() => navigate("/become-partner")}
             >
               Not a Partner yet? Apply for Partner access →
@@ -199,7 +199,7 @@ export default function FindEmployeePage() {
               <Card className="p-6 text-center text-sm text-muted-foreground">No open jobs match your filters.</Card>
             )}
             {filteredJobs.slice(0, visibleCount).map(j => (
-              <Card key={j.id} className="cursor-pointer p-4 transition-colors hover:bg-accent" onClick={() => navigate(`/personal/jobs/${j.id}`)}>
+              <Card key={j.id} className="cursor-pointer p-4 transition-all hover:bg-accent active:scale-[0.98]" onClick={() => navigate(`/personal/jobs/${j.id}`)}>
                 <div className="flex items-start gap-3">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                     {j.career_companies?.logo_url ? (
@@ -240,7 +240,7 @@ export default function FindEmployeePage() {
               <Card className="p-6 text-center text-sm text-muted-foreground">No companies yet.</Card>
             )}
             {filteredCompanies.map(c => (
-              <Card key={c.id} className="cursor-pointer p-4 transition-colors hover:bg-accent" onClick={() => navigate(`/personal/companies/${c.id}`)}>
+              <Card key={c.id} className="cursor-pointer p-4 transition-all hover:bg-accent active:scale-[0.98]" onClick={() => navigate(`/personal/companies/${c.id}`)}>
                 <div className="flex items-center gap-3">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                     {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
```

### Owner must verify
1. **Clickable `<Card>` DIVs** — these are keyboard-inaccessible. Recommend wrapping in `<button>` or adding `tabIndex={0} role="button" onKeyDown` for keyboard users.
2. Run `npm run update` before committing.

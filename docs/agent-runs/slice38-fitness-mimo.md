# MiMo run — 2026-06-14T03:08:45.286Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edit is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/FitnessActivitiesPage.tsx  (a "fitness activity log" page reached by in-app navigation; backed by the real `fitness_activities` table; react-query key ["fitness-activities", user?.id, range]; a `range` useState<"7d"|"30d"|"90d"> drives both the query's `.gte("recorded_at", ...)` window AND the banner copy; `totals` and `byDate` useMemo derivations group the rows. Layout: a sticky header with a shadcn back button + title, a gradient hero banner showing total steps, a horizontal-scroll row of three range filter chips, a 2x2 grid of stat cards (steps/calories/distance/active-time), loading skeletons + an empty state, then date-grouped sections of activity rows. Each activity row is a presentational motion.div.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, and framer-motion whileTap if warranted). Please keep ALL data logic exactly as it is: the Supabase query, the react-query key, the `setRange` handler, the `navigate(-1)` target, the `totals`/`byDate` useMemo derivations, the `rangeStartMs`/`formatDistance`/`formatDuration`/`activityIcon`/`formatRelative` helpers, and every onClick must stay byte-identical. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset). Use focus-visible:ring-inset INSTEAD OF an outward ring when the control is a flush edge child of a rounded overflow-hidden parent (an outward 2px ring would be clipped at the parent's rounded corners).
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press. If the control ALREADY ships transition-all, append the scale/ring tokens (don't re-flip).
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label).
- aria-pressed on a toggle button with a persistent on/off selected state; NOT on a one-shot action.
- Don't-churn rule: if a control already has a valid existing value, keep it rather than renumbering/re-flipping it.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML, not shadcn) ships NO tokens.

MY PLANNED EDIT (please confirm it is right, or correct it):

1. The range filter chips, line ~155 (a RAW `<button type="button">` rendered 3x in a `.map` over `["7d","30d","90d"]`; `onClick={() => setRange(r)}`; selection state `range === r` (active = `bg-ig-gradient text-white shadow-sm`, inactive = `bg-secondary text-foreground hover:bg-muted`); visible child text = "Last 7 days" / "Last 30 days" / "Last 90 days"; current className via cn() with base `"shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"`). The parent row (line ~153) is `className="flex gap-2 overflow-x-auto scrollbar-hide"` (NOT rounded, NOT overflow-hidden):
   plan: ADD `aria-pressed={range === r}` + APPEND to the cn() BASE string `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. NO aria-label. NO transition flip (transition-all already present).
   - segmented filter chip tier -> active:scale-[0.97].
   - APPEND not flip: the base string already ends with transition-all, which eases the inactive hover:bg-muted color fade alongside the new press-scale.
   - aria-pressed={range === r}: the chip has a persistent selected state (the active range is highlighted), so aria-pressed announces selection.
   - OUTWARD ring (not inset): the parent flex row is NOT rounded and NOT overflow-hidden (it is overflow-x-auto for horizontal scrolling), so there is no rounded-corner clip.
   - NO aria-label: the chip has rich visible text ("Last N days").
   This is intended to match the established PlacesPage / CouponsPage / ChallengesPage / ChatMediaGalleryPage segmented-chip precedent exactly (same `shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all` chip in a `flex gap-2 overflow-x-auto scrollbar-hide` row -> same aria-pressed + active:scale-[0.97] + OUTWARD ring).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~127: shadcn <Button aria-label="Back" variant="ghost" size="icon" onClick={navigate(-1)}> — labeled, ships tokens.
- Hero banner, line ~141: motion.div with entrance animation, NO onClick — presentational.
- The 2x2 stat cards, lines ~171-198: plain <div>s, NO onClick — non-interactive display.
- Each activity row, line ~240: motion.div with entrance animation, NO onClick — presentational.
- Loading skeletons (line ~202), empty-state (line ~210) — non-interactive.
- The date-group <section> headers (line ~227) — non-interactive.
- All Dumbbell/Footprints/Flame/Timer/Activity/MapPin/Sparkles/Calendar icons — decorative.

QUESTIONS:
Q1. Range filter chips (line ~155): is the planned treatment (ADD aria-pressed + APPEND active:scale-[0.97] segmented-chip tier + OUTWARD ring, NO aria-label, NO transition flip) correct and consistent with the PlacesPage/CouponsPage segmented-chip precedent?
Q2. Ring shape: confirm OUTWARD (not inset) is right — the parent row is overflow-x-auto (for horizontal scroll) but NOT rounded and NOT overflow-hidden.
Q3. aria-pressed vs aria-label: confirm aria-pressed (persistent selected range) is right and aria-label is correctly omitted (rich visible "Last N days" text).
Q4. Confirm the untouched list is correct. At a 375px-wide phone viewport, does the chip row scroll/lay out without crushing, and do the 2x2 stat cards fit?

Please answer Q1-Q4 and give me the corrected className string + confirm the aria attributes. Keep all data/query/handler logic unchanged. Thank you.
- files: src/pages/FitnessActivitiesPage.tsx

---

## Review: FitnessActivitiesPage — Interaction Polish Pass

**File:** `src/pages/FitnessActivitiesPage.tsx` (250 lines, `useAuth` + `SwipeBackContainer` + `SEOHead noIndex`, backed by `fitness_activities`, query key `["fitness-activities", user?.id, range]`)

---

### Inventory (full file read)

| # | Control | Type | Action |
|---|---------|------|--------|
| 1 | Back button (L~127) | shadcn `<Button aria-label="Back">` | skip — labeled, ships tokens |
| 2 | Hero banner (L~141) | `motion.div` entrance anim, NO onClick | skip — presentational |
| 3 | **Range chips × 3 (L~155)** | **RAW `<button>`** `.map` over `["7d","30d","90d"]` | **THE edit** |
| 4 | Stat cards × 4 (L~171–198) | plain `<div>`, NO onClick | skip — non-interactive display |
| 5 | Loading skeletons (L~202) | plain `<div>` × 3 | skip — non-interactive |
| 6 | Empty state (L~210) | `<div>` + `<p>`, NO button/link | skip — non-interactive |
| 7 | Date-group headers (L~227) | `<section>` + `<p>` + Calendar icon | skip — non-interactive |
| 8 | Activity rows (L~240) | `motion.div` entrance anim, NO onClick | skip — presentational |

**Total non-shadcn interactive controls: 1 (the range chips).** Inventory is exhaustive.

---

### Q1 — Range filter chips: ✅ Correct and consistent

Your planned treatment is exactly right and matches the PlacesPage / CouponsPage / ChallengesPage / ChatMediaGalleryPage segmented-chip precedent:

- **`aria-pressed={range === r}`** — persistent selected state, selection conveyed solely by background (gradient+white vs secondary). Each chip's label word is constant ("Last 7 days" / "Last 30 days" / "Last 90 days" — doesn't flip on selection). Valid.
- **`active:scale-[0.97]`** — segmented filter chip tier. Correct.
- **`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`** — focus ring for keyboard navigation.
- **Append to cn() base string, no transition flip** — `transition-all` already present; it eases the inactive `hover:bg-muted` color fade alongside the new press-scale. Don't-churn.
- **No `aria-label`** — rich visible text per chip.

### Q2 — Ring shape: ✅ OUTWARD (not inset) is correct

The parent row (`flex gap-2 overflow-x-auto scrollbar-hide`) is **not** rounded and **not** `overflow-hidden`. There are no rounded corners to clip an outward 2px ring. The established `overflow-x-auto` precedent (TrendingTopicsPage, CollabsPage) confirms this layout doesn't clip `box-shadow` rings. OUTWARD ring; no `ring-inset`.

### Q3 — `aria-pressed` vs `aria-label`: ✅ Both correct

- `aria-pressed={range === r}` — this is a persistent on/off selected state (one chip active at a time). Announces "Last 30 days, pressed" to screen readers. Matches every segmented-chip precedent in the repo.
- No `aria-label` — each button has rich visible text (`"Last 7 days"` / `"Last 30 days"` / `"Last 90 days"`). WCAG 2.5.3 satisfied without an explicit label.

### Q4 — Untouched list: ✅ Complete and correct

Every control outside the range chips is correctly skipped:

- **Back button** — shadcn, already labeled `aria-label="Back"`, ships built-in tokens.
- **Hero banner** — `motion.div` entrance anim only, no `onClick`. Presentational.
- **Stat cards** — plain `<div>`s, no interaction. Pure display.
- **Activity rows** — `motion.div` entrance anim only, no `onClick`. Presentational.
- **Loading / empty / date headers** — non-interactive.
- **All icons** (Dumbbell, Footprints, Flame, Timer, ActivityIcon, MapPin, Sparkles, Calendar) — decorative children.

**Responsive at 375px:** `max-w-2xl mx-auto px-4` → ~343px inner. The chip row (`flex gap-2 overflow-x-auto`) holds 3 chips at `px-3.5 text-xs` ≈ 270px total — fits without scrolling. The `grid-cols-2 gap-3` stat cards are ~165px each; `text-2xl font-extrabold` numbers like "12,345" fit comfortably. Activity rows are `flex items-center gap-3 p-3` with a 36px icon tile + `flex-1 min-w-0` text + small relative-time label — wraps gracefully. No crush anywhere.

---

### Proposed change (exact diff)

**`src/pages/FitnessActivitiesPage.tsx`** — **1 control, 3 button elements (from `.map`), 3 edits (3 `aria-pressed` attrs + 3 className appends)**

**Before (L~155–165):**
```tsx
<button
  key={r}
  type="button"
  onClick={() => setRange(r)}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all",
    range === r ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
  Last {r.replace("d", " days")}
</button>
```

**After:**
```tsx
<button
  key={r}
  type="button"
  onClick={() => setRange(r)}
  aria-pressed={range === r}
  className={cn(
    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    range === r ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )}
>
  Last {r.replace("d", " days")}
</button>
```

**Diff summary:** +1 `aria-pressed` display attr per button (3 total, but it's one `<button>` in a `.map` so 1 code change); the cn() BASE string gains ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. That's **1 attr addition + 1 className token append** on one button element. `onClick={() => setRange(r)}`, `type="button"`, `key={r}`, and the conditional className branches all preserved byte-for-byte. `git diff` expected: **1 ins / 1 del (+0 net)**.

**Hard rule honored:** every `onClick`/`setRange(r)`/`navigate(-1)`/`useQuery`/`useMemo`/`useState`/`rangeStartMs`/`formatDistance`/`formatDuration`/`activityIcon`/`formatRelative`/the Supabase `.select`/`.eq`/`.gte`/`.order` chain left byte-identical.

---

### Owner verification

Run `npm run update` (type-check + worker type-check + production build — must pass green before moving to Done).

**Preview caveat:** FitnessActivitiesPage is auth-gated (`useAuth` + `enabled: !!user?.id`; activity rows and stats render only once the signed-in user has `fitness_activities` rows in the selected range window, else the empty state shows). The range chips render unconditionally regardless of auth/data state, so the interaction tokens are previewable even without data.

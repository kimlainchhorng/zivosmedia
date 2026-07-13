# DeepSeek run — 2026-06-14T01:40:51.046Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control change is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/LeaderboardPage.tsx  (route /leaderboard — a loyalty-points leaderboard; backed by `loyalty_points` joined with `profiles`, react-query keys ["leaderboard", period] + ["my-points", user?.id]; a "Your Rank" card, a weekly/all-time period selector, a top-3 podium, and a ranked list)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed). Please keep all data logic exactly as it is: the Supabase queries, the react-query keys, the setPeriod state, the navigate() target, the leaderboard/top3/rest derivations, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).
- Don't-churn rule: if a control already has a valid existing active:scale value, keep it rather than renumbering it to the nominal tier.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A non-clickable shadcn <Badge> (no onClick) ships its own tokens -> leave untouched.
- A CLICKABLE shadcn <Badge> or clickable shadcn <Card> renders a plain <div> with an onClick but NO role / NO tabIndex -> it is NOT keyboard-focusable, so a CSS focus ring would be dead. We add the CSS press-scale (active:scale-*) which DOES work on the div, but NO focus ring, and NO aria-pressed (aria-pressed is invalid on a roleless <div>). (the "BadgesPage precedent".)

MY PLANNED EDIT (please confirm it is right, or correct it):

1. Period selector chips, line ~126 (a .map over ["weekly", "all-time"]; each is a CLICKABLE shadcn <Badge variant={period === p ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setPeriod(p)}> — renders a <div>, no role/tabIndex; the selected one is highlighted via variant="default"; visible text label "Weekly"/"All Time"):
   plan: append  transition-all active:scale-[0.97]  to the className (segmented filter-chip tier; transition-all because the shadcn Badge base cva already carries transition-colors for its variant/bg change, and we want the press-scale to ease alongside it); NO focus ring (non-focusable <div> — a CSS ring is dead); NO aria-pressed (invalid on a roleless <div> per the BadgesPage precedent). Correct?

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~94: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- "Your Rank" Card, line ~104: a shadcn <Card> with NO onClick — presentational.
- The tier <Badge variant="outline">, line ~115: NON-clickable (no onClick) — presentational.
- Top-3 podium, line ~153: a motion.div with an entrance animation and NO onClick — presentational.
- Full-list rows, line ~176: each is a <Card> (no onClick) wrapped in a presentational entrance motion.div — these are display rows, NOT clickable.
- Loading spinner (line ~133), empty-state (line ~139) — non-interactive.
- The <Avatar> components — display, not buttons.

QUESTIONS:
Q1. Period selector (edit #1): is  transition-all active:scale-[0.97]  + NO ring + NO aria-pressed the right treatment for a clickable shadcn Badge (non-focusable div), per the BadgesPage precedent? Is transition-all correct given the Badge base cva already has transition-colors (any conflict / ordering concern)?
Q2. Confirm the untouched list is correct (back shadcn Button labeled; "Your Rank" Card + tier Badge + podium + full-list rows all presentational/non-clickable; spinner/empty non-interactive; avatars are display).
Q3. Both the period chips are clickable <div>s with no role/tabIndex/onKeyDown -> keyboard-inaccessible. Per our scope (className + display-only attrs only; onKeyDown is logic and out of scope), I plan to FLAG this for the owner rather than fix it. Confirm flag-not-fix is the right call.
Q4. Anything missed? At a 375px-wide phone viewport: does the period selector row read well, and do the podium + ranked list lay out without crushing?

Please answer Q1-Q4 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/LeaderboardPage.tsx

---

## Review of LeaderboardPage.tsx — Premium Interaction Pass

### Short Plan

This page has **one interactive control** (the period selector chips) and **zero other raw buttons**. The period chips are clickable shadcn `<Badge>` elements (rendered as `<div>`, no `role`/`tabIndex`). The rest of the page is presentational or uses shadcn `<Button>` components that already ship their own tokens.

### Proposed Change

**File:** `src/pages/LeaderboardPage.tsx`

**Before (line ~126):**
```tsx
<Badge key={p} variant={period === p ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setPeriod(p)}>
```

**After:**
```tsx
<Badge key={p} variant={period === p ? "default" : "outline"} className="cursor-pointer capitalize transition-all active:scale-[0.97]" onClick={() => setPeriod(p)}>
```

That's it — **one line, one edit, zero new attributes**.

### Answers to Your Questions

**Q1. Period selector treatment: ✅ CORRECT**

`transition-all active:scale-[0.97]` + NO ring + NO `aria-pressed` is exactly right per the BadgesPage precedent:

- **`transition-all`** — correct because the shadcn Badge base `cva` already carries `transition-colors` for the `variant` bg swap. Adding `transition-all` is the superset that lets both the existing color transition AND the new press-scale ease together. No ordering conflict (CSS cascade: last-wins, `transition-all` covers everything).
- **NO focus ring** — correct. A clickable shadcn `<Badge>` renders a `<div>` with no `role`/`tabIndex`. A CSS `:focus-visible` ring would be dead CSS (never fires). Adding `role="button"` + `tabIndex={0}` + `onKeyDown` is logic-level and out of scope.
- **NO `aria-pressed`** — correct. `aria-pressed` is invalid on a roleless `<div>` per the ARIA spec. Adding it would be ignored or misread by assistive technology.

**Q2. Untouched list: ✅ CORRECT**

| Control | Status | Reasoning |
|---------|--------|-----------|
| Back `<Button>` (L94) | ✅ Leave | shadcn `<Button>`, has `aria-label="Back"`, ships built-in tokens |
| "Your Rank" `<Card>` (L104) | ✅ Leave | No `onClick` — presentational |
| Tier `<Badge>` (L115) | ✅ Leave | No `onClick` — presentational |
| Top-3 podium `motion.div` (L153) | ✅ Leave | No `onClick` — presentational |
| Full-list `<Card>` rows (L176) | ✅ Leave | No `onClick` — presentational display rows |
| Loading spinner (L133) | ✅ Leave | Non-interactive |
| Empty-state (L139) | ✅ Leave | Non-interactive |
| `<Avatar>` components | ✅ Leave | Display elements, not buttons |

**Q3. Flag-not-fix for keyboard accessibility: ✅ CORRECT**

The period chips are clickable `<div>`s with no `role`/`tabIndex`/`onKeyDown` — they're invisible to keyboard + screen-reader users. The full fix requires:
1. `role="button"`
2. `tabIndex={0}`
3. `onKeyDown` handler (Enter/Space)
4. `aria-pressed` (since they're toggle-like)

That's logic-level work, out of scope for a className-only pass. **Flagging is correct** — and importantly, adding `role="button"` + `tabIndex={0}` WITHOUT `onKeyDown` would make them focusable-but-inoperable (Tab to them, press Enter, nothing happens) = WORSE than the current skip-over state.

**Q4. 375px viewport check: ✅ CLEAN**

- **Period selector row:** `flex gap-2` inside `p-4` → ~343px inner width. Two chips: "Weekly" (~65px) + "All Time" (~75px) + 8px gap = ~148px total. Fits comfortably with no overflow.
- **Podium:** `flex items-end justify-center gap-3` with 3 columns of `w-20` (60px each) + 12px gaps = 204px total in ~343px inner. The `max-w-[80px]` name truncation prevents overflow. Clean.
- **Full list:** `p-3 flex items-center gap-3` → rank icon (24px) + gap (12px) + avatar (36px) + gap (12px) + score text (~60px) + gap (12px) = ~156px fixed, leaving ~187px for the `flex-1 min-w-0 truncate` name column. No crush.

### Owner Flag

**Keyboard accessibility gap:** The two period selector chips (`<Badge>` rendered as `<div>`) are not keyboard-focusable. To fix: add `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space → `setPeriod(p)`), and `aria-pressed={period === p}`. This is a logic-level change outside the current className-only scope.

### Verification

After applying the single-line change, run:
```bash
npm run update
```
Expected: 0 type errors, clean build.

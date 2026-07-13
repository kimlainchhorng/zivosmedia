# MiMo run — 2026-06-14T01:41:43.147Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Review: LeaderboardPage.tsx — Interaction Polish Pass

### (1) Short plan

**1 control / 1 className-edit, ZERO new attributes.** The only interactive control needing tokens is the clickable period-selector `<Badge>`. Everything else is either a labeled shadcn `<Button>` (ships own tokens) or presentational (no `onClick`).

---

### (2) Proposed change

**File:** `src/pages/LeaderboardPage.tsx`
**Line ~126** — period selector chips (`.map` over `["weekly", "all-time"]`, clickable shadcn `<Badge>` → renders a `<div>`, no `role`/`tabIndex`)

**Before:**
```tsx
<Badge key={p} variant={period === p ? "default" : "outline"} className="cursor-pointer capitalize" onClick={() => setPeriod(p)}>
```

**After:**
```tsx
<Badge key={p} variant={period === p ? "default" : "outline"} className="cursor-pointer capitalize transition-all active:scale-[0.97]" onClick={() => setPeriod(p)}>
```

**Diff:** `1 ins / 1 del / +0 net`. The `onClick` and all other attributes are byte-identical on both sides — only `transition-all active:scale-[0.97]` is appended to the className string.

**Rationale:**
- `active:scale-[0.97]` — segmented filter-chip tier ✓
- `transition-all` — the shadcn Badge base cva carries `transition-colors` for its variant bg swap; `transition-all` is the superset so the new press-scale eases alongside it, cascade last-wins, no ordering conflict ✓
- **NO focus ring** — the Badge renders a plain `<div>` with no `role`/`tabIndex`, so `:focus-visible` never fires → dead CSS → DO NOT add (BadgesPage precedent) ✓
- **NO `aria-pressed`** — invalid on a roleless `<div>` per the ARIA spec (ignored or misread by AT); adding `role`+`tabIndex`+`onKeyDown` to make it valid = logic, out of scope ✓

---

### (3) Q&A

**Q1 — Period selector treatment: confirmed correct.**
`transition-all active:scale-[0.97]` + NO ring + NO `aria-pressed` is exactly the right treatment for a clickable shadcn `<Badge>` (non-focusable div). `transition-all` has no conflict with the Badge base `transition-colors` — it's a superset that adds transform easing. This is the identical pattern proven on NearbyPage filter chips, EventsPage filter tabs, and FavoritesPage segmented tabs.

**Q2 — Untouched list: all confirmed correct.**

| Control | Line | Verdict |
|---------|------|---------|
| Back `<Button aria-label="Back" variant="ghost" size="icon">` | ~94 | ✅ SKIP — labeled, ships tokens |
| "Your Rank" `<Card>` | ~104 | ✅ SKIP — no `onClick`, presentational |
| Tier `<Badge variant="outline">` | ~115 | ✅ SKIP — no `onClick`, presentational |
| Podium `motion.div` entries | ~153 | ✅ SKIP — entrance animation only, no `onClick` |
| Full-list `<Card>` rows | ~176 | ✅ SKIP — no `onClick`, display rows wrapped in presentational `motion.div` |
| `<Loader2>` spinner | ~133 | ✅ SKIP — non-interactive |
| Empty-state Trophy + text | ~139 | ✅ SKIP — non-interactive |
| All `<Avatar>` components | various | ✅ SKIP — display, not buttons |

The user's inventory is exhaustive and correct. No controls were missed.

**Q3 — Flag-not-fix for keyboard accessibility: confirmed.**
The period chips are clickable `<div>`s with no `role`/`tabIndex`/`onKeyDown`. The full fix needs `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space) + `aria-pressed` = logic-level changes, out of scope. Adding `role`+`tabIndex` WITHOUT `onKeyDown` would make them focusable-but-inoperable (Tab lands on them, Enter does nothing) = worse than the current skip-over state. **Flag-not-fix is correct.**

**Q4 — 375px responsive: clean, no crush.**

- **Period chips:** `flex gap-2` with two short labels ("Weekly", "All Time") — both fit comfortably side-by-side (~150px total) in the ~343px inner width after `p-4` padding. No scroll needed.
- **Podium:** `flex items-end justify-center gap-3 px-4` with three items at `w-20` each = 3×80px + 2×12px + 32px padding = 296px < 343px inner. Fits cleanly.
- **Full-list rows:** `Card p-3 flex items-center gap-3` → rank 24px + avatar 36px + gaps 12+12px + score ~60px + padding 24px = ~168px fixed, leaving ~175px for the `flex-1 min-w-0 truncate` name/tier column. No crush.
- **No keyboard gaps beyond the flagged clickable-div issue** (the only controls are the back `<Button>` [native button, natively focusable, ships ring] and the period chips [flagged above]).

---

### (4) Owner action

After applying the single-line className append, run:

```bash
npm run update
```

Expected: `TRUE EXIT 0` (client type-check + worker type-check + production build all pass). This is a zero-risk cosmetic-only change.

**Owner flag (established repo compact pattern):** sub-44px tap targets — the period chips use shadcn Badge's default padding, which renders at ~28px tall. Not a blocker, just the established compact-pattern note.

**Keyboard-a11y flag for owner:** the period selector chips need `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space triggering `setPeriod(p)`) + `aria-pressed={period === p}` to be keyboard- and screen-reader-accessible. Out of scope for this className-only pass.

# MiMo run — 2026-06-14T01:32:54.257Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/NearbyPage.tsx  (route /nearby — discover nearby stores + recent public check-ins; backed by store_profiles and check_ins; a filter chip row [all / places / check-ins], a location-status block using the browser geolocation API, and a list of result cards that deep-link to a store via /s/:slug)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed). Please keep all data logic exactly as it is: the Supabase queries, the react-query keys, the geolocation requestLocation handler, the setFilter state, the navigate() targets, the distance math, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).
- Don't-churn rule: if a control already has a valid existing active:scale value, keep it rather than renumbering it to the nominal tier.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A non-clickable shadcn <Badge> (no onClick) ships its own tokens -> leave untouched.
- A CLICKABLE shadcn <Badge> or clickable shadcn <Card> renders a plain <div> with an onClick but NO role / NO tabIndex -> it is NOT keyboard-focusable, so a CSS focus ring would be dead. We add the CSS press-scale (active:scale-*) which DOES work on the div, but NO focus ring. (the "BadgesPage precedent".)
- A native <input> with its own focus ring -> leave untouched.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Filter chips, line ~138 (a .map over FILTERS = ["all","places","check-ins"]; each is a CLICKABLE shadcn <Badge variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0" onClick={() => setFilter(f)}> — renders a <div>, no role/tabIndex; the selected one is highlighted via variant="default"):
   plan: append  transition-all active:scale-[0.97]  to the className (chip/pill tier; transition-all because the shadcn Badge base cva already carries transition-colors for its variant/bg change, and we want the press-scale to ease alongside it); NO focus ring (non-focusable <div> — a CSS ring is dead). OPEN QUESTION on aria-pressed: these chips show a persistent SELECTED state (variant="default" when filter === f), unlike a one-shot action chip — should they get aria-pressed={filter === f}, or is that invalid/inappropriate on a roleless <div> (aria-pressed semantically expects a button role)? Please advise.

2. Result cards, line ~184 (a .map over filtered items; each is a CLICKABLE shadcn <Card className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => item.slug ? navigate(`/s/${item.slug}`) : undefined}> wrapped in a presentational motion.div that carries only an entrance x-slide [no whileTap]; the Card renders a <div>, no role/tabIndex):
   plan: append  active:scale-[0.99]  (wide full-width card tier) and FLIP the existing  transition-colors -> transition-all  (so the new transform eases alongside the existing hover:bg-accent/50); NO focus ring (non-focusable <div>); NO aria (it's a navigation action, not a toggle). Note: the wrapping motion.div's entrance transform is on the motion.div, not on the Card, so the Card's CSS active:scale is not overridden.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~132: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- "Try again" button, line ~157: shadcn <Button size="sm" variant="outline"> with visible "Try again" text — ships tokens, visible text = accessible name.
- Status Badges, line ~165 ("{n} nearby") and line ~194 (distance pill inside a card) — NON-clickable shadcn <Badge> (no onClick) — presentational, ship their own tokens.
- Location-status block, line ~146 (MapPin/Loader2 + text) — presentational.
- Loading skeletons (line ~170) and empty-state (line ~174) — non-interactive.

QUESTIONS:
Q1. Filter chips (edit #1): is  transition-all active:scale-[0.97]  + NO ring the right treatment for a clickable shadcn Badge (non-focusable div), per the BadgesPage precedent? Is transition-all correct given the Badge base cva already has transition-colors (any conflict / ordering concern I should know about)? And the key call: do these SELECTION-state filter chips get aria-pressed={filter === f}, or NOT (roleless div)?
Q2. Result cards (edit #2): is  active:scale-[0.99]  (wide-card tier) + flip transition-colors->transition-all + NO ring correct for a clickable shadcn Card (non-focusable div)? Or would you leave a Card untouched entirely?
Q3. Both the filter chips and the result cards are clickable <div>s with no role/tabIndex/onKeyDown -> keyboard-inaccessible. Per our scope (className + display-only attrs only; onKeyDown is logic and out of scope), I plan to FLAG this for the owner rather than fix it (adding role+tabIndex WITHOUT onKeyDown would make them focusable but non-operable by keyboard = worse). Confirm flag-not-fix is the right call. (Also: the result Card's onClick is conditional — check-in items have no slug, so their card shows cursor-pointer but does nothing on click; I plan to flag that too, not fix it.)
Q4. Confirm the untouched list is correct (back + "Try again" shadcn Buttons; the two non-clickable status Badges; the location-status block; skeletons + empty-state).
Q5. Anything missed? At a 375px-wide phone viewport: does the filter chip row (overflow-x-auto) scroll cleanly, does the 160px location-status block read well, and do the result cards (icon + name/description column + optional distance pill) lay out without crushing?

Please answer Q1-Q5 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/NearbyPage.tsx

---

## Review: NearbyPage.tsx — Premium Interaction Polish

### Short Plan

Two clickable `<div>` controls to style (filter chips, result cards), zero focus rings (non-focusable divs), six items left untouched. One correction to your plan: **no `aria-pressed`** on the filter chips in this pass.

---

### Q1 — Filter chips (`transition-all active:scale-[0.97]` + NO ring)

**Correct.** Three points:

1. **`transition-all` is right, no conflict.** The shadcn Badge base cva carries `transition-colors`. Appending `transition-all` to the same element supersedes it (CSS: `transition-all` is a strict superset — it covers `color`, `background-color`, AND `transform`). The variant bg flip (`default` ↔ `outline`) continues to ease, and the new press-scale eases alongside it. No ordering concern. ✓
2. **NO ring is right.** Clickable Badge → renders `<div>`, no `role`/`tabIndex` → `:focus-visible` never fires → CSS ring is dead. Matches the BadgesPage precedent exactly. ✓
3. **NO `aria-pressed`.** Per ARIA spec, `aria-pressed` is only valid on elements with an implicit or explicit `role="button"`. On a roleless `<div>`, screen readers ignore it or misread it. Adding `role="button"` + `tabIndex={0}` to make `aria-pressed` meaningful is logic-level and out of scope for this pass. **Skip it. Flag for owner** (see Q3).

**Final className:** append ` transition-all active:scale-[0.97]` — no attributes.

---

### Q2 — Result cards (`active:scale-[0.99]` + flip `transition-colors → transition-all` + NO ring)

**Correct, with one nuance.** Four points:

1. **Flip is right.** The Card currently has `transition-colors` for `hover:bg-accent/50`. Adding `active:scale-[0.99]` (a transform) means the press would snap under `transition-colors` (which only animates color/bg). Flipping to `transition-all` lets the hover-fade AND the press-scale both ease. This is the established "hover:bg + new active:scale" pattern (ConciergePage chips, CreatorSubscribers card-main). ✓
2. **`active:scale-[0.99]` wide-card tier is right.** Full-width cards in a vertical list, spanning nearly the full viewport width. ✓
3. **NO ring is right.** Same clickable-div rationale as filter chips. ✓
4. **Motion.div wrapper — no conflict.** The wrapper `<motion.div>` owns the entrance animation (`initial={{ opacity: 0, x: -8 }}`), which is on the *wrapper*, not the Card. The Card's own CSS `active:scale-[0.99]` is an independent transform on a child element. Once the entrance completes, the wrapper's inline transform settles to identity; the Card's `:active` scale operates independently. ✓

**Final className:** replace `transition-colors` → `transition-all` and append ` active:scale-[0.99]`.

---

### Q3 — Flag-not-fix for keyboard-inaccessible clickable divs

**Confirmed: flag-not-fix is the right call.** The reasoning is exactly correct:

- These are `<div>`s with `onClick` but no `role`/`tabIndex`/`onKeyDown`.
- Adding `role="button"` + `tabIndex={0}` *without* `onKeyDown` would make them focusable but non-operable by keyboard — keyboard users would Tab to them, hear "button," press Enter/Space, and nothing happens. That's **worse** than the current state (non-focusable, so keyboard users skip them entirely).
- The full fix requires `role="button"` + `tabIndex={0}` + `onKeyDown` (Enter/Space to activate) + `aria-pressed` (for filter chips). That's logic-level and out of scope.

**Flag for owner — both controls:**

> **Keyboard-a11y gap (out of scope for this pass):** Filter chips and result cards are clickable `<div>`s with no `role`, `tabIndex`, or `onKeyDown`. They are invisible to keyboard and screen-reader users. Needs the full treatment: `role="button"` + `tabIndex={0}` + `onKeyDown` Enter/Space handler + `aria-pressed` (filter chips only).

**Additional flag — check-in cards with no-op onClick:**

> **UX dead-end:** Check-in items have no `slug`, so their Card's `onClick` returns `undefined` — the card shows `cursor-pointer` and the new press-scale, but tapping does nothing. Either navigate check-in cards somewhere (e.g., a check-in detail route) or remove `cursor-pointer`/press-scale conditionally when `!item.slug`.

---

### Q4 — Untouched list

**All confirmed correct.** No changes needed:

| Control | Line | Why |
|---|---|---|
| Back `<Button>` | ~132 | `aria-label="Back"`, shadcn ships tokens |
| "Try again" `<Button>` | ~157 | Visible text = accessible name, shadcn ships tokens |
| "{n} nearby" `<Badge>` | ~165 | Non-clickable (no `onClick`), presentational |
| Distance pill `<Badge>` | ~194 | Non-clickable, presentational |
| Location-status block | ~146 | `MapPin`/`Loader2` + text — presentational |
| Loading skeletons | ~170 | `animate-pulse` divs — non-interactive |
| Empty-state | ~174 | Text + icon — non-interactive |

---

### Q5 — 375px layout

**Clean across the board:**

- **Filter chips:** `flex gap-2 overflow-x-auto no-scrollbar` with `shrink-0` badges. Three short labels ("all", "places", "check-ins") — at 375px the outer `p-4` eats 32px, leaving ~341px. Three Badge pills at roughly 50–90px each plus 16px gaps ≈ 190–300px. They likely fit or barely overflow; `overflow-x-auto` handles scroll cleanly. ✓
- **Location-status block:** `h-40` (160px), centered single-line content at 375px. The absolute-positioned `{n} nearby` Badge in `top-3 right-3` sits clear of the centered content. No crush. ✓
- **Result cards:** `p-3 flex items-center gap-3` = 24px inner padding + 12px gap. At 375px: ~327px usable. Icon div `h-10 w-10 shrink-0` (40px) + gap (12px) = 52px fixed. If distance pill present: ~60px + gap 12px = 72px more. Text column gets 327 − 52 − 72 = ~203px (name and description truncate cleanly). Without distance pill: 327 − 52 = 275px. No crush. ✓

---

### Proposed Diff

```diff
--- a/src/pages/NearbyPage.tsx
+++ b/src/pages/NearbyPage.tsx
@@ filter chips line (~138) @@
-            <Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0" onClick={() => setFilter(f)}>
+            <Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer capitalize shrink-0 transition-all active:scale-[0.97]" onClick={() => setFilter(f)}>

@@ result cards line (~184) @@
-              <Card className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
+              <Card className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-all active:scale-[0.99]"
                 onClick={() => item.slug ? navigate(`/s/${item.slug}`) : undefined}>
```

That's it — **2 lines changed, 0 new attributes, 0 new lines**. Every `onClick`, `navigate()`, `setFilter()`, `useQuery`, Supabase query, geolocation handler, and prop is byte-identical.

---

### Owner Action Items

1. **Apply the 2-line diff** above.
2. **Run `npm run update`** — must pass (types + worker types + production build).
3. **Flag (not fix in this pass):** keyboard-inaccessible clickable divs (filter chips + result cards need `role`/`tabIndex`/`onKeyDown`/`aria-pressed` — logic-level).
4. **Flag (not fix in this pass):** check-in cards show `cursor-pointer` + press-scale but `onClick` is a no-op (no slug → `navigate` returns `undefined`). Either route check-in cards somewhere or conditionally remove `cursor-pointer`.

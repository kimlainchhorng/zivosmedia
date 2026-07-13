# MiMo run — 2026-06-14T01:56:02.618Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control change is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/ProfileViewsPage.tsx  (route /profile-views — "who viewed your profile recently"; backed by `profile_views` joined with `public_profiles`, react-query keys ["profile-views-me", user?.id] + ["profile-views-viewers", ...]; a gradient hero stat card and a vertical list of viewer rows)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, and framer-motion whileTap if warranted). Please keep all data logic exactly as it is: the Supabase queries, the react-query keys, the navigate() target, the viewerMap/stats derivations, the disabled={anon} prop, and all prop wiring should stay byte-identical. Only advise on className tokens, whileTap, and aria-label.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it; an aria-label on a control with rich visible child text would REPLACE that child text for the accessible-name computation, which we do not want).
- Don't-churn rule: if a control already has a valid existing value, keep it rather than renumbering it.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- IMPORTANT — framer-motion motion.button with an entrance animation: a motion.button with initial/animate that animates `y` leaves a lingering inline `transform: translateY(0px)` after it settles, which OVERRIDES any CSS active:scale-* class (inline style beats stylesheet). So a CSS active:scale would be DEAD on such an element. To get a press-scale on a motion element you must use motion's own whileTap (inline-transform mechanism), not a CSS active:scale. A CSS focus ring (box-shadow) still works fine on a motion.button (box-shadow is not transform).

MY PLANNED EDIT (please confirm it is right, or correct it):

1. The viewer rows, line ~143 (a .map over `views`; each is a `motion.button type="button"` with an entrance animation initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:...}}, onClick={() => v.viewer_id && navigate(`/user/${v.viewer_id}`)}, disabled={anon} where anon = no viewer_id, className "w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed"; it has NO whileTap currently; rich visible child text = viewer name + relative time, plus an avatar/initials and a ChevronRight on the right):
   plan (my lean): RING-ONLY — append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  to the className; KEEP transition-colors (it animates only the hover:bg, never a transform → no conflict); add NO CSS active:scale (it would be dead under the entrance animation's lingering inline transform); add NO aria-label (the rich visible child text — name + relative time — provides the accessible name).
   OPEN QUESTION: should I additionally add a framer-motion whileTap={{ scale: 0.99 }} (wide-row tier) for tactile parity with the rest of the app's tappable result rows, or is ring-only the cleaner/more-consistent house call here given there's no existing whileTap to keep? Please give your recommendation.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~99: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- Hero stat card, line ~112: a motion.div with an entrance animation and NO onClick — presentational.
- Loading skeletons (line ~124), empty-state (line ~126) — non-interactive.
- The avatar <img> / initials <div> / EyeOff icon inside each row (lines ~153-159) — display children of the row button, not separate controls.
- The ChevronRight (line ~164), Clock icon (line ~162) — decorative.

QUESTIONS:
Q1. Viewer rows: is ring-ONLY (keep transition-colors, no CSS active:scale because the entrance animation's inline transform would make it dead, no aria-label because of the rich child text) the right treatment for this motion.button? And do you recommend ADDING whileTap={{ scale: 0.99 }} for tactile parity, or staying ring-only?
Q2. Confirm the untouched list is correct.
Q3. The rows are real <button> elements (motion.button), natively focusable, so the focus ring is functional (not dead) — and disabled rows (anon viewers) simply won't focus/press. Correct?
Q4. Anything missed? At a 375px-wide phone viewport: do the viewer rows lay out without crushing?

Please answer Q1-Q4 and give me the corrected className string (and whether to add whileTap). Keep all data/query logic unchanged. Thank you.
- files: src/pages/ProfileViewsPage.tsx

---

## Review: ProfileViewsPage interaction pass

### Q1. Viewer rows — recommendation

Your analysis is exactly right:

- **Ring-only className** — correct. The entrance animation (`initial={{opacity:0, y:4}} → animate={{opacity:1, y:0}}`) leaves a lingering inline `transform: translateY(0px)` after settle, which kills any CSS `active:scale-*`. No CSS press-scale.
- **Keep `transition-colors`** — correct. It only eases `hover:bg-secondary/40`, never a transform, no conflict.
- **No `aria-label`** — correct. Rich child text (name + relative time + avatar) provides the accessible name; adding `aria-label` would *replace* it.

**On the open question — add `whileTap={{ scale: 0.99 }}`:**

**Yes, add it.** This is the established repo precedent for exactly this element shape — PlacesPage result rows and NotificationsPage rows are both `motion.button` with entrance `y` animations, and both carry `whileTap={{ scale: 0.985 }}` alongside a CSS focus ring. The `whileTap` prop resolves through framer-motion's own transform pipeline (not CSS), so it composes correctly with the lingering inline `translateY`. Wide-row tier = `0.99`. Omitting it would leave these rows as the only tappable `motion.button` result rows in the app without a tactile press, which is the inconsistency.

**Final treatment for viewer rows:**
```
whileTap={{ scale: 0.99 }}
```
```
className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### Q2. Untouched list — confirmed correct

| Control | Why skipped | Verdict |
|---|---|---|
| Back button (L~99) | shadcn `<Button aria-label="Back" variant="ghost" size="icon">` — labeled, ships tokens | ✅ skip |
| Hero stat card (L~112) | `motion.div` with entrance animation, **NO `onClick`** — presentational | ✅ skip |
| Loading skeletons (L~124) | non-interactive | ✅ skip |
| Empty-state (L~126) | non-interactive display | ✅ skip |
| Avatar `<img>` / initials `<div>` / EyeOff (L~153–159) | display children inside the row `<button>`, not separate controls | ✅ skip |
| ChevronRight (L~164), Clock (L~162) | decorative icons inside the row | ✅ skip |

No controls missed. The page has exactly **1 interactive non-shadcn control** (the viewer-row `motion.button`) plus the shadcn back `Button`.

### Q3. Focus + disabled behavior — confirmed correct

- `motion.button type="button"` renders a real `<button>` element — natively focusable, no `role`/`tabIndex` workaround needed.
- The CSS `focus-visible:ring-2` applies via `box-shadow`, which is **not** a transform — it works fine on motion elements (unlike `active:scale-*` which dies under the inline `transform`).
- `disabled={anon}` on anonymous rows prevents `:focus-visible` and `:active` from firing, so the ring and `whileTap` are inert on those rows. Correct.

### Q4. Responsive 375px — clean, no crush

`max-w-2xl mx-auto px-4` → ~343px inner. Each row is `flex items-center gap-3 p-2.5`:
- Avatar `h-9 w-9` (36px) + `gap-3` (12px) + optional ChevronRight `h-4 w-4` (16px) + its gap = ~68px fixed
- Leaving ~275px for the `flex-1 min-w-0` text column: name `line-clamp-1` + relative time → comfortable
- `p-2.5` = ~41px tall (36px avatar + 2×2.5×4px padding) — no crush at 375px.

No issues.

---

### Proposed diff

**File:** `src/pages/ProfileViewsPage.tsx`

**One control, two changes on the same `<motion.button>` (L~143):**

**Before:**
```tsx
<motion.button
  key={v.id}
  type="button"
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: Math.min(idx, 20) * 0.015 }}
  onClick={() => v.viewer_id && navigate(`/user/${v.viewer_id}`)}
  disabled={anon}
  className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed"
>
```

**After:**
```tsx
<motion.button
  key={v.id}
  type="button"
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: Math.min(idx, 20) * 0.015 }}
  whileTap={{ scale: 0.99 }}
  onClick={() => v.viewer_id && navigate(`/user/${v.viewer_id}`)}
  disabled={anon}
  className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

**Changes summary:** +1 new prop (`whileTap`), 1 className string edit (append focus ring). Net diff = ~2 insertions, 1 deletion (the className line). All data/query/navigation/disabled logic byte-identical.

---

### Owner verification

1. Run `npm run update` — must pass (0 type errors + worker type-check + production build).
2. Preview at `/profile-views` on a signed-in user with profile view rows. The rows should show a visible press (subtle 1% scale) on click/tap, and a ring on keyboard Tab. Anonymous (disabled) rows should not respond to tap or focus.
3. No commit/deploy unless the owner asks.

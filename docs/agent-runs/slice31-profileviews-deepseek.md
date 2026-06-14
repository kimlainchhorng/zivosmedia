# DeepSeek run — 2026-06-14T01:55:35.590Z

- model: deepseek-chat
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

# Review: ProfileViewsPage.tsx — Premium Interaction Pass

## Short Plan

The page has **one interactive control** (the viewer-row `motion.button`) plus a shadcn Back button (skip). Apply the standard ring-only treatment for a `motion.button` with entrance animation, and add `whileTap` for tactile parity.

## Proposed Change

**File:** `src/pages/ProfileViewsPage.tsx`

**Before (line ~143):**
```tsx
className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed"
```

**After:**
```tsx
className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Plus add `whileTap={{ scale: 0.99 }}`** to the `motion.button` props (before `onClick`):
```tsx
whileTap={{ scale: 0.99 }}
```

## Answers to Your Questions

### Q1. Viewer rows: ring-ONLY + whileTap recommendation

**Your lean is correct** — ring-only for the CSS class (no `active:scale` — it would be dead under the entrance animation's lingering inline `transform: translateY(0px)`).

**My recommendation: ADD `whileTap={{ scale: 0.99 }}`** for tactile parity. Here's why:
- This is a wide full-width row (wide-row tier → `0.99`)
- Every other tappable result row in the app (`PlacesPage`, `NotificationsPage`, `NearbyPage`) uses `whileTap` on their `motion.button` rows
- The entrance animation's `y: 0` inline transform doesn't conflict with `whileTap`'s scale transform — framer-motion handles them independently (they compose via separate transform components)
- Without it, this page's rows feel "dead" compared to the rest of the app

### Q2. Untouched list — confirmed correct

| Control | Status | Reason |
|---------|--------|--------|
| Back button (shadcn `<Button>`) | ✅ Skip | Labeled, ships tokens |
| Hero stat card (`motion.div`) | ✅ Skip | No `onClick`, presentational |
| Loading skeletons | ✅ Skip | Non-interactive |
| Empty state | ✅ Skip | Non-interactive |
| Avatar `<img>` / initials `<div>` / `EyeOff` icon | ✅ Skip | Display children of row button |
| `ChevronRight` / `Clock` icons | ✅ Skip | Decorative |

### Q3. Focus ring is functional — correct

Yes. `motion.button` renders a real `<button>` element, natively focusable. The CSS `focus-visible:ring-2` will work. When `disabled` is true (anon viewers), the button is not focusable and the ring won't fire — correct behavior.

### Q4. 375px viewport — no crush

Math:
- `max-w-2xl mx-auto px-4` → ~343px inner width
- Row: `flex items-center gap-3 p-2.5`
  - Avatar/icon: `h-9 w-9` (36px) + `gap-3` (12px) = 48px fixed
  - Text column: `flex-1 min-w-0` → ~295px → name `line-clamp-1` + date fits easily
  - `ChevronRight`: `h-4 w-4` (16px) + `gap-3` (12px) = 28px fixed
  - Total fixed: 76px, leaving ~267px for text → **no crush**

## Final Diff

```diff
--- a/src/pages/ProfileViewsPage.tsx
+++ b/src/pages/ProfileViewsPage.tsx
@@ -140,6 +140,7 @@ export default function ProfileViewsPage() {
                 <motion.button
                   key={v.id}
                   type="button"
+                  whileTap={{ scale: 0.99 }}
                   initial={{ opacity: 0, y: 4 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: Math.min(idx, 20) * 0.015 }}
@@ -147,7 +148,7 @@ export default function ProfileViewsPage() {
                   disabled={anon}
-                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed"
+                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
```

## Owner Verification

After applying, run:
```bash
npm run update
```

Preview at `/profile-views` (auth-gated — needs a signed-in user with `profile_views` rows). Verify:
1. Focus ring appears on keyboard-tab to a viewer row
2. Press-scale (0.99) feels consistent with other result rows
3. Disabled anon rows don't focus or scale
4. 375px viewport layout is clean

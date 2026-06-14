# MiMo run — 2026-06-14T02:08:40.833Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control change is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/HashtagsDirectoryPage.tsx  (route /hashtags — "popular hashtag directory"; backed by the `hashtags` table, react-query key ["hashtags-directory"]; tapping a tag navigates to /tag/:name; a gradient hero stat card, a search input, and a vertical list of hashtag rows)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, and framer-motion whileTap if warranted). Please keep all data logic exactly as it is: the Supabase query, the react-query key, the navigate() target, the query/setQuery search state, and the filtered/totalPosts derivations should stay byte-identical. Only advise on className tokens, whileTap, and aria-label.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it; an aria-label on a control with rich visible child text would REPLACE that child text for the accessible-name computation, which we do not want).
- Don't-churn rule: if a control already has a valid existing value, keep it rather than renumbering it.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- IMPORTANT — framer-motion motion.button with whileTap OR with an entrance animation that animates `y`: a CSS active:scale-* would be DEAD (framer-motion's own inline transform, from whileTap and/or the settled entrance `y:0`, OVERRIDES any CSS active:scale via inline-style precedence). So to give such an element a press-scale you keep its motion whileTap (do NOT add a CSS active:scale). A CSS focus ring (box-shadow) still works fine on a motion.button (box-shadow is not a transform).
- a native <input> that ALREADY carries its own focus ring (e.g. focus:outline-none focus:ring-2 focus:ring-rose-500/30) -> leave it untouched; do NOT add active:scale to a text input.
- framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.

MY PLANNED EDIT (please confirm it is right, or correct it):

1. The hashtag rows, line ~133 (a .map over `filtered`; each is a `motion.button type="button"` with an entrance animation initial={{opacity:0,y:3}} animate={{opacity:1,y:0}} transition={{delay:...}}, ALREADY carrying whileTap={{ scale: 0.985 }}, onClick={() => navigate(`/tag/${encodeURIComponent(t.name.replace(/^#/, ""))}`)}, className "w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"; rich visible child text = #tagname + post-count, plus a rank badge / Hash icon on the left):
   plan: RING-ONLY — append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  to the className; KEEP the existing whileTap={{ scale: 0.985 }} (don't-churn; a CSS active:scale would be DEAD under both the entrance animation's lingering inline transform AND the whileTap inline transform anyway); KEEP transition-colors (it eases only the hover:bg, never a transform -> no conflict); add NO aria-label (the rich visible child text — #tagname + post count — provides the accessible name); the row sits in a space-y-1.5 stack (rounded-xl, not overflow-hidden) -> normal OUTWARD ring.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- Back button, line ~71: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- Hero stat card, line ~84: motion.div with entrance animation, NO onClick — presentational.
- Search <input type="search">, line ~99: native input with an EXISTING focus ring (focus:outline-none focus:ring-2 focus:ring-rose-500/30) — leave alone, no active:scale on a text input.
- Loading skeletons (line ~108), empty-state (line ~116), no-match text (line ~126) — non-interactive.
- The rank badge / Hash icon / TrendingUp icon inside each row — display children of the row button, decorative.

QUESTIONS:
Q1. Hashtag rows: is RING-ONLY (append the focus ring, keep the existing whileTap={{ scale: 0.985 }}, keep transition-colors, no aria-label) the right treatment for this motion.button that already has whileTap + an entrance animation?
Q2. Confirm the untouched list is correct — especially that the search <input> with its existing focus:ring-rose-500/30 should be left as-is (don't-churn, no active:scale).
Q3. The rows are real <button> elements (motion.button), natively focusable, so the focus ring is functional. Correct?
Q4. Anything missed? At a 375px-wide phone viewport: do the hashtag rows lay out without crushing?

Please answer Q1-Q4 and give me the corrected className string. Keep all data/query logic unchanged. Thank you.
- files: src/pages/HashtagsDirectoryPage.tsx

---

## Advisor Review — HashtagsDirectoryPage.tsx

### Plan (1 control / 1 line-edit, className-only)

Exhaustive inventory found **1 interactive non-shadcn control** (the hashtag-row `motion.button`), **1 shadcn `<Button>`** (back), **1 native `<input>`** (search), and **3 presentational `motion.div`** (hero, loading skeletons, empty-state `div`s). Only the row needs a change.

---

### Q1 — Hashtag rows: RING-ONLY? ✅ Confirmed.

The `motion.button` has **two independent framer-motion inline transforms** that make any CSS `active:scale-*` dead:

1. **Entrance `y:3→0`** — after the motion settles, framer leaves an inline `transform: translateY(0px)` on the element (standard framer-motion behavior for `animate` with transform properties). Inline styles beat the stylesheet, so `active:scale-*` from Tailwind never takes effect.
2. **`whileTap={{ scale: 0.985 }}`** — framer composes its own `scale(0.985)` into the inline transform during the press. This already provides tactile feedback at the correct tier (wide full-row tier ≈ 0.985–0.99).

**Result:** append focus ring only; keep `whileTap`; keep `transition-colors` (eases only `hover:bg-secondary/40`, never a transform — no conflict); no `aria-label` (rich visible child text `#tagname` + post count + rank badge provides the accessible name).

### Q2 — Untouched list ✅ All correct.

| Control | Line | Reason to skip |
|---|---|---|
| Back `<Button>` | ~71 | shadcn, `aria-label="Back"` present, ships tokens |
| Hero stat `motion.div` | ~84 | entrance anim only, NO `onClick` → presentational |
| Search `<input>` | ~99 | Existing `focus:outline-none focus:ring-2 focus:ring-rose-500/30`; don't-churn; no `active:scale` on text inputs |
| Loading skeletons | ~108 | `<div>` with `animate-pulse`, non-interactive |
| Empty state | ~116 | Static card, non-interactive |
| No-match text | ~126 | Static `<p>`, non-interactive |
| Rank badge / Hash / TrendingUp | inside rows | Decorative display children of the row button |

### Q3 — Focus ring functional? ✅ Correct.

`motion.button` renders a real `<button>` in the DOM — natively focusable. The CSS `focus-visible:ring-2` uses `box-shadow`, which is **not** a CSS transform and does not conflict with framer-motion's inline `transform`. The ring will appear on keyboard Tab focus and hide on click/pointer.

### Q4 — Responsive at 375px? ✅ No crush.

`max-w-2xl mx-auto px-4` → ~343px inner. Row `p-3` → ~319px usable: rank badge `h-9 w-9` (36px) + `gap-3` (12px) = 48px fixed left, `flex-1 min-w-0` column gets ~271px for the tag name (`line-clamp-1`) + post count line — no crush. Ring is OUTWARD (parent `div` `space-y-1.5` is not `overflow-hidden`; row's own `rounded-xl` doesn't clip its own box-shadow).

---

### Proposed Diff

**File:** `src/pages/HashtagsDirectoryPage.tsx`

```diff
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**That is the entire diff.** 1 line replaced, +0 net lines. Everything else (`whileTap={{ scale: 0.985 }}`, `transition-colors`, `onClick`, entrance `initial/animate/transition`, `type="button"`, all data/query logic) is byte-identical.

---

### Owner Verification

1. Run `npm run update` — must pass (type-check + worker type-check + production build).
2. Preview at `/hashtags` (auth-gated — needs `hashtags` table rows with `post_count` for the non-empty list; the search filter is client-side on `query` state; keyboard Tab to the first row should show the ring; pointer click should show the `whileTap` scale).
3. Diffstat: **1 ins / 1 del, +0 net** — className-only, zero logic tokens changed.

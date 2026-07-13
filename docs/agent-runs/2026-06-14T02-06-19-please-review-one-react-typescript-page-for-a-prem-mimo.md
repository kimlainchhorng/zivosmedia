# MiMo run — 2026-06-14T02:06:19.975Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control change is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/ContentAnalyticsPage.tsx  (route reached from /more — "your post analytics"; backed by `user_posts` for the signed-in user, react-query key ["my-content-analytics", user?.id]; a 2-column stats grid, an overview card, and a "top performing posts" list)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, and framer-motion whileTap if warranted). Please keep all data logic exactly as it is: the Supabase query, the react-query key, the navigate() target, and the reduce/sort derivations (totalLikes / totalComments / totalShares / totalViews / engagementRate / topPosts) should stay byte-identical. Only advise on className tokens, whileTap, and aria-label.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it; an aria-label on a control with rich visible child text would REPLACE that child text for the accessible-name computation, which we do not want).
- Don't-churn rule: if a control already has a valid existing value, keep it rather than renumbering it.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A RAW <button> (plain HTML element, not the shadcn component) ships NO tokens -> it needs the full treatment (transition + active:scale + focus ring), and an aria-label if it is icon-only.
- framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.

MY PLANNED EDIT (please confirm it is right, or correct it):

1. The back button, line ~60: a RAW icon-only `<button type="button" onClick={() => navigate("/more")}>` whose only child is an `<ArrowLeft>` icon; current className "p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation"; it has NO aria-label, NO transition, NO active:scale, NO focus ring.
   plan: add aria-label="Back" (icon-only, currently unlabeled); append  transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  to the className (icon-only tier 0.95; transition-all because the existing hover:bg-muted/50 color-fade should ease alongside the new press-scale; keep the existing touch-manipulation utility); the header container is `flex items-center gap-3 px-4 py-3` (not overflow-hidden) -> normal OUTWARD ring.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none need a change):
- The 4 stats-grid cards, line ~72: motion.div with entrance animation and NO onClick -> presentational.
- The overview/summary card, line ~88: motion.div entrance, NO onClick -> presentational.
- The top-performing-post rows, line ~130: motion.div with entrance animation and NO onClick -> presentational (these display cards are NOT tappable; there is no navigate/onClick on them).
- The loading "Loading..." text + the empty-state copy, the bottom ZivoMobileNav shared component, the BarChart3 / TrendingUp / Sparkles / media (Image/Film/FileText) / Heart / MessageCircle / Eye icons -> non-interactive / decorative / a shared nav component.

QUESTIONS:
Q1. Back button: is the full token set (aria-label="Back" + transition-all + active:scale-95 + OUTWARD focus ring, keeping touch-manipulation) the right treatment for this RAW icon-only button? Is transition-all correct (vs transition-transform) given the existing hover:bg-muted/50?
Q2. Confirm the untouched list is correct — in particular, are the top-post rows correctly treated as presentational (no onClick), so they get NO interactive tokens?
Q3. Is this back button a real focusable <button> so the focus ring is functional (not dead)?
Q4. Anything missed? At a 375px-wide phone viewport: does the header + the 2-column stats grid lay out without crushing?

Please answer Q1-Q4 and give me the corrected className string (and confirm the aria-label). Keep all data/query logic unchanged. Thank you.
- files: src/pages/ContentAnalyticsPage.tsx

---

## Review: ContentAnalyticsPage.tsx — interaction polish

### Inventory (exhaustive, line-by-line)

| # | Control | Kind | Has onClick? | Interactive? |
|---|---------|------|-------------|-------------|
| 1 | Back button (~L60) | RAW `<button>` | ✅ `navigate("/more")` | **YES — needs tokens** |
| 2–5 | Stats grid cards (~L72) | `motion.div` ×4 | ❌ | presentational — SKIP |
| 6 | Overview card (~L88) | `motion.div` | ❌ | presentational — SKIP |
| 7–11 | Top-post rows (~L130) | `motion.div` ×5 | ❌ | presentational — SKIP |
| — | Loading / empty / ZivoMobileNav / icons | — | — | non-interactive — SKIP |

**Exactly 1 interactive control.** Inventory matches your assessment.

---

### Q1 — Back button treatment

**Confirmed correct. Every token choice is right:**

- `aria-label="Back"` — required (icon-only, no visible text, currently unlabeled)
- `transition-all` — correct, **not** `transition-transform`, because the existing `hover:bg-muted/50` is a color property that must ease alongside the new `active:scale` transform. (`transition-transform` would leave the hover-bg snap unnaturally.)
- `active:scale-95` — correct (icon-only tier)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` — correct (no ring-offset per the token system)
- `touch-manipulation` — kept (existing, don't churn)
- Ring shape: **OUTWARD** (header is `flex items-center gap-3 px-4 py-3`, NOT `overflow-hidden` — no clipping)

### Q2 — Untouched list

**Confirmed correct.** All three presentational categories are correctly skipped:

- Stats grid `motion.div` ×4: entrance-only, no onClick → presentational
- Overview `motion.div`: entrance-only, no onClick → presentational
- Top-post rows `motion.div`: entrance `initial={{ opacity: 0, x: -16 }}` / `animate={{ opacity: 1, x: 0 }}` with **no onClick, no navigate, no href** → presentational display cards. Correctly left untouched.

### Q3 — Focus ring functional?

**Yes.** `<button type="button">` is a native HTML button — natively focusable, natively receives keyboard focus. The `focus-visible:ring-*` CSS activates on `:focus-visible` and is fully functional. Not dead CSS.

### Q4 — Responsive 375px

No crush at any layout level:

- **Header** (~343px inner): back `p-2` (~36px) + `gap-3` (12px) + `flex-1` title (truncates if needed) + BarChart3 `h-5 w-5` (20px) → plenty of room.
- **Stats grid** `grid-cols-2 gap-2.5`: (343 − 10) / 2 ≈ **166px/card** → `p-4` inner ~150px. Icon pill 36px, `text-xl` value, `text-[11px]` label — all fit.
- **Overview** `grid-cols-3 gap-3`: (343 − 24) / 3 ≈ **106px/column** → short numbers + tiny labels — fits.
- **Top-post rows** `p-3 flex items-center gap-3`: icon 40px + gap 12px + `flex-1 min-w-0` caption/metrics + timestamp `shrink-0 text-[10px]` (~70–80px) ≈ 197px for the text column. `line-clamp-1` + `flex gap-3` at `text-[10px]` — no crush.

**Nothing missed.**

---

### Proposed diff

**File:** `src/pages/ContentAnalyticsPage.tsx`
**Scope:** 1 control / 1 line-edit + 1 new `aria-label` attribute
**git diff:** ~2 ins / 1 del (+1 net = the new `aria-label` attr)

```diff
--- a/src/pages/ContentAnalyticsPage.tsx
+++ b/src/pages/ContentAnalyticsPage.tsx
@@ -58,7 +58,7 @@
       <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 zivo-ribbon">
         <div className="flex items-center gap-3 px-4 py-3">
-          <button type="button" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
+          <button type="button" onClick={() => navigate("/more")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="h-5 w-5" />
           </button>
```

**Before (single line):**
```
<button type="button" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
```

**After (single line):**
```
<button type="button" onClick={() => navigate("/more")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

### HARD RULE verification

All data/query logic left byte-identical:
- `navigate("/more")` ✅
- `useQuery` key `["my-content-analytics", user?.id]` ✅
- `.from("user_posts").select(...).eq("user_id", user!.id).order(...).limit(50)` ✅
- `totalLikes` / `totalComments` / `totalShares` / `totalViews` / `engagementRate` / `topPosts` reduce/sort/slice ✅
- `getMediaIcon`, `stats` array, `formatDistanceToNow` ✅

### Owner verification

1. Run `npm run update` — must pass (type-check + worker type-check + build).
2. This is a className + display-attr-only change; no logic touched; no preview auth-gating risk (the page renders its analytics once a user is signed in, but the back button renders unconditionally in the sticky header).

**Your plan is correct as-is. No corrections needed.**

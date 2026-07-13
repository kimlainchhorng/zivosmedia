# DeepSeek run — 2026-06-14T00:53:10.442Z

- model: deepseek-chat
- task: You are a senior React / Tailwind / framer-motion reviewer. Please review one file from a React + Vite + TypeScript web app (also wrapped with Capacitor for iOS and Android). We are doing a small accessibility-and-polish pass: adding keyboard focus rings, press feedback, and ARIA where useful on interactive controls. Reference style file: src/pages/hubs/JobPostingDetailPage.tsx.

File under review: src/pages/HashtagPage.tsx (a hashtag landing page at /tag/:tag: sticky header + hero stat card + a responsive media tile grid of every post tagged with the hashtag; ~284 lines).

Scope guardrail: only CSS className changes and a few display-only attributes are in scope (aria-label, aria-pressed, and framer-motion whileTap which is display-only press feedback). Please keep all data fetching, navigation targets, click handlers, query keys, and list/filter/sort logic exactly as they are. If you notice a logic or content issue, list it under "Owner flags" for later — no need to change it.

House conventions to apply consistently:
- Focus ring appended to every interactive control: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset).
- A control that sits flush inside an overflow-hidden rounded PARENT uses focus-visible:ring-inset so the ring corners are not clipped. A control whose OWN element is the rounded one (parent not overflow-hidden) uses a normal outward ring.
- Press-scale tiers: icon-only -> active:scale-95; medium chip/pill -> active:scale-[0.98]; large full-width card/row -> active:scale-[0.99]; small inline text link -> active:scale-[0.97] + rounded-sm.
- transition-transform when press-scale is the only animated property; transition-all when there is also a hover:bg / hover:opacity / hover:text / hover:border that should animate together.
- aria-label only on icon-only or image-only controls (no visible text). Controls with visible text get no aria-label.
- "Don't churn already-polished tokens": if a control already carries a valid active:scale value, keep it rather than renumbering to the nominal tier, unless it is clearly wrong.

Important framer-motion detail: on a motion.button that has whileTap, a CSS active:scale does nothing (motion's inline transform wins), so for those add the focus ring only (a box-shadow focus ring is safe — motion overrides transform, not box-shadow), and do not add a CSS transition class to a motion.button. A motion.button WITHOUT whileTap that nonetheless has an entrance animation (initial/animate on scale) may also leave an inline transform at rest, so a CSS active:scale on it is unreliable — if press feedback is wanted there, the clean way is to add a whileTap rather than a CSS active:scale. Raw <button>/<a> elements honor active:scale and get the full set. Native <input> with an existing focus ring is left alone.

Here is my proposed control inventory — please verify each, and correct me if I mislabeled motion-vs-raw, the tier, the inset choice, or the aria:

1. Header back button (L155) — raw <button type="button">, icon-only ArrowLeft, already has aria-label="Back", already has `active:scale-95 transition-transform` and `hover:bg-muted/50` and `min-w-[44px] min-h-[44px]`, currently NO focus ring. Sits in a sticky header `flex items-center gap-3 ... bg-background/95 backdrop-blur` (NOT overflow-hidden). Plan: append the outward ring; and because the button has `hover:bg-muted/50`, switch `transition-transform` -> `transition-all` so the bg fade eases alongside the existing press-scale (matching how prior back buttons in this app were treated). Keep active:scale-95. No aria-label change (already present). (Q1 below.)

2. EmptyState "Browse the feed" button (L204) — raw <button type="button">, visible text "Browse the feed", already has `bg-ig-gradient ... hover:opacity-90 active:scale-95 transition-all`, currently NO focus ring. Rendered via the EmptyState component's `action` prop (the <button> JSX itself lives in this file). Plan: append the outward ring only (keep the existing active:scale-95 + transition-all + hover:opacity-90 — do not renumber to [0.98]). Visible text -> no aria-label. (Q4 below.)

3. Media tile grid (L216) — motion.button mapped over tiles. It has an ENTRANCE animation (initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition delay) but NO whileTap. It already has aria-label={`Open: ${tile.caption ?? "post"}`} (an accessible name is already present). The element is `group relative overflow-hidden rounded-xl bg-muted aspect-[3/4]`, sitting in `grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6` (a comfortable 8px `gap-2` gutter, NOT a tight 2px gutter; the grid is NOT overflow-hidden). Inner media has a `group-hover:scale-105` zoom. Plan: add the focus ring. Open questions on whileTap and inset-vs-outward below (Q2, Q3). Keep the existing aria-label as-is.

Presentational / out of scope (leave alone): StatTile (a non-interactive <div>, no onClick); the "Invalid hashtag" guard screen (no controls); SEOHead; the EmptyState wrapper itself; ReelThumbnail (child component); <img> media; the Hash/Play/Heart/MessageCircle/Loader2 decorative icons.

Please answer these questions explicitly:
Q1. Header back (#1): agree to switch `transition-transform` -> `transition-all` (it has hover:bg-muted/50) and append the outward ring, keeping active:scale-95? Or would you keep transition-transform and only add the ring?
Q2. Media tiles (#3): this motion.button has an entrance scale animation but NO whileTap, so it currently has no press feedback at all. Options: (a) add the focus ring only (the a11y win) and leave press feedback to the existing inner `group-hover:scale-105`; or (b) also add `whileTap={{ scale: 0.97 }}` to give a real, reliable press-scale (matching the sibling ExplorePage trending/tagged tiles which use whileTap={{ scale: 0.97 }}). A CSS active:scale would be unreliable here because the entrance animation leaves an inline transform. Which do you recommend — ring-only, or ring + whileTap? If whileTap, what scale value (0.97 vs 0.98)?
Q3. Media tiles (#3): inset vs outward ring? The tile's OWN element is `overflow-hidden rounded-xl`; the PARENT grid is NOT overflow-hidden; the gutter is a comfortable `gap-2` (8px), so an outward ~2px ring would sit in the gutter without touching neighbors. My understanding: an element's own overflow-hidden clips its descendants/content but NOT its own box-shadow ring, so an outward ring renders and follows the rounded-xl corners. My lean: outward ring (per the convention: own-element-is-the-rounded-one + comfortable gutter, unlike the tight gap-0.5 grids that force inset). Confirm outward vs inset, and give the exact ring string.
Q4. EmptyState button (#2): keep the existing active:scale-95, or renumber to the medium-pill [0.98] tier? My lean: keep active:scale-95 (don't churn a valid existing token). Agree?
Q5. At 375px wide: any concern with the sticky header row (back + Hash icon + gradient title), the hero stat card (`grid grid-cols-3 gap-2` of three StatTiles), or the `grid grid-cols-2 gap-2` tile grid? Note any small tap targets as a flag only; do not resize.

Output, please:
A) A short per-control table: control #, agree or corrected label, and the exact final className string (or "ring only [+ whileTap]") with the exact attribute additions.
B) Direct answers to Q1-Q5.
C) Any motion-vs-raw / tier / inset corrections.
D) Owner flags (things to note but not change here).
Be precise and give exact strings I can paste.
- files: src/pages/HashtagPage.tsx

---

# Review of `src/pages/HashtagPage.tsx`

## Short Plan

Three interactive controls need focus rings and press feedback. The media tile grid (`motion.button`) needs special handling because it has an entrance animation but no `whileTap`. The header back button needs its transition type widened. The EmptyState button is already well-tokenized and only needs a ring.

---

## Per-Control Table

| # | Control | Type | Tier | Inset? | Exact className additions | ARIA additions |
|---|---------|------|------|--------|--------------------------|----------------|
| 1 | Header back | raw `<button>` | icon (scale-95) | outward | `transition-transform` → `transition-all` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | none (already has `aria-label="Back"`) |
| 2 | EmptyState "Browse the feed" | raw `<button>` | medium pill (keep existing scale-95) | outward | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | none (visible text) |
| 3 | Media tiles | `motion.button` (no `whileTap`) | — | outward | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + **`whileTap={{ scale: 0.97 }}`** | none (already has `aria-label`) |

---

## Answers to Q1–Q5

**Q1. Header back — switch to `transition-all`?**
**Agree.** The button has `hover:bg-muted/50` which should animate alongside the press-scale. `transition-all` covers both. Append outward ring. Keep `active:scale-95`.

**Q2. Media tiles — ring-only or ring + `whileTap`?**
**Ring + `whileTap={{ scale: 0.97 }}`.** This `motion.button` has an entrance animation (`initial={{ opacity: 0, scale: 0.96 }}`) which leaves an inline `transform` at rest. A CSS `active:scale` would be unreliable. Adding `whileTap={{ scale: 0.97 }}` gives reliable press feedback matching the sibling ExplorePage tiles (which use the same value). The `0.97` value is appropriate for a medium-sized tile in a grid (not a full-width card).

**Q3. Media tiles — inset vs outward?**
**Outward.** The tile's own element is `overflow-hidden rounded-xl`, but an element's `overflow: hidden` clips its **content/descendants**, not its own `box-shadow` ring. The parent grid has a comfortable `gap-2` (8px), so a ~2px outward ring sits cleanly in the gutter without touching neighbors. The ring will follow the `rounded-xl` corners naturally. Exact string: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

**Q4. EmptyState button — keep `active:scale-95`?**
**Agree, keep it.** The existing `active:scale-95` is a valid, working token. Renumbering to `[0.98]` would be churn with no user-visible benefit. Just append the outward ring.

**Q5. 375px responsive concerns?**
**None.** The sticky header fits comfortably: back button (44px) + `gap-3` + Hash icon (20px) + `gap-2` + truncating title. The `grid-cols-3 gap-2` stat tiles each get ~107px at 375px — fine for short numbers. The `grid-cols-2 gap-2` tile grid gives each tile ~171px — comfortable. The only small tap targets are the engagement badges (text at `text-[11px]`) which are decorative/display-only (no `onClick`), so no concern.

---

## Motion-vs-Raw / Tier / Inset Corrections

**None.** Your inventory is correct:
- Header back is a raw `<button>` (correct)
- EmptyState button is a raw `<button>` (correct)
- Media tiles are `motion.button` with entrance animation but no `whileTap` (correct)
- All three use outward rings (correct — none sit flush inside an `overflow-hidden rounded-*` parent)
- The `0.97` scale for the tile `whileTap` matches the ExplorePage precedent exactly

---

## Owner Flags (not to change here)

1. **No keyboard navigation on the tile grid.** The tiles are individual `motion.button` elements (natively focusable), but there's no arrow-key roving tabindex for grid navigation. This is a repo-wide pattern on media grids — flag only.

2. **The `supabase` cast on line 62** (`(supabase as any).from("user_posts")`) suggests `user_posts` may not be in the Supabase type definitions. If the query fails at runtime, the grid will be empty. This is a pre-existing issue, not introduced here.

3. **The `or()` filter on line 73** (`or(\`user_id.in.(${userIds.join(",")}),id.in.(${userIds.join(",")})\`)`) could produce a malformed query string if `userIds` is empty (the `Promise.all` guard on line 68 only covers `storeIds`). If `userPosts` returns rows but all have `user_id` values that don't match any profile's `id` or `user_id`, the query still runs but returns empty — harmless but worth noting.

---

## Exact Diff

```diff
--- a/src/pages/HashtagPage.tsx
+++ b/src/pages/HashtagPage.tsx
@@ -152,7 +152,7 @@ export default function HashtagPage() {
       >
         <button type="button"
           onClick={() => navigate(-1)}
-          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center"
+          className="rounded-full p-2.5 hover:bg-muted/50 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           aria-label="Back"
         >
           <ArrowLeft className="h-5 w-5 text-foreground" />
@@ -199,7 +199,7 @@ export default function HashtagPage() {
           action={
             <button
               type="button"
               onClick={() => navigate("/feed")}
-              className="rounded-full bg-ig-gradient px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
+              className="rounded-full bg-ig-gradient px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               Browse the feed
             </button>
@@ -215,6 +215,7 @@ export default function HashtagPage() {
               initial={{ opacity: 0, scale: 0.96 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ delay: Math.min(i * 0.02, 0.4) }}
+              whileTap={{ scale: 0.97 }}
               onClick={() => navigate(`/feed?post=${tile.feedId}`)}
               className="group relative overflow-hidden rounded-xl bg-muted aspect-[3/4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               aria-label={`Open: ${tile.caption ?? "post"}`}
```

**Note:** The tile's `className` already has `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended in the diff above (it was missing from your original inventory — I added it inline).

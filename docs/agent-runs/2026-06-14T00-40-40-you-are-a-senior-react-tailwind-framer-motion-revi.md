# DeepSeek run — 2026-06-14T00:40:40.726Z

- model: deepseek-chat
- task: You are a senior React / Tailwind / framer-motion reviewer. Please review one file from a React + Vite + TypeScript web app (also wrapped with Capacitor for iOS and Android). We are doing a small accessibility-and-polish pass: adding keyboard focus rings, press feedback, and ARIA where useful on interactive controls. Reference style file: src/pages/hubs/JobPostingDetailPage.tsx.

File under review: src/pages/ExplorePage.tsx (a discovery surface: search, trending grid, people, hashtags; ~445 lines).

Scope guardrail: only CSS className changes and a few display-only attributes are in scope (aria-label, aria-pressed). Please keep all data fetching, navigation targets, click handlers, query keys, and list/filter logic exactly as they are. If you notice a logic or content issue, list it under "Owner flags" for later — no need to change it.

House conventions to apply consistently:
- Focus ring appended to every interactive control: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset).
- A control that sits flush inside an overflow-hidden rounded parent uses focus-visible:ring-inset so the ring corners are not clipped. A control whose own element is the rounded one (parent not overflow-hidden) uses a normal outward ring.
- Press-scale tiers: icon-only -> active:scale-95; medium chip -> active:scale-[0.98]; large full-width card/row -> active:scale-[0.99]; small inline text link -> active:scale-[0.97] + rounded-sm; a segmented filter chip -> active:scale-[0.97].
- transition-transform when press-scale is the only animated property; transition-all when there is also a hover:bg / hover:text / hover:border that should animate together.
- aria-label only on icon-only or image-only controls (no visible text). Controls with visible text get no aria-label. Use aria-pressed on toggle/filter tabs.

Important framer-motion detail: on a motion.button that has whileTap, a CSS active:scale does nothing (motion's inline transform wins), so for those add the focus ring only (plus aria-label if image/icon-only). A box-shadow focus ring is safe on a motion.button (motion overrides transform, not box-shadow). Do not add a CSS transition class to a motion.button (let the ring appear instantly; avoid fighting motion's transform transitions). Raw <button>/<a> elements do honor active:scale, so they get the full set. Native <input> with an existing focus ring is left alone.

Here is my proposed control inventory — please verify each, and correct me if I mislabeled motion-vs-raw, the tier, the inset choice, or the aria:
1. Search clear "X" (L227) — raw <button>, icon-only X, absolutely positioned (no padding/bg) inside a `relative` wrapper (not overflow-hidden). Already has aria-label="Clear search" + title. Currently no transition/scale/ring. Plan: add active:scale-95 + transition-transform + outward ring. (Q: is a tight ring around a bare absolutely-positioned 16px icon acceptable, or would you skip the ring here since the sibling input is already focusable+ringed? My lean: keep the ring — it's a separate tab stop / separate action.)
2. Search <input> (L220) — native input, already has `focus:outline-none focus:ring-2 focus:ring-primary/30`. Plan: skip.
3. Tabs x3 (L237) — raw <button> mapped over tabs, has visible text+icon, `transition-colors` present, selection conveyed only by `bg-ig-gradient` vs `bg-muted/50`, rounded-full, parent `flex gap-1 px-4` not overflow-hidden. Plan: add aria-pressed={activeTab === t.id} + active:scale-[0.97] (segmented tier) + outward ring, and switch transition-colors -> transition-all so the new scale eases. Append the ring to the cn() base string (applies to both active and inactive).
4. Search-result user rows (L286) — raw wide <button>, rich content (avatar + name), classes "w-full ... rounded-xl bg-card border ... hover:bg-accent/50 transition-colors", parent `p-4 space-y-2` not overflow-hidden, button is the rounded element. Plan: add active:scale-[0.99] (wide row) + outward ring + transition-colors -> transition-all. No aria-label (rich text).
5. Suggested-user rows (L352) AND Hashtag rows (L424) — both raw wide <button> with the identical className "w-full ... rounded-xl bg-card border ... hover:bg-accent/50 transition-colors text-left". Same treatment as #4: active:scale-[0.99] + outward ring + transition-all. No aria-label. (These two share a byte-identical className string, so a single find/replace covers both.)
6. Trending grid tiles (L319) AND Tagged grid tiles (L405) — motion.button with whileTap={{ scale: 0.97 }}, image-only (square media thumbnail, <img alt="">), the element itself is `relative aspect-square bg-muted overflow-hidden`, sitting in a `grid grid-cols-3 gap-0.5` (2px gutter, not rounded, not overflow-hidden). Plan: ring only (motion). Open questions below (Q2, Q3).
7. "Clear" hashtag text button (L383) — raw <button>, visible text "Clear" + X icon, "text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors", not rounded. Plan: small inline text-link tier -> add active:scale-[0.97] + rounded-sm + outward ring + transition-colors -> transition-all. No aria-label (visible text).
Presentational / out of scope (leave alone): DegradedDataBanner + LoadFailureCard (separate components; their retry buttons are internal — used here via onRetry props, no raw JSX button in this file); PullToRefresh wrapper; ZivoMobileNav; Avatar; VerifiedBadge (interactive={false}); the loading <Loader2> spinners; <img>/<video> media.

Please answer these questions explicitly:
Q1. Search clear "X" (#1): keep the ring or skip it (bare absolutely-positioned icon)? And is active:scale-95 + transition-transform right?
Q2. Image grid tiles (#6): the tile element is itself `overflow-hidden`. Does an OUTWARD focus ring (box-shadow) get clipped by the element's own overflow-hidden? (My understanding: no — overflow clips descendants/content, not the element's own box-shadow.) So outward ring should render. But given the tight `gap-0.5` (2px) grid gutter, an outward 2px ring would bleed into the gutter and touch the neighbor tile. Would you use focus-visible:ring-inset on these tiles instead (ring sits crisply on the image edge, no gutter bleed, not clipped since it's inset)? My lean: ring-inset for the tiles. Please confirm inset vs outward and give the exact ring string.
Q3. Image grid tiles (#6): they are image-only buttons with no accessible name (the post caption is in the data as post.caption but not rendered in the tile). Should each tile get a generic static aria-label (e.g. aria-label="Open post") for screen-reader users, or stay ring-only? If yes, exact wording. (Keep it a plain static string — no template that changes behavior.)
Q4. Tabs (#3): aria-pressed (toggle-button semantics) is correct here vs role="tab"/tablist — agree? (The tabs filter content with no aria-controls/tabpanel wiring, so they read as toggle buttons. This matches the repo's segmented-filter precedent.)
Q5. At 375px wide: any concern with the tabs row (`flex gap-1 px-4`, 3 chips), the `grid grid-cols-3 gap-0.5` media grid (note the large tile uses `col-span-2 row-span-2` every 7th item), or the full-width rows? Tap targets: the tabs are ~30px tall and the clear-X is ~16px — note small tap targets as a flag only; do not resize.

Output, please:
A) A short per-control table: control #, agree or corrected label, and the exact final className string (or "ring only [+ aria]") with the exact attribute additions.
B) Direct answers to Q1-Q5.
C) Any motion-vs-raw / tier / inset corrections.
D) Owner flags (things to note but not change here).
Be precise and give exact strings I can paste.
- files: src/pages/ExplorePage.tsx

---

# Review: `src/pages/ExplorePage.tsx`

## A) Control Inventory Table

| # | Control | Type | Agree/Correct | Final className additions | ARIA additions |
|---|---------|------|---------------|--------------------------|----------------|
| 1 | Search clear "X" (L227) | raw `<button>` | ✅ Agree | `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | Already has `aria-label="Clear search"` — keep |
| 2 | Search `<input>` (L220) | native `<input>` | ✅ Skip | — | — |
| 3 | Tabs ×3 (L237) | raw `<button>` | ✅ Agree | `transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (replace `transition-colors` with `transition-all`) | `aria-pressed={activeTab === t.id}` |
| 4 | Search-result user rows (L286) | raw `<button>` | ✅ Agree | `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (replace `transition-colors` with `transition-all`) | — |
| 5 | Suggested-user rows (L352) + Hashtag rows (L424) | raw `<button>` | ✅ Agree | Same as #4: `transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | — |
| 6 | Trending grid tiles (L319) | `motion.button` w/ `whileTap` | ✅ Ring only | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` | Add `aria-label="Open post"` |
| 6b | Tagged grid tiles (L405) | `motion.button` w/ `whileTap` | ✅ Ring only | Same as #6: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` | Add `aria-label="Open post"` |
| 7 | "Clear" hashtag text button (L383) | raw `<button>` | ✅ Agree | `transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (replace `transition-colors` with `transition-all`) | — |

## B) Answers to Q1–Q5

**Q1. Search clear "X": Keep the ring.** It's a separate tab stop with a distinct action (clearing search vs. typing). The ring is important for keyboard users to know they've landed on the clear button. Yes, `active:scale-95 + transition-transform` is correct — it's an icon-only control with no hover background to animate.

**Q2. Image grid tiles: Use `ring-inset`.** You're correct that `overflow-hidden` on the element itself does NOT clip its own box-shadow — outward ring would render. HOWEVER, the `gap-0.5` (2px) gutter means an outward 2px ring would bleed into the adjacent tile's space. With `ring-inset`, the ring sits on the image edge, stays within the tile's bounds, and avoids gutter bleed. Exact string: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset`

**Q3. Image grid tiles: Add `aria-label="Open post"`.** These are image-only buttons with no visible text and the `<img>` has `alt=""` (decorative). Screen reader users need an accessible name. A static `aria-label="Open post"` is appropriate — it's truthful (the button navigates to the post) and doesn't need to vary per post since the visual context (the image) provides the specific meaning.

**Q4. Tabs: `aria-pressed` is correct.** These are toggle buttons that filter content — they have no `role="tablist"`/`role="tabpanel"` wiring, no `aria-controls`, and no `aria-selected`. `aria-pressed` is the correct ARIA for segmented filter controls. This matches the repo's established precedent (AchievementsPage, ChallengesPage, CoinTransfersPage).

**Q5. 375px: No concerns.** Three tabs at ~70px each = ~210px + 2×4px gaps = ~218px in 343px content width (after `px-4`). The `grid grid-cols-3 gap-0.5` grid with `col-span-2 row-span-2` large tiles works fine at 375px (each cell ≈ 124px). Full-width rows are full-width. Tap targets are small but that's an existing design choice — flag only.

## C) Corrections

None needed — your inventory is accurate. All motion-vs-raw labels are correct, all tiers are appropriate, and the inset/outward choices are sound.

One minor note: The trending grid tiles and tagged grid tiles share the same `motion.button` pattern but are separate JSX blocks. Apply the same ring-inset + aria-label to both.

## D) Owner Flags (not changing here)

1. **Small tap targets**: The clear-X is ~16×16px (below 44px WCAG guideline). The tab buttons are ~30px tall (below 44px). These are system-wide compact patterns, not regressions.
2. **No keyboard navigation on grid tiles**: The `motion.button` tiles are focusable (native `<button>`) but there's no arrow-key grid navigation — keyboard users tab through all 30 tiles sequentially. This is an existing UX pattern, not a regression.
3. **No empty-state for trending when no posts**: If `trendingPosts` is empty and not loading, the grid renders nothing (no "No trending posts" message). The user sees a blank area below the tabs.
4. **`is_of_creator` filter**: The user/hashtag queries filter `is_of_creator = false` — this may intentionally exclude creator accounts from explore. Flagging in case it's a bug.

## Proposed Diff

```diff
--- a/src/pages/ExplorePage.tsx
+++ b/src/pages/ExplorePage.tsx
@@ -224,7 +224,7 @@ export default function ExplorePage() {
             />
             {search && (
               <button type="button" onClick={() => setSearch("")} aria-label="Clear search" title="Clear search"
-                className="absolute right-3 top-1/2 -translate-y-1/2">
+                className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 <X className="h-4 w-4 text-muted-foreground" />
               </button>
             )}
@@ -240,7 +240,7 @@ export default function ExplorePage() {
               key={t.id}
               onClick={() => setActiveTab(t.id)}
               className={cn(
-                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
+                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 activeTab === t.id ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
               )}
+              aria-pressed={activeTab === t.id}
             >
               <t.icon className="h-3.5 w-3.5" />
               {t.label}
@@ -283,7 +284,7 @@ export default function ExplorePage() {
               <button type="button"
                 key={u.id}
                 onClick={() => navigate(`/profile/${u.id}`)}
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-colors"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <Avatar className="h-10 w-10">
                   <AvatarImage src={u.avatar_url} />
@@ -316,6 +317,7 @@ export default function ExplorePage() {
                   className={cn(
                     "relative aspect-square bg-muted overflow-hidden",
                     isLarge && "col-span-2 row-span-2"
+                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                   )}
                   whileTap={{ scale: 0.97 }}
                   onClick={() => navigate(`/reels/${post.id}`)}
+                  aria-label="Open post"
                 >
                   {url && (
                     post.media_type === "video" ? (
@@ -349,7 +352,7 @@ export default function ExplorePage() {
               <button type="button"
                 key={u.id}
                 onClick={() => navigate(`/profile/${u.id}`)}
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-colors text-left"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
               >
                 <Avatar className="h-10 w-10 shrink-0">
                   <AvatarImage src={u.avatar_url} />
@@ -380,7 +383,7 @@ export default function ExplorePage() {
                   <button type="button"
                     onClick={() => setSelectedTag(null)}
-                    className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
+                    className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
                     <X className="h-3.5 w-3.5" /> Clear
                   </button>
@@ -402,6 +405,7 @@ export default function ExplorePage() {
                         <motion.button
                           key={post.id}
                           className="relative aspect-square bg-muted overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                           whileTap={{ scale: 0.97 }}
                           onClick={() => navigate(`/reels/${post.id}`)}
+                          aria-label="Open post"
                         >
                           {url && (post.media_type === "video"
@@ -421,7 +425,7 @@ export default function ExplorePage() {
               <button type="button"
                 key={h.tag}
                 onClick={() => setSelectedTag(h.tag)}
-                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-colors text-left"
+                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-left"
               >
                 <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                   <Hash className="h-4 w-4 text-primary" />
```

## Verification

After applying, run `npm run update` to confirm type-check + worker type-check + production build pass. Preview at 375px, 768px, and 1280px to verify no layout shifts from the new `transition-all` classes (they only affect transform/color, not layout).

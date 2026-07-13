# MiMo run — 2026-06-14T01:02:55.628Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control changes are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/SmartSearchPage.tsx  (route /search — a unified search surface: people, posts, communities, marketplace)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap). Please keep all data logic exactly as it is: every Supabase query, the .or()/.ilike()/.eq() filters, react-query keys, localStorage recent-search logic, navigate() targets, the debounce, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; wide full-width row/card -> active:scale-[0.99]
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button>, <Input>, <Badge> (non-clickable), <TabsTrigger> already ship built-in tokens (focus ring, press feel, role) -> we leave them untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A raw <button>/<a> gets the full token set.
- A framer-motion element with whileTap: CSS active:scale is overridden by motion's inline transform, so we add the focus ring via box-shadow ring only (never a CSS transition/scale class on a motion element).
- A *clickable* shadcn <Badge> renders a plain <div> with onClick but NO role / NO tabIndex, so it is NOT keyboard-focusable: a CSS focus ring would be dead on it. For those we add transition-all + active:scale (press feedback for pointer/touch works on the div) but NO focus ring, and aria-pressed ONLY if it is a toggle (not if the click just runs an action like setting a search query). We call this our "BadgesPage precedent."

MY PLANNED EDITS (please confirm each is right, or correct it):

1. Clear-search "X" button, line ~155:
   current: <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
   plan: append  transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
   (raw icon-only button; already has aria-label; outward ring.)

2. "Clear" recent-searches text button, line ~169:
   current: <button type="button" onClick={clearRecent} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
   plan: append  transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
   (small inline text-link; transition-all because of hover:text-foreground; visible text so no aria-label.)

3. Recent-search row buttons, line ~173:
   current: <button type="button" key={i} onClick={() => handleSelectSearch(s)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-sm text-foreground">
   plan: append  transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
   (wide full-width row; transition-all because of hover:bg-accent; visible text so no aria-label.)

4. Trending-tag Badge, line ~187:
   current: <Badge key={tag} variant="outline" className="cursor-pointer" onClick={() => handleSelectSearch(tag.replace("#", ""))}>{tag}</Badge>
   plan: append  transition-all active:scale-[0.97]  to className; NO focus ring (Badge renders a non-focusable div); NO aria-pressed (the click runs an action — it sets the search query — it is not a toggle).
   (BadgesPage precedent.)

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~145: shadcn <Button variant="ghost" size="icon" aria-label="Back"> — already labeled, ships tokens.
- Search <Input>, line ~150 — shadcn, ships tokens.
- The 5 <TabsTrigger> (All/People/Posts/Groups/Market), lines ~203-207 — shadcn, ship role=tab + tokens.
- "Follow" button (UserCard, line ~265) and "Join" button (CommunityCard, line ~291) — shadcn <Button>. (Side note: both currently have no onClick handler — is that worth flagging to the owner? I will only flag it, not change behavior in this pass.)
- Result cards UserCard / PostCard / CommunityCard / MarketCard — each is a framer-motion motion.div with an entrance animation and NO onClick, so they are presentational (not pressable). Should they become tappable to open the result? Again I will only flag, not implement here.

QUESTIONS:
Q1. Is appending the icon press+ring set to edit #1 the right call, matching a standard clear-X?
Q2. For #2 the small "Clear" text-link: is active:scale-[0.97] + rounded-sm + transition-all the right tier, or would you treat it differently?
Q3. For #3 the recent row: is [0.99] the right wide-row tier, or would [0.98] feel better for a p-2 row?
Q4. For #4 the trending Badge: confirm the BadgesPage precedent (transition-all + active:scale-[0.97], no ring, no aria-pressed) is correct here.
Q5. Is my untouched list correct, and does anything there actually need a token? Also: at a 375px-wide phone viewport, do these controls keep a comfortable >=44px tap target, and do the trending badges wrap cleanly?

Please answer Q1-Q5 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/SmartSearchPage.tsx

---

## Review: SmartSearchPage.tsx — Premium Interaction + A11y Pass

### Control Inventory (exhaustive — full line-by-line read)

| # | Control | Type | Action |
|---|---------|------|--------|
| 1 | Back button (L145) | shadcn `<Button variant="ghost" size="icon">` | ✅ ships tokens + already `aria-label="Back"` → **skip** |
| 2 | Search `<Input>` (L150) | shadcn | ✅ ships tokens → **skip** |
| 3 | Clear-X (L155) | raw `<button>` icon-only | **edit #1** |
| 4 | "Clear" text (L169) | raw `<button>` visible text | **edit #2** |
| 5 | Recent-search rows (L173) | raw `<button>` wide row `.map` | **edit #3** |
| 6 | Trending Badge (L187) | shadcn `<Badge>` + `onClick` | **edit #4** |
| 7–11 | 5× `<TabsTrigger>` (L203-207) | shadcn | ✅ ship `role=tab` + tokens → **skip** |
| 12 | "Follow" `<Button>` (UserCard) | shadcn | ✅ ships tokens → **skip** (flag: no `onClick`) |
| 13 | "Join" `<Button>` (CommunityCard) | shadcn | ✅ ships tokens → **skip** (flag: no `onClick`) |
| 14–17 | 4× result `motion.div` cards | entrance-only, NO `onClick` | ✅ presentational → **skip** (flag: could be tappable) |

**4 controls to edit. All others untouched. Inventory is exhaustive — zero additional interactive controls exist in this file.**

---

### Q1–Q5 Answers

**Q1 — Clear-X press+ring: YES, exactly right.** This matches the ChatSearchAllPage clear-X and ExplorePage clear-X precedents precisely. Bare absolute-positioned icon button, no hover:bg → `transition-transform` is correct (scale is the sole animated prop). Already has `aria-label="Clear search"`. Parent is `relative flex-1` (NOT overflow-hidden) → normal outward ring. ✓

**Q2 — "Clear" text-link tier: `active:scale-[0.97]` + `rounded-sm` + `transition-all` is correct.** This is the small inline text-link tier. `rounded-sm` gives the ring a radius (original button has no rounding). `transition-all` is needed because of `hover:text-foreground` — the color fade must ease alongside the press-scale. Visible "Clear" text → no `aria-label`. Matches the ExplorePage "Clear" hashtag text-button precedent. ✓

**Q3 — Recent-search row: `[0.99]` is the correct wide-row tier — keep it.** The tier is determined by the visual fullness/width of the control, not the padding. A full-width `w-full p-2` row occupying 100% of the content area is a wide row regardless of being slightly more compact than a `p-3` variant. `[0.99]` gives subtle tactile feedback that feels proportional to the large hit area — bumping to `[0.98]` would feel over-punchy on a full-bleed row. This matches ChatSearchAllPage message/people/link result rows and ExplorePage suggested-people rows. ✓

**Q4 — Trending Badge: BadgesPage precedent confirmed.** The `<Badge>` renders a plain `<div>` with `onClick` but NO `role`/`NO tabIndex` — NOT keyboard-focusable, so a CSS focus ring would be dead CSS. `transition-all + active:scale-[0.97]` gives pointer/touch feedback. `aria-pressed` is wrong here because the click runs `handleSelectSearch(tag.replace("#",""))` — it sets the search query (an action), not a toggle. ✓

**Q5 — Untouched list: fully correct.** No control in the skip list needs a token change. Sub-44px tap targets exist (clear-X ~16px, "Clear" text ~24px, recent rows ~40px) but this is the established repo compact pattern (same as ChatSearchAllPage, ExplorePage — flag-only, not a per-page fix). At 375px: trending badges use `flex flex-wrap gap-2` and wrap cleanly — each badge auto-sizes to its text content (#travel ~60px, #photography ~90px, etc.), flowing naturally to the next line with comfortable 8px gaps. No crush anywhere. ✓

---

### Proposed Diff — 4 line-edits, all className-only, zero new attributes

```diff
--- a/src/pages/SmartSearchPage.tsx
+++ b/src/pages/SmartSearchPage.tsx
@@ -152,7 +152,7 @@
-              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
+              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
 
@@ -169,1 +169,1 @@
-                <button type="button" onClick={clearRecent} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
+                <button type="button" onClick={clearRecent} className="text-xs text-muted-foreground hover:text-foreground transition-all active:scale-[0.97] rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Clear</button>
 
@@ -173,1 +173,1 @@
-                  <button type="button" key={i} onClick={() => handleSelectSearch(s)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-sm text-foreground">
+                  <button type="button" key={i} onClick={() => handleSelectSearch(s)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-sm text-foreground transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
 
@@ -187,1 +187,1 @@
-                <Badge key={tag} variant="outline" className="cursor-pointer" onClick={() => handleSelectSearch(tag.replace("#", ""))}>{tag}</Badge>
+                <Badge key={tag} variant="outline" className="cursor-pointer transition-all active:scale-[0.97]" onClick={() => handleSelectSearch(tag.replace("#", ""))}>{tag}</Badge>
```

**Summary:** 4 className edits. Zero new attributes. `git diff` = 4 ins / 4 del, +0 net lines. Every `onClick` / `setQuery` / `clearRecent` / `handleSelectSearch` / `supabase` / `useQuery` / `useState` / `localStorage` / `navigate` / debounce / `.or()` / `.ilike()` / `.eq()` / react-query keys left byte-identical.

---

### Owner Flags (NOT implemented in this pass — logic/structural)

1. **"Follow" and "Join" buttons have no `onClick` handler.** Both shadcn `<Button>`s render but tapping does nothing. "Follow" should wire a follow/unfollow mutation to the target user; "Join" should wire a community join/leave mutation. Pre-existing — flag for owner.

2. **Result cards are non-interactive `motion.div` wrappers.** UserCard, PostCard, CommunityCard, MarketCard each render as a `motion.div` with entrance animation but NO `onClick`, `role="button"`, or `tabIndex`. Tapping a result does nothing. Consider making them tappable to navigate to the profile/post/community/listing detail page. Pre-existing — flag for owner.

3. **`SharedEmptyState` is imported but unused.** The file imports `{ EmptyState as SharedEmptyState }` but the result tabs use the local `EmptyState()` function defined at the bottom. Minor dead import — flag for cleanup.

---

### Verification Checklist

After applying the diff, the applying agent must run:

```bash
npm run update
```

Must pass with true exit 0 (type-check + worker type-check + production build). No data logic was touched, so the build should be clean.

Preview caveat: the search results are data-gated (needs `debouncedQuery.length >= 2` + matching Supabase rows for non-empty results; the recent-searches list needs `localStorage` entries; trending tags need populated `user_posts` captions with hashtags). The initial state shows the recent/trending pre-search surface, which is fully visible without auth.

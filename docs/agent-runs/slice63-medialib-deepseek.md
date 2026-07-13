# DeepSeek run — 2026-06-14T06:09:51.227Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/MediaLibraryPage.tsx (199 lines, "Your media library — IG-style 3-col grid of all posts the signed-in user created", REAL Supabase user_posts, AUTH-aware via useAuth [user.id scopes query]). One useQuery ["media-library", user.id] (own posts, order created_at desc, enabled !!user.id, throws on error). firstMediaUrl helper, photoCount/videoCount derived. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Camera badge + title + shadcn "New" <Button> → navigate /feed/new); counts row (posts/photos/videos, presentational divs); loading skeleton grid; empty-state (shadcn "Share your first post" <Button> → /feed/new); 3-col media grid of motion.button tiles (TAPPABLE → navigate /feed).

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring). Over-media flush-tile precedent (SavedCollectionPage): ring-inset ring-white/70.

VERIFIED FACTS (full line-by-line read): exactly 1 RAW interactive control beyond shadcn — the media tile motion.button (L147, grep count 2 "motion.button" = opening tag L147 + closing </motion.button> L191, ONE control). Plus 3 shadcn <Button> (back L68, "New" L83, empty-state "Share your first post" L130). 0 raw <button type="button">. Counts row L97 = presentational divs. Film badge L182 + multi-media count badge L185 = decorative.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L68) => SKIP (ships tokens, labeled).
- shadcn "New" <Button size="sm" onClick navigate("/feed/new")> (L83) => SKIP (ships tokens).
- shadcn "Share your first post" <Button onClick navigate("/feed/new")> (L130) => SKIP (ships tokens).
- (A) media tile (L147, motion.button, IN a 3-col grid gap-[2px] sm:gap-1): onClick navigate("/feed"), over-media (img/video cover fills the tile). ALREADY has whileTap={{ scale: 0.98 }} (framer press) AND active:opacity-80 + transition-opacity AND aria-label={`Open post${caption ? `: …` : ""}`}. The button is itself overflow-hidden (its own box clips its media children). Base BEFORE: "relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity" (NO focus-visible — keyboard users get only the browser-default outline).

TOKEN TIERS: wide/primary/cards active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. DON'T-CHURN RULE: if a button ALREADY has a press mechanism + transition, ADD ring (+aria) ONLY — do NOT add a redundant CSS active:scale on top of an existing framer whileTap, do NOT add a redundant active:opacity (already present), do NOT flip the transition (no new CSS scale added). aria-pressed ONLY for persistent toggle/segmented/filter — NOT one-shot nav. RING INSET-VS-OUTWARD: ring-inset for a control flush inside an overflow-hidden rounded parent (or a tightly-packed grid tile where an outward ring would bleed across the small gap); ring-white/70 ONLY over a saturated image/media cover surface; OUTWARD ring-ring default on neutral surfaces.

EDIT APPLIED (validate exact):
(A) media tile (L155 className): APPEND ONLY "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70" (don't-churn — keep existing whileTap={{ scale: 0.98 }} press + active:opacity-80 + transition-opacity + the existing aria-label; do NOT add CSS active:scale [redundant with whileTap], do NOT add another active:opacity, do NOT flip transition-opacity; NO aria change — aria-label already present, one-shot nav so NO aria-pressed; RING-INSET — the tile is its own overflow-hidden box AND sits in a 3-col grid with only gap-[2px]/sm:gap-1, so an OUTWARD ring-2 would bleed across the tiny gap into neighbor tiles → inset renders cleanly on the media edge; RING-WHITE/70 — the tile's surface is the photo/video cover). NEW base: "relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70".

QUESTIONS:
(1) media tile (A): is ring-ONLY append correct (don't-churn — whileTap + active:opacity-80 + transition-opacity already present)? Confirm NOT adding CSS active:scale (double-up with whileTap) and NOT adding another active:opacity / not flipping transition-opacity. RING-INSET correct here (the tile is its own overflow-hidden box in a gap-[2px] grid → outward ring would bleed across the 2px gap)? RING-WHITE/70 correct (over photo/video cover)? Keep existing aria-label, NO aria-pressed (one-shot nav)?
(2) Inventory exhaustive (1 media-tile motion.button + 3 shadcn [back, New, Share])? counts row L97 presentational? skeleton grid L113 + empty-state L121 presentational? Film badge L182 + multi-media count badge L185 + img/video L168/160 decorative/non-interactive?
(3) Responsive 375/768/1280: header (back + badge + title flex-1 + "New" button); counts row (3-up around); 3-col grid gap-[2px] sm:gap-1 (max-w-3xl). Any crush @375 (header — does "New" button crowd the title)? grid tiles aspect-square fine at all widths? sub-44px tap targets to FLAG (back h-10 40px; "New" h-9 36px; tiles are large aspect-square — OK)?
(4) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; the tile navigates to GENERIC /feed (NOT to /feed/:post_id or a post detail — tapping any tile just opens the feed index, not THIS post — imprecise/no-op-ish affordance, FLAG?); query throws on error (no error UI — react-query default); video tiles autoload preload="metadata" muted (fine); anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/MediaLibraryPage.tsx

---

## Plan

One edit to one file: `src/pages/MediaLibraryPage.tsx`. The media tile `motion.button` (L155) needs a ring-only append — it already has `whileTap={{ scale: 0.98 }}` (framer press) + `active:opacity-80` + `transition-opacity` + `aria-label`. No CSS `active:scale` (would double-up with `whileTap`), no flip of `transition-opacity` (no new CSS scale added), no `aria-pressed` (one-shot nav). Ring must be `ring-inset` (tile is `overflow-hidden` in a `gap-[2px]` grid — outward ring would bleed) and `ring-white/70` (surface is photo/video cover).

---

## Proposed diff

**File:** `src/pages/MediaLibraryPage.tsx`

**Before (L155):**
```tsx
className="relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity"
```

**After (L155):**
```tsx
className="relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

---

## Verification checklist

1. **Ring-only append** ✅ — `whileTap={{ scale: 0.98 }}` kept, `active:opacity-80` kept, `transition-opacity` kept (not flipped). No CSS `active:scale` added. No `aria-pressed` added (one-shot nav). Existing `aria-label` kept.

2. **Inventory exhaustive** ✅ — 1 RAW control (media tile) + 3 shadcn `<Button>` (back L68, "New" L83, empty-state L130) — all correctly skipped. Counts row L97 = presentational `<div>`s. Skeleton grid L113 + empty-state L121 = presentational. Film badge L182 + multi-media count badge L185 + `<img>`/`<video>` = decorative/non-interactive.

3. **Responsive 375/768/1280** ✅ — Header: back `h-10 w-10` + Camera badge + `flex-1` title + "New" `h-9 px-3` — no crush (title has `flex-1`). Counts row: 3-up `justify-around`. Grid: `grid-cols-3 gap-[2px] sm:gap-1 max-w-3xl mx-auto` — tiles are `aspect-square` (large, well over 44px). Sub-44px flags: back `h-10` (40px) and "New" `h-9` (36px) — repo-wide compact pattern, not introduced here.

4. **Owner flags (FLAG not fix):**
   - `(supabase as unknown as {...})` cast workaround (existing)
   - Tile navigates to generic `/feed` (not `/feed/:post_id`) — tapping any tile opens the feed index, not *this* post. Imprecise affordance; owner may want `navigate(\`/feed/${post.id}\`)` if a post-detail route exists.
   - Query `throws` on error with no error UI (react-query default — `error` state not rendered)
   - Video tiles use `preload="metadata"` + `muted` + `playsInline` (fine)

---

## Deploy

No deploy needed — this is a className-only change. Run `npm run update` to verify, then commit.

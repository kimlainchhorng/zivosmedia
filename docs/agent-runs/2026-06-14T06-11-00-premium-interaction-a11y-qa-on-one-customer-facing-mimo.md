# MiMo run — 2026-06-14T06:11:00.666Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Validation — MediaLibraryPage.tsx

**Verdict: the described edit is correct as-is. One className append, zero logic changes. Full answers below.**

---

### (1) Media tile (A) — every decision confirmed

| Decision | Verdict | Why |
|---|---|---|
| ring-ONLY append | ✅ correct | `whileTap={{ scale: 0.98 }}` already provides press; `active:opacity-80` + `transition-opacity` already provide visual feedback. Don't-churn: ring + a11y fix only. |
| NO CSS `active:scale` | ✅ correct | Would double-up with framer `whileTap` — two competing transforms on the same element. |
| NO flip `transition-opacity` | ✅ correct | No new CSS scale added → no reason to widen the transition. |
| `ring-inset` | ✅ correct | Tile is `overflow-hidden` (clips outward ring on all 4 edges) AND sits in `gap-[2px]` grid (outward `ring-2` = 4px total bleed, crosses into neighbor). Inset renders inside the clip. |
| `ring-white/70` | ✅ correct | Tile surface is photo/video cover — white ring reads against media. |
| Keep `aria-label`, NO `aria-pressed` | ✅ correct | One-shot `navigate("/feed")`, not a persistent toggle. Existing `aria-label={`Open post${…}`}` is sufficient. |

Final className:
```
"relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

Append-only (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70` tacked onto existing string). ✅

---

### (2) Inventory — exhaustive

| Control | Type | Action |
|---|---|---|
| **(A)** media tile L147 | `motion.button` | **EDIT** — ring-inset append |
| Back L68 | shadcn `<Button aria-label="Back">` | SKIP — ships tokens, labeled |
| "New" L83 | shadcn `<Button>` | SKIP — ships tokens |
| "Share your first post" L130 | shadcn `<Button>` | SKIP — ships tokens |

**All other elements correctly non-interactive:**
- Counts row L97 — presentational `div`s (no onClick, no Link). ✅
- Skeleton grid L113 — presentational `animate-pulse` divs. ✅
- Empty-state L121 — presentational container (the "Share" Button inside is the control, already skipped). ✅
- Film badge L182 — decorative icon overlay (no onClick). ✅
- Multi-media count badge L185 — decorative `<span>` inside a `<div>` (no onClick). ✅
- `img` L168 / `video` L160 — non-interactive media fills (no separate onClick; the parent `motion.button` is the control). ✅

**0 raw `<button type="button">`** — confirmed (only the `motion.button` tile, which already has `type="button"`). ✅

---

### (3) Responsive 375/768/1280

**Header** — `flex items-center gap-3 px-4 py-3`:
- 375: Back(40) + gap(12) + Camera(28)+gap(8)+title("Media Library" ~120px) + gap(12) + "New"(~68px) ≈ 288px inside 343px content → **fits, no crush**. Title `flex-1` absorbs remaining space; no truncation needed at 375 for "Media Library". ✅
- 768/1280: plenty of room. ✅

**Counts row** — `flex justify-around` 3-up: 3 stat blocks evenly distributed. Fine at all widths. ✅

**Grid** — `grid-cols-3 gap-[2px] sm:gap-1` inside `max-w-3xl`:
- 375: tiles ≈ 118×118px → well above 44px. ✅
- 768: tiles ≈ 253×253px. ✅
- 1280: capped at `max-w-3xl` (768px), tiles ≈ 253×253px. ✅

**Sub-44px tap targets to FLAG** (repo-wide patterns, not introduced here):
- Back `h-10 w-10` (40px) — **FLAG** but repo-wide compact pattern.
- "New" `h-9` (36px) — **FLAG** but repo-wide compact pattern.
- Tiles are large `aspect-square` (118px+ minimum) — OK. ✅

---

### (4) Owner flags (logic / out of scope — FLAG, not fix)

**(a)** `(supabase as unknown as {…})` cast — existing typing workaround. ✅

**(b) Imprecise navigation target** — **FLAG.** Every media tile calls `onClick={() => navigate("/feed")}`, which opens the **generic feed index**, not THIS specific post. The visual (your personal 3-col media grid) implies "tap to open this post", and the `aria-label` says `Open post: ${caption}`, but the destination is just `/feed`. This is misleading/no-op-ish. Owner should either:
- Navigate to a post-detail route (e.g. `/feed/${post.id}` if one exists), or
- Remove the per-tile affordance and make it a preview-only gallery, or
- Change the `aria-label` to "Open feed" to match the actual destination.

**(c)** Query throws on error — `if (error) throw error` with no `error` state in the component. React-query's default error boundary handles it (blank/error screen). No graceful inline error UI. **FLAG** — low priority for a personal page.

**(d)** `preload="metadata"` on video — fine, lightweight. ✅

**(e)** `staleTime: 60_000` — appropriate for a personal library. ✅

**(f)** No `limit()` on the query — fetches ALL `user_posts` for the user. Could be heavy for power users. **FLAG** — owner may want `.range(0, 99)` or infinite scroll.

---

### Diff (for the applying agent)

Single change in `src/pages/MediaLibraryPage.tsx`, className on the `motion.button` tile (line ~155 in the original):

```diff
-                  className="relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity"
+                  className="relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
```

That's it. No other lines change. No imports, no logic, no new props.

**Verify:** `npm run update` must exit 0 (type-check + worker type-check + production build).

---

### Hard-rule guard (post-apply grep)

After applying, confirm:
- `focus-visible:ring` count on the file: **1** (the tile)
- `whileTap` count: **1** (existing, untouched)
- `active:scale` count: **0** (none added — `whileTap` handles press)
- `aria-pressed` count: **0** (one-shot nav)
- `onClick` / `navigate` / `useQuery` / `useMemo` / `useState` / `useAuth` — all byte-identical to the original.

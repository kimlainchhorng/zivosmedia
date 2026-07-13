# MiMo run — 2026-06-15T21:44:17.264Z

- model: mimo-v2.5-pro
- api_format: openai
- task: Audit this page for CONCRETE, code-verified user-facing bugs only: mock/hardcoded data shown as real, fake/non-functional controls (buttons/toggles that do nothing), dropped or ignored params, swallowed errors, broken deep-links/navigation, state that is written but never read, incorrect calculations. For each finding give exact line refs and the user-visible symptom. If the page is clean, say so plainly. Do NOT propose stylistic refactors.
- files: src/pages/ReelsFeedPage.tsx

---

## Audit Plan

I'll examine the provided code for concrete, code-verified user-facing bugs: mock/hardcoded data, non-functional controls, dropped params, swallowed errors, broken navigation, write-but-never-read state, and incorrect calculations.

---

## Findings

### Bug 1: "Friends" and "Following" tabs show the same content as "For You" — they are non-functional filters

**Lines:** The `feedTab` state is read (L~490, L~500, L~510) and the tab UI renders, but the `useQuery` at L~620 (`queryKey: ["reels-feed-grid", pageSize]`) **never reads `feedTab`**. The query key doesn't include it, and the query function doesn't filter by it. The `friendIds` and `followingIds` sets are fetched (L~560–L~580) but **never used in the query or any filtering logic**.

**User-visible symptom:** Tapping "Friends" or "Following" tabs visually changes the tab highlight, but the feed content is identical to "For You" every time. The user believes they're filtering to friends-only or followed-accounts-only content, but they see everything.

**Severity:** High — this is a core social feature that appears to work but does nothing.

---

### Bug 2: "Travel" and "Eat" tabs are completely non-functional — no filtering logic exists

**Lines:** `FEED_TABS` at L~488 includes `"Travel"` and `"Eat"`. These render as selectable tabs. But there is zero logic anywhere in the query or filtering to handle these categories. No hashtag filtering, no category matching, no store-category filtering.

**User-visible symptom:** Tapping "Travel" or "Eat" changes the tab highlight but shows the exact same unfiltered feed. Users expect curated travel/food content.

**Severity:** Medium — misleading UI affordance.

---

### Bug 3: `selectedHashtag` state is set but never used for filtering

**Lines:** `selectedHashtag` is declared at L~475 (`useState<string | null>(null)`) and causes a scroll-to-top effect at L~505. The `TrendingHashtags` component is rendered somewhere in the truncated portion and presumably calls `setSelectedHashtag`. However, the feed query at L~620 **never reads `selectedHashtag`** — it's not in the query key and the query function doesn't filter by it.

**User-visible symptom:** Tapping a trending hashtag scrolls to top (giving the impression of filtering) but the feed content doesn't change at all.

**Severity:** Medium — broken feature that appears to work.

---

### Bug 4: `feedFilter` state (`"all" | "photos" | "videos" | "text"`) is set but never used for filtering

**Lines:** `feedFilter` is declared at L~487 and causes scroll-to-top at L~505, but the feed query **never reads `feedFilter`**. There's no media-type filtering in the query function.

**User-visible symptom:** If there's a filter UI for photos/videos/text-only, it changes the visual state but the feed content remains identical.

**Severity:** Medium — non-functional control.

---

### Bug 5: `newPostsCount` realtime listener double-counts — counts inserts from ALL users including stores the viewer owns

**Lines:** L~575–L~590, the realtime listener for `user_posts` correctly skips the current user's own posts (`payload?.new?.user_id === userId`), but the `store_posts` listener has **no owner check** — it counts every store post insert globally. If the signed-in user owns a store and publishes a post, it increments `newPostsCount` for them too.

**User-visible symptom:** A store owner who publishes a post sees a "X new posts" pill appear on their own feed, which when tapped just refreshes and shows their own post they just made.

**Severity:** Low — minor annoyance, not data corruption.

---

### Bug 6: `recordShareForFeedItem` silently returns `false` for poll posts without informing the caller

**Lines:** L~235: `if (item.source === "poll") return false;` — the function returns `false` but the callers (in the truncated portion) likely don't check the return value, so share actions on poll posts appear to succeed but the share is never tracked.

**User-visible symptom:** Share count on poll posts never increments. Not user-visible unless they check the count.

**Severity:** Low — analytics/metrics issue, not user-facing breakage.

---

### Bug 7: Search debounce timer is never cleaned up on unmount

**Lines:** `searchTimerRef` is set at L~520, and `clearFeedSearch` (L~510) clears it. But the component's unmount doesn't call `clearFeedSearch`. If the user navigates away while a search debounce timer is pending, the `setTimeout` callback fires on an unmounted component, potentially causing a React state-update-on-unmounted-component warning and wasted network request.

**User-visible symptom:** Console warning in development; potentially a brief flash of search results on a different page in edge cases.

**Severity:** Low — no visible data corruption.

---

### Bug 8: `commerceDraft` state is written but never read in the rendered output

**Lines:** `commerceDraft` is set via `setCommerceDraft` at L~495 and L~505 (from `location.state`), but it's only passed to `CreatePostModal` (presumably via `showCreate`). If `CreatePostModal` doesn't consume it, the commerce link draft from deep links is silently dropped. However, since `CreatePostModal` is lazy-loaded and its props aren't visible in the truncated code, this may or may not be a bug.

**Severity:** Uncertain — depends on `CreatePostModal` implementation.

---

## Summary

| # | Bug | Severity | Lines |
|---|-----|----------|-------|
| 1 | Friends/Following tabs don't filter — `friendIds`/`followingIds` fetched but unused | **High** | ~488, ~560–580, ~620 |
| 2 | Travel/Eat tabs are decorative — no filtering logic | Medium | ~488, ~620 |
| 3 | `selectedHashtag` written but never read by the query | Medium | ~475, ~620 |
| 4 | `feedFilter` written but never read by the query | Medium | ~487, ~620 |
| 5 | Store-post realtime counts own-store posts for the owner | Low | ~575–590 |
| 6 | Poll share tracking silently skipped | Low | ~235 |
| 7 | Search debounce timer not cleaned on unmount | Low | ~520 |
| 8 | `commerceDraft` may be unused (truncated) | Uncertain | ~495 |

**Bugs 1–4 are the critical findings.** The feed has four visible tab/filter controls that all appear functional (they highlight, persist to localStorage, trigger scroll-to-top) but **none of them actually filter the feed content**. The query function fetches the same `pageSize` most-recent posts regardless of tab, hashtag, or media-type filter. The `friendIds` and `followingIds` sets are fetched from Supabase at non-trivial cost but are completely dead code in terms of feed output.

---

## Proposed Fix (Bug 1 — highest severity)

The fix requires changes to the `useQuery` for `["reels-feed-grid", pageSize]` to incorporate `feedTab`, `selectedHashtag`, and `feedFilter` into the query key and filtering logic. Here's the minimal diff:

**File:** `src/pages/ReelsFeedPage.tsx`

### Change 1: Add `feedTab`, `selectedHashtag`, `feedFilter` to the query key

```diff
-    queryKey: ["reels-feed-grid", pageSize],
+    queryKey: ["reels-feed-grid", pageSize, feedTab, selectedHashtag, feedFilter],
```

### Change 2: Filter `allItems` before returning from the query function

After the `allItems` array is fully populated (after the post_media enrichment and before the `return`), add filtering:

```diff
+      // ── Apply active filters ─────────────────────────────────────────
+      let filtered = allItems;
+
+      // Tab filter
+      if (feedTab === "Friends" && userId) {
+        filtered = filtered.filter(
+          (item) => item.author_id && friendIds.has(item.author_id),
+        );
+      } else if (feedTab === "Following" && userId) {
+        filtered = filtered.filter(
+          (item) => item.author_id && followingIds.has(item.author_id),
+        );
+      } else if (feedTab === "Travel") {
+        filtered = filtered.filter(
+          (item) =>
+            (item.store_category && /travel|hotel|flight|tour/i.test(item.store_category)) ||
+            postHasHashtag(item.caption, "#travel") ||
+            postHasHashtag(item.caption, "#trip") ||
+            postHasHashtag(item.caption, "#vacation"),
+        );
+      } else if (feedTab === "Eat") {
+        filtered = filtered.filter(
+          (item) =>
+            (item.store_category && /food|restaurant|cafe|eat|delivery/i.test(item.store_category)) ||
+            postHasHashtag(item.caption, "#food") ||
+            postHasHashtag(item.caption, "#eats") ||
+            postHasHashtag(item.caption, "#restaurant"),
+        );
+      }
+
+      // Hashtag filter
+      if (selectedHashtag) {
+        filtered = filtered.filter((item) => postHasHashtag(item.caption, selectedHashtag));
+      }
+
+      // Media type filter
+      if (feedFilter === "photos") {
+        filtered = filtered.filter((item) => item.media_type === "image");
+      } else if (feedFilter === "videos") {
+        filtered = filtered.filter((item) => item.media_type === "video");
+      } else if (feedFilter === "text") {
+        filtered = filtered.filter((item) => !item.media_urls.length);
+      }
+
+      return filtered;
```

(replace the existing `return allItems;` at the end of the query function)

### Change 3: Ensure `friendIds` and `followingIds` are available to the query

The `friendIds`/`followingIds` state is set in a separate `useEffect` that runs after `sidebarDataReady`. The query already has `enabled: true` implicitly. To avoid a stale first render where the sets are empty, add `friendIds` and `followingIds` sizes to the query key (or use `enabled: sidebarDataReady`):

```diff
-    queryKey: ["reels-feed-grid", pageSize, feedTab, selectedHashtag, feedFilter],
+    queryKey: ["reels-feed-grid", pageSize, feedTab, selectedHashtag, feedFilter, friendIds.size, followingIds.size],
```

This ensures the query re-runs when the friend/following sets populate.

---

## Owner Verification

1. **Run `npm run update`** — must pass (0 type errors + production build).
2. **Manual test:** Switch between "For You", "Friends", "Following", "Travel", "Eat" tabs and confirm the feed content actually changes (Friends tab should show only posts from mutual friends, Following only from followed accounts).
3. **Manual test:** Tap a trending hashtag and confirm the feed filters to posts containing that hashtag.
4. **Manual test:** Use the media-type filter (if exposed in UI) and confirm photos-only/videos-only/text-only works.
5. **Edge case:** When `friendIds` or `followingIds` are empty (no friends/following), the Friends/Following tabs should show an empty state, not the full feed. Consider adding an empty-state message for these cases.
6. **Performance:** The filtering is client-side on up to 180 items — should be negligible. But the Travel/Eat regex+hashtag matching is heuristic; confirm the category/hashtag patterns match real data in production.

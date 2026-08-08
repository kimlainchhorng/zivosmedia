# DeepSeek run — 2026-08-08T18:40:33.466Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/FeedPage.tsx

---

I'll audit the visible portion of `FeedPage.tsx` for concrete user-facing bugs. Let me analyze carefully.

## Audit Findings

### Bug 1: `handleFollow` — silent Supabase error swallowing (LIKELY BUG)

**Location:** `src/pages/FeedPage.tsx`, `handleFollow` function (around line 700-730 in the visible code)

```typescript
const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !authorId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("user_followers" as any).delete()
          .eq("follower_id", userId).eq("following_id", authorId);
        setIsFollowing(false);
      } else {
        await (supabase as any).from("user_followers").insert({
          follower_id: userId,
          following_id: authorId,
        });
        setIsFollowing(true);
```

**Problem:** Both the `.delete()` and `.insert()` calls are awaited without checking the returned `{ error }`. A supabase-js `.delete()`/`.insert()` **resolves even when the DB rejects** (RLS denial, offline, constraint violation) — it does NOT throw unless you inspect `error` or call `.throwOnError()`. So:

- If the follow insert fails (e.g., RLS denies, or a duplicate follow hits a unique constraint), the code still calls `setIsFollowing(true)` — the UI shows "Following" but the DB never persisted it. The user sees a false success.
- If the unfollow delete fails, `setIsFollowing(false)` runs — UI shows "Not following" but the DB still has the follow.

The `catch` block only fires on actual thrown exceptions (network errors that reject the promise), not on supabase-js `{ error }` responses. This is the exact same bug family documented in the task board (silent write-failure).

**Fix:** Check `error` on both operations:

```typescript
if (isFollowing) {
  const { error } = await supabase.from("user_followers" as any).delete()
    .eq("follower_id", userId).eq("following_id", authorId);
  if (error) throw error;
  setIsFollowing(false);
} else {
  const { error } = await (supabase as any).from("user_followers").insert({
    follower_id: userId,
    following_id: authorId,
  });
  if (error) throw error;
  setIsFollowing(true);
  // ... push notification
}
```

### Bug 2: `handleSaveToggle` — partial error handling (MINOR, but real)

**Location:** `src/pages/FeedPage.tsx`, `handleSaveToggle` (around line 780-830)

```typescript
const [modernBookmark, legacyBookmark] = await Promise.all([
  (supabase as any).from("post_bookmarks").upsert(...),
  (supabase as any).from("bookmarks").upsert(...),
]);
const error = modernBookmark.error || legacyBookmark.error;
if (error && !String(error.message || "").toLowerCase().includes("duplicate")) throw error;
```

This one is actually **correct** — it checks `error` and throws. The `ignoreDuplicates: true` option means duplicate errors are expected and handled. Good.

### Bug 3: `handleSaveToggle` delete path — `alternateIds` logic (POSSIBLE BUG)

```typescript
const alternateIds = Array.from(new Set([post.id, rawPostId]));
const [modernDelete, legacyDelete] = await Promise.all([
  (supabase as any)
    .from("post_bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", rawPostId)
    .eq("source", bookmarkSource),
  (supabase as any)
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("item_type", "post")
    .in("item_id", alternateIds),
]);
if (modernDelete.error || legacyDelete.error) throw modernDelete.error || legacyDelete.error;
```

This checks errors correctly. The `alternateIds` includes both `post.id` (which may be `u-<uuid>`) and `rawPostId` (the stripped uuid), covering both storage formats. Looks correct.

### Bug 4: `handleFollow` — push notification uses wrong `action_url` (LIKELY BUG)

```typescript
action_url: `/user/${userId}`
```

The `action_url` points to `/user/${userId}` — but `userId` is the **follower's** ID, not the author's. The notification is sent to `authorId` (the person being followed), so the action URL should point to the **follower's** profile so the author can see who followed them. Wait — actually, `/user/${userId}` where `userId` is the follower IS correct — the author receiving the notification should be able to tap and see the follower's profile. So this is actually correct.

### Bug 5: `handleFollow` — `isSelf` check missing (POSSIBLE BUG)

```typescript
const isSelf = !!userId && userId === authorId;
```

`isSelf` is computed but I don't see it used to disable the follow button in the visible code. If the user is viewing their own reel, the follow button would still show and attempt to follow themselves. However, the follow insert would likely fail with a constraint or RLS, and with Bug 1's silent error, it would show "Following" falsely. This is a real UX bug but depends on the hidden portion — the button might be hidden elsewhere. I'll flag it as a possible issue but can't prove it from visible code alone.

### Bug 6: `handleVideoClick` — double-tap like fires even when already liked (MINOR)

```typescript
if (!liked && !doubleTapLikeLockRef.current) {
  doubleTapLikeLockRef.current = true;
  haptic("medium");
  onToggleLike(post.id, false);
```

This checks `!liked` before firing the like, so double-tapping an already-liked post won't re-like. Correct.

### Bug 7: `handleMuteToggle` — `onToggleMute` called before checking video (MINOR)

```typescript
const handleMuteToggle = () => {
    const video = videoRef.current;
    const nextMuted = !globalMuted;
    haptic("light");
    onToggleMute();
    if (!video) return;
```

`onToggleMute()` is called even if `video` is null. This is fine — the parent's mute state should still toggle even if the video element isn't ready. Not a bug.

### Bug 8: `capturePoster` — `tryBlobFallback(blobSrc ?? sourceUrl ?? "")` (POSSIBLE BUG)

```typescript
if (err instanceof DOMException && err.name === "SecurityError") {
  void tryBlobFallback(blobSrc ?? sourceUrl ?? "");
}
```

If `blobSrc` is set (from a previous blob fallback), it passes the blob URL to `tryBlobFallback`, which would try to fetch the blob URL again. But `tryBlobFallback` checks `if (triedBlobFallback) return;` — so if we already tried blob fallback and it succeeded (blobSrc is set), this would be a no-op. If blobSrc is set but the canvas is still tainted, that's a different issue. This is defensive code, not a clear bug.

### Bug 9: `handleSaveToggle` — `savingBookmarkRef` guard (CORRECT)

```typescript
if (savingBookmarkRef.current) return;
savingBookmarkRef.current = true;
```

Good — prevents double-submit.

### Bug 10: `handleFollow` — no double-submit guard (POSSIBLE BUG)

```typescript
if (!userId || !authorId || followLoading) return;
setFollowLoading(true);
```

`followLoading` guards against double-submit. Good.

## Summary of Confirmed Bugs

**Bug 1 (CONFIRMED):** `handleFollow` — both `.delete()` and `.insert()` silently swallow supabase errors. The UI will show "Following"/"Not following" even when the DB write fails. This is the exact same bug family documented in the task board (silent write-failure / false-success).

**Bug 5 (POSSIBLE, needs hidden code):** `isSelf` is computed but I can't see if the follow button is hidden for self-posts. If not, a user could attempt to follow themselves and get a false "Following" state (compounded by Bug 1).

## Proposed Fix

**File:** `src/pages/FeedPage.tsx`

**Before (handleFollow):**
```typescript
const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !authorId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("user_followers" as any).delete()
          .eq("follower_id", userId).eq("following_id", authorId);
        setIsFollowing(false);
      } else {
        await (supabase as any).from("user_followers").insert({
          follower_id: userId,
          following_id: authorId,
        });
        setIsFollowing(true);
```

**After:**
```typescript
const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !authorId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase.from("user_followers" as any).delete()
          .eq("follower_id", userId).eq("following_id", authorId);
        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await (supabase as any).from("user_followers").insert({
          follower_id: userId,
          following_id: authorId,
        });
        if (error) throw error;
        setIsFollowing(true);
```

This routes DB rejections into the existing `catch` block which already shows `toast.error("Couldn't update follow. Try again.")` and keeps the UI in the correct state (the `setIsFollowing` calls only run on success).

## What the owner must verify

1. **Apply the diff** to `src/pages/FeedPage.tsx` (the `handleFollow` function).
2. **Run `npm run update`** — must pass (type-check + worker type-check + Ride contracts + production build).
3. **Manually verify** the follow/unfollow flow in the live app — confirm the button state matches the DB state after a follow/unfollow.
4. **Check the `isSelf` case** — verify whether the follow button is hidden on the user's own reels (in the hidden portion of the file). If not, that's a separate bug to fix (hide the follow button when `isSelf` is true).

The fix is minimal (2 lines added), additive, and matches the repo's established pattern (check `{ error }` and throw). No live data or Stripe is touched.

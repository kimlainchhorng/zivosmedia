# DeepSeek run — 2026-08-11T21:40:35.214Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/SocialFeedPage.tsx

---

## Audit: `src/pages/SocialFeedPage.tsx`

### (1) Plan

I audited the file for concrete user-facing bugs only. I found **one real bug** and **one high-risk silent-failure pattern** worth flagging.

---

### (2) Findings

#### BUG 1 — `handleLike` delete path swallows errors (silent false-success)

**File:** `src/pages/SocialFeedPage.tsx`
**Lines:** ~L430–L432 (inside `handleLike`)

```ts
if (wasLiked) {
  await (supabase as any).from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
}
```

The **unlike** path does a bare `await …delete()` with **no `{ error }` check**. A supabase-js `.delete()` **resolves even when the DB rejects** (RLS denial / offline / constraint) — it does NOT throw unless you inspect `error` or call `.throwOnError()`. So when the delete fails:

- The optimistic `setLiked(!wasLiked)` + `setLikes(n-1)` already ran (L426–L427).
- The `try` block completes without throwing → the `catch` rollback never fires.
- The UI shows the post as **unliked** (heart unfilled, count decremented), but the DB still has the like row.
- On the next refetch/page-load, the post **silently reverts** to liked — with zero feedback to the user.

This is the exact same bug family as the `FollowSuggestions`/`FeaturedCreatorsRow` false-success fixes already shipped in this repo (see `AGENT_TASKS.md` "Social Follow controls" entry). The **insert** path in the same function correctly checks `{ error }` (L433–L435), so this is an asymmetry.

**Fix** (additive, 1 hunk, happy path byte-identical):

```ts
if (wasLiked) {
  const { error } = await (supabase as any).from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
  if (error) throw error;
}
```

---

#### BUG 2 — `handleSave` delete path swallows errors (silent false-success)

**File:** `src/pages/SocialFeedPage.tsx`
**Lines:** ~L452–L457 (inside `handleSave`)

```ts
if (wasSaved) {
  await (supabase as any)
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("item_type", "post")
    .eq("item_id", post.id);
  toast("Removed from Saved");
}
```

Same pattern: bare `await …delete()` with no `{ error }` check. On a rejected delete:

- The optimistic `setSaved(!wasSaved)` already ran (L450).
- The `try` completes → `toast("Removed from Saved")` fires **even though the bookmark still exists**.
- The `catch` rollback never fires.
- On next refetch, the bookmark **silently reappears** — the user was told "Removed from Saved" but it wasn't.

**Fix** (additive, 1 hunk):

```ts
if (wasSaved) {
  const { error } = await (supabase as any)
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("item_type", "post")
    .eq("item_id", post.id);
  if (error) throw error;
  toast("Removed from Saved");
}
```

---

#### BUG 3 — `FollowPill.ensureUnfollow` swallows errors (silent false-success)

**File:** `src/pages/SocialFeedPage.tsx`
**Lines:** ~L620–L625 (inside `ensureUnfollow`)

```ts
const ensureUnfollow = async () => {
  if (!user?.id) return;
  await (supabase as any)
    .from("user_followers")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);
  setFollowing(false);
};
```

Same family. This is called from `handleFriend` in the **cancel-request** and **unfriend** branches (L636, L650). On a rejected delete:

- `setFollowing(false)` runs unconditionally → the pill flips to "Follow".
- `handleFriend`'s `try` completes without throwing → the `catch` rollback never fires.
- The DB still has the follow row → on next refetch the pill flips back to "Following" with no feedback.

**Fix** (additive, 1 hunk):

```ts
const ensureUnfollow = async () => {
  if (!user?.id) return;
  const { error } = await (supabase as any)
    .from("user_followers")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);
  if (error) throw error;
  setFollowing(false);
};
```

---

#### BUG 4 — `handleFriend` accepted-branch update swallows errors (silent false-success)

**File:** `src/pages/SocialFeedPage.tsx`
**Lines:** ~L642–L644 (inside `handleFriend`, `prev === "pending_in"` branch)

```ts
await (supabase as any).from("friendships").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("user_id", targetUserId).eq("friend_id", user.id);
```

Bare `await …update()` with no `{ error }` check. On a rejected update:

- `setFriendStatus("accepted")` already ran (L641) → pill shows "Friends 🎉".
- `ensureFollow()` runs (which may also fail silently — see BUG 3's sibling `ensureFollow` which DOES check `{ error }` and throws, so that one is fine).
- The `try` completes → `toast.success("Friends 🎉")` fires.
- The DB still has `status: "pending"` → on next refetch the pill reverts to "Accept" with no feedback.

**Fix** (additive, 1 hunk):

```ts
const { error } = await (supabase as any).from("friendships").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("user_id", targetUserId).eq("friend_id", user.id);
if (error) throw error;
```

---

#### BUG 5 — `handleFriend` cancel/unfriend delete swallows errors (silent false-success)

**File:** `src/pages/SocialFeedPage.tsx`
**Lines:** ~L635 (cancel branch) and ~L649 (unfriend branch)

```ts
await (supabase as any).from("friendships").delete().eq("user_id", user.id).eq("friend_id", targetUserId);
// ...
await (supabase as any).from("friendships").delete().or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);
```

Both bare `await …delete()` with no `{ error }` check. On a rejected delete:

- The optimistic `setFriendStatus("none")` already ran (L634, L648).
- `ensureUnfollow()` runs (which itself has BUG 3).
- The `try` completes → `toast("Request cancelled")` / `toast("Friend removed · unfollowed")` fires.
- The DB still has the friendship row → on next refetch the pill reverts to "Requested" / "Friends" with no feedback.

**Fix** (additive, 2 hunks):

```ts
const { error } = await (supabase as any).from("friendships").delete().eq("user_id", user.id).eq("friend_id", targetUserId);
if (error) throw error;
// ...
const { error: delErr } = await (supabase as any).from("friendships").delete().or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);
if (delErr) throw delErr;
```

---

#### BUG 6 — `handleFollow` delete path swallows errors (silent false-success)

**File:** `src/pages/SocialFeedPage.tsx`
**Lines:** ~L590–L592 (inside `handleFollow`)

```ts
if (wasFollowing) {
  await (supabase as any).from("user_followers").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
}
```

Same family. On a rejected delete:

- The optimistic `setFollowing(!wasFollowing)` already ran (L588).
- The `try` completes → no throw → the `catch` rollback never fires.
- The DB still has the follow row → on next refetch the pill flips back to "Following" with no feedback.

**Fix** (additive, 1 hunk):

```ts
if (wasFollowing) {
  const { error } = await (supabase as any).from("user_followers").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
  if (error) throw error;
}
```

---

### Summary of all fixes (all in `src/pages/SocialFeedPage.tsx`)

| # | Location | Bug | Fix |
|---|----------|-----|-----|
| 1 | `handleLike` unlike path (~L430) | Bare `delete()` swallows error → false "unliked" | Add `{ error }` check + `throw` |
| 2 | `handleSave` unsave path (~L452) | Bare `delete()` swallows error → false "Removed from Saved" | Add `{ error }` check + `throw` |
| 3 | `ensureUnfollow` (~L620) | Bare `delete()` swallows error → false "unfollowed" | Add `{ error }` check + `throw` |
| 4 | `handleFriend` accept branch (~L642) | Bare `update()` swallows error → false "Friends 🎉" | Add `{ error }` check + `throw` |
| 5 | `handleFriend` cancel/unfriend branches (~L635, ~L649) | Bare `delete()` swallows error → false "cancelled"/"removed" | Add `{ error }` check + `throw` |
| 6 | `handleFollow` unfollow path (~L590) | Bare `delete()` swallows error → false "unfollowed" | Add `{ error }` check + `throw` |

All six are the **same bug family**: a supabase-js `.delete()`/`.update()` that resolves with `{ error }` even on DB rejection, with the error never inspected. Each has an existing `catch` block that would correctly roll back + toast if the error were thrown — the fix is purely additive and the happy path is byte-identical.

---

### (3) Owner must verify / deploy

- **Verify:** Run `npm run update` — must pass (type-check + worker type-check + Ride contract tests + production-boundary tests + QA + build).
- **Note:** The failure paths only manifest on a forced DB rejection (RLS denial / offline) — they can't be triggered without breaking RLS, so verification rests on the green type-check + code review of the exact hunks.
- **No live Supabase writes** were fired during this audit.
- **Deploy:** Owner commits + deploys (per the rulebook, agents don't commit/deploy).

---

### Clean areas (no bugs found)

- **Deep-link handling** (`?compose=`, `?post=`) — correctly strips params after use, no stale-state bug.
- **`handleShare`** — `onShared` has a proper try/catch with a fallback `update` if the RPC fails. Good.
- **`PostMoreMenu`** — all owner toggles correctly check `{ error }` via `updateOwnPost`. Good.
- **`handleHidePost` / `handleMuteAuthor` / `handleDelete` / `handleReport`** — all check `{ error }` and throw. Good.
- **`ensureFollow`** — correctly checks `{ error }` and throws. Good.
- **`handleLike` insert path** — correctly handles `23505` (duplicate) as non-error. Good.
- **`handleSave` insert path** — correctly handles `23505`. Good.
- **`FollowPill` hydration** — properly guards against stale async with `alive` flag. Good.
- **`PostCaption` clamp detection** — correct logic. Good.
- **`ActionButton`** — no logic errors. Good.

The file is otherwise clean — the six bugs are all the same silent-error-swallowing family in the like/save/follow/friend toggle paths.

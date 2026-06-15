# MiMo run — 2026-06-15T20:32:35.422Z

- model: mimo-v2.5-pro
- api_format: openai
- task: PublicProfilePage.tsx post Like is local-only (likedPosts Set, no DB) so likes vanish on refresh. Canonical mechanism (SocialFeedPage) persists to post_likes table: optimistic toggle, then insert {post_id,user_id} or delete by post_id+user_id, tolerating unique-violation code 23505 on insert. PublicProfile shows the user's own user_posts (so post_likes), and has a bookmark-load effect I can mirror. PROPOSED: (1) handleLike async: optimistic setLikedPosts toggle then post_likes insert/delete with rollback-on-error + 23505 tolerance, guard if no user; (2) in the existing load effect also query post_likes (post_id where user_id=me and post_id in posts) and setLikedPosts on mount; (3) the post-overlay Like button does its own local-only toggle - point it at handleLike(selectedPost.id). Q1: mirroring post_likes insert/delete correct here? Q2: skip the manual author-notification SocialFeedPage does (keep minimal, assume a DB trigger handles likes_count/notify) or add it for parity? Q3: any risk (RLS, optimistic rollback, the overlay likes_count already adds +1 locally)? Concise verdict + any risk.

---

## Verdict

**Q1: Yes** — mirror the exact `post_likes` insert/delete pattern from `SocialFeedPage`. Same table, same optimistic toggle, same 23505 tolerance.

**Q2: Skip the notification for now.** The like count is likely maintained by a DB trigger (`post_likes` → `posts.likes_count`). If there's no trigger, the count will be stale until refresh — acceptable for a profile page. Adding client-side notification logic is a separate concern.

**Q3: Two risks to flag:**
- **RLS**: `post_likes` must allow `INSERT` where `user_id = auth.uid()` and `DELETE` where `user_id = auth.uid()`. If the policy is more restrictive (e.g., only on feed pages), the insert/delete will silently fail. Owner should verify.
- **Double-count on `likes_count`**: The overlay currently does `likes_count + 1` locally. If the DB trigger also increments, you'll see a double bump until refresh. **Fix: remove the local `likes_count` mutation and let the DB value reflect on re-query, OR keep it but accept the visual inconsistency.** I recommend removing the local count bump since the optimistic `likedPosts` set already gives instant UI feedback.

---

## Short plan

1. **Add `handleLike(postId)` async function** — optimistic `setLikedPosts` toggle → `post_likes` insert/delete → rollback on error (tolerate 23505).
2. **In the existing load effect**, query `post_likes` for the current user's likes among the displayed posts → seed `setLikedPosts`.
3. **Wire the overlay Like button** to call `handleLike(selectedPost.id)` instead of the local-only toggle.
4. **Remove the local `likes_count` +/- mutation** from the overlay button (the optimistic heart fill is enough; the count updates on next load).

---

## Proposed diff

**File:** `src/pages/PublicProfilePage.tsx`

### (1) Add `handleLike` after the existing state declarations

```tsx
// FIND: the existing likedPosts state + any nearby handler declarations
// ADD handleLike right after:

const handleLike = useCallback(async (postId: string) => {
  if (!user) {
    toast({ title: 'Sign in to like posts', variant: 'destructive' });
    return;
  }

  const alreadyLiked = likedPosts.has(postId);

  // Optimistic toggle
  setLikedPosts(prev => {
    const next = new Set(prev);
    if (alreadyLiked) next.delete(postId);
    else next.add(postId);
    return next;
  });

  try {
    if (alreadyLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });

      if (error && error.code !== '23505') {
        throw error;
      }
    }
  } catch (err) {
    console.error('Like toggle failed', err);
    // Rollback
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (alreadyLiked) next.add(postId);
      else next.delete(postId);
      return next;
    });
    toast({ title: 'Could not update like', variant: 'destructive' });
  }
}, [user, likedPosts, toast]);
```

### (2) Seed likedPosts from DB in the load effect

```tsx
// FIND: the existing useEffect that loads posts (the one that also loads bookmarks)
// ADD after the bookmark query, inside the same effect (after posts are fetched):

// Load liked posts for this user
if (user && postsData?.length) {
  const postIds = postsData.map(p => p.id);
  const { data: likes } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', user.id)
    .in('post_id', postIds);

  if (likes) {
    setLikedPosts(new Set(likes.map(l => l.post_id)));
  }
}
```

### (3) Wire overlay Like button to `handleLike`

```tsx
// FIND: the overlay Like button onClick — currently does something like:
//   onClick={() => {
//     setLikedPosts(prev => { ... toggle ... });
//     setSelectedPost(p => ({ ...p, likes_count: p.likes_count + 1 }));
//   }}
//
// REPLACE with:

onClick={() => handleLike(selectedPost.id)}
```

### (4) Remove local likes_count mutation

```tsx
// FIND: any setSelectedPost calls that mutate likes_count (likes_count ± 1)
// DELETE those lines entirely. The heart fill (from likedPosts set) is the
// optimistic feedback; the count updates on next data load.
```

---

## Owner must verify

1. **RLS on `post_likes`**: Confirm the table has policies allowing authenticated users to `INSERT` (with `user_id = auth.uid()`) and `DELETE` (with `user_id = auth.uid()`). Run:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'post_likes';
   ```
2. **DB trigger for `likes_count`**: Confirm whether `posts.likes_count` is maintained by a trigger on `post_likes`. If not, the count will only update on next load — acceptable but worth knowing.
3. **Run `npm run update`** after applying — must pass with 0 errors.
4. **Test**: Like a post on a profile, refresh, confirm the heart stays filled. Unlike, refresh, confirm it stays unfilled.

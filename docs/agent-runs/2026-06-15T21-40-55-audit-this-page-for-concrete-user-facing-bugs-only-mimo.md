# MiMo run — 2026-06-15T21:40:55.476Z

- model: mimo-v2.5-pro
- api_format: openai
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/ReelsFeedPage.tsx

---

## Audit Result

After carefully reading the full file (which is truncated but covers ~1400+ lines including the main component, feed query, all interaction handlers, and rendering), I found **one concrete bug** and **one likely bug**:

---

### Bug 1: `snoozeFeedAuthor` Supabase error silently swallowed

**File:** `src/pages/ReelsFeedPage.tsx`  
**Lines:** ~430–445 (the `snoozeFeedAuthor` async function)

```typescript
const snoozeFeedAuthor = async (
  userId: string,
  authorId: string,
  authorSource: FeedPreferenceSource,
  days = FEED_SNOOZE_DAYS,
) => {
  // ...
  try {
    // localStorage write succeeds...
    await (supabase as any)
      .from("feed_snoozed_authors")
      .upsert(/* ... */);
    return true;  // ← returns true even if the Supabase upsert FAILS
  } catch {
    return false;
  }
};
```

**Bug:** The `await supabase.from("feed_snoozed_authors").upsert(...)` result is never destructured for `{ error }`. If the upsert fails (RLS violation, network error, constraint violation), the function still returns `true` because the Supabase client doesn't throw on PostgREST errors — it returns `{ error }`. The outer `try/catch` only catches JS exceptions, not Supabase-level errors. The localStorage write already happened, so the user sees the snooze as "working" but it never persisted server-side. On next page load from a different device, the snoozed author reappears.

**Severity:** Medium — user-facing data loss of a preference they explicitly triggered.

---

### Bug 2: `useFeedPostNotificationState` — Supabase upsert/delete errors silently swallowed

**File:** `src/pages/ReelsFeedPage.tsx`  
**Lines:** ~490–520 (the `setPersisted` callback inside `useFeedPostNotificationState`)

```typescript
const setPersisted = useCallback(async (nextEnabled: boolean) => {
  // ...
  const savedLocal = writeFeedStringSet(storageKey, next, FEED_POST_NOTIFICATIONS_EVENT);
  setEnabled(nextEnabled);
  if (!savedLocal) return false;

  if (nextEnabled) {
    await (supabase as any)
      .from("feed_post_notification_subscriptions")
      .upsert(/* ... */);
    // ← { error } never checked
  } else {
    await (supabase as any)
      .from("feed_post_notification_subscriptions")
      .delete(/* ... */);
    // ← { error } never checked
  }
  return true;  // ← returns true regardless of Supabase outcome
}, [postKey, userId]);
```

**Bug:** Same pattern — the Supabase `.upsert()` and `.delete()` results are never destructured for `{ error }`. PostgREST errors don't throw; they return `{ error }`. The function returns `true` even when the server-side write failed. The localStorage state is already updated, so the UI shows the notification toggle as changed, but it didn't persist. On next load from another device (or after the `syncRemote` effect runs), the state reverts.

**Severity:** Medium — same class of bug as #1.

---

### Not a bug (examined and ruled out):

- **Feed query doesn't use `userId` in the query key** (line ~670): `queryKey: ["reels-feed-grid", pageSize]` — this is intentional; the feed is public/global and not filtered by user, so this is correct.
- **`recordShareForFeedItem` swallows errors** (line ~255): This is explicitly documented as intentional ("failures are swallowed so a flaky network never blocks the UX").
- **`syncRemote` in `useFeedSnoozedAuthorIds`** (line ~460): On error it falls back to local state — this is intentional graceful degradation, not a bug.
- **`syncRemote` in `useFeedPostNotificationState`** (line ~480): Same — falls back to local on error, intentional.

---

### Proposed Fix

**File:** `src/pages/ReelsFeedPage.tsx`

**Diff for Bug 1** (~line 438):

```diff
-    await (supabase as any)
+    const { error: upsertError } = await (supabase as any)
       .from("feed_snoozed_authors")
       .upsert(
         {
           user_id: userId,
           author_id: authorId,
           author_source: authorSource,
           snoozed_until: new Date(snoozedUntilMs).toISOString(),
         },
         { onConflict: "user_id,author_id,author_source" },
       );
-    return true;
+    return !upsertError;
```

**Diff for Bug 2** (~line 505):

```diff
   if (nextEnabled) {
-    await (supabase as any)
+    const { error: upsertErr } = await (supabase as any)
       .from("feed_post_notification_subscriptions")
       .upsert(
         {
           user_id: userId,
           post_id: parsed.postId,
           post_source: parsed.source,
         },
         { onConflict: "user_id,post_id,post_source", ignoreDuplicates: true },
       );
+    if (upsertErr) return false;
   } else {
-    await (supabase as any)
+    const { error: deleteErr } = await (supabase as any)
       .from("feed_post_notification_subscriptions")
       .delete()
       .eq("user_id", userId)
       .eq("post_id", parsed.postId)
       .eq("post_source", parsed.source);
+    if (deleteErr) return false;
   }
   return true;
```

---

### Owner verification

1. Both fixes are additive (check `{ error }` and return `false` on failure). No logic changes to the happy path.
2. `npm run update` must pass (type-check + worker type-check + production build).
3. The callers of `snoozeFeedAuthor` and `setPersisted` already handle `false` returns gracefully (the UI just doesn't update), so no downstream changes needed.
4. To test: snooze an author or toggle post notifications with the network tab throttled/offline — the UI should now correctly show the action as failed rather than silently pretending it succeeded.

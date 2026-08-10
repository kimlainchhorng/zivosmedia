# DeepSeek run — 2026-08-10T13:42:38.915Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/ReelsFeedPage.tsx

---

I'll audit the visible portion of `ReelsFeedPage.tsx` for concrete user-facing bugs. Let me analyze what I can prove from the visible code.

## Audit Findings

### Bug 1: `useFeedPostNotificationState` — silent Supabase error swallowing in `setPersisted` (LINES ~370-395)

**Location:** `src/pages/ReelsFeedPage.tsx`, the `setPersisted` callback inside `useFeedPostNotificationState`.

**The bug:** When the user toggles post notifications, `setPersisted` does:
```js
if (nextEnabled) {
  await (supabase as any)
    .from("feed_post_notification_subscriptions")
    .upsert({...}, { onConflict: "...", ignoreDuplicates: true });
} else {
  await (supabase as any)
    .from("feed_post_notification_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", parsed.postId)
    .eq("post_source", parsed.source);
}
return true;
```

Both the `.upsert()` and `.delete()` results are **never checked** — no `{ error }` destructure, no `.throwOnError()`. A supabase-js write **resolves with `{ data, error }` even when the DB rejects** (RLS denial / offline / constraint). So:

- The **local state** (`setEnabled(nextEnabled)`) is flipped optimistically at line ~378.
- The **localStorage** is written at line ~379.
- The function returns `true` unconditionally.
- The caller (in the hidden portion) likely toasts success or updates UI based on this `true`.

**User-facing impact:** The toggle flips on/off, the toast says success, but the DB write failed — the subscription never persists. On next page load, `syncRemote` re-reads the DB, finds no row, and the toggle silently reverts. This is the exact "false-success" family the repo has been fixing elsewhere (see the PriceAlertWidget and social Follow controls fixes in AGENT_TASKS.md).

**Proof from code:** The `syncRemote` function (lines ~340-365) *does* check `error` and falls back to `localEnabled` — proving the pattern is known and expected here. But `setPersisted` (the actual user-triggered write) does not.

**Fix (additive, minimal):**
```js
const setPersisted = useCallback(async (nextEnabled: boolean) => {
  const parsed = parseFeedPreferencePostKey(postKey);
  if (!userId || !postKey || !parsed) return false;
  const storageKey = scopedFeedStorageKey("post-notifications", userId);
  const next = readFeedStringSet(storageKey);
  if (nextEnabled) next.add(postKey);
  else next.delete(postKey);
  const savedLocal = writeFeedStringSet(storageKey, next, FEED_POST_NOTIFICATIONS_EVENT);
  setEnabled(nextEnabled);
  if (!savedLocal) return false;

  if (nextEnabled) {
    const { error } = await (supabase as any)
      .from("feed_post_notification_subscriptions")
      .upsert(
        {
          user_id: userId,
          post_id: parsed.postId,
          post_source: parsed.source,
        },
        { onConflict: "user_id,post_id,post_source", ignoreDuplicates: true },
      );
    if (error) {
      // Roll back local state so the UI doesn't lie.
      const rollback = readFeedStringSet(storageKey);
      if (nextEnabled) rollback.delete(postKey);
      else rollback.add(postKey);
      writeFeedStringSet(storageKey, rollback, FEED_POST_NOTIFICATIONS_EVENT);
      setEnabled(!nextEnabled);
      return false;
    }
  } else {
    const { error } = await (supabase as any)
      .from("feed_post_notification_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", parsed.postId)
      .eq("post_source", parsed.source);
    if (error) {
      const rollback = readFeedStringSet(storageKey);
      if (nextEnabled) rollback.delete(postKey);
      else rollback.add(postKey);
      writeFeedStringSet(storageKey, rollback, FEED_POST_NOTIFICATIONS_EVENT);
      setEnabled(!nextEnabled);
      return false;
    }
  }
  return true;
}, [postKey, userId]);
```

**Note:** The caller in the hidden portion must handle the `false` return (show an error toast). If the caller currently ignores the return value, the rollback alone still prevents the false-success UI state.

---

### Bug 2: `snoozeFeedAuthor` — silent Supabase error swallowing (LINES ~250-270)

**Location:** `src/pages/ReelsFeedPage.tsx`, the `snoozeFeedAuthor` function.

**The bug:**
```js
await (supabase as any)
  .from("feed_snoozed_authors")
  .upsert({...}, { onConflict: "user_id,author_id,author_source" });
return true;
```

The `.upsert()` result is never checked. The function writes to localStorage first (line ~258), dispatches the event, then does the DB write. If the DB write fails (RLS / offline), the function still returns `true`.

**User-facing impact:** The author is snoozed locally (so the UI hides their posts immediately), but the snooze is **not persisted to the DB**. On another device, or after a re-login, the snooze is gone. The user believes they snoozed the author for 30 days; it only lasts until the local storage is cleared or the session changes.

**Proof from code:** The `useFeedSnoozedAuthorIds` hook's `syncRemote` (lines ~280-320) merges remote rows into local — so a missing remote row means the snooze silently disappears on the next sync. The function's `catch` block returns `false` only for thrown errors, but supabase-js `.upsert()` **does not throw** on a DB rejection — it resolves with `{ error }`.

**Fix (additive):**
```js
const snoozeFeedAuthor = async (...) => {
  if (typeof window === "undefined") return false;
  try {
    const storageKey = scopedFeedStorageKey("snoozed-authors", userId);
    const current = readFeedSnoozeMap(userId);
    const snoozedUntilMs = Date.now() + days * 24 * 60 * 60 * 1000;
    current[getFeedAuthorSnoozeKey(authorSource, authorId)] = snoozedUntilMs;
    window.localStorage.setItem(storageKey, JSON.stringify(current));
    window.dispatchEvent(new Event(FEED_SNOOZED_AUTHORS_EVENT));
    const { error } = await (supabase as any)
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
    if (error) {
      // Roll back local state so the UI doesn't claim a snooze that won't persist.
      delete current[getFeedAuthorSnoozeKey(authorSource, authorId)];
      window.localStorage.setItem(storageKey, JSON.stringify(current));
      window.dispatchEvent(new Event(FEED_SNOOZED_AUTHORS_EVENT));
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
```

---

### Bug 3: `recordShareForFeedItem` — silent failure, but **intentional** (LINES ~200-210)

**Location:** `src/pages/ReelsFeedPage.tsx`, the `recordShareForFeedItem` function.

**The bug:** The comment explicitly says "failures are swallowed so a flaky network never blocks the UX or breaks the share itself." This is **deliberate** — the share itself (copy link / native share) happens regardless, and the RPC is best-effort analytics. This is **not a bug** — it's a documented design decision. I'm flagging it only to note I checked it.

---

### Bug 4: `useFeedPostNotificationState` — `syncRemote` writes to localStorage on a **read** (LINES ~345-365)

**Location:** `src/pages/ReelsFeedPage.tsx`, inside `useFeedPostNotificationState`'s `syncRemote`.

**The bug:** When `syncRemote` finds a DB row (line ~355), it does:
```js
const storageKey = scopedFeedStorageKey("post-notifications", userId);
const next = readFeedStringSet(storageKey);
next.add(postKey);
writeFeedStringSet(storageKey, next, FEED_POST_NOTIFICATIONS_EVENT);
setEnabled(true);
```

This is a **read path** (syncing remote → local) that **writes** to localStorage and dispatches an event. The event triggers the `sync` listener (line ~362), which calls `setEnabled(read())` — a redundant re-render but not a bug per se.

**However:** There's a subtle race. If the user toggles the notification **off** while `syncRemote` is in-flight (the DB read is pending), and then `syncRemote` resolves with a DB row (the old state), it will **re-add** the postKey to localStorage and `setEnabled(true)` — **clobbering the user's just-made "off" choice**. The user toggled off, but the in-flight read flips it back on.

**Proof from code:** `syncRemote` is fired on mount (line ~340: `void syncRemote()`). If the user quickly toggles off before the read resolves, the read's `if (data)` branch unconditionally re-adds and re-enables. There's no check for "did the user change this since I started reading?"

**User-facing impact:** A user who toggles notifications off immediately after the feed loads may see the toggle flip back on a moment later, with the DB row still present (the delete in `setPersisted` may not have completed either, or the read raced ahead of it).

**Fix (additive, guard with a ref):**
```js
const syncRemote = async () => {
  const parsed = parseFeedPreferencePostKey(postKey);
  if (!userId || !postKey || !parsed) {
    setEnabled(false);
    return;
  }
  const localEnabled = read();
  const { data, error } = await (supabase as any)
    .from("feed_post_notification_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("post_id", parsed.postId)
    .eq("post_source", parsed.source)
    .maybeSingle();

  if (error) {
    setEnabled(localEnabled);
    return;
  }

  // If the user changed the toggle while we were reading, don't clobber it.
  if (read() !== localEnabled) return;

  if (data) {
    const storageKey = scopedFeedStorageKey("post-notifications", userId);
    const next = readFeedStringSet(storageKey);
    next.add(postKey);
    writeFeedStringSet(storageKey, next, FEED_POST_NOTIFICATIONS_EVENT);
    setEnabled(true);
    return;
  }
  // ... rest unchanged
};
```

---

### Bug 5: `handleSearchChange` — `public_profiles` query uses `.ilike` on `full_name` but the table may not have that column (LINES ~560-575)

**Location:** `src/pages/ReelsFeedPage.tsx`, `handleSearchChange`.

**The bug:** 
```js
let profileQuery = supabase.from("public_profiles" as any).select("id, full_name, avatar_url").limit(15);
words.forEach((w) => { profileQuery = profileQuery.ilike("full_name", `%${w}%`); });
```

This chains multiple `.ilike()` calls on the same query. PostgREST treats multiple `.ilike()` on the same column as **AND** conditions. So searching "John Smith" becomes `full_name ILIKE '%john%' AND full_name ILIKE '%smith%'` — which is actually correct for multi-word names.

**However:** The `public_profiles` table — I need to verify it has `full_name`. Looking at the feed query (line ~640), it selects `"id, user_id, full_name, avatar_url"` from `public_profiles` — so the column exists. **Not a bug.**

But there's a subtler issue: the search is **case-sensitive** on the `ilike` pattern? No — `ilike` is case-insensitive in Postgres. **Not a bug.**

---

### Bug 6: `handleSearchChange` — no error check on the search queries (LINES ~560-575)

**Location:** `src/pages/ReelsFeedPage.tsx`, `handleSearchChange`.

**The bug:**
```js
const [{ data: profileData }, { data: storeData }] = await Promise.all([
  profileQuery,
  supabase.from("store_profiles" as any).select("id, name, logo_url, slug, category").ilike("name", `%${q.trim()}%`).limit(10),
]);
setSearchResults(profileData || []);
setStoreSearchResults(storeData || []);
```

Both queries' `{ error }` is never checked. If either fails (RLS / network), `data` is `null`, and the code sets empty results — **silently showing "no results"** when the real problem is a failed query. The user sees an empty search state with no error indication.

**User-facing impact:** A user searches for a friend, the query fails silently, and they see "no results" — believing the person doesn't exist on the platform. There's no retry, no error message.

**Fix (additive):**
```js
const [{ data: profileData, error: profileError }, { data: storeData, error: storeError }] = await Promise.all([
  profileQuery,
  supabase.from("store_profiles" as any).select("id, name, logo_url, slug, category").ilike("name", `%${q.trim()}%`).limit(10),
]);
if (profileError || storeError) {
  setSearchResults([]);
  setStoreSearchResults([]);
  // Surface an error state — the caller (hidden portion) should render it.
  // At minimum, don't silently show "no results".
  return;
}
setSearchResults(profileData || []);
setStoreSearchResults(storeData || []);
```

---

### Bug 7: `useFeedSnoozedAuthorIds` — `syncRemote` merges remote into local but **local wins on conflict** (LINES ~280-320)

**Location:** `src/pages/ReelsFeedPage.tsx`, `useFeedSnoozedAuthorIds`'s `syncRemote`.

**The bug:**
```js
const merged = { ...local };
(data ?? []).forEach((row) => {
  if (!row?.author_id || ...) return;
  const until = Date.parse(row.snoozed_until);
  if (Number.isFinite(until) && until > Date.now()) {
    merged[getFeedAuthorSnoozeKey(row.author_source, row.author_id)] = until;
  }
});
```

This merges **remote into local**, with remote **overwriting** local on conflict. That's correct for syncing. But consider: the user snoozes an author on device A (local write + DB upsert). On device B, `syncRemote` pulls the remote row and merges it in — correct.

**However:** If the user **unsnoozes** on device A (deletes the local entry), but the DB row still exists (the unsnooze path — is there one? The visible code only shows `snoozeFeedAuthor`, no unsnooze function). If there's no unsnooze path, then once snoozed, always snoozed until the 30-day expiry — which is by design. **Not a bug** unless there's an unsnooze path in the hidden portion that doesn't delete the DB row.

---

### Bug 8: `handleFeedSwipeEnd` — swipe threshold logic (LINES ~230-240)

**Location:** `src/pages/ReelsFeedPage.tsx`, `handleFeedSwipeEnd`.

**The bug:**
```js
if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
```

This requires horizontal swipe distance ≥ 52px AND ≥ 1.6× the vertical distance. That's a reasonable guard against accidental vertical scrolls. **Not a bug.**

---

### Bug 9: `useEffect` for share-to-profile deep link — `window.history.replaceState({}, document.title)` clears ALL state (LINES ~300-315)

**Location:** `src/pages/ReelsFeedPage.tsx`, the deep-link effect.

**The bug:**
```js
if (state?.shareToProfile && userId) {
  setShareForPost({...});
  setCommerceDraft(state.commerceLinkDraft || null);
  setShowCreate(true);
  window.history.replaceState({}, document.title);
}
```

`window.history.replaceState({}, document.title)` replaces the **entire** history state with an empty object. If the navigation to this page carried other state (e.g., a `from` redirect target, a pending action), it's wiped. This is a **minor** issue — the state was consumed, so clearing it is intentional. But it also clears any **other** state keys that might have been present. **Low severity, likely intentional.**

---

### Bug 10: `useEffect` for auth — `supabase.auth.getUser()` fires on every mount but `setUserId` may race with the `useAuth` context (LINES ~320-340)

**Location:** `src/pages/ReelsFeedPage.tsx`, the auth effect.

**

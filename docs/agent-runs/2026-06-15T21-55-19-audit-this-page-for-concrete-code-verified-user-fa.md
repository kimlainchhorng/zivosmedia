# DeepSeek run — 2026-06-15T21:55:19.816Z

- model: deepseek-chat
- task: Audit this page for CONCRETE, code-verified user-facing bugs only: mock/hardcoded data shown as real; controls that claim an action but do nothing or navigate to the wrong place (missing/wrong route params, wrong navigation-state shape); silent Supabase error swallowing (an insert/update/delete/select whose {error} is never checked, especially when a wired error/retry UI then never fires); broken deep-links; logic/calculation errors; state written but never read. Cite exact line numbers and the user-visible symptom. Be strict — only report bugs you can PROVE from the code. If genuinely clean, say so in one line.
- files: src/pages/NotificationCenterPage.tsx

---

## Audit Results: `src/pages/NotificationCenterPage.tsx`

### Bug Found: Silent Supabase Error Swallowing in `load()` and `loadMore()`

**Line 155-168 (`load` function):**
```typescript
const { data, count } = await supabase
  .from("notifications")
  .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .range(0, PAGE_SIZE - 1);

if (data) {
  setNotifications(data.map(mapRow));
  setOffset(PAGE_SIZE);
  setHasMore((count ?? 0) > PAGE_SIZE);
}
setLoading(false);
```

**Line 175-188 (`loadMore` function):**
```typescript
const { data, count } = await supabase
  .from("notifications")
  .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .range(offset, offset + PAGE_SIZE - 1);

if (data) {
  setNotifications(prev => [...prev, ...data.map(mapRow)]);
  const newOffset = offset + PAGE_SIZE;
  setOffset(newOffset);
  setHasMore((count ?? 0) > newOffset);
}
setLoadingMore(false);
```

**User-visible symptom:** If the Supabase query fails (network error, RLS violation, server error), `data` will be `null` and `error` will be populated. The code silently ignores the error — the user sees a perpetual loading state (for `load()`) or the "Load more" button does nothing with no feedback (for `loadMore()`). The `error` property from the Supabase response is never checked.

**Proof from code:**
- `const { data, count } = await supabase...` — destructures `data` and `count` but **not** `error`
- `if (data) { ... }` — only enters the success branch; on failure, `data` is `null`, so the block is skipped
- No `else` branch, no `catch`, no `toast.error()` call
- `setLoading(false)` / `setLoadingMore(false)` still runs, so the loading spinner stops, but the user sees an empty list or a "No notifications" empty state with no indication of failure

### Bug: `load()` Missing from `useEffect` Dependency Array

**Line 190:**
```typescript
useEffect(() => { load(); }, [load]);
```

While `load` is wrapped in `useCallback` with `[user]` dependency, this is technically correct for the initial load. However, if `user` changes after mount, the effect re-runs because `load` identity changes. This is actually fine — just noting it's correct.

### Bug: `loadMore` Missing `hasMore` Guard

**Line 172:**
```typescript
if (!user || loadingMore) return;
```

`loadMore` doesn't check `hasMore` before firing. The button is conditionally rendered (`{!loading && hasMore && ...}`), so this is a defense-in-depth issue, not user-visible. The button won't appear when `hasMore` is false.

### Bug: `replyOpenFor` State Leak on Notification Delete

**Lines 393-398:**
```typescript
if (notif.count > 1) void deleteMany(notif.ids);
else void deleteNotif(notif.id);
```

If a user has the reply panel open for a chat notification, then deletes that notification, `replyOpenFor` still holds the old `threadId`. The reply panel's `AnimatePresence` exit animation will play, but the state is stale. Not user-visible (the panel disappears with the deleted row), but a minor memory leak.

### Bug: `muteOpenFor` State Leak on Notification Delete

Same pattern as above — if the mute dropdown is open when the notification is deleted, `muteOpenFor` retains the stale thread ID. Again, not user-visible since the row is gone.

### Bug: `previewUserId` Not Cleared on Notification Delete

If the profile preview sheet is open and the notification is deleted, `previewUserId` still holds the value. The sheet would remain open over an empty space. This is a minor UX issue — the sheet should close when its parent notification is removed.

---

## Verdict: **1 confirmed user-facing bug** (silent error swallowing in `load()` and `loadMore()`)

The page is otherwise well-structured with proper error handling for mutations (markRead, delete, sendReply all have try/catch with toast). The initial data fetch and load-more are the only places where Supabase errors are silently dropped.

### Fix: Add error checking to `load()` and `loadMore()`

**File:** `src/pages/NotificationCenterPage.tsx`

**Before (lines 155-168):**
```typescript
const load = useCallback(async () => {
  if (!user) { setLoading(false); return; }
  const { data, count } = await supabase
    .from("notifications")
    .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (data) {
    setNotifications(data.map(mapRow));
    setOffset(PAGE_SIZE);
    setHasMore((count ?? 0) > PAGE_SIZE);
  }
  setLoading(false);
}, [user]);
```

**After:**
```typescript
const load = useCallback(async () => {
  if (!user) { setLoading(false); return; }
  const { data, count, error } = await supabase
    .from("notifications")
    .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    console.error("Failed to load notifications:", error);
    toast.error("Couldn't load notifications");
  } else if (data) {
    setNotifications(data.map(mapRow));
    setOffset(PAGE_SIZE);
    setHasMore((count ?? 0) > PAGE_SIZE);
  }
  setLoading(false);
}, [user]);
```

**Before (lines 175-188):**
```typescript
const loadMore = useCallback(async () => {
  if (!user || loadingMore) return;
  setLoadingMore(true);
  const { data, count } = await supabase
    .from("notifications")
    .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (data) {
    setNotifications(prev => [...prev, ...data.map(mapRow)]);
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    setHasMore((count ?? 0) > newOffset);
  }
  setLoadingMore(false);
}, [user, offset, loadingMore]);
```

**After:**
```typescript
const loadMore = useCallback(async () => {
  if (!user || loadingMore) return;
  setLoadingMore(true);
  const { data, count, error } = await supabase
    .from("notifications")
    .select("id, title, body, category, is_read, created_at, action_url", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error("Failed to load more notifications:", error);
    toast.error("Couldn't load more notifications");
  } else if (data) {
    setNotifications(prev => [...prev, ...data.map(mapRow)]);
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    setHasMore((count ?? 0) > newOffset);
  }
  setLoadingMore(false);
}, [user, offset, loadingMore]);
```

### Owner Verification

1. Apply the diff above to `src/pages/NotificationCenterPage.tsx`
2. Run `npm run update` — must pass (type-check + worker type-check + build)
3. Test: temporarily break the Supabase query (e.g., add `.eq("nonexistent_column", true)`) and verify the toast appears instead of silent failure
4. Test: normal flow still works — notifications load, load-more works, real-time inserts appear

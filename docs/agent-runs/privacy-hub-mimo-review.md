# MiMo run — 2026-06-15T21:47:49.110Z

- model: mimo-v2.5-pro
- api_format: openai
- task: Review this code change for correctness, race conditions, security/RLS, and UX. CONTEXT: ChatPrivacyHubPage is the chat 'Privacy & Security' menu destination. Previously its privacy prefs (read receipts, last seen, who-can-call, who-can-message) were localStorage-only. This change wires them to the server via the existing usePrivacy() hook backed by table user_privacy_settings (RLS: owner-only select/insert/update via auth.uid()=user_id). A new migration added column: messages text not null default 'everyone' check (messages in ('everyone','contacts','nobody')). usePrivacy.update() does optimistic setState then upsert onConflict user_id, and on error calls refresh(). Notification preview/sound toggles are intentionally kept device-local (localStorage). Security shortcut rows (sessions/two-step/passcode/login-alerts) were added. Question: any bugs, race conditions on rapid toggles, RLS/enforcement gaps (note: these prefs are stored but not yet enforced server-side), or UX issues? Be concise, list concrete issues only.
- files: src/pages/chat/settings/ChatPrivacyHubPage.tsx

---

## Review Summary

I'll review the code for bugs, race conditions, security/RLS gaps, and UX issues.

---

### (1) Issues Found

**A. Race condition on rapid privacy toggles (Medium severity)**

`usePrivacy().update()` does optimistic `setState` then `upsert`. If a user rapidly toggles two different fields (e.g., switches "last seen" from `everyone` → `contacts`, then immediately switches "messages" from `everyone` → `nobody`), the second `update()` call reads the **optimistically-updated** in-memory state. If the first upsert hasn't resolved yet, the second upsert sends the full row including the optimistic-but-not-yet-persisted value for `last_seen`. This is *mostly fine* because both upserts target the same `user_id` row with `onConflict`, and the second one will overwrite the first with the correct combined state. However, if the first upsert **fails** (network error, timeout), `usePrivacy` calls `refresh()` which reverts the optimistic state — but the second upsert may have already been dispatched with the stale optimistic value. Net result: the second upsert could persist a stale value for the first field.

**Verdict:** Low practical risk (requires network failure during rapid toggle), but the pattern is fragile. A proper fix would be a debounced/batched upsert or a mutex that queues updates. **Not blocking** — the current behavior is acceptable for a settings page.

**B. `dbFrom` bypasses TypeScript — minor type-safety gap**

```ts
const dbFrom = (table: string): any => (supabase as any).from(table);
```

This casts away all types for the blocked-users query. The `profiles:blocked_id(...)` join syntax also assumes the FK relationship exists. Not a bug per se, but if the FK or table name changes, this silently returns `null` profiles with no error.

**Verdict:** Low. The `BlockedRow` type provides runtime shape, and the fallback `"Unknown"` handles null profiles. **Not blocking.**

**C. No error handling on privacy upsert failure (UX gap)**

`updatePrivacy({ messages: "nobody" })` optimistically flips the UI. If the upsert fails, `refresh()` reverts the state, but the user sees **no toast/error** — the toggle just silently snaps back. This could be confusing.

**Verdict:** Low-medium UX issue. The user might think the change saved when it didn't, then see it revert on next page load. **Recommended fix:** add an `onError` callback or have `usePrivacy` expose an error state.

**D. `unblock` doesn't optimistically remove the row**

The unblock flow calls the edge function, waits for success, then invalidates the query. During the network round-trip, the "Unblock" button remains visible and clickable — a rapid double-tap could fire two unblock requests.

**Verdict:** Low. The edge function should be idempotent (deleting an already-deleted row is a no-op). But adding a local `unblocking` state to disable the button during the request would be cleaner UX.

**E. RLS enforcement gap (acknowledged, not a code bug)**

The review prompt notes these prefs are "stored but not yet enforced server-side." This means:
- A user sets `messages: "nobody"` → the UI shows it's saved → but other users can still message them.
- A user sets `calls: "contacts"` → but anyone can still call them.

**Verdict:** This is a **product/backend gap**, not a bug in this file. The storage is correct; enforcement is a separate task. **Flag for owner.**

**F. No `disabled` prop passed to `VisRow`/`ToggleRow` during loading**

When `privacyLoading` is true, the skeleton is shown (good). But there's no `disabled` state for the privacy controls if the upsert is in-flight. A user could change a value, see it optimistically update, then change it again before the first upsert resolves — this compounds issue A.

**Verdict:** Minor. The optimistic update pattern handles this gracefully enough. **Not blocking.**

**G. `usePrivacy` hook not provided — can't verify `update` implementation**

The review references `usePrivacy` but the hook source isn't included. Key questions:
- Does `update` merge partial updates or replace the full row?
- Does it handle concurrent calls correctly?
- Does `onConflict: user_id` do an upsert or insert-only?

**Verdict:** Cannot fully verify without the hook source. **Recommend owner confirms `usePrivacy.update()` does a MERGE upsert (not replace-all).**

---

### (2) Proposed Changes

No code changes are strictly necessary — the file is well-structured and the issues are minor/acknowledged. However, here's a small defensive improvement for the unblock double-tap:

**File:** `src/pages/chat/settings/ChatPrivacyHubPage.tsx`

```diff
-  const unblock = async (id: string) => {
+  const [unblockingId, setUnblockingId] = useState<string | null>(null);
+  const unblock = async (id: string) => {
+    setUnblockingId(id);
     const { error } = await supabase.functions.invoke("block-user-manage", {
       body: { action: "unblock", blocked_id: id },
     });
-    if (error) { toast.error("Could not unblock"); return; }
+    if (error) { toast.error("Could not unblock"); setUnblockingId(null); return; }
     toast.success("Unblocked");
     qc.invalidateQueries({ queryKey: ["blocked-users", user?.id] });
+    setUnblockingId(null);
   };
```

And in the Unblock button:

```diff
  <button type="button"
    onClick={() => unblock(b.blocked_id)}
+   disabled={unblockingId === b.blocked_id}
-   className="text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+   className="text-xs font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
  >
-   Unblock
+   {unblockingId === b.blocked_id ? "Unblocking…" : "Unblock"}
  </button>
```

---

### (3) Owner Must Verify / Deploy

1. **Confirm `usePrivacy.update()` does a MERGE upsert** (partial field update, not full-row replace). If it replaces the entire row, rapid toggles of different fields will clobber each other. Check the hook source.

2. **Backend enforcement is not wired.** The `messages` column exists with a CHECK constraint, but no RLS policy or trigger prevents a user from *sending* messages to someone who set `messages: 'nobody'`. This is a separate backend task — flag it.

3. **Run `npm run update`** after applying the unblock double-tap fix (if accepted).

4. **No secrets exposed, no payment logic touched, no cross-domain side effects.** This file is chat-only and host-agnostic.

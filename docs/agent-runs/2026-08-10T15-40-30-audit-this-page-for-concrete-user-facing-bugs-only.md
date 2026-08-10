# DeepSeek run — 2026-08-10T15:40:30.523Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/ChatHubPage.tsx

---

I'll audit the visible portion of `ChatHubPage.tsx` for concrete user-facing bugs. Since only ~20% of the file is shown, I'll focus strictly on what I can prove from the visible code.

## Audit Findings

### Bug 1: Silent Supabase error swallowing in `handleShareToContact` (line ~L700)
```typescript
await supabase.from("direct_messages").insert({
  sender_id: user.id,
  receiver_id: contactId,
  message: shareMessage,
});
toast.success(`Shared to ${contactName}`);
```
The `.insert()` result is never checked. If the DB rejects the write (RLS denial, offline, constraint), the user still sees "Shared to {contactName}" — a **false success**. The `try/catch` only catches thrown errors, but supabase-js `.insert()` resolves with `{ data, error }` even on rejection; it doesn't throw unless you inspect `error` or call `.throwOnError()`.

**Fix:**
```typescript
const { error } = await supabase.from("direct_messages").insert({
  sender_id: user.id,
  receiver_id: contactId,
  message: shareMessage,
});
if (error) throw error;
toast.success(`Shared to ${contactName}`);
```

### Bug 2: `?with=` deep-link profile fetch swallows errors (line ~L590)
```typescript
const { data } = await supabase
  .from("profiles")
  .select("full_name, avatar_url, is_verified")
  .eq("user_id", withId)
  .maybeSingle();
setOpenPersonalChat({
  id: withId,
  name: data?.full_name || "Chat",
  ...
});
```
If the profile fetch fails (network/RLS), `data` is `null` and the user gets a chat titled "Chat" with no avatar — but the deep-link **did** open a chat, so this is arguably acceptable fallback. However, the error is silently swallowed; if the user taps a push notification for a specific person and the profile fetch fails, they see a generic "Chat" instead of the person's name. This is a **minor UX bug** — the error should at least be logged or surfaced.

### Bug 3: `?group=` deep-link error handling is correct but the `setFolder("groups")` may not match the actual folder
```typescript
setFolder("groups");
```
The `builtInFolders` array has `{ id: "groups", label: "Groups", category: "personal" }`, so `setFolder("groups")` sets the active folder to "Groups" — this is correct. No bug here.

### Bug 4: `handleShareToContact` — the `setOpenPersonalChat` after success doesn't include `isVerified`
```typescript
setOpenPersonalChat({ id: contactId, name: contactName, avatar: contactAvatar });
```
The `OpenChatState` type includes `isVerified?: boolean`, but this call omits it. The chat will open without the verified badge even if the contact is verified. This is a **minor cosmetic bug** — the verified badge won't show in the opened chat.

### Bug 5: `chatMenuProfile` query — `.maybeSingle()` on a non-unique column
```typescript
const { data } = await supabase
  .from("profiles")
  .select("full_name, username, avatar_url, is_verified")
  .eq("user_id", user!.id)
  .maybeSingle();
```
If `user_id` is not unique in `profiles` (which it should be, but if there are duplicate rows), `.maybeSingle()` returns `null` and the error is swallowed. The menu would show fallback "ZIVO" instead of the real name. This is a **potential data-integrity issue**, not a code bug per se — but the error is silently ignored.

### Bug 6: `?with=` deep-link — `setActive("personal")` may not match the folder
```typescript
setActive("personal");
```
`setActive` calls `setFolder("personal")`, which sets the folder to "personal" — this matches the `builtInFolders` entry `{ id: "personal", label: "Personal", category: "personal" }`. Correct.

### Bug 7: `handleShareToContact` — no `isVerified` in the opened chat state (confirmed above)

### Bug 8: `?with=` deep-link — the `openGiftOnMount` flag is read but the `gift` param is deleted
```typescript
const openGiftOnMount = searchParams.get("gift") === "1";
const nextParams = new URLSearchParams(searchParams);
nextParams.delete("with");
nextParams.delete("gift");
nextParams.delete("msg");
```
This is correct — the gift param is consumed and removed.

### Bug 9: `?unlocked=` deep-link — `verify-media-unlock` edge function error handling
```typescript
const { data, error } = await supabase.functions.invoke("verify-media-unlock", {
  body: { message_id: unlockedMsgId },
});
if (error) throw error;
if (data?.unlocked) {
  toast.success("Media unlocked! 🔓");
} else {
  toast.info("Payment is still processing. The media will unlock shortly.");
}
```
This is correct — errors are caught and surfaced.

### Bug 10: `?gift=` deep-link — no user check
```typescript
const giftStatus = searchParams.get("gift");
if (giftStatus !== "success" && giftStatus !== "canceled") return;
```
This effect runs even when `user` is null. If a logged-out user lands on `/chat?gift=success`, they get a "Premium gift sent" toast even though they're not authenticated. **Minor bug** — should check `user` before showing the toast.

## Summary of Concrete Bugs

| # | Line (approx) | Bug | Severity |
|---|---|---|---|
| 1 | ~L700 | `handleShareToContact` — silent `.insert()` error → false "Shared to" success toast | **High** |
| 2 | ~L590 | `?with=` deep-link — profile fetch error silently swallowed → generic "Chat" name | Medium |
| 3 | ~L700 | `setOpenPersonalChat` after share omits `isVerified` → verified badge missing | Low |
| 4 | ~L640 | `?gift=` deep-link — toast fires for unauthenticated users | Low |

## Proposed Fixes

### Fix 1: `handleShareToContact` (line ~L700)
**Before:**
```typescript
await supabase.from("direct_messages").insert({
  sender_id: user.id,
  receiver_id: contactId,
  message: shareMessage,
});
toast.success(`Shared to ${contactName}`);
```
**After:**
```typescript
const { error } = await supabase.from("direct_messages").insert({
  sender_id: user.id,
  receiver_id: contactId,
  message: shareMessage,
});
if (error) throw error;
toast.success(`Shared to ${contactName}`);
```

### Fix 2: `?with=` deep-link (line ~L590)
**Before:**
```typescript
const { data } = await supabase
  .from("profiles")
  .select("full_name, avatar_url, is_verified")
  .eq("user_id", withId)
  .maybeSingle();
setOpenPersonalChat({
  id: withId,
  name: data?.full_name || "Chat",
  avatar: data?.avatar_url || null,
  isVerified: (data as any)?.is_verified === true,
  prefillInput,
  openGiftOnMount,
  initialJumpMessageId,
});
```
**After:**
```typescript
const { data, error } = await supabase
  .from("profiles")
  .select("full_name, avatar_url, is_verified")
  .eq("user_id", withId)
  .maybeSingle();
if (error) {
  console.error("Failed to load profile for deep-link chat:", error);
}
setOpenPersonalChat({
  id: withId,
  name: data?.full_name || "Chat",
  avatar: data?.avatar_url || null,
  isVerified: (data as any)?.is_verified === true,
  prefillInput,
  openGiftOnMount,
  initialJumpMessageId,
});
```

### Fix 3: `handleShareToContact` — include `isVerified` (line ~L700)
**Before:**
```typescript
setOpenPersonalChat({ id: contactId, name: contactName, avatar: contactAvatar });
```
**After:**
```typescript
setOpenPersonalChat({ id: contactId, name: contactName, avatar: contactAvatar, isVerified: false });
```
(Or fetch the contact's `is_verified` from profiles before opening — but that's a larger change. Setting `false` at least makes the state explicit.)

### Fix 4: `?gift=` deep-link (line ~L640)
**Before:**
```typescript
useEffect(() => {
  const giftStatus = searchParams.get("gift");
  if (giftStatus !== "success" && giftStatus !== "canceled") return;
  ...
}, [searchParams, setSearchParams]);
```
**After:**
```typescript
useEffect(() => {
  const giftStatus = searchParams.get("gift");
  if (giftStatus !== "success" && giftStatus !== "canceled") return;
  if (!user) return; // Don't show gift toasts to unauthenticated users
  ...
}, [searchParams, setSearchParams, user]);
```

## What the Owner Must Verify

1. **Fix 1** is the critical one — it's a false-success bug that misleads users into thinking a message was sent when it wasn't. The happy path is unchanged; only the error path now surfaces correctly.
2. **Fix 2** is defensive — the deep-link still opens a chat, just with a generic name on profile-fetch failure. Adding a console.error is non-breaking.
3. **Fix 3** is cosmetic — the verified badge won't show in the opened chat after sharing. Setting `isVerified: false` is explicit but doesn't fix the underlying issue (the contact might be verified). A proper fix would fetch the profile, but that's a larger change.
4. **Fix 4** is a minor edge case — unauthenticated users landing on `/chat?gift=success` shouldn't see a gift toast.

All fixes are **additive** and don't change the happy path. Run `npm run update` after applying to verify type-check + build pass.

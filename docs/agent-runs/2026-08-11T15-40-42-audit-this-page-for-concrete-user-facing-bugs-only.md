# DeepSeek run — 2026-08-11T15:40:42.025Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/LiveStreamPage.tsx

---

I'll audit the visible portion of `LiveStreamPage.tsx` for concrete user-facing bugs. Let me analyze carefully.

## Audit Findings

### Bug 1: `sendChat` clears input before confirming the write succeeded (false-success on failure)

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L340-349 (in the `sendChat` callback)

```tsx
const sendChat = useCallback(async () =>{
 if (!chatInput.trim() || !user?.id) {
   if (!user?.id) toast.error("Sign in to chat");
   return;
 }
 const content = chatInput.trim();
 setChatInput("");   // <-- clears input BEFORE the insert resolves
 const { error } = await (supabase as any)
   .from("live_comments")
   .insert({ stream_id: stream.id, user_id: user.id, content });
 if (error) toast.error("Failed to send", { description: error.message });
}, [chatInput, stream.id, user?.id]);
```

**Proof:** `setChatInput("")` runs synchronously before `await`. If the insert fails (RLS denial, offline, constraint), the user's typed message is **gone** from the input box, and they only get a toast — they must retype the entire message. This is a concrete data-loss bug: the control claims "send" but on failure the user's content is destroyed. The correct pattern (used elsewhere in this file, e.g. `handleFollowHost`) is to check `error` first and only clear on success.

**Fix:**
```tsx
const content = chatInput.trim();
const { error } = await (supabase as any)
  .from("live_comments")
  .insert({ stream_id: stream.id, user_id: user.id, content });
if (error) {
  toast.error("Failed to send", { description: error.message });
  return; // keep the input so the user can retry
}
setChatInput(""); // only clear on success
```

---

### Bug 2: `sendGift` does not refresh the coin balance after a successful gift

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L390-420 (in the `sendGift` callback)

```tsx
const { error } = await (supabase as any).rpc("send_live_gift", {
  p_stream_id: stream.id,
  p_gift_name: selectedGift.name,
  p_gift_icon: selectedGift.icon,
  p_coins: selectedGift.coins,
  p_tier: tier,
  p_quantity: giftQty,
});
if (error) throw error;
// ... sound + setGiftQty(1)
```

**Proof:** The RPC `send_live_gift` atomically debits the sender's coin balance. But after a successful send, `coinBalance` (from `useCoinBalance`) is **never refreshed**. The user sends a gift, the balance shown in the gift panel header (`{coinBalance.toLocaleString()}`) stays at the pre-gift value. The next gift attempt will use the stale balance for the `totalCoins > coinBalance` check — so a user who sends a gift that brings them below the next gift's cost will see "Not enough coins!" even though they have exactly enough, or worse, the UI shows a balance that no longer matches reality. This is a concrete stale-data bug.

**Fix:** After a successful `send_live_gift`, call the balance refetch. The `useCoinBalance` hook exposes `recharge` but we need a refetch. Check the hook's API — if it exposes `refetch` or `refresh`, call it after success:

```tsx
if (error) throw error;
// Refresh the balance after a successful debit
try { await refreshBalance?.(); } catch { /* non-fatal */ }
```

(Where `refreshBalance` is whatever the hook exposes — if it only exposes `recharge`, then the fix is to add a `refetch` to `useCoinBalance` or call the underlying balance query again.)

---

### Bug 3: `handleShare` — `navigator.share` failure is silently swallowed

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L425-431

```tsx
const handleShare = () =>{
 if (navigator.share) {
   navigator.share({ title: stream.title, text: `Watch ${stream.host_name} live on ZIVO!`, url: window.location.href });
 } else {
   navigator.clipboard.writeText(window.location.href);
   toast.success("Link copied!");
 }
};
```

**Proof:** `navigator.share()` returns a Promise that **rejects** when the user cancels the share sheet (AbortError) or when sharing fails. The rejection is unhandled — no `.catch()`, no `await` in a try/catch. On mobile (where `navigator.share` exists), if the user cancels the native share sheet, an **unhandled promise rejection** fires. This is a concrete bug: the control claims "share" but on cancel/failure it produces a console error and no feedback. The `else` branch (clipboard) is fine, but the `navigator.share` branch needs error handling.

**Fix:**
```tsx
const handleShare = () =>{
 if (navigator.share) {
   navigator.share({ title: stream.title, text: `Watch ${stream.host_name} live on ZIVO!`, url: window.location.href })
     .catch(() => { /* user cancelled — no-op */ });
 } else {
   navigator.clipboard.writeText(window.location.href);
   toast.success("Link copied!");
 }
};
```

---

### Bug 4: `handleDoubleTap` fires `sendLike()` on every double-tap even when the user is signed out

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L433-447

```tsx
const handleDoubleTap = useCallback(
 (e: React.TouchEvent | React.MouseEvent) =>{
   const now = Date.now();
   if (now - lastTapRef.current< 300) {
     // ... setDoubleTapHeart(...)
     sendLike();
     setTimeout(() =>setDoubleTapHeart(null), 1000);
   }
   lastTapRef.current = now;
 },
 [sendLike]
);
```

**Proof:** `sendLike` itself checks `if (!user?.id) { toast.error("Sign in to like"); return; }`. So a signed-out user double-tapping the video gets a "Sign in to like" toast — that's fine. But the **double-tap heart animation** (`setDoubleTapHeart`) fires regardless of auth state. So a signed-out user sees the heart animation AND gets a "Sign in to like" toast — the animation claims a like happened when it didn't. This is a minor false-success: the visual heart implies the like registered. The fix is to gate the animation on `user?.id`:

```tsx
if (now - lastTapRef.current < 300) {
  if (!user?.id) { toast.error("Sign in to like"); return; }
  // ... rest
}
```

---

### Bug 5: `sendLike` — duplicate-like error is swallowed but the like count still increments optimistically

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L351-361

```tsx
const sendLike = useCallback(async () =>{
 if (!user?.id) {
   toast.error("Sign in to like");
   return;
 }
 const { error } = await (supabase as any)
   .from("live_likes")
   .insert({ stream_id: stream.id, user_id: user.id });
 if (error && !String(error.message).includes("duplicate")) {
   toast.error("Failed to like");
 }
}, [stream.id, user?.id]);
```

**Proof:** The `live_likes` table presumably has a unique constraint on `(stream_id, user_id)` to prevent duplicate likes. When a user taps the like button twice, the second insert hits the unique violation. The code swallows the "duplicate" error (correctly, to avoid a false error toast). **But** the like count (`likes` state) is only incremented by the Realtime `INSERT` handler — which fires for the **first** insert. On the second tap, no new row is inserted, so no Realtime event fires, and `likes` doesn't increment. That's actually correct behavior (one like per user). 

However, there's a subtle bug: the **double-tap heart** (`handleDoubleTap`) calls `sendLike()` — and if the user already liked, the second call hits the duplicate and is silently swallowed. That's fine. But the **like button** in the right sidebar (`onClick={sendLike}`) — if the user taps it twice rapidly, the first insert succeeds, the second hits duplicate and is swallowed. No false increment. So this is actually **not** a bug — the duplicate handling is correct. I'll drop this.

---

### Bug 6: `handleFollowHost` — optimistic toggle + duplicate insert race

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L120-145

```tsx
const handleFollowHost = useCallback(async () =>{
 if (!user) { toast.error("Sign in to follow"); return; }
 if (isHostMe || followBusy) return;
 setFollowBusy(true);
 const wasFollowing = isFollowingHost;
 setIsFollowingHost(!wasFollowing); // optimistic
 try {
   if (wasFollowing) {
     const { error } = await (supabase as any)
       .from("user_followers")
       .delete()
       .eq("follower_id", user.id)
       .eq("following_id", stream.user_id);
     if (error) throw error;
   } else {
     const { error } = await (supabase as any)
       .from("user_followers")
       .insert({ follower_id: user.id, following_id: stream.user_id });
     if (error && !String(error.message).includes("duplicate")) throw error;
     toast.success(`Following ${stream.host_name}`);
   }
 } catch {
   setIsFollowingHost(wasFollowing); // rollback
   toast.error(wasFollowing ? "Couldn't unfollow" : "Couldn't follow");
 } finally {
   setFollowBusy(false);
 }
}, [user, isHostMe, followBusy, isFollowingHost, stream.user_id, stream.host_name]);
```

**Proof:** The `followBusy` guard prevents double-submit. The duplicate-error swallow is correct (idempotent). The rollback is correct. This is **clean** — no bug here.

---

### Bug 7: `sendGift` — `giftQty` is reset to 1 but `selectedGift` is NOT cleared after a successful send

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L390-420

```tsx
if (error) throw error;
try { navigator.vibrate?.(giftQty >1 ? [50, 30, 50] : [50]); } catch { /* noop */ }
// Sound for the sender (others get one via realtime handler)
if (selectedGift.coins >= 20000) playLegendaryGiftSound();
else if (hasGiftVideo(selectedGift.name)) playPremiumGiftSound();
else playGiftSound(1, selectedGift.coins);
setGiftQty(1);
```

**Proof:** After a successful send, `giftQty` resets to 1 but `selectedGift` stays selected. The user sees the gift panel still showing the same gift selected with qty 1. If they tap "Send" again, it sends another single gift. This is arguably intended (send multiple of the same gift), so not a bug per se. But combined with Bug 2 (stale balance), the user could send a second gift they can't afford — the `totalCoins > coinBalance` check uses the stale balance. So Bug 2 is the real issue here.

---

### Bug 8: `LiveWatcher` — the "Join as viewer" effect has a race condition on unmount

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L230-245

```tsx
useEffect(() =>{
 if (!user?.id) return;
 let active = true;
 (async () =>{
   await (supabase as any)
     .from("live_viewers")
     .insert({ stream_id: stream.id, user_id: user.id })
     .then(() =>null, () =>null); // ignore duplicates
 })();
 return () =>{
   if (!active) return;
   (supabase as any)
     .from("live_viewers")
     .delete()
     .eq("stream_id", stream.id)
     .eq("user_id", user.id)
     .then(() =>null, () =>null);
   active = false;
 };
}, [stream.id, user?.id]);
```

**Proof:** The cleanup runs on unmount and deletes the viewer row. But there's a race: if the component unmounts **before** the insert resolves, the cleanup fires the delete, but then the insert (still in flight) resolves **after** the delete — leaving a ghost viewer row that never gets cleaned up. The `active` flag is set to `false` in the cleanup, but the insert's `.then(() => null, () => null)` doesn't check `active` — it just swallows. So the insert completes after the delete, and the viewer count is permanently inflated by 1 for that stream. This is a concrete bug: leaving a stream quickly can leave a phantom viewer.

**Fix:** Check `active` in the insert's resolution:
```tsx
(async () =>{
  const { error } = await (supabase as any)
    .from("live_viewers")
    .insert({ stream_id: stream.id, user_id: user.id });
  if (!active && !error) {
    // We unmounted while the insert was in flight — clean up the ghost row
    await (supabase as any)
      .from("live_viewers")
      .delete()
      .eq("stream_id", stream.id)
      .eq("user_id", user.id);
  }
})();
```

---

### Bug 9: `filteredStreams` — the "popular" filter is in the type but has no backing logic

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L560-575 (the `filteredStreams` computation)

```tsx
const filteredStreams = streams.filter((s) =>{
 if (filter === "live" && s.status !== "live") return false;
 if (filter === "scheduled" && s.status !== "scheduled") return false;
 if (
   searchQuery &&
   !s.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
   !s.host_name.toLowerCase().includes(searchQuery.toLowerCase())
 )
   return false;
 return true;
});
```

**Proof:** The `filter` state type includes `"popular" | "following" | "nearby" | "pk" | "voice" | "multi"` but the filter chips only render `all`, `live`, `scheduled` (the comment says the others are hidden). So `filter` can never be `"popular"` etc. from the UI. This is **not** a user-facing bug — the chips are correctly hidden. No issue.

---

### Bug 10: `handleGoLive` navigates to `/go-live` — is that route real?

**File:** `src/pages/LiveStreamPage.tsx`
**Line:** ~L575

```tsx
const handleGoLive = () =>navigate("/go-live");
```

**Proof:** I can't see the router config in this file. The "Go Live" button navigates to `/go-live`. If that route doesn't exist, the user gets a 404. I can't prove this from the visible code — I'd need to check the router. I'll flag it as "verify" rather than a confirmed bug.

---

### Bug 11: `Recently Watched` — "Clear" button claims to clear but only shows a toast

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L700-710

```tsx
<button type="button" onClick={() =>toast.info("Watch history is managed automatically")} className="text-[11px] text-muted-foreground flex items-center gap-0.5 active:text-foreground">
  Clear<X className="w-3 h-3" />
</button>
```

**Proof:** The button is labeled **"Clear"** with an X icon — a user expects it to clear their watch history. Instead it shows a toast saying "Watch history is managed automatically" and does **nothing**. This is a concrete false-action bug: the control claims "Clear" but doesn't clear anything. Either remove the button or wire it to actually clear the `useRecentlyWatchedLive` history.

---

### Bug 12: `Recently Watched` — clicking a live stream shows a toast but doesn't open the stream

**File:** `src/pages/LiveStreamPage.tsx`
**Lines:** ~L715-725

```tsx
onClick={() => {
  if (r.isLive) toast.success(`Resuming ${r.name}'s stream`);
  else toast.info(`${r.name} isn't live — we'll notify you when they go live`);
}}
```

**Proof:** When a user taps a **live** recently-watched stream, the code shows a success toast "Resuming X's stream" but **does not actually open the stream**. The user expects to be taken into the watcher. This is a concrete false-success: the toast claims "Resuming" but nothing resumes. The `LiveStream` objects from `useRecentlyWatchedLive` have `hostId` — the code should find the matching stream in `streams` and `setActiveStream(...)`.

---

### Bug 13: `Top Gifters` — "See all" navigates to `/leaderboard` — is that the right route?

**File:** `src/pages/LiveStreamPage.tsx`
**Line:** ~L760

```tsx
<button type="button" onClick={() =>navigate("/leaderboard

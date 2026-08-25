# DeepSeek run — 2026-08-11T18:40:36.819Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/GoLivePage.tsx

---

## Audit of `src/pages/GoLivePage.tsx` (visible portion)

### Findings

**Bug 1 — `endActiveStream` paired-device path never updates UI state (L~700-710)**
```ts
if (isPaired && pairToken && !options?.keepalive) {
  await supabase.functions.invoke("pair-go-live", {
    body: { pair_token: pairToken, action: "end", stream_id: streamId },
  });
  return;  // ← returns without setting streamId=null or phase="ended"
}
```
The `endStream` callback calls `endActiveStream()` then does `setStreamId(null); setPhase("ended")` — so the UI does update. **However**, the `return` inside `endActiveStream` means the `keepalive` branch and the normal `.update()` branch are skipped, which is correct for paired mode. **Not a bug** — `endStream` handles the state reset after `endActiveStream` resolves. The `error` from `invoke` is also unhandled (no try/catch around it in this branch), so a failed end would silently leave the stream "live" in the DB while the UI shows "ended". **This is a real bug**: if the edge function fails, `endActiveStream` throws, `endStream`'s `await` rejects, and the subsequent `setStreamId(null); setPhase("ended")` never runs — the UI stays stuck on the live screen with a stream that's still marked live in the DB. The `catch` in `endActiveStream` only wraps the non-paired branches.

**Bug 2 — `endActiveStream` non-paired `.update()` has no error check (L~725-730)**
```ts
await (supabase as any)
  .from("live_streams")
  .update({ status: "ended", ended_at: endedAt })
  .eq("id", streamId)
  .eq("status", "live");
```
No `{ error }` destructure, no `.throwOnError()`. If the update fails (RLS, network), the stream stays "live" in the DB but the UI shows "ended" — a silent false-success. The `catch` block only catches thrown errors, and supabase-js `.update()` resolves with `{ error }` rather than throwing.

**Bug 3 — `endActiveStream` keepalive branch ignores fetch failure (L~710-725)**
```ts
await fetch(`${SUPABASE_URL}/rest/v1/live_streams?id=eq.${streamId}&status=eq.live`, {
  method: "PATCH",
  keepalive: true,
  ...
});
```
No `res.ok` check. A 4xx/5xx response resolves the fetch without throwing, so the stream stays live silently. This is the `keepalive` path (used on page unload), so the failure is somewhat expected, but the non-keepalive path (Bug 2) is the user-facing one.

**Bug 4 — `goLive` paired-device branch: `pair-go-live` invoke error not checked for `data.error` (L~480-490)**
```ts
const { data, error } = await supabase.functions.invoke("pair-go-live", {
  body: { pair_token: pairToken, action: "start", payload: { title: streamTitle, topic } },
});
if (error) throw error;
if ((data as any)?.error) throw new Error((data as any).error);
```
This one **is** checked correctly. Not a bug.

**Bug 5 — `restoreLiveStream` paired branch: `data.error` not checked (L~790-800)**
```ts
const { data, error } = await supabase.functions.invoke("pair-go-live", {
  body: { pair_token: pairToken, action: "heartbeat" },
});
if (cancelled || error) return;
restoreLiveStream((data as any)?.active_stream ?? null);
```
`error` is checked, but `(data as any)?.error` is not. If the edge function returns `{ error: "..." }` in the body (like the `start` branch checks), this silently returns without restoring — but that's a graceful degradation, not a false-success. **Minor, not a user-facing bug** (no success toast fired).

**Bug 6 — `endStream` doesn't clear `streamId` before `setPhase("ended")` if `endActiveStream` throws (L~735-745)**
```ts
const endStream = useCallback(async () =>{
  await endActiveStream();  // ← if this throws (Bug 1), the lines below never run
  streamRef.current?.getTracks().forEach((t) =>t.stop());
  setStreamId(null);
  setPhase("ended");
}, [endActiveStream]);
```
This is the consequence of Bug 1 — the UI stays stuck on the live screen.

**Bug 7 — `live_viewers` DELETE handler doesn't decrement on the paired/restore path (L~560-570)**
The `live_viewers` DELETE handler decrements `viewerCount`, but the `live_streams` UPDATE handler (L~590-600) sets `viewerCount` from `r.viewer_count`. If both fire for the same event, the count could double-adjust. However, the DELETE handler only fires on actual `live_viewers` row deletion, and the UPDATE handler only fires on `live_streams` row updates — these are different tables, so no double-count. **Not a bug.**

**Bug 8 — `goLive` countdown: `setPhase("countdown")` happens before the camera check passes (L~470-480)**
```ts
const hasLiveVideo = !!localStream
  && localStream.getVideoTracks().some((t) =>t.readyState === "live");
if (!hasLiveVideo) {
  toast.error("Camera not ready", ...);
  startCamera();
  return;
}
```
This check is **before** `setPhase("countdown")`, so the camera check happens first. **Not a bug.**

**Bug 9 — `goLive` insert: `user!.id` non-null assertion (L~495)**
```ts
const { data, error } = await (supabase as any)
  .from("live_streams")
  .insert({
    user_id: user!.id,
    ...
```
The guard at the top (`if (!user?.id && !isPaired)`) ensures `user.id` exists when not paired. **Not a bug.**

**Bug 10 — `live_comments` INSERT handler: `row.content` vs `row.text` (L~540-550)**
```ts
const row = payload.new;
...
text: row.content,
```
The table is `live_comments` — the column is likely `content` (matching the insert elsewhere in the codebase). **Cannot prove a bug** without seeing the schema. The chat insert elsewhere in the file (hidden portion) would confirm the column name. **Not reportable.**

**Bug 11 — `live_gift_displays` INSERT handler: `g.coins` and `g.gift_name` field names (L~575-590)**
```ts
setCoinsEarned((c) =>c + g.coins);
...
text: `sent ${g.gift_name}`,
```
Same — cannot prove field names wrong without schema. **Not reportable.**

**Bug 12 — `restoreLiveStream` sets `phase("live")` but doesn't restart the WebRTC publisher (L~780-790)**
The publisher effect depends on `[streamId, phase, localStream]`. When `restoreLiveStream` sets `streamId` and `phase("live")`, the effect re-runs and starts publishing. **Not a bug.**

**Bug 13 — `endActiveStream` keepalive branch: `SUPABASE_PUBLISHABLE_KEY` used as Bearer fallback (L~715-720)**
```ts
Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`,
```
Using the publishable key as a Bearer token is a security smell but works for anon access. **Not a user-facing bug.**

**Bug 14 — `goLive` countdown interval: `setPhase("countdown")` then `setCountdown(3)` then interval decrements (L~470-480)**
```ts
setPhase("countdown");
setCountdown(3);
let c = 3;
const iv = setInterval(async () =>{
  c -= 1;
  if (c<= 0) { ... }
  else { setCountdown(c); }
}, 1000);
```
First tick: `c` becomes 2, `setCountdown(2)`. Second tick: `c` becomes 1, `setCountdown(1)`. Third tick: `c` becomes 0, goes live. So the user sees 3 → 2 → 1 → live. **Correct.**

**Bug 15 — `endActiveStream` paired branch: no `try/catch` around `invoke` (L~700-710)**
```ts
if (isPaired && pairToken && !options?.keepalive) {
  await supabase.functions.invoke("pair-go-live", {
    body: { pair_token: pairToken, action: "end", stream_id: streamId },
  });
  return;
}
```
If `invoke` rejects (network error, edge function 500), the error propagates up to `endStream`'s `await endActiveStream()` which throws, and the UI never resets. This is the same as Bug 1 — the `try/catch` in `endActiveStream` only wraps the non-paired branches.

---

### Summary of provable bugs

| # | Line (approx) | Bug |
|---|---|---|
| 1 | ~700-710 | Paired `endActiveStream` branch: `invoke` error not caught → `endStream` throws → UI stuck on live screen, stream stays live in DB |
| 2 | ~725-730 | Non-paired `.update()` has no `{ error }` check → silent false-success (stream stays live in DB, UI shows ended) |
| 3 | ~710-725 | Keepalive `fetch` has no `res.ok` check → silent failure on page unload |

Bugs 1 and 2 are the user-facing ones. Bug 3 is minor (page-unload path).

---

### Proposed fix

**File:** `src/pages/GoLivePage.tsx`

**Before (L~700-730):**
```ts
const endActiveStream = useCallback(async (options?: { keepalive?: boolean }) =>{
  if (!streamId) return;

  const endedAt = new Date().toISOString();

  try {
    // Paired-device flow: end via edge function
    if (isPaired && pairToken && !options?.keepalive) {
      await supabase.functions.invoke("pair-go-live", {
        body: { pair_token: pairToken, action: "end", stream_id: streamId },
      });
      return;
    }

    if (options?.keepalive) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      await fetch(`${SUPABASE_URL}/rest/v1/live_streams?id=eq.${streamId}&status=eq.live`, {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ status: "ended", ended_at: endedAt }),
      });

      return;
    }

    await (supabase as any)
      .from("live_streams")
      .update({ status: "ended", ended_at: endedAt })
      .eq("id", streamId)
      .eq("status", "live");
  } catch (error) {
    console.warn("[GoLivePage] failed to end stream", error);
  }
}, [streamId, isPaired, pairToken]);
```

**After:**
```ts
const endActiveStream = useCallback(async (options?: { keepalive?: boolean }) =>{
  if (!streamId) return;

  const endedAt = new Date().toISOString();

  try {
    // Paired-device flow: end via edge function
    if (isPaired && pairToken && !options?.keepalive) {
      const { error } = await supabase.functions.invoke("pair-go-live", {
        body: { pair_token: pairToken, action: "end", stream_id: streamId },
      });
      if (error) throw error;
      return;
    }

    if (options?.keepalive) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/live_streams?id=eq.${streamId}&status=eq.live`, {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken ?? SUPABASE_PUBLISHABLE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ status: "ended", ended_at: endedAt }),
      });
      if (!res.ok) throw new Error(`Failed to end stream (${res.status})`);
      return;
    }

    const { error } = await (supabase as any)
      .from("live_streams")
      .update({ status: "ended", ended_at: endedAt })
      .eq("id", streamId)
      .eq("status", "live");
    if (error) throw error;
  } catch (error) {
    console.warn("[GoLivePage] failed to end stream", error);
    throw error;  // ← re-throw so endStream's UI reset is skipped on failure
  }
}, [streamId, isPaired, pairToken]);
```

**And update `endStream` to handle the failure gracefully:**
```ts
const endStream = useCallback(async () =>{
  try {
    await endActiveStream();
  } catch {
    toast.error("Failed to end stream", { description: "Please try again." });
    return;  // keep UI on live screen so the user can retry
  }
  streamRef.current?.getTracks().forEach((t) =>t.stop());
  setStreamId(null);
  setPhase("ended");
}, [endActiveStream]);
```

---

### Owner must verify

1. **`live_streams` RLS** — confirm the authenticated user can `UPDATE` their own rows (the `.eq("status", "live")` guard means a 0-row match returns `{ error: null }` — that's a silent no-op, not a false-success, but worth knowing).
2. **`pair-go-live` edge function** — confirm the `end` action returns `{ error }` in the body on failure (the `start` branch checks `data.error`, so the pattern exists).
3. **Run `npm run update`** — must pass (type-check + worker + tests + build) before this is considered done.
4. **Manual smoke** — go live, then tap End. Confirm the stream row flips to `ended` in the DB and the UI returns to setup. Then simulate a failure (e.g., block the network) and confirm the UI stays on the live screen with an error toast instead of falsely showing "ended".

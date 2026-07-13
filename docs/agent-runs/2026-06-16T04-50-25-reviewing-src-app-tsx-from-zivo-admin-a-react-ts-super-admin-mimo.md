# MiMo advisor — Reviewing src/App.tsx from ZIVO-ADMIN, a React+TS super-admin dashboard (single large file: domain control plane, connected-workflow handoffs, employees, time-clock/timesheet, audit, deployments, staff access, customers). Find CONCRETE, VERIFIABLE bugs only — defects a careful engineer confirms by reading: date/time math errors (minutesBetween, formatDuration, elapsedSince, isSameDay), localStorage parse/validation (loadTimesheet/saveTimesheet) producing NaN or corrupt state, summary reducers with wrong keys (summarizeConnectedHandoffs byStatus/byDomain), useEffect dependency/cleanup bugs (stale closures, missing cleanup, intervals not cleared, race conditions on async state set after unmount), event-handler state desync, or incorrect conditional logic. For each: exact symbol + line context, why it's a real bug (not style), and the minimal fix. Skip styling/nits. Rank P1>P2>P3.

Files: /Users/kimlain/Documents/GitHub/Zivo-Admin/src/App.tsx

[no final text — stop_reason=max_tokens; reasoning excerpt:]
Let me carefully analyze this large file for concrete, verifiable bugs. I'll focus on correctness issues, not style/nits.

Let me go through the specific areas mentioned:

1. **Date/time math errors** (minutesBetween, formatDuration, elapsedSince, isSameDay)
2. **localStorage parse/validation** (loadTimesheet/saveTimesheet)
3. **Summary reducers with wrong keys** (summarizeConnectedHandoffs)
4. **useEffect dependency/cleanup bugs** (stale closures, missing cleanup, intervals not cleared, race conditions)
5. **Event-handler state desync**
6. **Incorrect conditional logic**

Let me go through methodically:

### `minutesBetween` - looks correct: `(end - start) / 60000`, rounded, clamped to 0.

### `formatDuration` - looks correct for non-negative integers.

### `elapsedSince` - uses `minutesBetween` with `new Date().toISOString()`. Looks correct.

### `isSameDay` - compares year, month, date. Looks correct, but note it compares in local timezone since `new Date(iso)` parses to local time. This is actually fine for the use case (filtering today's sessions).

### `loadTimesheet` - Parses JSON, returns defaults on failure. Looks safe.

### `saveTimesheet` - Just JSON.stringify and localStorage.setItem. Looks safe.

### `summarizeConnectedHandoffs`:
```typescript
function summarizeConnectedHandoffs(handoffs: ConnectedHandoffRecord[]): ConnectedHandoffSummary {
  const byStatus: ConnectedHandoffSummary["byStatus"] = {
    created: 0,
    opened: 0,
    returned: 0,
    completed: 0,
    cancelled: 0,
  };
  const byDomain: ConnectedHandoffSummary["byDomain"] = {};

  for (const handoff of handoffs) {
    byStatus[handoff.status] += 1;
    byDomain[handoff.domain] = (byDomain[handoff.domain] || 0) + 1;
  }

  return {
    total: handoffs.length,
    byStatus,
    byDomain,
  };
}
```

This looks correct. It initializes all status keys to 0 and increments. The `byStatus[handoff.status] += 1` could silently create a key if `handoff.status` is an unexpected value, but that's a data integrity concern, not a code bug.

### useEffect dependency/cleanup bugs:

1. **Initial data load useEffect** (around line ~1070):
```typescript
useEffect(() => {
    let mounted = true;
    Promise.all([...]).then((...) => {
      if (!mounted) return;
      setSnapshot(nextSnapshot);
      // ... many setState calls
    });
    return () => { mounted = false; };
  }, []);
```
This looks fine - has `mounted` guard.

2. **Customer search useEffect**:
```typescript
useEffect(() => {
    let mounted = true;
    const handle = window.setTimeout(() => {
      searchCustomers(filter).then((nextCustomerSearch) => {
        if (mounted) setCustomerSearch(nextCustomerSearch);
      });
    }, 180);
    return () => { mounted = false; window.clearTimeout(handle); };
  }, [filter]);
```
Looks fine.

3. **Connected handoffs useEffect**:
```typescript
useEffect(() => {
    let mounted = true;
    loadConnectedHandoffs({...}).then((nextConnectedHandoffs) => {
      if (mounted) setConnectedHandoffs(nextConnectedHandoffs);
    });
    return () => { mounted = false; };
  }, [handoffDomainFilter, handoffLimit, handoffOffset, handoffSourceFilter, handoffStatusFilter]);
```
Looks fine.

4. **Deep link useEffect**:
```typescript
useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const target = HASH_NAV_TARGETS[hash];
    if (target) {
      setActiveNavTarget(target);
      window.setTimeout(() => scrollToSection(hash), 80);
    }
    const query = new URLSearchParams(window.location.search);
    const handoffId = query.get("handoff") || query.get("handoff_id");
    if (handoffId) {
      setReturnHandoffId(handoffId);
    }
  }, []);
```
Looks fine - one-time execution.

5. **Auto-advance handoff lifecycle**:
```typescript
useEffect(() => {
    if (!returnHandoffId || !connectedHandoffs) return;
    const id = returnHandoffId;
    const match = connectedHandoffs.handoffs.find((handoff) => handoff.id === id);
    setReturnHandoffId(null);
    if (match && match.status === "opened") {
      void handleHandoffStatusChange(id, "returned");
    } else {
      setActionNotice({ tone: "ok", message: `Opened from connected handoff ${id}.` });
    }
  }, [returnHandoffId, connectedHandoffs]);
```

This has a potential issue: `handleHandoffStatusChange` is defined in the component body and captures `handoffDomainFilter`, `handoffLimit`, `handoffOffset`, `handoffSourceFilter`, `handoffStatusFilter` via `refreshConnectedHandoffs`. But since it's called inline and those are state values at the time of the effect run, it should be fine. The function will read the current state values via closure. Actually wait - `handleHandoffStatusChange` calls `refreshConnectedHandoffs` which reads the current filter state values. These are captured at the time the function is defined (each render). Since the effect runs with the latest render's closure, this should be fine.

Actually, wait. There's a subtlety: `handleHandoffStatusChange` is defined in the component body and it captures state values at render time. The useEffect callback also captures state values at render time. Since both are defined in the same render cycle, they should be consistent. This looks fine.

But the `eslint-disable` comment suggests there may be a concern about missing dependencies. The effect depends on `returnHandoffId` and `connectedHandoffs`, but uses `handleHandoffStatusChange` which itself depends on filter state. If the filter changes between the initial render and when this effect fires, the `refreshConnectedHandoffs` inside `handleHandoffStatusChange` would use stale filter values. However, since `handleHandoffStatusChange` is recreated every render, and the effect fires when `returnHandoffId` or `connectedHandoffs` change, the latest version of `handleHandoffStatusChange` should be used. This is actually fine.

6. **Sidebar keyboard listener**:
```typescript
useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);
```
This is correct.

7. **Role restriction useEffect**:
```typescript
useEffect(() => {
    const allowed = roleNavAccess[signedInRole];
    if (allowed && !allowed.includes(activeNavTarget) && activeNavTarget !== "settings") {
      setActiveNavTarget(allowed[0]);
    }
  }, [signedInRole, activeNavTarget]);
```
**BUG**: This runs on every render where `signedInRole` or `activeNavTarget` changes. If `signedInRole` is in `roleNavAccess` and the user tries to navigate to "settings", the condition `activeNavTarget !== "settings"` prevents redirect. But if the user navigates to any other non-allowed target, this redirects them. However, the effect depends on `activeNavTarget`, meaning it fires whenever `activeNavTarget` changes. When `navigateToSection` sets `activeNavTarget` to a non-allowed target, this effect immediately redirects back. This could cause an infinite loop if the first allowed target is not in the allowed list somehow, but that shouldn't happen. Actually, this could cause a render loop: if `allowed[0]` itself is not a valid target... but `allowed[0]` is from `roleNavAccess` which are hardcoded valid targets. So this should be fine, though it's a bit of an odd pattern.

Wait, actually there IS a potential issue: `signedInRole` is derived from `signedInMatch?.role || getAdminRole() || "Super Admin"`. If `employees` hasn't loaded yet, `signedInRole` might be "Super Admin" initially, then change to "Support" once employees load. The effect would fire on the role change, and redirect correctly. This seems fine.

8. **Timesheet hydration useEffect**:
```typescript
useEffect(() => {
    let cancelled = false;
    loadClockState().then((state) => {
      if (!cancelled && state) {
        setTimesheet(saveTimesheet(state));
      }
    });
    return () => { cancelled = true; };
  }, []);
```
Looks fine.

9. **Chat polling in TeamChatPanel**:
```typescript
useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 4000);
    return () => window.clearInterval(timer);
  }, []);
```
The `refresh` function is defined inside the component but the effect only runs once (empty deps). The `refresh` function is recreated each render but the interval always calls the initial version. This means if `refresh` captures stale state... but `refresh` only calls `loadTeamChat()` which doesn't depend on any state, and then calls `setMessages` and `setError`. So this is fine.

10. **Support chat polling in LiveSupportPanel**:
```typescript
useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const snapshot = await loadSupportChats();
      if (!cancelled) setChats(snapshot);
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
```
Fine.

```typescript
useEffect(() => {
    activeChatIdRef.current = activeChat?.id ?? null;
    if (!activeChat) {
      setThread([]);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      try {
        const messages = await loadSupportChatMessages(activeChat.id);
        if (!cancelled && activeChatIdRef.current === activeChat.id) {
          setThread(messages);
          setChatError(null);
        }
      } catch {
        if (!cancelled) setChatError("Couldn't load this conversation.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeChat?.id]);
```
Wait, there's a subtle issue here. When `activeChat` changes, the effect cleans up the old interval and creates a new one. But the `refresh` closure captures `activeChat` from the current render. If the effect fires due to `activeChat?.id` changing, the old interval is cleared and a new one is created with the correct `activeChat`. This looks correct.

But wait - the `refresh` function inside this effect references `activeChat` (not `activeChat?.id`), but the dependency is `activeChat?.id`. If the same ID's object reference changes but the ID stays the same, the effect won't re-run, but the old `refresh` still references the old object. The old object's `id` would still be the same, so `loadSupportChatMessages(activeChat.id)` would still use the correct ID. And the double-check `activeChatIdRef.current === activeChat.id` handles the race. This is fine.

11. **useTeamCall poll useEffect**:
```typescript
useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (startingRef.current) return;
      const current = await loadCurrentCall();
      if (cancelled || startingRef.current) return;
      // ... complex logic
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 1800);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [myEmail]);
```
This looks correct. The cleanup sets `cancelled` and clears the interval.

12. **Video attachment useEffect** in useTeamCall:
```typescript
useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [phase, hasRemote]);
```
This reattaches streams when phase or hasRemote changes. Looks correct.

13. **Elapsed timer useEffect** in useTeamCall:
```typescript
useEffect(() => {
    if (phase !== "active") return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);
```
Looks correct.

14. **Teardown on unmount** in useTeamCall:
```typescript
useEffect(() => () => teardown(), []);
```
This captures the initial `teardown` function. But `teardown` is defined inside the component and uses refs, not state, so it should always reference the current refs. Actually, `teardown` also calls `setHasRemote`, `setMuted`, `setCameraOff`, `setElapsed` which are state setters - these are stable across renders. And it uses `pcRef`, `localStreamRef`, `remoteStreamRef`, `callIdRef`, `remoteDescSetRef`, `appliedCandidatesRef`, `pendingCandidatesRef` which are refs - also stable. So this is fine.

15. **DM partner disappears useEffect** in TeamChatPanel:
```typescript
useEffect(() => {
    if (activeChat !== "team" && employees.length > 0 && !activeMate) {
      setActiveChat("team");
    }
  }, [activeChat, activeMate, employees.length]);
```
Wait, `activeMate` depends on `employees` and `activeChat`. The dependency includes `activeMate` which changes whenever `employees` or `activeChat` changes. This seems fine, though the dependency array includes a derived value. The guard `employees.length > 0` prevents the redirect when employees haven't loaded yet. This looks correct.

16. **scroll-to-bottom useEffect** in TeamChatPanel:
```typescript
useEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [visibleMessages.length, activeChat]);
```
Fine.

Now let me look for actual bugs more carefully:

### Potential Bug 1: `handleHandoffStatusChange` uses `refreshConnectedHandoffs` which reads filter state

`refreshConnectedHandoffs` is:
```typescript
async function refreshConnectedHandoffs() {
    const nextConnectedHandoffs = await loadConnectedHandoffs({
      domain: handoffDomainFilter,
      limit: handoffLimit,
      offset: handoffOffset,
      source: handoffSourceFilter,
      status: handoffStatusFilter,
    });
    setConnectedHandoffs(nextConnectedHandoffs);
  }
```

This captures the current render's filter values. When called from `handleHandoffStatusChange` or `handleCreateHandoff`, it uses whatever the filter state is at that render. This is fine because React state is consistent within a single render.

### Potential Bug 2: `teardown` in `useTeamCall` - setting state after unmount

The `teardown` function calls `setHasRemote(false)`, `setMuted(false)`, `setCameraOff(false)`, `setElapsed(0)`. The cleanup effect `useEffect(() => () => teardown(), [])` runs on unmount. Calling `setState` after unmount is harmless in React 18+ (it's a no-op), but was a warning in React 17. Not really a bug.

However, `teardown` can also be called from `hangUp`, `declineIncoming`, and error paths. If the component is still mounted, this is fine. But what if `hangUp` is called right before unmount? The async operations might try to set state after unmount. This is a minor concern in React 18.

### Potential Bug 3: `new URL(handoff.returnTo)` in `ConnectedHandoffRow`

```typescript
<a href={handoff.returnTo} target="_blank" rel="noreferrer">{new URL(handoff.returnTo).pathname}</a>
```

If `handoff.returnTo` is an invalid URL or empty/null, `new URL(handoff.returnTo)` will throw. This would crash the entire component render. This is a real bug - if the API returns a handoff with an empty or malformed `returnTo`, the UI crashes.

**This is a P1 bug.**

### Potential Bug 4: Missing dependency in `useEffect` for role navigation

```typescript
useEffect(() => {
    const allowed = roleNavAccess[signedInRole];
    if (allowed && !allowed.includes(activeNavTarget) && activeNavTarget !== "settings") {
      setActiveNavTarget(allowed[0]);
    }
  }, [signedInRole, activeNavTarget]);
```

This effect depends on `signedInRole` and `activeNavTarget`. If `signedInRole` is "Support" and `activeNavTarget` is "domains" (not allowed), this redirects to `allowed[0]` which is "live-support". Then `activeNavTarget` changes to "live-support", which triggers the effect again. `allowed.includes("live-support")` is true, so no further redirect. No infinite loop.

But wait - there's a more subtle issue. What if `allowed` is undefined for a role not in `roleNavAccess`? Then `allowed` is undefined and the condition `if (allowed && ...)` is false. Fine.

What if `allowed[0]` is undefined (empty array)? Then `setActiveNavTarget(undefined)` would be called, which would make `activeNavTarget` undefined, and the effect would re-run... `allowed && !allowed.includes(undefined) && undefined !== "settings"` → `true && true && true` → redirect to undefined again → infinite loop. But this can't happen because `roleNavAccess` is hardcoded with non-empty arrays.

Hmm, but there's another subtle issue: if `signedInRole` changes from "Support" to "Super Admin" (because employees loaded), `allowedNavTargets` goes from `["live-support", "team-chat"]` to `null`. The effect would have `allowed = roleNavAccess["Super Admin"]` which is `undefined`. So `if (undefined && ...)` → false. No redirect. But the previous redirect to "live-support" already happened. The user is now on "live-support" with full access. Not ideal but not a bug per se.

Actually wait, I realize there's a subtle issue with `signedInRole`. It's:
```typescript
const signedInMatch = employees.find((employee) => employee.email.toLowerCase() === (signedInEmail ?? "").toLowerCase());
const signedInName = signedInMatch?.name || getAdminName() || deriveAccountName(signedInEmail);
const signedInRole = signedInMatch?.role || getAdminRole() || "Super Admin";
```

Initially, `employees` is `[]`, so `signedInMatch` is undefined, so `signedInRole` is `getAdminRole() || "Super Admin"`. If `getAdminRole()` returns "Support", then initially `signedInRole` is "Support" and the role restriction kicks in. When employees load, `signedInMatch` might change the role. But if `getAdminRole()` already returns "Support", and the employee record also says "Support", then there's no change. This seems fine.

### Potential Bug 5: Race condition in handoff auto-advance

```typescript
useEffect(() => {
    if (!returnHandoffId || !connectedHandoffs) return;
    const id = returnHandoffId;
    const match = connectedHandoffs.handoffs.find((handoff) => handoff.id === id);
    setReturnHandoffId(null);
    if (match && match.status === "opened") {
      void handleHandoffStatusChange(id, "returned");
    } else {
      setActionNotice({ tone: "ok", message: `Opened from connected handoff ${id}.` });
    }
  }, [returnHandoffId, connectedHandoffs]);
```

Issue: `connectedHandoffs` is initially loaded with `limit: initialHandoffLimit` (10). If the target handoff is not in the first 10 results (e.g., it's on page 2), `match` would be undefined. The handoff would NOT get auto-advanced from "opened" to "returned". Instead, a misleading success notice would show. This is a **real bug** - the handoff may not be found in the paginated results.

**P2 bug**: The handoff auto-advance only works if the target handoff happens to be in the initial page of results. If the handoff is outside the first page, it silently fails to advance.

### Potential Bug 6: `selected` state initialization with fallback domains

```typescript
const domains = snapshot?.domains ?? fallbackDomains;
const [selected, setSelected] = useState(domains[0]);
```

`selected` is initialized once with the first render's `domains[0]` (which would be `fallbackDomains[0]`). Later, in the data load effect:
```typescript
setSelected((current) => nextSnapshot.domains.find((domain) => domain.domain === current.domain) ?? nextSnapshot.domains[0]);
```
This correctly updates `selected` when the snapshot loads. But during the initial render, `selected` is `fallbackDomains[0]`, which is fine for display.

But there's a subtle issue: if `fallbackDomains` is empty, `domains[0]` is `undefined`, and `selected` would be `undefined`. All references to `selected.domain`, `selected.health`, etc. would throw. But this seems unlikely given it's a fallback.

### Potential Bug 7: `summaryReducers` wrong keys - let me check `summarizeConnectedHandoffs` again

```typescript
const byStatus: ConnectedHandoffSummary["byStatus"] = {
    created: 0,
    opened: 0,
    returned: 0,
    completed: 0,
    cancelled: 0,
  };
```

This initializes exactly the 5 expected status values. If a handoff has an unexpected status (e.g., "pending"), `byStatus[handoff.status] += 1` would add a new key to the object. This wouldn't crash, but the summary would have an extra key not displayed in the UI. This is a data validation concern but not a crash bug.

### Potential Bug 8: `ConnectedHandoffsPanel` uses `handoffs?.summary?.byStatus` directly

```typescript
const statusCounts = handoffs?.summary?.byStatus ?? summarizeConnectedHandoffs(handoffs?.handoffs ?? []).byStatus;
```

If `handoffs.summary` exists but `handoffs.summary.byStatus` is missing/undefined, `statusCounts` would be the result of `summarizeConnectedHandoffs`. This fallback seems intentional and correct.

### Potential Bug 9: `useTeamCall` - `phaseRef.current` assignment

```typescript
phaseRef.current = phase;
sessionRef.current = session;
```

These are at the top of the hook body, outside any callback. They run on every render, keeping the refs in sync with state. This is the correct pattern for making state available in stable callbacks (like the poll interval). Fine.

### Potential Bug 10: Poll loop stale `tick` function in `useTeamCall`

The poll useEffect:
```typescript
useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (startingRef.current) return;
      const current = await loadCurrentCall();
      if (cancelled || startingRef.current) return;
      const phaseNow = phaseRef.current;
      const myCallId = callIdRef.current;
      // ...
    }
    void tick();
    const timer = window.setInterval(() => void tick(), 1800);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [myEmail]);
```

The `tick` function is defined inside the effect and captures `cancelled` from the closure. All other values it reads are from refs (`phaseRef`, `sessionRef`, `callIdRef`, `startingRef`), which are always current. `cancelled` is also local to the effect closure and correctly scoped. The `setPhase` and `setSession` calls are state setters, which are stable. This looks correct.

### Potential Bug 11: Error handling in `getMedia` timeout race

```typescript
const stream = await Promise.race([
    navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" }),
    new Promise<null>((resolve) => window.setTimeout(() => { timedOut = true; resolve(null); }, 4000)),
]);
```

If `getUserMedia` resolves after the timeout, the stream's tracks won't be stopped (the timeout sets `timedOut = true` and resolves with `null`, so `stream` is `null`, and the code returns `unavailable()`). But the actual `getUserMedia` promise is still pending and will eventually resolve with a MediaStream whose tracks are never stopped.

Actually wait, let me re-read:
```typescript
let timedOut = false;
const stream = await Promise.race([
    navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" }),
    new Promise<null>((resolve) => window.setTimeout(() => { timedOut = true; resolve(null); }, 4000)),
]);
if (!stream) {
    return unavailable();
}
if (timedOut) {
    stream.getTracks().forEach((track) => track.stop());
    return unavailable();
}
```

When the timeout wins the race: `timedOut = true`, `stream = null` (the resolve value of the timeout promise). Then `if (!stream)` is true, so we return `unavailable()` immediately. The `if (timedOut)` check is never reached. But the underlying `getUserMedia` may eventually resolve with a real stream. That stream's tracks are never stopped, so the camera/mic indicator stays on.

**This is a P1 bug**: When getUserMedia is slow (>4s), the timeout resolves first with `null`, and the actual MediaStream from getUserMedia (when it eventually arrives) leaks its tracks. The camera/mic light stays on indefinitely.

Fix: capture the getUserMedia promise and stop its tracks in the timeout case:
```typescript
const mediaPromise = navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
const stream = await Promise.race([
    mediaPromise,
    new Promise<null>((resolve) => window.setTimeout(() => { timedOut = true; resolve(null); }, 4000)),
]);
if (!stream) {
    // Stop leaked tracks if getUserMedia resolves later
    mediaPromise.then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
    return unavailable();
}
```

### Potential Bug 12: `refreshEmployees` is not stable across renders

```typescript
async function refreshEmployees() {
    try {
      setEmployees(await loadEmployees());
      setEmployeesError(null);
    } catch {
      setEmployeesError("Can't reach the admin API...");
    }
  }
```

And it's used in a `useEffect`:
```typescript
useEffect(()

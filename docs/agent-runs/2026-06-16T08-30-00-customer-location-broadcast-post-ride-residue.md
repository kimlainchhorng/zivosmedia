# zivosmedia pass 3 — customer live-location row lingers after the ride ends

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Class:** Effect-cleanup scoping — a privacy-sensitive "delete my live data" cleanup is
attached to the wrong effect, so it fires on unmount but NOT when the broadcast actually
stops (ride ends while the screen stays mounted). Distinct from pass-2's untrusted-redirect
work.
**Status:** Done. Gate green: `npm run type-check` (tsc exit 0) + `npm run build` (exit 0).
One file changed.
**Advisors:** DeepSeek (MCP) confirmed the bug is real, walked all four lifecycle
transitions (ride-end / trip A→B / logout / unmount) to confirm the fix still covers every
case the removed effect covered plus the new one, and found no regression (the only timing
gap is a sub-second delete/re-create window on a back-to-back trip change, negligible).
Reachability was verified by reading both consumers; manual file verification was the
primary basis.

## Baseline
`npm run type-check` = exit 0 and `npm run build` = exit 0 before any change. zivosmedia has
very heavy concurrent peer-agent activity this pass (car-rental, autorepair, lib redirect/SSO,
checkout, chat, notifications, push clusters all modified in `git status`) — deliberately
avoided every peer-modified file and picked a finding in an untouched hook.

## Scan — verified clean, NOT churned
Audited the realtime/timer hooks not under peer edit:
- `useChatPresence.ts` — channel pooling, `removeChannel`, interval cleanup all correct (minor:
  `typingTimeout` / a 2s `leave` `setTimeout` aren't cleared on unmount, but they fire at most
  once into a removed channel — harmless; not worth churn).
- `useNearbyPresence.ts` — `cancelled` guard, `clearInterval`, `is_visible:false` on exit. Clean.
- `useCoinBalance.ts`, `useReactions.ts` — realtime subscribe/`removeChannel`, optimistic paths
  reconcile via refetch. Clean.

## Finding — `useCustomerLocationBroadcast` deletes the location row only on unmount
`src/hooks/useCustomerLocationBroadcast.ts` broadcasts the customer's live GPS into
`customer_locations` (one row per user, `onConflict: user_id`) "while a ride is active." It had
two effects:
- **Effect 1** (broadcaster) — gated on `enabled && user?.id && tripId`; `watchPosition` +
  interval upsert; cleanup cleared the watch/interval. It early-returns (no cleanup) when
  broadcasting is disabled, so a cleanup exists **only when a broadcast was actually running**.
- **Effect 2** — deleted the row, but keyed on `[user?.id]`, so it ran **only on unmount or
  user change**.

When a ride ends, the consumer flips `enabled`→false / `tripId`→null **while staying mounted**.
Confirmed at both call sites:
- `src/pages/app/RideTrackingPage.tsx:31-35` — `isRideActive` excludes `completed`/`cancelled`,
  and the page explicitly renders those terminal statuses (its `statusToEvent` map handles
  `trip_completed`/`trip_cancelled`), i.e. it stays mounted after the ride.
- `src/components/rides/RideBookingHome.tsx:1002-1006` — `isRideLive` flips false on terminal
  `viewStep` while the booking home stays mounted.

So Effect 1's cleanup stops the broadcast, but Effect 2 never fires (same user, still mounted)
→ the customer's **last GPS position persists in `customer_locations` after the ride is over**,
defeating the hook's own "only while active" contract. (Exposure is bounded by RLS, but the
intent is clearly to not retain live location post-ride — the unmount delete proves that intent;
it's simply scoped too narrowly.)

## Fix (minimal — net −6 lines)
Fold the delete into **Effect 1's cleanup** (which exists exactly when an active broadcast tears
down: ride-end, trip change, logout, or unmount) and remove Effect 2:
```ts
return () => {
  if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
  if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  // Stop exposing our last position the moment broadcasting stops — ride ended, trip
  // changed, logout, or unmount — not only on unmount. Row is keyed by user_id.
  if (user?.id) { void supabase.from("customer_locations").delete().eq("user_id", user.id); }
};
```
Transition coverage (DeepSeek-confirmed): ride-end (enabled true→false) → cleanup deletes ✅;
trip A→B → cleanup deletes A then re-broadcasts B ✅; logout (user→undefined) → cleanup of the
prior active effect deletes ✅; unmount-while-active → cleanup deletes ✅. Strictly a superset of
the old Effect 2 behavior. The upsert is unchanged.

## Files changed
- `src/hooks/useCustomerLocationBroadcast.ts` — delete the live-location row when broadcasting
  stops (ride end/trip change/logout/unmount), not only on unmount (+6/-12).

## Verification
- `npm run type-check` = tsc exit 0.
- `npm run build` = exit 0.
- `git diff --name-only` (minus the known peer-agent set) shows `useCustomerLocationBroadcast.ts`
  as the only file I changed. The large car-rental / autorepair / lib / chat / push cluster of
  modified files is concurrent peer-agent work — not touched here.

## Notes
- No commit/push/deploy (owner deploys). Local change only.

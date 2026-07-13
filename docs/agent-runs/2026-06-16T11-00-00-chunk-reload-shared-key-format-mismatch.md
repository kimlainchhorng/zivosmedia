# zivosmedia pass 4 — shared chunk-reload key has two incompatible value formats (double-reload on broken deploy)

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Class:** Cross-file broken-contract / dead-wiring — three modules share one `sessionStorage`
key (`zivo_chunk_reload`) whose documented purpose is to guarantee the app hard-reloads **at
most once** for a stale-deploy chunk failure, but they write that key in two incompatible
formats, so the shared guard silently fails in one direction. Distinct from this pass's other
findings (stale-closure in ZIVO-CHAT, listener-leak in zivodriver, input-clamp in zivostravel,
void-invoice receivables in zivosoftware, CSV formula-injection in Zivo-Admin) and from pass-2
(untrusted-redirect/host-validation) and pass-3 (effect-cleanup scoping / Promise.all atomicity).
**Status:** Done. Gate green: `npm run type-check` (tsc --noEmit, no errors) + `npm run build`
(exit 0). Two files changed (`src/lib/lazyRetry.ts`, `src/components/shared/ErrorBoundary.tsx`).
**Advisors:** DeepSeek (MCP, deepseek-reasoner) independently confirmed (1) the double-reload is
real and correctly diagnosed (`Number("1")` = epoch+1ms is always >30s in the past, so the
timestamp reader re-reloads), (2) unifying the two `"1"` writers onto `String(Date.now())` is the
correct minimal fix and preserves their own presence-check semantics (any timestamp string is
truthy, so they still reload at most once until the key is cleared on success), and (3) no missed
edge case — same-tab clock is consistent, the 30s re-arm window is preserved, the timestamp
persists across the reload, and all three clear the key on a successful import. Manual verification
against the three actual call sites was the primary basis.

## Baseline
`npm run type-check` = exit 0 (no errors) before any change. zivosmedia has heavy concurrent
peer-agent activity this pass (52 source files modified by peers — the car-rental hooks/components
cluster, authRedirect/crossDomainSSO/nativeDeepLinks/urlSafety/softwareCheckout lib cluster, plus
untracked escapeHtml.ts and many docs/agent-runs). Deliberately avoided every peer-touched file;
all three chunk-reload consumers are non-peer and were clean before this change.

## Scan — verified clean / deliberately NOT churned
Read a wide swath of the non-peer lib/util/hook/service surface; uniformly polished, left alone:
- `currency.ts`, `cafe-currency.ts`, `tierFormat.ts`, `flightPricing.ts` — money/format helpers.
- `khqr.ts` — KHQR/EMVCo dynamic QR builder; CRC16-CCITT, TLV encode/parse, canonical-order
  reassembly that preserves custom merchant tags, numeric-key reorder guard. Carefully correct.
- `performanceCsvExport.ts` — already neutralizes CSV formula injection (`FORMULA_TRIGGERS` +
  `NUMERIC_LITERAL` apostrophe prefix before RFC-4180 quoting). Correct.
- `storeStatus.ts` — timezone-aware open/closed with overnight wrap + JSON weekly schedule.
- `flightLegGrouping.ts` — layover/duration math; the `segs.slice(1).reduce((t,s,i)=>…segs[i]…)`
  index alignment is correct. `laborGuide.ts` — flat-rate multipliers, capped, rounded. Correct.
- `chatRealtimePool.ts` / group variant — ref-counted Supabase channel pool; release-timer
  cleared on re-subscribe, channel removed only when listener count hits 0. Correct.
- Hooks: `useChatPresence`, `useNearbyPresence`, `useLiveActivityCount`, `useGeofenceNotifications`,
  `useFlightStatus` (mock), `useSpeakerDetection` — intervals/channels paired with teardown.
- `feedQueryTelemetry.ts`, `mediaPermissions.ts`, `softwareMediaConnect.ts`, `geocodeCache.ts`,
  `storiesCache.ts`, `voiceUpload.ts`, `geohash.ts`, `zivoSessions.ts` — clean.

## Finding — `lazyRetry` + `ErrorBoundary` write a `"1"` sentinel that `lazyWithRetry` reads as a timestamp
All three modules guard a one-time auto-reload behind the same key and their doc-comments call it
SHARED specifically so the app "never reload[s] twice in a row for the same broken deploy":

- `src/lib/lazyRetry.ts` — writes `"1"`, reads with a **presence** check (`!getItem`).
- `src/components/shared/ErrorBoundary.tsx` — writes `"1"`, reads with a **presence** check.
- `src/lib/lazyWithRetry.ts` — writes `String(Date.now())`, reads as a **number** with a 30s
  re-arm window:
  ```js
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
  if (Date.now() - last > 30_000) { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); window.location.reload(); }
  ```

The contract breaks in one direction. When `lazyRetry` or `ErrorBoundary` reloads first, it stores
the string `"1"`. After the reload, if a `lazyWithRetry`-wrapped chunk also fails on the same
broken deploy, its reader computes `last = Number("1") = 1` (≈1 ms after the 1970 epoch), so
`Date.now() - last` (~1.7e12 ms) is always ≫ 30000 → `lazyWithRetry` **reloads a second time**,
which the shared key was explicitly meant to prevent. (The reverse direction is already fine: if
`lazyWithRetry` reloads first it stores a real timestamp, and the two presence-check readers then
correctly suppress their own reload.) Net effect: a user on a genuinely stale deploy can be
hard-reloaded twice instead of once — extra flash/jank and a wasted round-trip on exactly the slow,
broken-network path the guard exists to soften.

## Fix (minimal, additive — 2 writers, net +6/-2 plus comments)
Unify the two `"1"` writers onto the timestamp format the shared reader already expects:
```js
// lazyRetry.ts and ErrorBoundary.tsx
sessionStorage.setItem(RELOAD_KEY, String(Date.now())); // was "1"
```
Both writers read with a presence check and any timestamp string is truthy, so their own
"reload at most once until cleared on success" behavior is unchanged. `lazyWithRetry` now sees a
real, recent timestamp after their reload and (within its 30s window) suppresses the duplicate
reload — restoring the documented single-reload guarantee. `lazyWithRetry` already wrote a
timestamp, so this makes all three consumers agree on one format. Added a one-line comment at each
site explaining why a sentinel must not be used (the non-obvious cross-module reader contract).

## Files changed
- `src/lib/lazyRetry.ts` — store `String(Date.now())` instead of `"1"` on the shared
  `zivo_chunk_reload` key so `lazyWithRetry`'s timestamp reader recognizes the reload (+4/-1).
- `src/components/shared/ErrorBoundary.tsx` — same change at the ErrorBoundary chunk-error
  auto-reload site (+4/-1).

## Verification
- `npm run type-check` = tsc --noEmit, no errors.
- `npm run build` = exit 0 (PWA injectManifest, 18 precache entries).
- `git status --short` shows only `src/lib/lazyRetry.ts` and
  `src/components/shared/ErrorBoundary.tsx` as my changes; the 52-file car-rental / auth-redirect /
  softwareCheckout / escapeHtml peer cluster is concurrent peer-agent work — not touched here.

## Notes
- No commit/push/deploy (owner deploys). Local change only.
- `lazyWithRetry.ts` was left unchanged — it is the canonical timestamp writer/reader; the bug was
  the two sentinel writers diverging from it, not its own logic.

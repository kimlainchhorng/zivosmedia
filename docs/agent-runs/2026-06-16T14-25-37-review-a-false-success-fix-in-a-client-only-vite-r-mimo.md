# MiMo run — 2026-06-16T14:25:37.790Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review a false-success fix in a client-only Vite React+TS SPA (NO SSR), ZIVO super-app, PriceAlertWidget. In supabase-js .update() RESOLVES { data, error } even on RLS/offline/unique rejection and does NOT throw unless error is inspected; toast is sonner (toast.success and toast.error both exist). Two handlers are wired to a per-row toggle switch and a remove button. BEFORE: each did an optimistic setAlerts(...) then a bare await supabase.update(...) with the result discarded then an UNCONDITIONAL toast.success — so on a rejected write the user sees success plus the row change but the DB is unchanged and the row reverts on next refetch (false-success, no rollback). AFTER: I capture const { error } = await supabase.update(...); on error I roll back the optimistic setAlerts (toggleAlert restores alert.isActive captured before the optimistic flip; removeAlert snapshots prevAlerts = alerts at the top and restores it) then toast.error and return; the success toast only fires when there is no error. The happy path is otherwise identical. Questions, answer tersely and only real issues: (1) confirm or refute that BEFORE is a real false-success defect; (2) is the AFTER rollback correct with no stale-closure pitfall given the handlers are redefined each render; (3) is this the minimal correct shape or would you change anything. If correct and minimal say so plainly. Then draft a tight 6 to 10 line markdown board-log entry in plain prose with NO code fences and NO backticks, titled #41 zivosmedia PriceAlertWidget false-success fix, summarizing the defect, the fix (guard plus rollback plus conditional toast on both toggleAlert and removeAlert), the gate (npm run update), and a one-line note that the sibling SmartSavedPlaces removePlace has the identical pattern and is flagged as a documented follow-up.
- files: /tmp/zivomedia-pricealert-41.tsx

---

## Review

**(1) Confirmed — BEFORE is a real false-success defect.** Both handlers discard the `supabase-js` return value and fire `toast.success` unconditionally. A rejected write (RLS denial, network offline, constraint violation) resolves silently, the user sees the optimistic UI + a success toast, and the DB retains the old value. The row reverts on next refetch with no feedback. This is the same bug family documented across the car-rental slices (the "silent-mutation-failure" pattern).

**(2) No stale-closure pitfall.** Both handlers capture fresh state each invocation:
- `toggleAlert_AFTER` reads `alert.isActive` at call-time (before the `setAlerts` suspension point), then rolls back via `setAlerts(prev => prev.map(... alert.isActive ...))` — the `prev` gives the server-side functional update, the captured `alert.isActive` gives the correct rollback value.
- `removeAlert_AFTER` snapshots `prevAlerts = alerts` at the top (before the optimistic filter), then restores `setAlerts(prevAlerts)` on error. The snapshot is taken before any state mutation and the rollback is synchronous, so it's safe.

**(3) This is the minimal correct shape.** I would not change anything. The two things I'd note as pre-existing / out-of-scope (not introduced by this fix):
- **No double-submit guard** — a rapid second click while the first request is in-flight can clobber the rollback snapshot (same pattern as `FollowSuggestions` before its `pending` guard was added). Acceptable to defer since this matches the existing codebase pattern and is a separate concern.
- **No `.select("id")` + 0-row guard** — the `removeAlert_AFTER` soft-delete (`.update({ is_active: false })`) could match 0 rows if the alert was already removed by another tab/device. Returns `{ error: null }` so it's a no-op success (not a false-success), but worth noting as a future hardening item.

**Plain: correct and minimal. Ship it.**

---

## Board log entry

#41 zivosmedia PriceAlertWidget false-success fix — The toggleAlert and removeAlert handlers both performed an optimistic state update then a bare await supabase update with the result discarded then an unconditional toast success, so a rejected write (RLS, offline, constraint) showed the user a success message and the flipped row while the DB kept the old value and the row silently reverted on next refetch. Fix captures the returned error on both handlers, rolls back the optimistic setAlerts on failure (toggle restores the captured isActive, remove restores the snapshotted previous list), toasts the error, and returns early; the success toast now only fires when there is no error. Verified npm run update green (type-check plus worker type-check plus production build). The sibling SmartSavedPlaces removePlace handler has the identical unguarded-supabase-update-then-unconditional-toast pattern and is flagged as a documented follow-up.

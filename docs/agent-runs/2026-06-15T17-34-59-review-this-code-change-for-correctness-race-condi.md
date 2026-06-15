# DeepSeek run — 2026-06-15T17:34:59.010Z

- model: deepseek-chat
- task: Review this code change for correctness, race conditions, and error handling. It wires an inline post-order Cancel button to the real cancel+refund edge function. Be concise; flag only real bugs with severity.
- files: docs/agent-runs/_review-brief-eats-inline-cancel.md

---

## Review

**Verdict: Correct and safe.** No bugs, race conditions, or error-handling gaps. The change faithfully mirrors the proven `EatsTrackingPage` pattern with one minor improvement (the `cancellingOrder` guard prevents double-fire).

### Observations (all low-severity / non-blocking)

1. **Race: realtime `cancelled` vs. optimistic `setTrackedOrderId(null)`** — The review brief acknowledges this: the explicit `null` gives immediate UI feedback; the realtime subscription is a backstop. If the edge function fails *after* the realtime event fires but *before* the `try` block reaches `setTrackedOrderId(null)`, the `finally` block resets `cancellingOrder` and the overlay stays open (correct). If the realtime event fires *after* the explicit `null`, the subscription's `setTrackedOrderId(null)` is a no-op (harmless). **No race bug.**

2. **`cancelCountdown` still ticks during cancellation** — The button text switches to "Cancelling…" so the countdown number is hidden. The countdown interval continues running but has no visible effect. If the edge function takes >60s (unlikely — it's synchronous DB writes), the button would disappear mid-flight. **Low severity:** the `finally` block still resets `cancellingOrder`, and the overlay stays open (the subscription would close it on realtime). If you want to be defensive, clear the interval on cancel start, but not required.

3. **`Loader2` import** — Confirmed already imported in the file (per brief). No type error.

4. **`disabled` on the button** — Prevents double-click. The `cancellingOrder` guard in the handler is belt-and-suspenders. Correct.

5. **Error surface** — The `catch` block shows `e?.message || "Cancellation failed"`. The edge function returns HTTP 409 with `{ error: "already_inactive", current_status }` for terminal orders. The `catch` will surface `"already_inactive"` — informative enough. Could add the `current_status` to the toast description, but the existing pattern in `EatsTrackingPage` doesn't either. **Fine as-is.**

6. **`refund_cents > 0` guard** — Matches the reference. If `refund_cents` is `null` or `undefined` (edge case: malformed response), the `>` comparison coerces to `false`, falling through to the simple toast. Correct.

### Summary

**No changes needed.** The diff is ready to apply. The owner should verify:
- `npm run update` passes (type-check + build).
- The `cancel-eats-order` edge function is deployed and has the same contract as the reference.
- No end-to-end payment/cancel test is run (live Stripe key).

# MiMo advisor — Workflow-correctness review of a car-rental merchant RETURN/CHECK-IN flow (admin). Focus on mutation correctness + financial safety + operator feedback, not styling. Unlike the sibling checkout section, this one uses LOCAL state + a direct supabase.from('car_rental_reservations').update(...) (NOT a shared hook). The flow is CarRentalReturnsSection's onProcess: it sets saving=true, awaits the DB update to status='returned' with dropoff odo/fuel/damage/fees/total, and on err does { setSaving(false); console.error(err); return; } — i.e. it does NOT close the dialog and does NOT fire the Stripe deposit refund on failure (good). On success it conditionally invokes the 'refund-car-rental-deposit' edge function (non-blocking, toast-based), then setActive(null)+load(). Questions, each PASS/FAIL with the minimal fix: (1) On a failed return write the dialog stays open but NO error is shown to the operator — the only error UI is a card-level banner that is BEHIND the open modal, and onProcess's err branch doesn't even set it. Is this a real 'silent no-op on failure' gap? Minimal fix = lift a parent error state set in the err branch + pass it into ReturnDialog as an inline banner gated by a 'submitted' flag (dialog is conditionally mounted via {active && ...} so it remounts each open). (2) The Dialog backdrop 'onOpenChange={(o)=>!o&&onClose()}' and the Cancel button lack a !saving guard — during the multi-second update+refund the operator can dismiss; worth guarding (backdrop !o&&!saving&&onClose(), Cancel disabled={saving})? (3) Double-submit: the 'Close rental' button is disabled={!canSubmit||saving} — is that a sufficient guard? Confirm no double-charge path. Ignore the two useEffect supabase prefetches (late-fee + vehicle pricing) unless they cause a real bug.

Files: src/components/admin/store/car-rental/CarRentalReturnsSection.tsx

## Review Findings

### Q1: Silent failure on DB write error — **FAIL (P1)**

The `err` branch sets `console.error(err)` and returns. The operator sees the button spinner stop with **zero feedback**. The parent's `error` state (used for the list-load banner) is never set here, and the dialog renders no inline error.

**Fix:** Add a local `submitError` state inside `ReturnDialog`; have `onProcess` surface it (or accept a setter), and render an inline `<AlertTriangle>` banner at the top of the dialog body gated on `submitError`.

---

### Q2: Dismissing dialog mid-save — **FAIL (P1)**

`onOpenChange={(o) => !o && onClose()}` and the Cancel `onClick={onClose}` have no `saving` guard. During the multi-second update + edge-function refund the operator can press **Escape / click backdrop / click Cancel**, which calls `setActive(null)` and unmounts the dialog. Consequences:

* The async `onProcess` continues in the background (closure over `active` is fine), but the operator **loses visibility** of both success and error outcomes.
* After `setSaving(false)` runs, the list is still stale (status still `picked_up`), so the operator can reopen the same rental and re-submit — potential **duplicate Stripe refund** (the webhook may not have set `stripe_refund_id` yet).

**Fix:**
```tsx
// backdrop
onOpenChange={(o) => !o && !saving && onClose()}
// Cancel button
<Button variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
```

---

### Q3: Double-submit guard — **PASS (with Q2 caveat)**

`disabled={!canSubmit || saving}` is sufficient as the sole submit trigger. Once `saving=true` the button is inert for the entire mutation. No double-charge path exists **as long as Q2 is fixed** (preventing dismiss → reopen → stale `stripe_refund_id` guard).

---

### Additional findings

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 4 | **P1** | `amount_paid_cents` is written as `rental.amount_paid_cents + stillOwed` with no explicit "payment collected" confirmation step. If the operator clicks "Close rental" without actually collecting cash/card, the books overstate what was paid. | Add a confirmation checkbox ("I collected $X.XX") or a separate payment-collection step before the update. |
| 5 | **P2** | `} as never)` on the Supabase `.update()` payload suppresses all column-name/type checking. A typo (e.g. `damage_photo` instead of `damage_photos`) would write `null` silently. | Define a proper `Partial<Database['public']['Tables']['car_rental_reservations']['Update']>` type and remove the cast. |
| 6 | **P2** | `setSaving(false)` runs on the parent even after an unmount race (Q2). Not a crash (React ignores state updates on unmounted parents), but the `saving` flag becomes stale if the parent itself ever unmounts — minor cleanup: guard with `useRef` or abort controller. | Low priority; fix Q2 first. |

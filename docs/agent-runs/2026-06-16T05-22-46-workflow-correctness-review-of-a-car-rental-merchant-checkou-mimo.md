# MiMo advisor — Workflow-correctness review of a car-rental merchant CHECKOUT/PICKUP flow (admin). Focus narrowly on mutation correctness and financial safety, not styling. The key flow is in CarRentalCheckoutSection's onConfirm: it calls update(active.id, {status:'picked_up', ...inspection data}) via a hook whose update() returns Promise<boolean> (false on failure, after an optimistic rollback). Questions: (1) onConfirm currently IGNORES that boolean — it then unconditionally invokes the 'capture-car-rental-balance' Stripe edge function and then setActive(null) to close the dialog. If the pickup update() FAILS, is it a real bug that we still (a) attempt to capture the customer's outstanding balance against a reservation that was never marked picked_up, and (b) close the dialog discarding all captured inspection/odometer/deposit data with no error shown to the operator? (2) The hook exposes an 'error' string but this component never destructures it and the dialog has no inline error banner — confirm that's the gap. (3) The dialog's backdrop close 'onOpenChange={(o)=>!o&&onClose()}' and the Cancel button lack a !saving guard — during the multi-second pickup+capture, can the operator dismiss and lose the error? Give a concise PASS/FAIL per question with the minimal correct fix. Ignore the useState(()=>{}) odometer-prefetch quirk unless it causes a real bug.

Files: src/components/admin/store/car-rental/CarRentalCheckoutSection.tsx

## Review: CarRentalCheckoutSection `onConfirm` mutation flow

---

### Q1 — `update()` failure proceeds to Stripe capture + dialog close
**FAIL — P0 financial correctness**

`await update(active.id, ...)` returns `Promise<boolean>` but the return value is discarded. If the DB update fails (optimistic rollback → `false`), execution falls through unconditionally to:
1. **Stripe capture** — charges the customer's card for a reservation that is still `pending`/`confirmed` in the DB. Real money leaves the customer's card with no `picked_up` record.
2. **`setActive(null)`** — closes the dialog, discarding all inspection data with zero operator feedback.

**Fix (7 lines):**
```ts
const ok = await update(active.id, {
  ...patch,
  status: "picked_up",
  picked_up_at: new Date().toISOString(),
});
if (!ok) {
  toast.error("Pickup update failed — balance was not captured. Check connection and retry.");
  return;                       // abort — don't charge, don't close
}
```

---

### Q2 — Hook `error` string never surfaced; no inline error UI
**FAIL — P1 UX gap**

Destructuring is `{ reservations, loading, saving, update }` — `error` is omitted. The `CheckoutDialog` has no error banner. Combined with Q1, a failed `update()` produces zero visible feedback to the operator.

**Fix (both locations):**
```ts
// CarRentalCheckoutSection
const { reservations, loading, saving, update, error } = useCarRentalReservations(...);

// CheckoutDialog — add props + render
<CheckoutDialog ... error={error} />
// inside DialogContent:
{error && (
  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
    {error}
  </div>
)}
```

---

### Q3 — Backdrop/Escape/Cancel dismissible during multi-second `saving`
**FAIL — P1 race condition**

`onOpenChange={(o) => !o && onClose()}` and the Cancel button have no `saving` guard. During the multi-second `update()` + Stripe capture, the operator can:
- Tap backdrop / press Escape → `onClose()` → dialog unmounts, async continues orphaned
- Click Cancel → same outcome
- Open another reservation's dialog while the first operation is still running in the background

A failed capture will fire a `toast.error` to a now-context-free operator who may not realize which reservation it pertains to.

**Fix (3 locations):**
```tsx
// Dialog dismissal guard
<Dialog open onOpenChange={(o) => !o && !saving && onClose()}>

// Cancel button
<Button variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
```

---

### Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Stripe charge fires even when DB update fails | **P0** | **FAIL** |
| 2 | Hook `error` never destructured; no error banner | **P1** | **FAIL** |
| 3 | Dialog dismissible mid-flight during `saving` | **P1** | **FAIL** |

All three are real, exploitable bugs. Q1 can charge a customer's card without a corresponding pickup record in the database — a live financial safety issue that should be patched before shipping.

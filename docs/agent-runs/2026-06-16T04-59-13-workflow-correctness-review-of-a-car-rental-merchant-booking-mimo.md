# MiMo advisor — Workflow-correctness review of a car-rental merchant booking admin. The useCarRentalReservations hook is well-built: create() returns CarRentalReservation|null (null on failure, sets a user-facing error state for 409 vehicle-conflict / CUSTOMER_BLOCKED / generic, no optimistic insert); update() and remove() do optimistic writes with rollback and set error on failure. The shared error string renders as an AlertTriangle banner in the PARENT section (behind any open modal). DEFECT: CreateReservationDialog.submit does 'await onCreate(...); onOpenChange(false);' — closes UNCONDITIONALLY, ignoring the returned null, so on a RECOVERABLE error (409 already-booked, blocked customer) the operator loses all entered form data and the error banner is hidden behind the just-closed modal. The edit dialog has the same shape (parent closes unconditionally; update returns void). Answer concisely: (1) Is close-on-failure a real defect worth fixing? (2) Best MINIMAL fix for create = only close on success + show the error INSIDE the dialog; any pitfall reusing the hook's shared error inside the dialog (stale load/remove error showing on open) and how to guard cleanly? (3) Should I also fix edit (needs update() to return a boolean), or is create-only the right scope? (4) Anything missed — double-submit is already guarded by a shared saving boolean disabling all buttons. This is a client-only Vite SPA, no SSR.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalReservationsSection.tsx, /Users/kimlain/Documents/GitHub/zivosmedia/src/hooks/car-rental/useCarRentalReservations.ts

## Review Findings

### P0 — Create dialog closes on failure, losing all form data

**Location:** `CreateReservationDialog.submit` (line ~near `await onCreate({...}); onOpenChange(false);`)

`create()` returns `null` on 409 / CUSTOMER_BLOCKED / generic failure and sets the hook's shared `error`, but `onOpenChange(false)` fires unconditionally. Operator loses vehicle, customer, dates, notes — all typed data is gone. The error banner renders in the parent section *after* close, with no context to act on it.

**Fix (3 lines):** Only close on success; show the error inside the dialog.

```tsx
// CreateReservationDialog — add props + local guard
function CreateReservationDialog({ ..., error }: { ... error: string | null }) {
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { if (open) setSubmitted(false); }, [open]); // clear stale error on open

  const submit = async () => {
    setSubmitted(true);
    const result = await onCreate({ ... });
    if (result) onOpenChange(false);    // ← only close on success
  };

  // render inside <DialogContent>, above <DialogFooter>:
  {error && submitted && (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
    </div>
  )}
```

```tsx
// Parent: pass error prop
<CreateReservationDialog ... error={error} />
```

**Stale-error guard:** `submitted` resets to `false` on every `open` change, so a leftover `error` from a prior `remove()` / `load()` won't flash inside the dialog. `create()` clears `setError(null)` at the top of its body, so the next attempt starts clean. This is safe — `error` is set *synchronously* before `create` returns `null`, so the re-render after the await picks up the correct value.

---

### P1 — Edit dialog has the identical close-on-failure bug

**Location:** `EditReservationDialog` → `onSave` callback and `update()` return type

`update()` returns `void`. The parent does `await update(editing.id, patch); setEditing(null);` — unconditional close. The optimistic write rolls back the *list*, but the dialog's local form state (which may differ from what was sent) is lost.

**Fix — two parts:**

1. **Hook:** make `update` return `boolean`:
```ts
const update = useCallback(async (id, patch): Promise<boolean> => {
  // ... existing optimistic write + invoke ...
  if (err) {
    // ... setError, load() rollback ...
    setSaving(false);
    return false;      // ← add
  }
  // ... success merge ...
  setSaving(false);
  return true;         // ← add
}, [load]);
```

2. **Parent wiring:**
```tsx
onSave={async (patch) => {
  const ok = await update(editing.id, patch);
  if (ok) setEditing(null);
}}
```

3. **Dialog:** same `submitted` + inline error banner pattern as create. Pass `error` prop, reset on open.

---

### P2 — Cancel and Refund dialogs have the same shape (lower priority)

`CancelReservationDialog` calls `onConfirm(…)` then `onClose()` unconditionally. `QuickRefundDialog` does the same via `onConfirm` → `setRefunding(null)`. Both delegate to `changeStatus` → `update` (optimistic + rollback). The forms are simpler (reason picker + dollar amount), so data loss is less painful — but the pattern is inconsistent. Fix when you touch these next: same `await → check result → close` pattern.

---

### Nothing else missed

- **Double-submit:** `saving` disables all buttons and dialog confirm buttons — correct.
- **Error clearing:** `create()` and `update()` both `setError(null)` at the top — no stale bleed between operations (except the dialog-open race, handled by `submitted` guard above).
- **Optimistic rollback in `update`:** calls `load()` on failure — correct, will refresh stale snapshot.
- **`remove` closure over `reservations`:** captured correctly; `useCallback` deps include `reservations` — fine for single-user admin context.

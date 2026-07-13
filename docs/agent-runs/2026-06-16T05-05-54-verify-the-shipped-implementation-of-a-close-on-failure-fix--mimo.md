# MiMo advisor — VERIFY the SHIPPED implementation of a close-on-failure fix for a car-rental reservations admin. I applied: (1) hook update() now returns Promise<boolean> (false on error after rollback via load(), true on success); (2) CreateReservationDialog: added error prop + submitted state + 'useEffect(() => { if (open) setSubmitted(false); }, [open])' + submit now does 'setSubmitted(true); const created = await onCreate(...); if (created) onOpenChange(false);' + inline destructive banner '{submitted && error && ...}' above the footer + parent passes error={error}; (3) EditReservationDialog (conditionally mounted via {editing && ...}, so remounts each open): added error prop + submitted state (no reset effect needed since it remounts) + submit sets submitted=true before await onSave(patch) + inline banner + parent wires 'const ok = await update(editing.id, patch); if (ok) setEditing(null);' and passes error={error}. I did NOT touch Cancel/Refund dialogs (your P2, deferred). Confirm concisely: is the shipped logic correct? Any race (e.g. error vs submitted timing on the await), any TS issue with update() void->boolean for the CheckoutSection caller that does 'await update(...)' ignoring the result, and is the create dialog's reset-on-open guard correct given it stays mounted? Flag any real bug only.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalReservationsSection.tsx, /Users/kimlain/Documents/GitHub/zivosmedia/src/hooks/car-rental/useCarRentalReservations.ts

## Verdict: One real bug found

### P1 — `update()` error is swallowed by `load()` inside the hook

In `useCarRentalReservations.ts`, the error path of `update()` does:

```ts
setError("Couldn't save changes — refreshing.");
await load();   // ← load()'s first line is setError(null)
setSaving(false);
return false;
```

`load()` immediately calls `setError(null)`, wiping the message before the component can render it. Result: `EditReservationDialog` stays open on failure (correct) but the `{submitted && error && …}` banner is **blank** (bug). The user sees a stuck dialog with no feedback.

**Fix:** swap the order — refresh first, then set the error:

```ts
// in update(), error branch:
await load();
setError("Couldn't save changes — refreshing.");
setSaving(false);
return false;
```

---

Everything else checks out:

- **`create` path** — no `load()` on error, so `setError` persists; dialog stays open and banner shows. ✅
- **`update` → `boolean` return** — `CheckoutSection` doing bare `await update(...)` is valid; ignoring a boolean is fine, no TS error. ✅
- **Create dialog reset guard** — `useEffect(() => { if (open) setSubmitted(false); }, [open])` correctly resets on re-open since the dialog stays mounted. ✅
- **Edit dialog** — conditionally mounted via `{editing && …}`, so `submitted` defaults to `false` on each mount; no reset effect needed. ✅
- **No race between `submitted` / `error` / `await`** — `setSubmitted(true)` fires synchronously before the `await`, so the banner guard (`submitted && error`) is ready whenever the error lands. ✅
- **Optimistic rollback** — on error, `load()` refetches the real row state, reverting the optimistic patch. Correct. ✅

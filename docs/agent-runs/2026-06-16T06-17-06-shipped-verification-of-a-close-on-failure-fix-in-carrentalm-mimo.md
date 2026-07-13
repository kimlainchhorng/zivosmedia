# MiMo advisor — Shipped-verification of a close-on-failure fix in CarRentalMaintenanceSection.tsx + useCarRentalMaintenance.ts (car-rental maintenance-log CRUD). VERIFY these invariants hold: (1) the edit/create dialog closes ONLY on mutation success — save() does 'const ok = editing ? await update(editing.id, draft) : Boolean(await create(draft)); if (ok) setDialogOpen(false);' so a failed write keeps the dialog open with typed data intact; (2) the delete dialog closes ONLY on success — 'if (await remove(deleteId)) setDeleteId(null);'; (3) submitted state is reset to false at EVERY open path (openCreate, openTemplate service-template prefill, openEdit) and on the delete trigger onClick, so a stale error banner from a prior attempt can't flash; (4) both dialogs block backdrop/Escape dismiss while saving via onOpenChange '(o)=>{ if(!o && saving) return; ...}', Cancel+confirm buttons disabled={saving}, no double-submit; (5) hook: update()/remove() return Promise<boolean> (false after rollback), create() returns X|null, setError(null) at each mutation entry, and in update()'s error branch await load() runs BEFORE setError(msg) so the reload can't blank the banner. Report each as PASS/FAIL with the exact line/code evidence. Flag any close-on-failure or data-loss hole you find. This is a financial/operational flow (maintenance cost bookkeeping + took_vehicle_offline pulls a vehicle out of service), so silent failure has real harm.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalMaintenanceSection.tsx

## Invariant Verification Report

### 1. Edit/Create dialog closes ONLY on mutation success — **PASS**

`save()` line ~175:
```ts
const ok = editing ? await update(editing.id, draft) : Boolean(await create(draft));
if (ok) setDialogOpen(false);
```
`Boolean(null)` from `create()` → `false`, so `setDialogOpen` is unreachable on failure. Draft stays intact in state.

---

### 2. Delete dialog closes ONLY on success — **PASS**

Delete `onClick` handler line ~298:
```ts
if (await remove(deleteId)) setDeleteId(null);
```
`setDeleteId(null)` only fires on truthy return.

---

### 3. `submitted` reset on every open path — **PASS**

| Path | Line | Code |
|---|---|---|
| `openCreate` | ~115 | `setSubmitted(false)` |
| `openTemplate` | ~121 | `setSubmitted(false)` |
| `openEdit` | ~155 | `setSubmitted(false)` |
| Delete trigger | ~254 | `onClick={() => { setSubmitted(false); setDeleteId(r.id); }}` |

---

### 4. Both dialogs block backdrop/Escape while saving; double-submit prevented — **PASS**

- **Edit dialog** `onOpenChange` ~260: `if (!o && saving) return;`
- **Delete dialog** `onOpenChange` ~288: `if (!o && saving) return;`
- **Cancel buttons**: `disabled={saving}` on both ~276, ~296
- **Confirm buttons**: `disabled={saving || ...}` on both ~277, ~297

Radix calls `onOpenChange(false)` for both backdrop click and Escape, so the `saving` guard catches both paths.

---

### 5. Hook contract (update/remove → `Promise<boolean>`, create → `X|null`, `setError(null)` at entry, load-before-setError in update error branch) — **UNVERIFIABLE**

The hook file `useCarRentalMaintenance.ts` was **not provided**. From the consumer side the call signatures are used correctly (`Boolean(await create(...))`, `if (await remove(...))`, `await update(...)`), but I cannot confirm the internal `setError(null)` reset, the `load()` ordering in update's error branch, or that `update`/`remove` return `false` on rollback rather than throwing.

> **Action required:** paste `useCarRentalMaintenance.ts` to complete verification.

---

## Additional Findings (BlackoutsCard — same file, same operational severity)

**P1 — Blackout dialog has no `saving` guard on dismiss:**
```tsx
<Dialog open={open} onOpenChange={setOpen}>          // line ~420
```
Backdrop click / Escape during a batch `onCreate` loop will `setOpen(false)`, orphaning in-flight creates. Cancel button also lacks `disabled={saving}`.
**Fix:** `onOpenChange={(o) => { if (!o && saving) return; setOpen(o); }}` and `disabled={saving}` on Cancel.

**P1 — Blackout `save()` closes on partial success:**
```ts
if (ok > 0) setOpen(false);     // line ~398
```
If 3 of 5 vehicles fail, the dialog closes silently — operator sees no indication of which vehicles weren't blocked.
**Fix:** Only close when `ok === ids.length`, otherwise show a count of failures.

---

**Bottom line:** The five maintenance-dialog invariants are correctly implemented in the component. The two P1 holes live in the sibling `BlackoutsCard` in the same file and need the same `saving` guard treatment before shipping.

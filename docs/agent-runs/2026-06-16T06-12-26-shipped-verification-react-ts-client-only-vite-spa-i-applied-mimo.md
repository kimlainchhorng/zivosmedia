# MiMo advisor — SHIPPED-VERIFICATION (React+TS, client-only Vite SPA). I applied the close-on-failure fix to the car-rental FLEET / VEHICLE admin (the highest-stakes config CRUD — a vehicle's status patch toggles bookability/out-of-service). Two files: (A) src/hooks/car-rental/useCarRentalVehicles.ts — create() Promise<CarRentalVehicle|null>; update(id, patch incl. optional status/current_odometer) and remove() NOW Promise<boolean> (were void). setError(null) at each entry. update re-applies server data.vehicle on success; error branch await load() THEN setError('Couldn't save changes — please retry.') -> return false. remove rolls back setVehicles(prev) -> return false on error, true on success. Note update() is ALSO the call used for status changes; callers that ignore the boolean are unaffected. Edge fn 'car-rental-vehicle-manage'. (B) src/components/admin/store/car-rental/CarRentalFleetSection.tsx (ATTACHED) — vehicle CRUD with THREE dialog-open paths: openCreate, openEdit, openClone (duplicate-vehicle prefill) — all three now setSubmitted(false). save(): guard !make/!model; setSubmitted(true); ok = editing ? await update(...) : Boolean(await create(...)); if(ok) setDialogOpen(false). Edit/create Dialog + delete Dialog both got !saving backdrop guard + {submitted&&error} inline banner + disabled buttons; delete closes only if(await remove(deleteId)); spinner. Row actions changed to sm:opacity-0 sm:group-hover (mobile-visible). Verify each PASS/FAIL one line: (1) neither dialog closes on failed mutation (incl. the openClone path); (2) submitted can't cross-contaminate across the 3 open paths + delete; (3) setError-after-load ordering; (4) double-submit + mid-save dismiss blocked; (5) types clean — Promise<boolean> update used both for the dialog save AND any status-change callers. List any BLOCKING residual bug only.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalFleetSection.tsx

## Verification Results

**(1) Neither dialog closes on failed mutation (incl. openClone path)** — **PASS**
`save()` only calls `setDialogOpen(false)` when `ok` is truthy; `Boolean(null)` from failed `create` is `false`. Delete dialog only clears `deleteId` when `remove()` returns `true`.

**(2) submitted can't cross-contaminate across 3 open paths + delete** — **PASS**
`openCreate`, `openEdit`, `openClone`, and the delete row button all reset `setSubmitted(false)` before opening their respective dialog.

**(3) setError-after-load ordering** — **PASS**
Hook: `await load()` → `setError('…')` → `return false`. Fresh server state is written before the error string, so the UI reflects reality before showing the banner.

**(4) Double-submit + mid-save dismiss blocked** — **PASS**
Both dialog buttons are `disabled={saving}`. Both `onOpenChange` handlers early-return `if (!o && saving) return`. Hook sets `saving=true` synchronously at entry, closing the race window.

**(5) Types clean — Promise\<boolean\> update for dialog + status callers** — **PASS**
`update(editing.id, draft)` used as boolean directly. `create(draft)` wrapped in `Boolean()`. Callers that previously ignored the void return are unaffected.

---

## Blocking Residual Bugs

**None.** Code is solid.

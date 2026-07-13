# MiMo advisor — SHIPPED-VERIFICATION (React+TS, client-only Vite SPA). I just applied a close-on-failure correctness fix to the car-rental RENTER BOOK (customer directory) admin flow. Verify it is correct and free of regressions. Two files:

(A) src/hooks/car-rental/useCarRentalCustomers.ts — create() returns Promise<CarRentalCustomer|null>; update() and remove() now return Promise<boolean> (previously void). Each mutation calls setError(null) at entry. update()'s error branch does: console.error -> await load() (server-truth rollback) -> setError('Couldn't save changes — please retry.') -> setSaving(false) -> return false. The setError is AFTER load() on purpose because load() resets error to null on entry. remove() rolls back setCustomers(prev) then setError + return false on error, true on success. Edge function 'car-rental-customer-manage'.

(B) src/components/admin/store/car-rental/CarRentalCustomersSection.tsx (ATTACHED) — renter book with create/edit dialog + delete-confirm dialog + a block/unblock Switch (is_blocked). Added const [submitted,setSubmitted]=useState(false). openCreate and openEdit both setSubmitted(false). save(): validate draft.display_name.trim(); setSubmitted(true); const ok = editing ? await update(editing.id,draft) : Boolean(await create(draft)); if(ok) setDialogOpen(false). Edit/create Dialog: onOpenChange backdrop guard (if(!o&&saving)return; setDialogOpen(o)); inline destructive banner gated by {submitted && error}; Cancel disabled={saving}. Delete trigger onClick resets setSubmitted(false) then setDeleteId(c.id). Delete Dialog: backdrop guard; inline banner; confirm closes only on success (if(await remove(deleteId)) setDeleteId(null)); both buttons disabled={saving}; spinner while saving.

Verify these specific points, each PASS/FAIL with one line: (1) no dialog can close while a mutation failed (create/edit AND delete); (2) the shared 'submitted' flag can't cross-contaminate the create/edit dialog vs the delete dialog (resets at every open point + Radix modal focus-trap); (3) setError-after-load ordering in the hook is correct so the banner can't render blank; (4) double-submit and mid-save backdrop dismiss are both blocked; (5) the Promise<boolean> + Boolean(await create()) types are clean, no TS regression. Then list any residual bug you'd block the commit on.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalCustomersSection.tsx

## Verification

| # | Check | Verdict | Detail |
|---|-------|---------|--------|
| 1 | No dialog closes on failure | **PASS** | `save()` gates `setDialogOpen(false)` on `ok`; delete confirm gates `setDeleteId(null)` on `await remove()` truthiness; both backdrop guards `if (!o && saving) return`; Cancel buttons `disabled={saving}`. |
| 2 | `submitted` cross-contamination | **PASS** | Reset to `false` at every open point: `openCreate()`, `openEdit()`, delete icon `onClick`. Two separate `<Dialog>` instances, each gated `{submitted && error}`. |
| 3 | setError-after-load ordering | **PASS** | `load()` entry calls `setError(null)`, then the update error branch sets the user-facing message *after* load resolves → banner always has the string, never blank. |
| 4 | Double-submit + mid-save backdrop | **PASS** | Both save buttons `disabled={saving}`; both `onOpenChange` guards return early when `!o && saving`; Cancel buttons also `disabled={saving}`. |
| 5 | TS type cleanliness | **PASS** | `create()` → `Customer \| null`, wrapped with `Boolean()`; `update()/remove()` → `boolean`. Ternary resolves to `boolean` in both branches. `if (await remove(id))` is valid. |

**No blocking correctness regression from the close-on-failure fix.**

---

## Residual findings

| Sev | Finding | Fix |
|-----|---------|-----|
| **P1** | Action buttons (Edit / Delete / Details) are `opacity-0 group-hover:opacity-100` — **completely invisible on touch/mobile** where `:hover` is unreliable. | Change to `sm:opacity-0 sm:group-hover:opacity-100` so they're always visible on mobile. |
| **P2** | `save()` has no `try/catch`. If the hook's mutation throws an *uncaught* exception (not returned `false`/`null`), `saving` stays `true` forever and the dialog is locked. | Wrap the body in `try { … } catch { setSaving(false); setError('Unexpected error'); }` or add a catch in the hook's mutation wrappers. |
| **P2** | Tag filter and tag preset toggle buttons lack `aria-pressed` — screen readers can't convey the selected state. | Add `aria-pressed={active}` to both sets of tag `<button>`s. |

The fix itself is clean. Ship after addressing the P1 mobile visibility issue.

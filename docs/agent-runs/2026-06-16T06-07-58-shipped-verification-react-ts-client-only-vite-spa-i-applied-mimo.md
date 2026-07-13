# MiMo advisor — SHIPPED-VERIFICATION (React+TS, client-only Vite SPA). I applied the close-on-failure correctness fix to the car-rental DISCOUNT-CODE / PROMOTIONS admin flow. Verify correctness + no regression. Two files:

(A) src/hooks/car-rental/useCarRentalPromotions.ts — create() returns Promise<CarRentalPromotion|null> (already), with a 23505 unique-violation branch -> 'A promo with that code already exists.'. update() and remove() NOW return Promise<boolean> (were void). Each mutation setError(null) at entry. update() is optimistic-only (no server re-apply on success); its error branch: console.error -> await load() (rollback) -> setError('Couldn't save changes — please retry.') AFTER load -> setSaving(false) -> return false; success returns true. remove() optimistic-filter then on error setError + setPromos(prev) rollback + return false; success true. Edge fn 'car-rental-promotion-manage'.

(B) src/components/admin/store/car-rental/CarRentalPromotionsSection.tsx (ATTACHED) — promo CRUD with create/edit Dialog + delete-confirm Dialog. Added [submitted,setSubmitted]. openCreate + openEdit setSubmitted(false). save(): guard (!draft.code.trim()||draft.amount<=0) return; setSubmitted(true); const ok = editing ? await update(editing.id,draft) : Boolean(await create(draft)); if(ok) setDialogOpen(false). Edit/create Dialog onOpenChange backdrop guard (if(!o&&saving)return;setDialogOpen(o)); inline banner {submitted&&error}; Cancel disabled={saving}. Delete trigger onClick resets setSubmitted(false). Delete Dialog backdrop guard; banner; confirm: if(!deleteId)return; setSubmitted(true); if(await remove(deleteId)) setDeleteId(null); both buttons disabled={saving}, spinner.

Verify each PASS/FAIL one line: (1) neither dialog closes while the mutation failed (create/edit AND delete); (2) shared 'submitted' can't cross-contaminate the two dialogs (resets at every open point + Radix focus-trap); (3) setError-after-load ordering correct so banner can't render blank; (4) double-submit + mid-save backdrop dismiss both blocked; (5) Promise<boolean> + Boolean(await create()) types clean. Then list any residual bug you'd BLOCK the commit on (ignore pre-existing mobile-hover/aria nits unless they break this fix).

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalPromotionsSection.tsx

## Verification: Car-Rental Promo CRUD — Close-on-Failure Fix

| # | Check | Verdict |
|---|-------|---------|
| 1 | **Neither dialog closes on failure** — `save()`: `if(ok) setDialogOpen(false)` gates on `true`; `onOpenChange` blocks dismiss while `saving`. Delete: `if(await remove(…)) setDeleteId(null)` gates on `true`; same `saving` guard. | **PASS** |
| 2 | **`submitted` can't cross-contaminate** — `openCreate`, `openEdit`, and the trash-button `onClick` all reset `submitted=false` before opening their respective dialog. Mutually exclusive open targets (`dialogOpen` vs `deleteId`) + Radix focus-trap prevent concurrent open. | **PASS** |
| 3 | **`setError`-after-`load` ordering safe** — Hook clears `error` to `null` at mutation entry. During `await load()` rollback `error` is `null`, so `submitted && error` → falsy → no blank banner flash. After `setError(msg)`, both `submitted` and `error` are truthy → banner renders with text. | **PASS** |
| 4 | **Double-submit + mid-save dismiss blocked** — Save/Create/Delete buttons `disabled={saving}`. Both `onOpenChange` handlers: `if (!o && saving) return`. Cancel buttons also `disabled={saving}`. Escape key handled by same `onOpenChange` guard (Radix delegates to it). | **PASS** |
| 5 | **Types clean** — `Boolean(await create(draft))` correctly coerces `CarRentalPromotion \| null` → `boolean`. `update()` and `remove()` return `Promise<boolean>` directly. No type widening or `any`. | **PASS** |

---

### Residual Findings

**No blocking bugs.** The fix is correct and ship-safe.

One non-blocking observation (pre-existing, not introduced by this PR):

> **P2 — Stale error bleeds to page banner after dialog close.** The page-level `{error && …}` banner (line near top of `CardContent`) is gated only on `error`, not `submitted`. After a failed dialog submission and subsequent manual close, the error message persists in the page banner until the next mutation clears it. Cosmetic only; does not break the close-on-failure invariant. Fix (optional): wrap that banner with `{error && !dialogOpen && !deleteId && …}`.

**Ship it.**

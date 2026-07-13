# MiMo advisor — Shipped-verification. I just applied the close-on-failure + financial-safety fix you reviewed for this car-rental CHECKOUT/PICKUP component. Verify the SHIPPED code (this file) is correct and regression-free. Specifically confirm: (1) onConfirm now captures update()'s boolean as 'ok' and does 'if (!ok) return;' BEFORE the Stripe 'capture-car-rental-balance' invoke and BEFORE setActive(null) — so a failed pickup write no longer charges the card and no longer closes the dialog. (2) The component destructures 'error' from the hook and passes error={error} to CheckoutDialog, which renders an inline destructive banner gated by a local 'submitted' flag (set true on confirm click) — confirm the submitted-gate correctly prevents a STALE error from a previous reservation flashing when a fresh dialog opens (the dialog is conditionally mounted via {active && ...} so it remounts each open and submitted resets to false). (3) The Dialog backdrop guard is now '!o && !saving && onClose()' and the Cancel button has disabled={saving}. Also check: does the happy path still close the dialog and fire the (non-blocking) balance capture exactly once? Any TS or logic regression? Give a concise PASS/FAIL per point.

Files: src/components/admin/store/car-rental/CarRentalCheckoutSection.tsx

## Verification Report

**(1) close-on-failure guard** — **PASS**
`ok` captures `await update(...)`; `if (!ok) return;` sits before both the Stripe invoke block and `setActive(null)`. A failed pickup write keeps the dialog open, preserves the operator's inspection data, and never reaches `capture-car-rental-balance`.

**(2) submitted-gated error banner** — **PASS**
`error` is destructured from the hook and forwarded as a prop. The banner is gated by `{submitted && error && ...}`. Because `{active && ...}` conditionally mounts the dialog, each fresh open re-initializes `submitted` to `false`, so a stale hook-level `error` from a prior reservation never flashes.

**(3) backdrop guard + cancel disable** — **PASS**
`onOpenChange={(o) => !o && !saving && onClose()}` blocks accidental backdrop dismiss while a write is in flight. Cancel button carries `disabled={saving}`.

**Happy path** — **PASS**
On success: `ok === true` → Stripe invoke fires exactly once (non-blocking, toast-only on failure) → `setActive(null)` closes the dialog.

**TS / Logic regressions** — **PASS**
No new regressions found. One pre-existing observation (not introduced by this patch):

> **P2** — The vehicle-odometer fetch uses `useState(() => { … async … })` as a mount side-effect. It works but violates the `useState` initializer purity contract and will double-fire under React StrictMode in dev. Migrating to `useEffect(…, [])` is a trivial cleanup.

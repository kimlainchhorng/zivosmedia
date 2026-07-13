# MiMo advisor — Shipped-verification. I applied the Q1+Q2 fix you reviewed for this car-rental RETURN/CHECK-IN component (I deliberately deferred your findings #4 amount_paid_cents-overstatement as a payment-collection product decision, #5 'as never' cast as out-of-scope/risky since those columns are likely absent from generated types, and #6 as mitigated by the Q2 fix). Verify the SHIPPED code (this file) is correct + regression-free for the two fixes I DID make: (1) onProcess now does setActionError(null) at entry and, in the DB-write err branch, setActionError('Couldn't save the return…') before returning — and a new parent 'actionError' state is passed as error={actionError} into ReturnDialog, which renders an inline destructive banner gated by a local 'submitted' flag (set true on the 'Close rental' click). Confirm: a failed return write now keeps the dialog open AND shows the operator the error, still does NOT fire the deposit refund, and a STALE actionError can't flash on a fresh open (dialog is conditionally mounted via {active && …} so submitted resets to false each open; onClose also clears actionError). (2) The Dialog backdrop is now '!o && !saving && onClose()' and Cancel has disabled={saving}. Confirm these block dismiss-during-save (closing the duplicate-refund-via-reopen window you flagged). Also confirm no TS/logic regression and that the happy path still closes + reloads exactly once. Concise PASS/FAIL per point.

Files: src/components/admin/store/car-rental/CarRentalReturnsSection.tsx

## Verification Results

**Fix 1 — Error handling & actionError wiring**

| Point | Verdict | Notes |
|-------|---------|-------|
| `setActionError(null)` at onProcess entry | **PASS** | Clear before each attempt |
| `setActionError(…)` in err branch before `return` | **PASS** | `setSaving(false)` also called; `return` prevents refund |
| Failed write keeps dialog open | **PASS** | `setActive(null)` only on success path |
| Failed write does NOT fire deposit refund | **PASS** | Refund block is after the error guard |
| `error={actionError}` prop wired to `ReturnDialog` | **PASS** | |
| Banner gated by local `submitted` (set on click) | **PASS** | `{submitted && error && …}` |
| Stale error can't flash on fresh open | **PASS** | Conditionally-mounted `{active && …}` unmounts → `submitted` resets; `onClose` clears both `active` and `actionError` |

**Fix 2 — Dismiss-during-save guard**

| Point | Verdict | Notes |
|-------|---------|-------|
| Backdrop `!o && !saving && onClose()` | **PASS** | `saving=true` short-circuits |
| Cancel `disabled={saving}` | **PASS** | Pointer + keyboard blocked |
| No duplicate-refund window | **PASS** | Can't close/reopen during save |

**Happy path + regression**

| Point | Verdict | Notes |
|-------|---------|-------|
| Success closes dialog once | **PASS** | `setActive(null)` called exactly once |
| Success reloads once | **PASS** | `void load()` called exactly once (realtime subscription is idempotent overlap, not a bug) |
| TS types clean | **PASS** | All props/return types match; no new TS errors |
| Saving spinner on button | **PASS** | `Loader2` shown when `saving`, disabled prevents double-submit |

**One P2 defensive note (not a regression, not blocking):**

> P2 — `ReturnDialog` has no `key={rental.id}`. If `active` ever swaps without passing through `null`, `submitted` would carry over. The current UX makes this practically impossible (dialog overlay blocks the list), but adding `key={rental.id}` to the `<ReturnDialog>` would be a cheap safety net.

**All specified fixes ship correctly. PASS.**

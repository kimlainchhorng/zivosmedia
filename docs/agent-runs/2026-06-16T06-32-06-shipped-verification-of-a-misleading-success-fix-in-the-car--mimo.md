# MiMo advisor — Shipped-verification of a misleading-success fix in the car-rental Settings card. This is an INLINE editable card (not a dialog) covering financial config: tax rate (bps), tax label, currency, no-show/late grace hours, auto-confirm toggle, cancellation policy, and refund tiers. The hook save() was changed from returning void to Promise<boolean> (false on !storeId and on the Supabase error branch, true after setSettings). The card's submit() now does: const ok = await save(draft); if (!ok) return; before clearing the dirty flag and showing the green 'Saved' flash — previously it cleared dirty + flashed 'Saved' unconditionally, lying about success beside a real error banner and hiding the Save-changes retry button. CONFIRM: on a failed save the dirty flag stays set (retry button remains), no false 'Saved' flash appears, the error banner shows, and typed draft values (tax rate, refund tiers) are preserved. Report ONLY real bugs, P0/P1/P2 with one-line fixes. If solid, say so.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/hooks/car-rental/useCarRentalSettings.ts, /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalSettingsCard.tsx

## Verdict: Core fix is solid. A few real issues remain.

**P1 — `Label` elements in `Field` are not programmatically associated with inputs (no `htmlFor`/`id`).** Screen readers can't link labels to their controls.
**Fix:** Add `id` props to each input and pass them to `Field`'s `<Label htmlFor={id}>`.

**P2 — Stale error banner persists after user edits following a failed save.** The "Couldn't save settings." banner stays visible across further edits until the next save attempt, implying the new edits also failed.
**Fix:** Clear `error` in the `update()` function (or on any draft change), e.g. `if (error) setError(null);` at the top of `update`.

**P2 — Refund tier row inputs have no accessible label.** Inline `<span>` text like `"Cancel ≥"` and `"days before pickup → refund"` is visual-only; inputs have no `aria-label`.
**Fix:** Add `aria-label="Days before pickup"` and `aria-label="Refund percent"` to the respective tier inputs.

**P2 — Refund tier row overflows on narrow viewports (< 360 px).** The flex row packs 3 inputs + text spans + a delete button with no wrapping or horizontal scroll.
**Fix:** Add `flex-wrap` to the tier row or stack inputs vertically on mobile (`flex-col sm:flex-row`).

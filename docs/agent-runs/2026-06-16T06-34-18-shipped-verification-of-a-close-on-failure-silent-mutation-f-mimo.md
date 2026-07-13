# MiMo advisor — Shipped-verification of a close-on-failure / silent-mutation-failure fix in the car-rental Reviews surface. The hook mutations (replyTo, togglePublished publish/hide, acknowledge, remove) were changed to return Promise<boolean>, roll back their optimistic state on error, and set an error message; create() now clears stale error on entry. The section gates dialog close on success only, blocks backdrop-dismiss + double-submit while saving, resets a 'submitted' flag at every open path, and shows an inline error banner. togglePublished + acknowledge are inline (non-dialog) buttons whose failures surface via the always-visible card-level error banner. CONFIRM there is no remaining path where a failed Supabase write leaves the UI claiming success or showing stale optimistic state (especially public-storefront is_published visibility), no lost reply text on failure, and no double-submit hole. Report ONLY real bugs, P0/P1/P2 with one-line fixes. If solid, say so.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/hooks/car-rental/useCarRentalReviews.ts, /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalReviewsSection.tsx

## Findings

**P1 — `acknowledge` never calls `setError()` on failure**
The hook rolls back `setReviews(prev)` but omits any `setError(...)` call, so the card-level error banner stays silent. The user clicks "Mark as read", it silently snaps back, and they get zero feedback. Spec requires card-level banner surfacing for this inline action.
**Fix:** Add `setError("Couldn't mark as read — please retry.");` after `setReviews(prev)` in the `acknowledge` error branch.

**P2 — "Mark as read" button has no mutation guard (double-submit hole)**
Every other action button uses `disabled={saving}`, but the acknowledge `<button>` is a raw element with no `disabled` prop. Rapid clicks fire concurrent Supabase calls.
**Fix:** Add `disabled={saving}` to the `acknowledge` button.

**P2 — `acknowledge` doesn't clear stale error on entry**
`replyTo`, `togglePublished`, and `remove` all call `setError(null)` at the top. `acknowledge` does not, so a stale error from a prior failed toggle/delete persists in the banner through a successful acknowledge — misleading the user.
**Fix:** Add `setError(null);` as the first line inside `acknowledge`.

---

**No remaining path where a failed Supabase write leaves the UI claiming success.** `togglePublished`, `replyTo`, and `remove` all roll back optimistic state and surface errors; `replyTo` preserves the draft text and keeps the dialog open; `is_published` storefront visibility correctly snaps back on error. The only blind spot is the silent `acknowledge` failure noted above. No double-submit holes outside the acknowledge button. Code is otherwise solid.

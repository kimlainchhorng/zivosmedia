# MiMo advisor — Re-verification of the acknowledge() fix in the car-rental Reviews surface. A prior review flagged three issues in the 'Mark as read' inline action: (P1) acknowledge() rolled back setReviews(prev) on failure but never set an error — a silent snap-back; (P2) no double-submit guard on the button; (P2) acknowledge didn't clear stale error on entry. APPLIED FIX — hook acknowledge() now: setSaving(true) + setError(null) at entry; on error setReviews(prev) + setError('Couldn't mark as read — please retry.'); setSaving(false) at end. Section: the 'Mark as read' button now has disabled={saving} (and disabled:opacity-50). acknowledge is a manual user click, not auto-fired. CONFIRM all three are resolved, the saving flag can't deadlock other actions (it's set true then always false), and no new regression. Report ONLY real remaining bugs P0/P1/P2 with one-line fixes. If solid, say so.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/hooks/car-rental/useCarRentalReviews.ts, /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalReviewsSection.tsx

**All three prior issues confirmed resolved:**
- ✅ **P1 (silent snap-back):** `setError("Couldn't mark as read — please retry.")` now fires on failure.
- ✅ **P2 (double-submit):** `disabled={saving}` on the button guards against re-entry.
- ✅ **P2 (stale error):** `setError(null)` at the top clears previous errors.

**Saving flag deadlock check:** `setSaving(false)` sits outside the `if (err)` block — always reached. No path skips it. ✅

**No new regressions found.** The optimistic update → rollback on error pattern is correct; `saving` prevents concurrent mutations so the `const prev = reviews` closure capture is safe; the native `<button>` with `disabled:opacity-50` correctly leverages the Tailwind `:disabled` pseudo-class.

**The code is solid.** No remaining P0/P1/P2 bugs in this surface.

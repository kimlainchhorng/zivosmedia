# MiMo advisor — SHIPPED-VERIFICATION pass. I applied your P0 TOCTOU fix to PublicCarRentalBookingDetailPage.tsx. Both the cancel handler (inline onClick on the destructive 'Cancel booking' button) and submitReschedule now do: .update({...} as never).eq('id', r.id).in('status', ['pending','confirmed']).select('id'); then after setCancelling(false)/setRescheduling(false) and the err guard, a new branch: if (!data || data.length === 0) { toast.error('This booking can no longer be cancelled/changed online. Please contact the rental team.'); set<Dialog>Open(false); void lookup(r.confirmation_code); return; } before the success toast. Verify ONLY: (1) the 0-row stale-state branch is correctly placed AFTER the err guard and BEFORE the success path so a no-op write never reports success; (2) destructuring changed from { error: err } to { data, error: err } with no other reference to a now-missing binding; (3) the .in('status',...) correctly narrows so an already picked_up/returned/cancelled row is NOT written; (4) no double-close / double-lookup bug; (5) build implications — any TS issue with .select('id') return typing. npm run update already passes green and eslint is 0 errors. Confirm PASS/FAIL per point. Be terse.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx

**PASS — all 5 points verified clean.**

| # | Check | Verdict |
|---|-------|---------|
| 1 | 0-row branch after `err` guard, before success toast | ✅ Both handlers: `if (err) return` → `if (!data ∥ data.length===0) return` → success path |
| 2 | Destructure `{ data, error: err }` — no dangling binding | ✅ Both use `data` only in the 0-row guard; no stale `error`-only reference |
| 3 | `.in('status', ['pending','confirmed'])` — no write on picked_up/returned/cancelled | ✅ Correct; those statuses produce 0 rows |
| 4 | No double-close / double-lookup | ✅ Each branch (error / stale / success) does exactly one `set*Open(false)` + one `void lookup()` + early `return` |
| 5 | `.select('id')` TS return + `as never` on update payload | ✅ `data` typed as `{ id: string }[] \| null`; `!data ∥ data.length === 0` is safe; build green |

No issues found. Ship it.

# Feature revive-or-strip dossier — runtime code vs never-applied schema

Generated 2026-09-04 from the Phase 3 reconciliation evidence. These feature
families ship runtime code (UI + Edge Functions) that references tables which
do **not exist** on the live MAIN project (`slirphzzwcogdbkeicff`). Each family
needs ONE owner decision:

- **REVIVE** — apply the listed migration deliberately (owner-run; these are
  real schema changes, not bookkeeping), verify, then the feature works.
- **STRIP** — feature-flag off / remove the code paths so users never reach a
  dead end, and archive the migrations with the feature.

Applying schema is deliberately left to the owner; nothing here has been
executed against the database beyond read-only probes.

| Family | Missing live | Revive-by (migration file) | Runtime entry points |
|---|---|---|---|
| **ZivoPay / payments — ✅ SCHEMA APPLIED 2026-09-04** | ~~nothing now~~ | `20260607163048` applied (with `driver_payouts` → `payment_driver_payouts` rename after a live name-collision with the legacy week-based payouts table); functions still to deploy | `zivopay-order`, `zivopay-stripe-webhook`, `zivopay-create-billing-portal`, `_shared/zivopay{,Chat,Software,Business,Driver,Admin}.ts` |
| **Post reactions — ✅ SCHEMA APPLIED 2026-09-04** | ~~`post_reactions`~~ | `20260429260001` applied (idempotent, 4 policies); the shared `20260505184000` review file is NOT applied — see review-system row | `usePostReactions`, `ReactionSummary`, `PostInsights` — feature now schema-backed |
| **Share-to-earn / referrals — ✅ SCHEMA APPLIED 2026-09-04** | ~~3 referral tables~~ (purchase_records still missing) | `20260601114500` applied (idempotent; RESTRICTIVE server-only-write policies); `purchase_records` lives in `20260406093000` (mixed file — owner review) | `share-to-earn-manage`, `referralProgram.ts` — schema-backed; `stripe-webhook`'s purchase_records still pending |
| **Account hub activity — ✅ SCHEMA APPLIED 2026-09-04** | ~~`account_hub_activity`~~ | `20260608000000` applied (idempotent, RLS own-rows, grant) | `MorePage`, `ActivityLogPage` — feature now schema-backed |
| **SMS audit log** | `sms_send_log` | `20260509120000_unified_notifications.sql` | `send-sms`, `AdminNotificationAnalyticsPage` |
| **Login protection** | `auth_login_protection` (function `auth_record_login_attempt` EXISTS) | `20260411170000_auth_shield_lockout.sql` | auth Edge Functions — **verify the existing function's write path before enabling anything** |
| **Group message reports** | `group_message_reports` | `20260526165000_sensitive_media_controls.sql` | chat moderation paths |
| **Salon memberships — ✅ SCHEMA APPLIED 2026-09-04** | ~~`salon_membership_tiers`~~ | `20260602000000` applied: tiers + client_memberships + BOTH RPCs created | salon membership UI now schema-backed |
| **Store payroll** | `store_payroll_configs` | part of `20260406091500_super_app_architecture.sql` (shared file — extracting payroll means splitting it) | — |
| **Hotel reviews / review system — ⚠ CONFLICTED, owner review** | `hotel_reviews`, `review_votes`, `review_flags` absent — BUT `reviews`, `restaurant_reviews`, `car_rental_reviews` ALREADY EXIST live (divergent partial system via other migrations); the file's non-idempotent creates would collide | Do NOT apply `20260505184000` as-is; reconcile the live partial review system first |
| **Super-app warehouse/truck** | `warehouse_inventory`, `truck_inventory`, `truck_offline_sales_queue` | `20260406091500_super_app_architecture.sql` | `truck_inventory` referenced in 1 runtime file |

## P0 verdict (bus payments — resolved, no live risk)

`stripe-bus-webhook` referencing the absent `bus_stripe_webhook_events` is
**staged, not deployed** (per the function's own header): bus payment functions
are intentionally held out of deploy; bookings use operator-driven capture as
the interim model. No production payment-integrity exposure today. Deploying
the bus payment set later requires applying its schema first.

## Related finding: the archive experiment (disproven)

Moving the 220 "zero-runtime-reference" migrations to
`supabase/migrations-archived/` was attempted and **fully reverted**: a
repo-wide filename scan found **zero** of them unreferenced — ~100+ are pinned
by content in `src/test/workflows/*` (86 tests failed while moved), plus
scripts and docs. Migration files in this repo are load-bearing artifacts;
archive only after updating every pinning test, if ever.

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
| **ZivoPay / payments** | `payment_customers`, `payment_orders`, `payment_invoices`, `payment_refunds`, `payment_subscriptions`, `payment_transactions`, `payment_webhook_events`, `payment_audit_logs`, `payment_support_threads`, `payment_methods`, `business_billing_profiles` | `20260607163048_zivosmedia_payments_foundation.sql` (the entire family is this ONE file from merged PR #57) | `zivopay-order`, `zivopay-stripe-webhook`, `zivopay-create-billing-portal`, `_shared/zivopay{,Chat,Software,Business}.ts` |
| **Post reactions** | `post_reactions`, `review_flags` | `20260429260001_post_reactions.sql`, `20260505184000_review_and_rating_system.sql` | `usePostReactions`, `ReactionSummary`, `PostInsights` |
| **Share-to-earn / referrals** | `user_referral_codes`, `referral_shares`, `referral_conversions`, `purchase_records` | `20260601114500_share_to_earn_server_gate.sql` (+ `20260406093000_launch_security_deeplink_pulse.sql` for referral shares) | `share-to-earn-manage`, `stripe-webhook` (purchase_records), `src/config/referralProgram.ts` |
| **Account hub activity** | `account_hub_activity` | `20260608000000_account_hub_activity.sql` | `MorePage`, `ActivityLogPage` |
| **SMS audit log** | `sms_send_log` | `20260509120000_unified_notifications.sql` | `send-sms`, `AdminNotificationAnalyticsPage` |
| **Login protection** | `auth_login_protection` (function `auth_record_login_attempt` EXISTS) | `20260411170000_auth_shield_lockout.sql` | auth Edge Functions — **verify the existing function's write path before enabling anything** |
| **Group message reports** | `group_message_reports` | `20260526165000_sensitive_media_controls.sql` | chat moderation paths |
| **Salon memberships** | `salon_membership_tiers` | `20260602000000_salon_memberships.sql` | salon public RPCs (`salon_public_get_membership_tiers` etc. — also absent) |
| **Store payroll** | `store_payroll_configs` | part of `20260406091500_super_app_architecture.sql` (shared file — extracting payroll means splitting it) | — |
| **Hotel reviews** | `hotel_reviews` | `20260505184000_review_and_rating_system.sql` (shared with post reactions) | no direct runtime references found (UI likely uses another path — verify before deciding) |
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

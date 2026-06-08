# ZIVO Supabase Table Inventory

Status: Generated 2026-06-07 (live, read-only via Supabase MCP) · Companion to
[`SUPABASE_PROJECT_MAP.md`](SUPABASE_PROJECT_MAP.md) and [`REPO_INVENTORY.md`](REPO_INVENTORY.md).

Method: `pg_class`/`pg_namespace` catalog query per project, `public` schema, `relkind='r'`.
Shows table name + RLS flag. Row estimates were all `-1` (tables not yet `ANALYZE`d), so
omitted.

## Summary

| Project | Ref | Public tables | RLS | Character |
| --- | --- | ---: | --- | --- |
| zivosmedia (hub) | `slirphzzwcogdbkeicff` | **1,414** | all RLS-enabled (0 without) | The super-app — every vertical lives here |
| Zivo software | `ydxztoresbdeoeijhxww` | 39 | all | Auto-repair (`ar_*`) + marketplace (`store_*`) |
| Zivo Driver | `yiedlgoxwjmansszdypf` | 26 | all | `drivers`, driver_*, wallets, ratings |
| Zivo Travel | `xbllvmpomorawkcrtbcq` | 7 | all | `zivo_travel_*` foundation/bridge |
| Zivo Admin | `wtdlbzgryuelpylijnkd` | **0** | — | Registry served by Node API + fixtures, not Supabase |

**Security baseline:** every table in every project has RLS enabled (no exceptions). RLS-on does
not prove policies are correct, but it is the right posture.

## Hub (`slirphzzwcogdbkeicff`) — table families

1,414 public tables. Largest families: `driver` (56), `user` (52), `zivo` (39), `cafe` (38),
`car` (36), `lodge` (29), `store` (29), `ar` (27), `salon` (22), `chat` (21), `p2p` (21),
`business` (17), `lodging` (17), `marketplace` (17), `order` (17), `bot` (16), `post` (16),
`ai` (14), `flight` (14), `group` (13), `marketing` (13), `merchant` (13), `service` (13),
`city` (12), `live` (12), `restaurant` (12), `admin` (11), `travel` (11). The long tail is
per-vertical feature tables not central to the cross-app architecture.

### Identity foundation — status: INERT (not applied)

`app_integrations`, `zivosmedia_auth_codes`, `linked_zivosmedia_users` do **not** exist on the
hub → migration `20260607161643_zivosmedia_auth_foundation.sql` is unapplied; the exchange flow
is inert end-to-end. Identity-adjacent tables that *do* exist: `oauth_states`,
`oauth_state_nonces`, `two_step_auth`, `linked_devices`.

### Chat/messaging — no unified thread primitive

Heavy chat schema exists (`chat_messages`, `chat_groups`, `chat_members`, `conversations`,
`direct_messages`, `messages`, `group_messages`, `live_chat_messages`, plus per-vertical
`order_messages`/`store_chat_messages`/`trip_messages`/`support_messages`/…), but there is **no
cross-app `chat_threads`** carrying `source_platform`/`app_key`/related-record IDs. The unified
thread primitive in [`ZIVOCHAT_FLOW.md`](ZIVOCHAT_FLOW.md) must be built.

### Business / Employee — partly exists already

`business_accounts`, `business_account_users`, `business_approval_requests`,
`business_authorized_drivers`, `business_invoices` (+ `business_invoice_line_items`,
`business_invoice_audit_log`), `business_cost_centers`, `business_departments`,
`business_employee_departments`, `business_policies`, `business_renter_accounts`,
`business_trip_expenses`, `employee_rules`, `employee_rule_acknowledgements`, `employee_shifts`,
`store_employees`, `store_employee_invites`, `store_employee_rules`. So the Business/Employee
*apps* are new, but the hub already has substantial business/employee data.

## ZivoPay consolidation map (the big one)

**Payments are fragmented per-vertical AND across projects.** There is no single payment schema —
each vertical and several projects carry their own payment/payout/wallet/webhook tables. This is
the gap [`PAYMENT_ARCHITECTURE.md`](PAYMENT_ARCHITECTURE.md) targets: ZivoPay is a **consolidation
refactor**, not greenfield.

| ZivoPay target (unified) | Current fragmented tables to consolidate (hub unless noted) |
| --- | --- |
| `payment_orders` / `payment_records` | `payment_records`, `bbq_payments`, `cafe_payments`, `car_rental_payment_attempts`, `driver_company_payments`, `group_order_payments`, `job_payments`, `travel_payments`, `bill_split_payments`, `zivo_payment_events`, `flight_payment_audit_log`; **software:** `ar_invoice_payments` |
| `payment_methods` | `zivo_payment_methods`, `store_payment_methods`, `business_payment_methods`, `store_payment_settings`, `partner_checkout_config` |
| `wallets` + `wallet_transactions` | `wallets`, `wallet_balances`, `wallet_ledger`, `wallet_transactions`, `user_wallets`(+`_transactions`), `customer_wallets`(+`_transactions`), `driver_wallets`, `restaurant_wallets`(+`_transactions`), `user_promo_wallet`, `zivo_wallet_credits`, `zivo_wallet_transactions`, `ads_studio_wallet`, `ads_wallet_ledger`; **driver project also has `wallet_balances`/`wallet_ledger`** |
| `payment_subscriptions` | `subscription_plans`, `subscription_tiers`, `user_subscriptions`, `creator_subscriptions`, `podcast_subscriptions`, `zivo_subscriptions`, `zivo_subscription_plans` |
| `payment_invoices` | `invoices`, `business_invoices`(+line_items/audit_log); **software:** `ar_invoices` |
| `payment_refunds` + `payment_disputes` | `refunds`, `refund_requests`, `ride_refund_requests`, `payment_disputes`, `lodge_refund_disputes` |
| `driver_payouts` | `driver_payouts`, `driver_payout_methods`, `driver_payout_settings`; **driver project also has `driver_payouts` + `zivo_payouts`** |
| `business_payouts` / merchant | `merchant_payouts`, `merchant_payout_runs`(+`_run_items`), `supplier_payouts`, `salon_commission_payouts`, `cafe_tip_payouts`(+`_lines`), `affiliate_payouts`, `creator_payouts`, `marketplace_payouts`, `p2p_payouts`, `eats_payout_ledger`/`eats_payout_requests`, `lodge_payout_ledger`/`lodge_payout_requests`, `customer_payout_methods`; **software:** `ar_payouts` |
| `payout_runs` (shared infra) | `payout_runs`, `payout_run_items`, `payout_batches`, `payout_items`, `payout_holds`, `payout_schedules`, `payout_settings`, `payout_notifications`, `zivo_payout_items`, `zivo_payout_schedules`, `zivo_payouts`, `zivo_service_payouts` |
| provider accounts | `stripe_connect_accounts`, `driver_stripe`, `driver_stripe_accounts` |
| `payment_webhook_events` (one table, provider column) | `stripe_webhook_events`, `stripe_event_log`, `square_webhook_events`, `car_rental_stripe_webhook_events`, `eats_paypal_webhook_events`, `eats_square_webhook_events`, `grocery_paypal_webhook_events`, `grocery_square_webhook_events`, `lodging_stripe_webhook_events`, `lodging_paypal_webhook_events`, `lodging_square_webhook_events`, `tip_paypal_webhook_events`, `tip_square_webhook_events`, `webhook_events`, `webhook_event_logs`, `webhook_endpoints` |

**Implications for the build order:** ZivoPay (Step 5) cannot be a clean greenfield schema —
it must (a) define the unified model, (b) write provider adapters, then (c) migrate/alias the
fragmented tables incrementally with backfill + idempotency, **never destructively**. Do not
attempt a big-bang cutover. Stripe-first, test mode, owner approval before any live move.

## Product projects — full lists

**Zivo Driver (`yiedlgoxwjmansszdypf`, 26):** admin_security_alerts, blocked_entities,
device_tokens, driver_daily_goals, driver_documents, driver_earnings, driver_limits,
driver_location_events, driver_location_history, driver_locations, driver_notifications,
driver_payouts, driver_performance_metrics, driver_vehicles, drivers, drivers_status, otp_codes,
passenger_ratings, push_tokens, risk_events, trip_ratings, user_limits, vehicles,
wallet_balances, wallet_ledger, zivo_payouts.
**No `trips`/`driver_jobs` table** → the Travel↔Driver job primitive
([`TRAVEL_DRIVER_FLOW.md`](TRAVEL_DRIVER_FLOW.md)) still needs building.

**Zivo Travel (`xbllvmpomorawkcrtbcq`, 7):** zivo_travel_backend_links,
zivo_travel_booking_intents, zivo_travel_partner_workflows, zivo_travel_search_events,
zivo_travel_service_catalog, zivo_travel_support_tickets, zivo_travel_sync_runs.

**Zivo software (`ydxztoresbdeoeijhxww`, 39):** app_settings, ar_bays, ar_customer_notes,
ar_customer_vehicles, ar_estimates, ar_expense_items, ar_expenses, ar_fleet_accounts,
ar_inspections, ar_invoice_payments, ar_invoices, ar_job_photos, ar_labor_entries,
ar_loaner_vehicles, ar_parts, ar_payouts, ar_recall_checks, ar_service_catalog,
ar_service_reminders, ar_supplier_credentials, ar_technicians, ar_tires, ar_vin_lookups,
ar_warranties, ar_work_orders, brands, csp_violations, eats_zones, pricing_config, profiles,
projects, service_bookings, store_messages, store_post_comments, store_posts, store_products,
store_profiles, store_promotions, store_reviews.
**No `software_products`/`software_subscriptions`/`business_software_entitlements`** here — the
subscription backend referenced in [`BUSINESS_SOFTWARE_FLOW.md`](BUSINESS_SOFTWARE_FLOW.md) lives
on the hub, not this project.

**Zivo Admin (`wtdlbzgryuelpylijnkd`, 0):** no public tables. The platform registry + operational
reads are served by the Node Admin API over service-role connections to product projects, not by
Admin-project tables.

The hub's full 1,414-name list is large; this doc enumerates the cross-cutting families
(identity, chat, business/employee, payments). Ask if you want the complete dump.

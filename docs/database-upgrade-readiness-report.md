# Database Upgrade Readiness Report

Generated: 2026-05-26T20:14:03.337Z

## Summary

- Supabase CLI: 2.100.0
- Local migrations: 830
- Invalid migration filenames: 0
- Duplicate migration versions: 24
- Allowed legacy duplicate migration versions: 8
- New duplicate migration versions: 16
- Duplicate SQL hashes: 0
- Last linked drift report: local=830, remote=1409, matched=0, remoteError=no, generated=2026-05-26T20:13:59.087Z
- Declared extensions: btree_gist, citext, pg_cron, pg_net, pg_trgm, pgcrypto
- Postgres 17 unsupported extensions found: 0
- Public tables created in migrations: 860
- Public tables needing RLS review: 0
- Recent public tables needing Data API grant review: 92
- Views needing security_invoker review: 0
- SECURITY DEFINER files needing search_path review: 0

## Blockers

- 16 new duplicate migration version(s) need reconciliation before db push/pull.
- Local and remote migration histories have zero matching versions.

## Warnings

- 92 recent public table(s) should be reviewed for explicit Data API grants after the Supabase exposure change.

## Duplicate Versions

- 20260429230000: 20260429230000_security_hardening.sql, 20260429230000_user_posts_visibility_location.sql (allowed legacy duplicate)
- 20260429240000: 20260429240000_backfill_storage_paths.sql, 20260429240000_increment_user_post_views.sql (allowed legacy duplicate)
- 20260429250000: 20260429250000_post_actions_tables.sql, 20260429250000_user_posts_realtime.sql (allowed legacy duplicate)
- 20260429260000: 20260429260000_post_comments_realtime.sql, 20260429260000_post_reactions.sql (allowed legacy duplicate)
- 20260430020000: 20260430020000_blocked_link_attempts.sql, 20260430020000_fix_social_notification_triggers.sql (allowed legacy duplicate)
- 20260430040000: 20260430040000_ar_shop_settings_column.sql, 20260430040000_comment_pinning.sql (allowed legacy duplicate)
- 20260430050000: 20260430050000_booking_to_workorder_link.sql, 20260430050000_post_comments_pin_and_edit.sql (allowed legacy duplicate)
- 20260430060000: 20260430060000_ar_estimates_share_token.sql, 20260430060000_post_comments_notification_trigger.sql (allowed legacy duplicate)
- 20260525100000: 20260525100000_cafe_baristas.sql, 20260525100000_cafe_orders_realtime_publication.sql (needs reconciliation)
- 20260525110000: 20260525110000_cafe_auto_expire_pending.sql, 20260525110000_cafe_time_entries.sql (needs reconciliation)
- 20260525120000: 20260525120000_cafe_orders_status_timestamps.sql, 20260525120000_cafe_reviews.sql (needs reconciliation)
- 20260525130000: 20260525130000_cafe_orders_recalc_on_adjustment.sql, 20260525130000_cafe_promotions.sql (needs reconciliation)
- 20260525400000: 20260525400000_cafe_customer_summary.sql, 20260525400000_car_rental_initial.sql (needs reconciliation)
- 20260525410000: 20260525410000_cafe_till_drops.sql, 20260525410000_car_rental_expenses_maintenance.sql (needs reconciliation)
- 20260525420000: 20260525420000_cafe_last_order_items.sql, 20260525420000_car_rental_reviews_promotions.sql (needs reconciliation)
- 20260525430000: 20260525430000_cafe_tip_payouts.sql, 20260525430000_car_rental_blackouts.sql (needs reconciliation)
- 20260525440000: 20260525440000_cafe_daily_message.sql, 20260525440000_car_rental_damage_photos.sql (needs reconciliation)
- 20260525450000: 20260525450000_cafe_review_summary.sql, 20260525450000_car_rental_compliance_and_tax.sql (needs reconciliation)
- 20260525460000: 20260525460000_cafe_reservations.sql, 20260525460000_car_rental_refunds.sql (needs reconciliation)
- 20260525500000: 20260525500000_cafe_menu_allergens.sql, 20260525500000_car_dealership_initial.sql (needs reconciliation)
- 20260525510000: 20260525510000_cafe_menu_happy_hour.sql, 20260525510000_car_dealership_promotions.sql (needs reconciliation)
- 20260525520000: 20260525520000_cafe_rpc_happy_hour.sql, 20260525520000_car_dealership_customer_interactions.sql (needs reconciliation)
- 20260525530000: 20260525530000_cafe_bundles.sql, 20260525530000_car_dealership_deal_documents.sql (needs reconciliation)
- 20260525540000: 20260525540000_cafe_rpc_bundles.sql, 20260525540000_car_dealership_public_reviews.sql (needs reconciliation)

## Postgres 17 Extension Review

- None

## RLS Review Candidates

- None

## Data API Grant Review Candidates

- store_payment_settings: supabase/migrations/20260524010000_store_payment_settings.sql
- salon_services: supabase/migrations/20260524020000_salon_services.sql
- salon_stylists: supabase/migrations/20260524030000_salon_stylists.sql
- salon_stylist_services: supabase/migrations/20260524030000_salon_stylists.sql
- salon_clients: supabase/migrations/20260524040000_salon_clients.sql
- salon_bookings: supabase/migrations/20260524050000_salon_bookings.sql
- salon_expenses: supabase/migrations/20260524060000_salon_expenses.sql
- salon_waitlist: supabase/migrations/20260524070000_salon_waitlist_and_schedules.sql
- salon_stylist_schedules: supabase/migrations/20260524070000_salon_waitlist_and_schedules.sql
- salon_packages: supabase/migrations/20260524080000_salon_packages_retail_loyalty_reviews.sql
- salon_package_services: supabase/migrations/20260524080000_salon_packages_retail_loyalty_reviews.sql
- salon_retail_products: supabase/migrations/20260524080000_salon_packages_retail_loyalty_reviews.sql
- salon_loyalty_settings: supabase/migrations/20260524080000_salon_packages_retail_loyalty_reviews.sql
- salon_loyalty_events: supabase/migrations/20260524080000_salon_packages_retail_loyalty_reviews.sql
- salon_reviews: supabase/migrations/20260524080000_salon_packages_retail_loyalty_reviews.sql
- salon_booking_retail_items: supabase/migrations/20260524100000_salon_booking_retail_items.sql
- salon_blockouts: supabase/migrations/20260524140000_salon_blockouts.sql
- salon_store_closures: supabase/migrations/20260524150000_salon_store_closures.sql
- salon_gift_cards: supabase/migrations/20260524160000_salon_gift_cards.sql
- salon_gift_card_redemptions: supabase/migrations/20260524160000_salon_gift_cards.sql
- salon_time_entries: supabase/migrations/20260524170000_salon_time_entries.sql
- salon_booking_addons: supabase/migrations/20260524210000_salon_booking_addons_and_commission_payouts.sql
- salon_commission_payouts: supabase/migrations/20260524210000_salon_booking_addons_and_commission_payouts.sql
- salon_reminder_settings: supabase/migrations/20260524360000_salon_reminders.sql
- salon_reminders: supabase/migrations/20260524360000_salon_reminders.sql
- salon_notification_template_overrides: supabase/migrations/20260524380000_salon_reminders_followup.sql
- salon_sms_inbound_log: supabase/migrations/20260524380000_salon_reminders_followup.sql
- salon_campaigns: supabase/migrations/20260524390000_salon_campaigns.sql
- salon_campaign_recipients: supabase/migrations/20260524390000_salon_campaigns.sql
- cafe_categories: supabase/migrations/20260525000000_cafe_categories.sql
- cafe_menu_items: supabase/migrations/20260525010000_cafe_menu_items.sql
- cafe_modifier_groups: supabase/migrations/20260525020000_cafe_modifiers.sql
- cafe_modifiers: supabase/migrations/20260525020000_cafe_modifiers.sql
- cafe_menu_item_modifier_groups: supabase/migrations/20260525020000_cafe_modifiers.sql
- cafe_tables: supabase/migrations/20260525030000_cafe_tables.sql
- cafe_orders: supabase/migrations/20260525040000_cafe_orders.sql
- cafe_order_items: supabase/migrations/20260525050000_cafe_order_items.sql
- cafe_order_item_modifiers: supabase/migrations/20260525050000_cafe_order_items.sql
- cafe_payments: supabase/migrations/20260525060000_cafe_payments.sql
- cafe_gift_cards: supabase/migrations/20260525080000_cafe_gift_cards.sql
- cafe_gift_card_redemptions: supabase/migrations/20260525080000_cafe_gift_cards.sql
- cafe_expenses: supabase/migrations/20260525090000_cafe_expenses.sql
- cafe_baristas: supabase/migrations/20260525100000_cafe_baristas.sql
- cafe_time_entries: supabase/migrations/20260525110000_cafe_time_entries.sql
- cafe_reviews: supabase/migrations/20260525120000_cafe_reviews.sql
- cafe_promotions: supabase/migrations/20260525130000_cafe_promotions.sql
- cafe_inventory_items: supabase/migrations/20260525140000_cafe_inventory_items.sql
- cafe_recipes: supabase/migrations/20260525150000_cafe_recipes.sql
- cafe_inventory_movements: supabase/migrations/20260525160000_cafe_inventory_movements.sql
- cafe_suppliers: supabase/migrations/20260525170000_cafe_suppliers.sql
- cafe_purchase_orders: supabase/migrations/20260525180000_cafe_purchase_orders.sql
- cafe_purchase_order_items: supabase/migrations/20260525180000_cafe_purchase_orders.sql
- cafe_loyalty_programs: supabase/migrations/20260525190000_cafe_loyalty.sql
- cafe_loyalty_balances: supabase/migrations/20260525190000_cafe_loyalty.sql
- cafe_loyalty_events: supabase/migrations/20260525190000_cafe_loyalty.sql
- cafe_shifts: supabase/migrations/20260525200000_cafe_shifts.sql
- cafe_hours: supabase/migrations/20260525280000_cafe_hours.sql
- cafe_settings: supabase/migrations/20260525300000_cafe_settings.sql
- cafe_till_sessions: supabase/migrations/20260525320000_cafe_till_sessions.sql
- car_rental_locations: supabase/migrations/20260525400000_car_rental_initial.sql
- car_rental_vehicles: supabase/migrations/20260525400000_car_rental_initial.sql
- car_rental_addons: supabase/migrations/20260525400000_car_rental_initial.sql
- car_rental_customers: supabase/migrations/20260525400000_car_rental_initial.sql
- car_rental_reservations: supabase/migrations/20260525400000_car_rental_initial.sql
- car_rental_reservation_addons: supabase/migrations/20260525400000_car_rental_initial.sql
- cafe_till_drops: supabase/migrations/20260525410000_cafe_till_drops.sql
- car_rental_expenses: supabase/migrations/20260525410000_car_rental_expenses_maintenance.sql
- car_rental_maintenance: supabase/migrations/20260525410000_car_rental_expenses_maintenance.sql
- car_rental_promotions: supabase/migrations/20260525420000_car_rental_reviews_promotions.sql
- car_rental_promo_redemptions: supabase/migrations/20260525420000_car_rental_reviews_promotions.sql
- cafe_tip_payouts: supabase/migrations/20260525430000_cafe_tip_payouts.sql
- cafe_tip_payout_lines: supabase/migrations/20260525430000_cafe_tip_payouts.sql
- car_rental_vehicle_blackouts: supabase/migrations/20260525430000_car_rental_blackouts.sql
- cafe_reservations: supabase/migrations/20260525460000_cafe_reservations.sql
- cafe_customer_notes: supabase/migrations/20260525490000_cafe_customer_notes.sql
- car_dealership_vehicles: supabase/migrations/20260525500000_car_dealership_initial.sql
- car_dealership_customers: supabase/migrations/20260525500000_car_dealership_initial.sql
- car_dealership_leads: supabase/migrations/20260525500000_car_dealership_initial.sql
- car_dealership_test_drives: supabase/migrations/20260525500000_car_dealership_initial.sql
- car_dealership_sales: supabase/migrations/20260525500000_car_dealership_initial.sql
- ...and 12 more

## View Review Candidates

- None

## Remote SQL To Run Before Upgrade

```sql
select version();
select extname, extversion from pg_extension order by extname;
select version from supabase_migrations.schema_migrations order by version;
select table_schema, table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;
select schemaname, tablename
from pg_tables t
join pg_class c on c.relname = t.tablename
join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
where schemaname = 'public' and not c.relrowsecurity
order by schemaname, tablename;
```

## Upgrade Path

1. Install/authenticate Supabase CLI or MCP and refresh `docs/supabase-migration-drift-report.md`.
2. Reconcile duplicate local migration versions without rewriting already-applied production history.
3. Compare remote schema history to local migrations and decide whether this repo needs a baseline migration.
4. Confirm no Postgres 17-unsupported extensions are installed remotely.
5. For every public table that must be reachable through REST/GraphQL, enable RLS and add explicit grants for `anon` and/or `authenticated`.
6. Run Supabase advisors, type generation, API readiness, secret scan, and a production build.

-- Supabase migration reconciliation repair draft
-- Generated: 2026-09-04T18:46:02.592Z
--
-- Review-only artifact. Do not run this file as-is.
-- Every repair statement is commented out until local/remote SQL intent is manually verified.
-- Keep a backup of supabase_migrations.schema_migrations before any approved history repair.
--
-- Candidate mappings: 17
-- High confidence (<= 5 seconds apart): 3
-- Medium confidence (6-60 seconds apart): 14
--
-- Suggested manual review query before any repair:
-- select version, name, statements from supabase_migrations.schema_migrations order by version;
--
begin;

-- high: remote 20260525191031 -> local 20260525191033 (2s) 20260525191033_driver_earnings_ride_requests.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260525191033'
-- where version = '20260525191031'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260525191033');

-- high: remote 20260525155957 -> local 20260524400000 (3s) 20260524400000_salon_stripe_deposits.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260524400000'
-- where version = '20260525155957'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260524400000');

-- high: remote 20260527152005 -> local 20260527152000 (5s) 20260527152000_ar_estimates_tax_rate_and_expire_cron.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527152000'
-- where version = '20260527152005'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527152000');

-- medium: remote 20260525190006 -> local 20260525190000 (6s) 20260525190000_cafe_loyalty.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260525190000'
-- where version = '20260525190006'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260525190000');

-- medium: remote 20260527040009 -> local 20260525520001 (8s) 20260525520001_car_dealership_customer_interactions.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260525520001'
-- where version = '20260527040009'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260525520001');

-- medium: remote 20260527150010 -> local 20260527150000 (10s) 20260527150000_ar_estimates_discount_cents.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527150000'
-- where version = '20260527150010'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527150000');

-- medium: remote 20260603120012 -> local 20260603120000 (12s) 20260603120000_ar_estimate_public_rpcs.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260603120000'
-- where version = '20260603120012'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260603120000');

-- medium: remote 20260527140942 -> local 20260527141000 (18s) 20260527141000_ar_job_photos.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527141000'
-- where version = '20260527140942'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527141000');

-- medium: remote 20260527151021 -> local 20260527151000 (21s) 20260527151000_ar_invoices_estimates_backfill_subtotals.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527151000'
-- where version = '20260527151021'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527151000');

-- medium: remote 20260601164428 -> local 20260601164500 (32s) 20260601164500_car_dealership_reviews_server_gate.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260601164500'
-- where version = '20260601164428'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260601164500');

-- medium: remote 20260601192927 -> local 20260601193000 (33s) 20260601193000_car_rental_customers_server_gate.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260601193000'
-- where version = '20260601192927'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260601193000');

-- medium: remote 20260524185923 -> local 20260524190000 (37s) 20260524190000_salon_public_stylist_and_review_rpcs.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260524190000'
-- where version = '20260524185923'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260524190000');

-- medium: remote 20260526145035 -> local 20260526145114 (39s) 20260526145114_feed_preferences.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260526145114'
-- where version = '20260526145035'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260526145114');

-- medium: remote 20260605030112 -> local 20260605030155 (43s) 20260605030155_lockdown_auto_repair_internal_function_grants.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260605030155'
-- where version = '20260605030112'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260605030155');

-- medium: remote 20260601201548 -> local 20260601201500 (48s) 20260601201500_car_rental_store_settings_server_gate.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260601201500'
-- where version = '20260601201548'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260601201500');

-- medium: remote 20260527145351 -> local 20260527145444 (53s) 20260527145444_group_paid_media_bundles.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527145444'
-- where version = '20260527145351'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527145444');

-- medium: remote 20260527142901 -> local 20260527143000 (59s) 20260527143000_store_promotions_reviews_messages.sql
-- update supabase_migrations.schema_migrations
-- set version = '20260527143000'
-- where version = '20260527142901'
--   and not exists (select 1 from supabase_migrations.schema_migrations where version = '20260527143000');

-- Verify after applying an approved subset:
-- select version from supabase_migrations.schema_migrations order by version;

rollback;

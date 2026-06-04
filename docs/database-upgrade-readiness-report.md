# Database Upgrade Readiness Report

Generated: 2026-06-04T22:32:32.304Z

## Summary

- Supabase CLI: 2.100.0
- Local migrations: 1080
- Invalid migration filenames: 0
- Duplicate migration versions: 6
- Allowed legacy duplicate migration versions: 0
- New duplicate migration versions: 6
- Duplicate SQL hashes: 0
- Last linked drift report: local=1080, remote=0, matched=0, near5s=0, near60s=0, oneToOne5s=0, oneToOne60s=0, unmatchedLocal=1080, unmatchedRemote=0, localAfterRemoteRange=0, sharedDays=0, remoteError=no, generated=2026-06-04T22:32:31.619Z
- Pending local migration gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0
- Declared extensions: btree_gist, citext, pg_cron, pg_net, pg_trgm, pgcrypto
- Postgres 17 unsupported extensions found: 0
- Public tables created in migrations: 901
- Public tables needing RLS review: 0
- Recent public tables needing Data API grant review: 6
- Views needing security_invoker review: 0
- SECURITY DEFINER files needing search_path review: 0
- Hardcoded Supabase URLs in migrations: 34
- Hardcoded scheduled/function endpoint URLs: 18
- Cron function URL remediation migration present: yes
- Hardcoded legacy anon JWTs in migrations: 14
- Hardcoded legacy anon JWTs in scheduled/function SQL: 13
- Cron anon-key remediation migration present: yes
- Cron remediation regex issues: 0

## Blockers

- 6 new duplicate migration version(s) need reconciliation before db push/pull.

## Warnings

- 6 recent public table(s) should be reviewed for explicit Data API grants after the Supabase exposure change.

## Duplicate Versions

- 20260601000000: 20260601000000_revoke_anon_execute_admin_rpcs.sql, 20260601000000_salon_color_formulas.sql (needs reconciliation)
- 20260601194500: 20260601194500_bus_booking_schema.sql, 20260601194500_car_rental_reservations_server_gate.sql (needs reconciliation)
- 20260601210000: 20260601210000_bus_my_bookings_rpc.sql, 20260601210000_car_dealership_expenses_server_gate.sql (needs reconciliation)
- 20260601211500: 20260601211500_car_dealership_financing_server_gate.sql, 20260601211500_fix_bus_rls_store_owner.sql (needs reconciliation)
- 20260612000200: 20260612000200_add_ar_estimate_issue_and_start_dates.sql, 20260612000200_ar_invoices_estimates_mileage.sql (needs reconciliation)
- 20260612000300: 20260612000300_add_ar_invoice_issue_and_start_dates.sql, 20260612000300_ar_invoices_estimates_vsm_fields.sql (needs reconciliation)

## Postgres 17 Extension Review

- None

## RLS Review Candidates

- None

## Data API Grant Review Candidates

- bus_routes: supabase/migrations/20260601194500_bus_booking_schema.sql
- bus_trips: supabase/migrations/20260601194500_bus_booking_schema.sql
- bus_bookings: supabase/migrations/20260601194500_bus_booking_schema.sql
- channel_removed_users: supabase/migrations/20260602033500_add_channel_removed_users.sql
- channel_admin_log: supabase/migrations/20260602034000_add_channel_admin_log.sql
- channel_invite_links: supabase/migrations/20260602035000_add_channel_invite_links.sql

## View Review Candidates

- None

## Hardcoded Supabase URL Review

- storage-object: supabase/migrations/20260326202539_3298121e-84c7-4d56-974f-3f1a46b6fb61.sql:3 (https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-posts/posts/1dd04bf0-9ffd-4155-9fe8-f582881b1ead/1774556579080.mp4)
- scheduled-function-endpoint: supabase/migrations/20260331022139_0960ad68-2dae-4fab-ad0c-dc208eddbaf5.sql:7 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/auto-cancel-stale-orders)
- scheduled-function-endpoint: supabase/migrations/20260406020001_meta_capi_bridge_webhooks.sql:43 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/meta-capi-bridge)
- project-url: supabase/migrations/20260406061300_42af212f-257b-4941-8a11-53fa5a4fe9fa.sql:20 (https://slirphzzwcogdbkeicff.supabase.co)
- function-endpoint: supabase/migrations/20260406091500_super_app_architecture.sql:393 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/meta-conversion-handler)
- scheduled-function-endpoint: supabase/migrations/20260407013601_b2ab3302-a83f-4900-8ad1-28334fa75eb9.sql:90 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/meta-capi-bridge)
- scheduled-function-endpoint: supabase/migrations/20260421154049_2b800c91-6958-4fd1-8387-947a29759829.sql:20 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ads-studio-auto-winner)
- scheduled-function-endpoint: supabase/migrations/20260421154049_2b800c91-6958-4fd1-8387-947a29759829.sql:33 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ads-studio-publish)
- scheduled-function-endpoint: supabase/migrations/20260421155541_f3c2680b-a458-4667-8d70-37465ced87e9.sql:10 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ads-studio-budget-guard)
- scheduled-function-endpoint: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:19 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/dispatch-escalate)
- scheduled-function-endpoint: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:32 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/dispatch-escalate)
- scheduled-function-endpoint: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:45 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/dispatch-escalate)
- scheduled-function-endpoint: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:58 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/dispatch-escalate)
- scheduled-function-endpoint: supabase/migrations/20260421201221_0806eaf5-3ee5-4b2e-b391-cb71ce315bc5.sql:19 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/close-trip-call-sessions)
- function-endpoint: supabase/migrations/20260421201952_99bf7cfa-c6b1-4722-b898-669fd439bcc4.sql:11 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/close-ride-call-session)
- scheduled-function-endpoint: supabase/migrations/20260422020019_f3d8e688-6df1-4aab-9c4c-cf427cd305dc.sql:17 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/marketing-automations-tick)
- scheduled-function-endpoint: supabase/migrations/20260422020106_c7b5c875-882e-45a3-b3a9-91b3b5e5f279.sql:13 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/marketing-automations-tick)
- scheduled-function-endpoint: supabase/migrations/20260426162733_c3d6c3a6-712d-49ef-b8a9-c9cdca9f78a1.sql:15 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/channel-publish-scheduled)
- storage-object: supabase/migrations/20260427224910_67bfa090-44cd-4954-896b-a3d1e9a4923d.sql:66 (https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884994525-bghf6.webp)
- storage-object: supabase/migrations/20260427224910_67bfa090-44cd-4954-896b-a3d1e9a4923d.sql:67 (https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884991392-s7pfv.webp)
- storage-object: supabase/migrations/20260427224910_67bfa090-44cd-4954-896b-a3d1e9a4923d.sql:68 (https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884991962-np6he.webp)
- storage-object: supabase/migrations/20260427224910_67bfa090-44cd-4954-896b-a3d1e9a4923d.sql:69 (https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884992579-8wbbo.webp)
- storage-object: supabase/migrations/20260427224910_67bfa090-44cd-4954-896b-a3d1e9a4923d.sql:70 (https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884976699-is3wa.webp)
- storage-object: supabase/migrations/20260427224910_67bfa090-44cd-4954-896b-a3d1e9a4923d.sql:71 (https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884990803-8hof5.webp)
- scheduled-function-endpoint: supabase/migrations/20260508120000_bots_botfather.sql:144 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/bot-dispatch)
- project-url: supabase/migrations/20260509120000_unified_notifications.sql:72 (https://slirphzzwcogdbkeicff.supabase.co)
- project-url: supabase/migrations/20260509130000_notifications_followups.sql:85 (https://slirphzzwcogdbkeicff.supabase.co)
- project-url: supabase/migrations/20260509140000_provider_side_notifications.sql:119 (https://slirphzzwcogdbkeicff.supabase.co)
- project-url: supabase/migrations/20260509170000_live_and_payout_notifications.sql:56 (https://slirphzzwcogdbkeicff.supabase.co)
- scheduled-function-endpoint: supabase/migrations/20260509180000_notifications_cron_schedule.sql:23 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/notifications-cron)
- scheduled-function-endpoint: supabase/migrations/20260509190000_weekly_digest_schedule.sql:21 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/notifications-weekly-digest)
- project-url: supabase/migrations/20260509200000_grouped_social_notifications.sql:75 (https://slirphzzwcogdbkeicff.supabase.co)
- project-url: supabase/migrations/20260509210000_notifications_snooze.sql:42 (https://slirphzzwcogdbkeicff.supabase.co)
- scheduled-function-endpoint: supabase/migrations/20260527144000_ar_reminders_dispatch_cron.sql:11 (https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ar-reminders-dispatch)

For new cron/function SQL, prefer `current_setting('app.settings.supabase_url', true)` with a deploy-time setting instead of embedding a project URL.

## Hardcoded Legacy Anon JWT Review

- scheduled-function-auth: supabase/migrations/20260331022139_0960ad68-2dae-4fab-ad0c-dc208eddbaf5.sql:8 (sha256:c8e22010f6d3)
- anon-jwt: supabase/migrations/20260406091500_super_app_architecture.sql:394 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421154049_2b800c91-6958-4fd1-8387-947a29759829.sql:21 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421154049_2b800c91-6958-4fd1-8387-947a29759829.sql:34 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421155541_f3c2680b-a458-4667-8d70-37465ced87e9.sql:11 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:20 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:33 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:46 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421182035_80fd27b7-3ab8-482d-b620-5c98b4fa9023.sql:59 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260421201221_0806eaf5-3ee5-4b2e-b391-cb71ce315bc5.sql:20 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260426162733_c3d6c3a6-712d-49ef-b8a9-c9cdca9f78a1.sql:18 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260508120000_bots_botfather.sql:146 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260509180000_notifications_cron_schedule.sql:24 (sha256:c8e22010f6d3)
- scheduled-function-auth: supabase/migrations/20260509190000_weekly_digest_schedule.sql:22 (sha256:c8e22010f6d3)

Token values are intentionally not printed. For new cron/function SQL, prefer `current_setting('app.settings.supabase_anon_key', true)` with a deploy-time setting.

## Cron Remediation Regex Review

- None

## Runtime Settings SQL

Configure these per Supabase project after applying migrations. Generate guarded SQL with `npm run supabase:runtime-settings:sql`; see `docs/supabase-runtime-settings.md`.

```sql
alter database postgres set "app.settings.supabase_url" = 'https://<project-ref>.supabase.co';
alter database postgres set "app.settings.supabase_anon_key" = '<legacy-anon-or-compatible-function-auth-key>';
select pg_reload_conf();
```

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

1. Install/authenticate Supabase CLI or MCP and refresh `docs/supabase-migration-drift-report.md` with `npm run supabase:migrations:report`.
2. Review `docs/supabase-migration-reconciliation-plan.md` and reconcile local/remote version ids without rewriting already-applied production history.
3. Run `npm run supabase:migrations:linked:strict`; it must pass before production schema push/pull.
4. Confirm no Postgres 17-unsupported extensions are installed remotely.
5. For every public table that must be reachable through REST/GraphQL, enable RLS and add explicit grants for `anon` and/or `authenticated`.
6. Run Supabase advisors, type generation, API readiness, secret scan, and a production build.

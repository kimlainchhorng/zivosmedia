# Supabase Migration Reconciliation Plan

Generated: 2026-06-08T21:42:46.635Z

This plan is diagnostic only. It does not repair migration history or change the remote schema.

## Current State

- Local migrations: 1112
- Remote migration versions: 1561
- Exact version matches: 1
- One-to-one likely timestamp-drift matches: 616
- High-confidence one-to-one matches: 584
- Medium-confidence one-to-one matches: 32
- Unmatched local migrations: 495
- Unmatched local migrations inside remote version range: 481
- Unmatched local migrations after remote version range: 14
- Unmatched remote versions: 944
- Unmatched remote versions inside local version range: 944
- Unmatched remote versions before local version range: 0
- Unmatched remote versions after local version range: 0

## Pending Local Risk Summary

- Likely pending local migrations: 14
- Creates tables: 1
- Creates tables without RLS: 0
- Creates tables without explicit grants: 0
- Sequence-backed ids: 0
- Sequence-backed ids without sequence grants: 0
- SECURITY DEFINER migrations: 1
- SECURITY DEFINER without search_path: 0
- Cron migrations: 1
- Hardcoded Supabase URLs: 0
- Legacy anon JWTs: 0

## Review Files

- Candidate one-to-one map: `docs/supabase-migration-reconciliation-candidates.csv`
- Local migrations with no candidate: `docs/supabase-migration-unmatched-local.csv`
- Remote versions with no candidate: `docs/supabase-migration-unmatched-remote.csv`
- Likely pending local review: `docs/supabase-migration-pending-local-review.csv`
- Review-only repair SQL draft: `docs/supabase-migration-reconciliation-repair-draft.sql`

## Review Order

1. high-confidence candidate mappings (584 items)
2. medium-confidence candidate mappings (32 items)
3. unmatched local migrations after candidates (495 items)
4. unmatched remote versions after candidates (944 items)
5. likely pending local migrations after remote range (14 items)

## Recommended Sequence

1. Review the high-confidence one-to-one candidate map first. These are likely the same logical migrations with slightly different timestamp ids.
2. Review the medium-confidence candidate map next. These need more care because nearby timestamp does not prove SQL equivalence.
3. Inspect unmatched local migrations after the remote range. These are the strongest candidates for genuinely pending local work.
4. Inspect unmatched local migrations inside the remote range. These may be local-only additions, squashed/renamed migrations, or migrations represented differently in remote history.
5. Inspect unmatched remote versions inside the local range. These may be remote-only historical entries not represented by this repository.
6. Do not run production `db push`, `db pull`, or migration repair until the candidate map is reviewed against actual SQL/schema intent.

## Validation Commands

- Local migration hygiene: `npm run supabase:migrations:check:main`
- Linked soft report: `npm run supabase:migrations:report`
- Linked strict reconciliation gate: `npm run supabase:migrations:linked:strict`
- Full soft preflight: `npm run deploy:preflight -- --skip-build --skip-type-check`

## Likely Pending Local Migrations

These local migrations are newer than the latest remote migration version and have no one-to-one candidate match.
Review flags are generated in `docs/supabase-migration-pending-local-review.csv`.

- 20260609000000: 20260609000000_ar_reminders_secure_cron.sql (low, chat/social)
- 20260609000100: 20260609000100_add_increment_user_post_view_count_rpc.sql (high, security/auth)
- 20260610000000: 20260610000000_grant_channel_helper_execute.sql (high, security/auth)
- 20260611000000: 20260611000000_add_channel_subscriber_permissions.sql (high, security/auth)
- 20260611000500: 20260611000500_add_channel_permission_exceptions.sql (high, security/auth)
- 20260612000000: 20260612000000_add_store_default_language.sql (high, security/auth)
- 20260612000100: 20260612000100_store_products_owner_write_policies.sql (high, security/auth)
- 20260612000200: 20260612000200_add_ar_estimate_issue_and_start_dates.sql (high, chat/social)
- 20260612000200: 20260612000200_ar_invoices_estimates_mileage.sql (high, general)
- 20260612000300: 20260612000300_add_ar_invoice_issue_and_start_dates.sql (high, chat/social)
- 20260612000300: 20260612000300_ar_invoices_estimates_vsm_fields.sql (high, chat/social)
- 20260612000400: 20260612000400_ar_invoices_estimates_vehicle_engine.sql (high, general)
- 20260613000000: 20260613000000_ar_customer_vehicles_oil_specs.sql (high, general)
- 20260614000000: 20260614000000_zivosmedia_admin_customer_search_rpc.sql (high, security/auth)

## Current Gate

- Production schema work still requires normal readiness checks.

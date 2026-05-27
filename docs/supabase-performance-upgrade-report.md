# Supabase Performance Upgrade Report

Generated: 2026-05-18

## Completed

- Upgraded the package lock to current compatible dependency versions, including `@supabase/supabase-js` `2.106.0`, Vite `8.0.13`, Rollup `4.60.4`, and related build/runtime transitive packages.
- Added the Supabase CLI as a project dev dependency at `supabase` `2.100.0`, matching the current stable npm release checked during the upgrade.
- Applied a live Supabase database cleanup migration that removed all advisor-reported duplicate indexes.

## Database Speed Cleanup

Migration: `supabase/migrations/20260518204722_drop_duplicate_performance_indexes.sql`

Removed duplicate indexes/constraints that added write overhead without improving reads:

- `public.idx_activity_feed_user_recent`
- `public.idx_dm_receiver`
- `public.job_offers_job_driver_uniq`
- `public.job_offers_job_driver_unique`
- `public.lodge_room_blocks_room_date_uniq`
- `public.idx_marketplace_status`
- `public.idx_trip_shares_token_unique`

Supabase performance advisor result:

- Before cleanup: 6 `duplicate_index` warnings.
- After cleanup: 0 `duplicate_index` warnings.

## Remaining Advisor Work

The linked Supabase performance advisor still reports:

- 97 `auth_rls_initplan` warnings.
- 3048 `multiple_permissive_policies` warnings.

The linked security advisor still reports:

- 1 `security_definer_view` error on `public.bots_directory`.
- Security-definer function executable warnings for anonymous/authenticated roles.
- Mutable function `search_path` warnings.
- Public bucket listing warnings.

These are larger policy/security refactors and should be handled in focused migrations so row-level security behavior can be reviewed table by table.

## Local Environment Notes

- Global Supabase CLI was `2.95.4`; current stable checked during this pass was `2.100.0`.
- The project now pins `supabase` `^2.100.0` locally so npm scripts and `npx supabase ...` can use the project version after dependencies are reinstalled.
- A direct physical `npm update` was blocked because Windows had a native Vite/Rolldown binary open in `node_modules`. The lockfile is updated, but `node_modules` should be refreshed after stopping any dev/build server.
- Local Supabase status could not be checked because Docker was not running.

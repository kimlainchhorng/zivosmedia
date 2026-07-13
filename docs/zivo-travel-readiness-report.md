# Zivo Travel readiness report

Generated: 2026-06-06T00:20:14.452Z

## Summary

- Status: hold_for_target_project_verification
- Blockers: 0
- Warnings: 0
- Manual target-project checks required: 7

## Backend flag

- Dedicated backend flag in source config: present
- Dedicated backend enabled in .env.local: false

## Required Edge Function source folders

### flights

- Present: 8/8

### hotels

- Present: 9/9

### cars

- Present: 4/4

### bus

- Present: 2/2

### payouts

- Present: 9/9

## Local migration signal files

- flights: 51 local migration files mention matching table names.
- hotels: 64 local migration files mention matching table names.
- cars: 36 local migration files mention matching table names.
- bus: 6 local migration files mention matching table names.
- payouts: 207 local migration files mention matching table names.

## Manual target-project checks

- Target travel Supabase project has the travel engine schema, indexes, triggers, functions, and RLS policies applied.
- Target travel Supabase project exposes intended public tables/functions through explicit grants for anon/authenticated roles, with RLS enabled.
- Required Edge Functions are deployed to the target travel Supabase project, not just present in the repo.
- Provider API secrets and payment webhook secrets are configured in the target travel Supabase project.
- Storage buckets and bucket policies needed by travel workflows are created in the target travel Supabase project.
- Supabase Auth redirect allowlists include zivostravel.com, www.zivostravel.com, and auth handoff URLs.
- Sandbox payment, payout, flight, hotel, car, and bus smoke tests pass before live keys or the dedicated backend flag are enabled.

## Next safe step

Keep `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=false` until the manual target-project checks are complete. Local source folders and migration signal files are necessary, but they do not prove the dedicated travel Supabase project is ready for customer traffic.


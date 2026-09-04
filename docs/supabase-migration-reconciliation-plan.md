# Supabase Migration Reconciliation Plan

Generated: 2026-09-04T23:12:00.893Z

This plan is diagnostic only. It does not repair migration history or change the remote schema.

## Current State

- Local migrations: 1178
- Remote migration versions: 1768
- Exact version matches: 758
- One-to-one likely timestamp-drift matches: 17
- High-confidence one-to-one matches: 3
- Medium-confidence one-to-one matches: 14
- Unmatched local migrations: 403
- Unmatched local migrations inside remote version range: 403
- Unmatched local migrations after remote version range: 0
- Unmatched remote versions: 995
- Unmatched remote versions inside local version range: 995
- Unmatched remote versions before local version range: 0
- Unmatched remote versions after local version range: 0

## Pending Local Risk Summary

- Likely pending local migrations: 0
- Creates tables: 0
- Creates tables without RLS: 0
- Creates tables without explicit grants: 0
- Sequence-backed ids: 0
- Sequence-backed ids without sequence grants: 0
- SECURITY DEFINER migrations: 0
- SECURITY DEFINER without search_path: 0
- Cron migrations: 0
- Hardcoded Supabase URLs: 0
- Legacy anon JWTs: 0

## Review Files

- Candidate one-to-one map: `docs/supabase-migration-reconciliation-candidates.csv`
- Local migrations with no candidate: `docs/supabase-migration-unmatched-local.csv`
- Remote versions with no candidate: `docs/supabase-migration-unmatched-remote.csv`
- Likely pending local review: `docs/supabase-migration-pending-local-review.csv`
- Review-only repair SQL draft: `docs/supabase-migration-reconciliation-repair-draft.sql`

## Review Order

1. high-confidence candidate mappings (3 items)
2. medium-confidence candidate mappings (14 items)
3. unmatched local migrations after candidates (403 items)
4. unmatched remote versions after candidates (995 items)
5. likely pending local migrations after remote range (0 items)

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

- None

## Current Gate

- Production schema work still requires normal readiness checks.

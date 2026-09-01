# Supabase Migration Reconciliation Plan

Generated: 2026-08-31T00:34:18.825Z

This plan is diagnostic only. It does not repair migration history or change the remote schema.

## Current State

- Local migrations: 1169
- Remote migration versions: 1622
- Exact version matches: 11
- One-to-one likely timestamp-drift matches: 617
- High-confidence one-to-one matches: 584
- Medium-confidence one-to-one matches: 33
- Unmatched local migrations: 541
- Unmatched local migrations inside remote version range: 529
- Unmatched local migrations after remote version range: 12
- Unmatched remote versions: 994
- Unmatched remote versions inside local version range: 994
- Unmatched remote versions before local version range: 0
- Unmatched remote versions after local version range: 0

## Pending Local Risk Summary

- Likely pending local migrations: 12
- Creates tables: 0
- Creates tables without RLS: 0
- Creates tables without explicit grants: 0
- Sequence-backed ids: 0
- Sequence-backed ids without sequence grants: 0
- SECURITY DEFINER migrations: 6
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

1. high-confidence candidate mappings (584 items)
2. medium-confidence candidate mappings (33 items)
3. unmatched local migrations after candidates (541 items)
4. unmatched remote versions after candidates (994 items)
5. likely pending local migrations after remote range (12 items)

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

- 20260830183748: 20260830183748_eats_wallet_backend_reconciliation.sql (high, security/auth)
- 20260830185229: 20260830185229_harden_eats_order_creation_authority.sql (high, security/auth)
- 20260830190000: 20260830190000_eats_payment_cancellation_state_machine.sql (high, security/auth)
- 20260830190500: 20260830190500_eats_dispatch_idempotency.sql (high, security/auth)
- 20260830191000: 20260830191000_eats_inventory_promo_atomic_order.sql (high, security/auth)
- 20260830193000: 20260830193000_eats_manual_payout_authority.sql (high, security/auth)
- 20260830193500: 20260830193500_payout_method_verification_authority.sql (high, security/auth)
- 20260830194000: 20260830194000_eats_order_financial_authority.sql (high, security/auth)
- 20260830194511: 20260830194511_eats_order_creation_authority_hard_cutover.sql (high, security/auth)
- 20260831000449: 20260831000449_harden_auth_login_attempt_boundary.sql (high, security/auth)
- 20260831000607: 20260831000607_harden_backend_helper_caller_identity.sql (high, security/auth)
- 20260831002349: 20260831002349_harden_cafe_customer_lookup_and_loyalty_ownership.sql (high, security/auth)

## Current Gate

- Production schema work still requires normal readiness checks.

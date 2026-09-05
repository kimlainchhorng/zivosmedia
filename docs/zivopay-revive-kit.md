# ZivoPay revive kit — SCHEMA APPLIED 2026-09-04; functions remain to deploy

Applied under owner delegation after fixing the one blocker below. Live state
verified: 11 family tables + `business_billing_profiles` + renamed
`payment_driver_payouts` created; the LEGACY `driver_payouts` (week-based,
consumed by the deployed `driver-payout` function) untouched; 5 `zivo_*`
enums created; bookkeeping recorded (`migration repair --status applied
20260607163048`); drift scan green (matched 764). The tables are INERT until
the owner deploys the Edge Functions (`zivopay-order`,
`zivopay-stripe-webhook`, `zivopay-create-billing-portal` — currently 404)
with their Stripe secrets; the UI already gates on them.

## The blocker that was found and fixed (kept for the record)

The live MAIN project already has a **legacy `public.driver_payouts`**
(`id, driver_id, week_start, payout_type, amount, status, created_at, paid_at`
— the week-based payouts table, consumed by the DEPLOYED `driver-payout` Edge
function). The foundation file's own `driver_payouts` definition assumes its
new shape (`zivosmedia_user_id`, provider refs…). Because every create is
`if not exists`, the existing table is silently KEPT, and the first later
statement referencing `zivosmedia_user_id` on it fails:

```
ERROR: 42703: column "zivosmedia_user_id" does not exist
```

The one-command apply is therefore **retracted** until the file is corrected.

## The fix (owner decision, one option recommended)

- **Recommended — rename in the (unapplied) file**: `driver_payouts` →
  `payment_driver_payouts` in `20260607163048` + the `_shared/zivopay*.ts`
  references. The migration is unapplied and absent from remote bookkeeping,
  so editing it creates no drift. The legacy table keeps its deployed
  consumer untouched.
- Alternative: split the `driver_payouts` section into a follow-up migration
  reconciled with the legacy shape (slower; two payout tables coexist).

After the rename lands, re-run this kit's apply step.

## What reviving means (unchanged)

Apply one migration + deploy the zivopay Edge Functions together. The UI
already gates on their presence (the missing-function browser gates), so
schema-without-functions stays inert.

## The one command (schema — owner-run)

```bash
./node_modules/.bin/supabase db query --agent=no --linked < supabase/migrations/20260607163048_zivosmedia_payments_foundation.sql
```

Why this is safe to run as-is:
- **Fully idempotent** — every statement is `create ... if not exists`
  (11 tables, indexes, policies, grants; 459 lines; verified by scan).
- **Purely additive** — no inserts/updates/deletes, no drops, no alters of
  existing tables.
- **Bookkeeping self-heals** — after applying, run
  `supabase migration repair --status applied 20260607163048` so the drift
  scan matches (or let the next reconciliation pass pick it up).

Then deploy the functions (owner-run): `zivopay-order`,
`zivopay-stripe-webhook`, `zivopay-create-billing-portal` (plus reviewing
`_shared/zivopay{,Chat,Software,Business}.ts` consumers) with their Stripe
secrets provisioned.

## Post-apply verification (read-only)

```sql
select count(*) from information_schema.tables
where table_schema='public' and table_name like 'payment_%';  -- expect 10
select to_regclass('public.business_billing_profiles');        -- expect non-null
select to_regclass('public.driver_payouts');                   -- expect non-null
```

## Rollback

`drop table if exists` each created table (all 12 names are in the file's
`create table if not exists` statements). No existing data is touched at any
point, so rollback loses nothing.

## Findings that de-risked this

- zivopay-order / zivopay-stripe-webhook / zivopay-create-billing-portal →
  **HTTP 404 live** (not deployed — consistent staging, no broken endpoints).
- The foundation file is the ENTIRE family (merged PR #57); no other
  migrations prerequisite.
- Related non-issue: `auth_record_login_attempt` writes to `login_attempts`
  (exists, RLS enabled + policy) — the "missing" `auth_login_protection` file
  is just an unapplied evolution, not a live bug.

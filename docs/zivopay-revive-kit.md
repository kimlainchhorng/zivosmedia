# ZivoPay revive kit — one owner command from live

Prepared 2026-09-04. ZivoPay is fully **staged, not live**: the three Edge
functions answer 404 on the MAIN project (`slirphzzwcogdbkeicff`), and the
schema family they target was never applied. Nothing is half-broken in
production — reviving is a coordinated launch decision, and everything below
is verified so it is ONE decision, not an investigation.

## What reviving means

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

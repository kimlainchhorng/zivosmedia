-- MED-08 / MED-10 regression tests — RUN ON A NON-PRODUCTION CLONE / SUPABASE BRANCH.
-- Requires two fictional QA users (A, B) already signed up on the clone. Never run
-- against the 266-user production project. Execute after applying the remediation migration.
--
-- Usage (per user, via PostgREST/psql impersonating the user's JWT, or supabase test):
--   set request.jwt.claim.sub = '<QA_USER_A_UUID>'; set role authenticated;

-- ── MED-08: a non-owner authenticated user cannot read PII columns of others ─────
-- EXPECT: permission denied for column phone/email/date_of_birth (42501), OR (if the
-- client selects only granted cols) zero PII leakage. Either way, this must FAIL to
-- return other users' PII.
do $$
begin
  begin
    perform phone, email, date_of_birth
    from public.profiles
    where id <> (current_setting('request.jwt.claim.sub', true))::uuid
    limit 1;
    raise exception 'MED-08 REGRESSION: PII columns were selectable by a non-owner';
  exception when insufficient_privilege then
    raise notice 'MED-08 PASS: PII columns denied to non-owner (42501)';
  end;
end $$;

-- Owner PII path still works via the RPC (no direct column read needed).
-- EXPECT: returns exactly one row (the caller's own profile) including PII.
--   select * from public.get_my_profile();

-- ── MED-10: an owner cannot self-escalate trust/KYC/payout columns ───────────────
-- EXPECT: the UPDATE raises 'MED-10: … cannot be changed by the account owner'.
do $$
declare me uuid := (current_setting('request.jwt.claim.sub', true))::uuid;
begin
  begin
    update public.profiles
      set is_verified = true, kyc_status = 'verified',
          phone_verified = true, payout_hold = false
    where id = me;
    raise exception 'MED-10 REGRESSION: owner self-escalated trust columns';
  exception when others then
    if sqlerrm like 'MED-10:%' then
      raise notice 'MED-10 PASS: owner trust-column self-update rejected';
    else raise; end if;
  end;
end $$;

-- ── MED-09 (edge function; not SQL) — run as an integration test on the clone ─────
-- EXPECT: POST /functions/v1/auto-recharge-ads-wallet with `Authorization: Bearer <ANON_KEY>`
--   ⇒ HTTP 401/403 and ZERO Stripe PaymentIntents created (Stripe test mode).
--   Only x-cron-secret == INTERNAL_CRON_SECRET or the exact service-role Bearer succeeds.

-- ============================================================================
-- MED-08 (CRITICAL) + MED-10 (HIGH) remediation — public.profiles
-- Repo audited @ cb39920. Owner: zivosmedia. Project: slirphzzwcogdbkeicff (authority).
--
-- ⚠️ APPLY TO A NON-PRODUCTION CLONE / SUPABASE BRANCH FIRST, run the regression
--    tests in supabase/tests/med08_med10_regression.sql, THEN promote. Do NOT push
--    straight to the 266-user production project. This branch is not merged/deployed.
--
-- MED-08: migration 20260503161835 restored TABLE-LEVEL `GRANT SELECT ON profiles`
--   to authenticated+anon, reverting the column-level hardening of 20260428014827,
--   so any signed-in user could `SELECT phone, email, date_of_birth` for every public
--   profile. Fix: re-apply the column-level SELECT model (PII stays owner-only via
--   get_my_profile() / admin_get_profile()).
-- MED-10: the same migration restored TABLE-LEVEL `GRANT UPDATE`, and no column guard
--   exists on profiles (the 20260531234500 trigger covers only creator_profiles), so an
--   owner could self-set is_verified/kyc_status/phone_verified/payout_hold. Fix: a
--   BEFORE INSERT/UPDATE trigger that rejects non-service_role changes to trust columns.
-- ============================================================================

begin;

-- ── MED-08: restore column-level SELECT (mirrors 20260428014827) ────────────────
revoke select on public.profiles from anon, authenticated;

-- Non-PII, safe-to-read subset (identical to the 20260428014827 hardening). PII
-- columns (phone, phone_e164, phone_hash, email, date_of_birth, kyc_status,
-- background_check_status, …) are intentionally EXCLUDED — owners read them via
-- public.get_my_profile(); admins via public.admin_get_profile(uuid)/service_role.
grant select (
  id, user_id, full_name, username, avatar_url, cover_url, cover_position, bio,
  is_verified, is_private, profile_visibility, display_brand_name,
  social_facebook, social_instagram, social_tiktok, social_snapchat,
  social_x, social_linkedin, social_telegram, social_onlyfans,
  social_links_visible, social_links,
  comment_control, hide_like_counts, allow_mentions, allow_sharing,
  allow_friend_requests, hide_from_drivers,
  selected_city_id, selected_city_name, zone_id, loyalty_tier_id,
  affiliate_partner_name, status, last_seen, role, setup_complete,
  created_at, updated_at
) on public.profiles to authenticated, anon;

-- ── MED-10: guard trust / KYC / payout columns against self-escalation ──────────
create or replace function public.enforce_profiles_trust_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (admin/back-office paths) may change these; nobody else may.
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or current_user = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- On a self-insert, force the unambiguous boolean trust flags to their safe
    -- values so a user cannot create a pre-verified/unheld profile. The enum trust
    -- columns (kyc_status/background_check_status) are left to the table DEFAULT and
    -- guarded on UPDATE below — do NOT hard-code enum literals here without confirming
    -- the enum's default on the non-prod clone first.
    new.is_verified    := false;
    new.phone_verified := false;
    new.payout_hold    := true;
    return new;
  end if;

  -- On UPDATE, reject any attempt to change trust columns.
  if new.is_verified is distinct from old.is_verified
     or new.phone_verified is distinct from old.phone_verified
     or new.kyc_status is distinct from old.kyc_status
     or new.background_check_status is distinct from old.background_check_status
     or new.payout_hold is distinct from old.payout_hold then
    raise exception 'MED-10: is_verified/phone_verified/kyc_status/background_check_status/payout_hold are managed by the platform and cannot be changed by the account owner';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_profiles_trust_columns on public.profiles;
create trigger trg_enforce_profiles_trust_columns
  before insert or update on public.profiles
  for each row execute function public.enforce_profiles_trust_columns();

-- Regression guard: a future table-level GRANT reversion should be caught in review.
comment on table public.profiles is
  'PII columns (phone/email/date_of_birth/kyc_status/background_check_status) are NOT column-granted to anon/authenticated (MED-08). Trust columns are trigger-guarded (MED-10). Do not re-add table-level GRANT SELECT/UPDATE without security review.';

commit;

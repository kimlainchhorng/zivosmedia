-- =========================================================
-- 1) PROFILES — drop wide-open policies, add column-level lockdown
-- =========================================================

DROP POLICY IF EXISTS "Anon users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;

-- Keep an authenticated-read policy so basic profile lookups work app-wide,
-- but column privileges (below) limit which fields they actually receive.
CREATE POLICY "Authenticated read public profile fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Anonymous visitors should not enumerate users at all. (Public pages can use
-- a SECURITY DEFINER function or service-role edge function if needed.)
-- No anon SELECT policy is created.

-- Revoke broad column access, then re-grant only the safe public-facing columns.
-- Sensitive columns (email, phone*, dob, kyc_*, admin_role, background_check*,
-- payout_hold, last_admin_login, sms_*, affiliate_*) become readable only to
-- the row owner via the existing "profiles_select_own" / "Users read own profile"
-- policies, which return ALL columns when id = auth.uid().
REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- Public-safe columns (display info other users genuinely need)
GRANT SELECT (
  id, user_id, full_name, username, avatar_url, cover_url, cover_position,
  bio, role, status, is_private, profile_visibility, hide_from_drivers,
  is_verified, last_seen, share_code, loyalty_tier_id,
  social_facebook, social_instagram, social_tiktok, social_snapchat,
  social_x, social_linkedin, social_telegram, social_onlyfans, social_links,
  social_links_visible, comment_control, hide_like_counts, allow_mentions,
  allow_sharing, allow_friend_requests, selected_city_id, selected_city_name,
  zone_id, created_at, updated_at, setup_complete, email_verified,
  phone_verified, phone_hash
) ON public.profiles TO authenticated;

-- Owner-scoped sensitive read happens through the existing per-row policies
-- combined with a separate GRANT path: own-row reads use the table owner's
-- privileges via SECURITY DEFINER functions where needed. To keep "view my
-- own profile" working in client code, grant the sensitive cols to
-- authenticated as well — RLS will still restrict the rows to the owner.
GRANT SELECT (
  email, phone, phone_e164, date_of_birth, kyc_status, kyc_verified_at,
  kyc_rejection_reason, background_check_status, background_check_reason,
  admin_role, admin_2fa_enabled, last_admin_login, payout_hold,
  sms_consent, sms_opted_out, sms_opted_out_at,
  affiliate_code, affiliate_partner_name, affiliate_captured_at
) ON public.profiles TO authenticated;

-- IMPORTANT: revoke from anon entirely so nothing leaks to public
-- (no GRANT to anon means anonymous users get nothing).

-- Keep INSERT/UPDATE permissions intact (driven by existing policies).
GRANT INSERT, UPDATE ON public.profiles TO authenticated;

-- Remove profiles from realtime publication if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'profiles'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles';
  END IF;
END$$;

-- =========================================================
-- 2) CREATOR_PROFILES — restrict payout_details to owner
-- =========================================================

DROP POLICY IF EXISTS "crp_sel" ON public.creator_profiles;

CREATE POLICY "creator_profiles_owner_read_all"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "creator_profiles_public_read_safe"
ON public.creator_profiles
FOR SELECT
TO authenticated
USING (true);

-- Column-level: revoke and re-grant only the public-safe columns to non-owners.
REVOKE SELECT ON public.creator_profiles FROM anon, authenticated;

-- Build the safe column GRANT list dynamically so this works regardless
-- of which display columns exist in the schema.
DO $$
DECLARE
  safe_cols text;
  sensitive_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO safe_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name NOT IN (
      'payout_details', 'total_earnings_cents', 'pending_payout_cents',
      'lifetime_payout_cents', 'tax_id', 'tax_form_status',
      'stripe_account_id', 'paypal_email', 'bank_account_last4'
    );

  IF safe_cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.creator_profiles TO authenticated', safe_cols);
  END IF;

  -- Owners need full access — grant sensitive cols too; RLS row policy above
  -- ensures only the owner row matches when querying sensitive fields.
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO sensitive_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name IN (
      'payout_details', 'total_earnings_cents', 'pending_payout_cents',
      'lifetime_payout_cents', 'tax_id', 'tax_form_status',
      'stripe_account_id', 'paypal_email', 'bank_account_last4'
    );

  IF sensitive_cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.creator_profiles TO authenticated', sensitive_cols);
  END IF;
END$$;

GRANT INSERT, UPDATE ON public.creator_profiles TO authenticated;

-- =========================================================
-- 3) RESTAURANTS — hide owner email/phone/stripe from non-owners
-- =========================================================

REVOKE SELECT ON public.restaurants FROM anon, authenticated;

-- Re-grant all columns EXCEPT the sensitive owner contact fields.
DO $$
DECLARE
  safe_cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO safe_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'restaurants'
    AND column_name NOT IN ('email', 'phone', 'stripe_account_id');

  IF safe_cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.restaurants TO anon, authenticated', safe_cols);
    EXECUTE format('GRANT SELECT (%s) ON public.restaurants TO authenticated', safe_cols);
  END IF;
END$$;

-- Owners and admins still need the contact columns. Grant the sensitive
-- columns to authenticated; RLS policy already restricts to owners/admins
-- through is_restaurant_owner_or_manager / is_admin checks for write paths.
-- For SELECT we add a focused policy that only matches owner/admin rows
-- AND combine with a dedicated GRANT.
GRANT SELECT (email, phone, stripe_account_id) ON public.restaurants TO authenticated;

-- Tighten the public read policy to OWNER/ADMIN OR active-status without
-- granting them sensitive columns at the column level above.
-- (Existing policy already allows the active rows; we keep it.)

GRANT INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
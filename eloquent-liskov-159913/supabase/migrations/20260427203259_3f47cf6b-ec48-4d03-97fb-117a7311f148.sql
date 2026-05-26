-- =====================================================================
-- Phase 9: SECURITY DEFINER lockdown
-- =====================================================================
-- 1) Bulk revoke EXECUTE on every SECURITY DEFINER function in public
--    from PUBLIC, anon, authenticated. service_role retains EXECUTE
--    (it bypasses ACLs anyway). Trigger functions don't need EXECUTE
--    grants to fire — triggers run with the table owner's privileges.
-- =====================================================================
DO $phase9$
DECLARE
  r record;
  sig text;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    sig := format('public.%I(%s)', r.proname, r.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', sig);
  END LOOP;
END
$phase9$;

-- =====================================================================
-- 2) Re-grant EXECUTE to `authenticated` for every RPC the app calls.
--    Overload-safe: grants to every overload of the named function.
-- =====================================================================
DO $phase9b$
DECLARE
  fn_name text;
  r record;
  sig text;
  used_rpcs text[] := ARRAY[
    'accept_job_offer','admin_ack_security_incident','admin_clear_auth_lockout',
    'admin_clear_chat_sender_block','admin_force_auth_quarantine','admin_lookup_profile_by_email',
    'append_ice_candidate','apply_pricing_to_job','assign_job_zone_and_surge_postgis',
    'auth_precheck_login','auth_record_login_attempt','cancel_live_pair_session',
    'check_user_role','cleanup_expired_device_link_tokens','confirm_live_pair_session',
    'create_live_pair_session','credit_coin_purchase','enqueue_email',
    'expire_all_stale_live_streams','expire_stale_live_streams_for_user',
    'fn_record_gift_transaction','fn_transfer_coins','get_active_pair_session_for_store',
    'get_employee_payroll_summary','get_follower_count','get_following_count',
    'get_friend_count','get_friendship_status','get_live_pair_session',
    'get_merchant_roi','get_nearby_drivers','get_or_create_referral_code',
    'get_paired_session_by_token','get_trending_near_user','has_role',
    'increment_counter','increment_flight_api_usage','increment_store_post_view_count',
    'is_admin','is_following','is_trip_participant','lodging_wiring_report',
    'process_referral_signup','record_channel_post_view','redeem_group_invite',
    'register_trusted_device','remove_trusted_device','request_live_earnings_payout',
    'revoke_live_pair_session','send_live_gift','set_profile_blue_verified_from_request',
    'set_profile_blue_verified_manual','set_store_blue_verified_manual',
    'track_user_interest','validate_promo_code','validate_ride_promo'
  ];
BEGIN
  FOREACH fn_name IN ARRAY used_rpcs LOOP
    FOR r IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn_name
    LOOP
      sig := format('public.%I(%s)', fn_name, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    END LOOP;
  END LOOP;
END
$phase9b$;

-- =====================================================================
-- 3) Re-grant EXECUTE to `anon` for the 3 pre-login helpers.
-- =====================================================================
DO $phase9c$
DECLARE
  fn_name text;
  r record;
  sig text;
  anon_rpcs text[] := ARRAY[
    'auth_precheck_login',
    'auth_record_login_attempt',
    'cleanup_expired_device_link_tokens'
  ];
BEGIN
  FOREACH fn_name IN ARRAY anon_rpcs LOOP
    FOR r IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn_name
    LOOP
      sig := format('public.%I(%s)', fn_name, r.args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', sig);
    END LOOP;
  END LOOP;
END
$phase9c$;

-- =====================================================================
-- 4) Move citext extension out of public into a dedicated schema.
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION citext SET SCHEMA extensions;
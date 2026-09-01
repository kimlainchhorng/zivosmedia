-- The browser previously supplied both the login identifier and whether the
-- attempt succeeded. That let an anonymous caller manufacture failures for a
-- victim (eventually locking the victim out) or manufacture successes that
-- cleared a lockout. The companion precheck also disclosed whether an email
-- existed in auth.users.
--
-- Credential verification and password-login throttling belong to Supabase
-- Auth. Keep these legacy functions available only to trusted server code
-- while clients move to direct Auth sign-in plus the authenticated log-login
-- Edge Function for successful-login history.
--
-- Release note: this containment intentionally retires browser-reported failed
-- attempt telemetry and the browser-enforced custom quarantine check. The
-- Admin Auth Shield counters are historical until a trusted Auth hook or other
-- server-owned login boundary replaces them; Supabase Auth remains the active
-- password-verification and throttling authority.

REVOKE EXECUTE ON FUNCTION public.auth_precheck_login(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auth_record_login_attempt(TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.auth_precheck_login(TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.auth_record_login_attempt(TEXT, BOOLEAN, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.auth_precheck_login(TEXT, TEXT) IS
  'Legacy server-only login shield helper. Browser credential flows must use Supabase Auth and must not receive account-existence hints.';
COMMENT ON FUNCTION public.auth_record_login_attempt(TEXT, BOOLEAN, TEXT) IS
  'Legacy server-only login shield helper. Untrusted callers must not declare login outcomes.';

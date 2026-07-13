
CREATE OR REPLACE FUNCTION public.auth_precheck_login(
  _identifier text,
  _device_fingerprint text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_failures int;
  email_exists boolean;
BEGIN
  -- Count failures in last 15 minutes
  SELECT count(*) INTO recent_failures
  FROM public.login_attempts
  WHERE identifier = lower(_identifier)
    AND success = false
    AND created_at > now() - interval '15 minutes';

  -- Progressive lockout
  IF recent_failures >= 20 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Account temporarily locked. Try again in 30 minutes.');
  ELSIF recent_failures >= 10 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Too many failed attempts. Try again in 2 minutes.');
  ELSIF recent_failures >= 5 THEN
    IF EXISTS (
      SELECT 1 FROM public.login_attempts
      WHERE identifier = lower(_identifier) AND success = false
        AND created_at > now() - interval '30 seconds'
      LIMIT 1
    ) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Too many attempts. Please wait 30 seconds.');
    END IF;
  END IF;

  -- Check if email exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = lower(_identifier)
  ) INTO email_exists;

  RETURN jsonb_build_object('allowed', true, 'email_exists', email_exists);
END;
$$;

-- list_my_recent_logins: lets a signed-in user see their own recent successful
-- login attempts from auth_login_events. Used by /account/sessions to render
-- a "Where am I signed in?" view alongside the existing LinkedDevicesPage.
--
-- The function joins auth.users to map auth.uid() → email (the
-- auth_login_events.identifier column is the normalized email). Only rows
-- belonging to the caller are returned.

CREATE OR REPLACE FUNCTION public.list_my_recent_logins(
  _limit INT DEFAULT 50,
  _hours INT DEFAULT 24 * 30
)
RETURNS TABLE (
  id UUID,
  device_fingerprint TEXT,
  success BOOLEAN,
  blocked_before_attempt BOOLEAN,
  risk_score INT,
  risk_labels TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_limit INT;
  v_since TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT lower(u.email) INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL THEN
    RETURN;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(_limit, 50), 1), 500);
  v_since := now() - make_interval(hours => LEAST(GREATEST(COALESCE(_hours, 720), 1), 24 * 365));

  RETURN QUERY
  SELECT
    e.id,
    e.device_fingerprint,
    e.success,
    e.blocked_before_attempt,
    COALESCE(e.risk_score, 0)::INT,
    COALESCE(e.risk_labels, ARRAY[]::TEXT[]),
    e.created_at
  FROM public.auth_login_events e
  WHERE e.identifier = v_email
    AND e.created_at >= v_since
  ORDER BY e.created_at DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_recent_logins(INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_recent_logins(INT, INT) TO authenticated;

COMMENT ON FUNCTION public.list_my_recent_logins(INT, INT) IS
  'Authenticated callers only. Returns the caller''s own auth_login_events '
  'rows so /account/sessions can show "Where have I signed in recently?".';

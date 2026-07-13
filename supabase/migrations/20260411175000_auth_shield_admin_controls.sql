-- Auth Shield admin controls: clear lockouts and prune old login telemetry.

CREATE OR REPLACE FUNCTION public.admin_clear_auth_lockout(_identifier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_id TEXT;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can clear auth lockouts';
  END IF;

  normalized_id := public.auth_normalize_identifier(_identifier);
  IF normalized_id = '' THEN
    RETURN false;
  END IF;

  UPDATE public.auth_login_protection
  SET
    failed_streak = 0,
    blocked_until = NULL,
    updated_at = now()
  WHERE identifier = normalized_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_auth_login_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.auth_login_events
  WHERE created_at < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
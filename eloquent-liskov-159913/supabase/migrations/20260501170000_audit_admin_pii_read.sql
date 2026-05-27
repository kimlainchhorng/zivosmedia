-- Audit every admin PII read.
--
-- WHY: admin_get_profile lets admins read full PII (email, phone, KYC, payout
-- holds, etc) of any user. Without an audit trail, a compromised or rogue
-- admin account can quietly exfiltrate user data row by row. This migration
-- replaces the function with a plpgsql version that records each successful
-- read as `admin.pii_read` in security_events. The audit failure-mode is
-- swallow-and-log: a flaky audit must never block legitimate admin work, but
-- it must surface to ops via stderr.

CREATE OR REPLACE FUNCTION public.admin_get_profile(_user_id UUID)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_row public.profiles%ROWTYPE;
  v_actor UUID;
BEGIN
  v_actor := auth.uid();
  IF NOT public.has_role(v_actor, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.profiles
  WHERE id = _user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Fire-and-forget audit. We deliberately do NOT include the returned PII
  -- in event_data — only enough to know who read whose record and when.
  BEGIN
    INSERT INTO public.security_events (event_type, severity, user_id, event_data, is_blocked)
    VALUES (
      'admin.pii_read',
      'info',
      v_actor,                                          -- actor (the admin)
      jsonb_build_object(
        'target_user_id', _user_id,
        'resource', 'profiles'
      ),
      false
    );
  EXCEPTION WHEN OTHERS THEN
    -- Audit failure is logged to stderr but doesn't fail the read; ops
    -- watches Postgres logs for `admin_pii_read_audit_failed`.
    RAISE WARNING 'admin_pii_read_audit_failed: %', SQLERRM;
  END;

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_profile(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_get_profile(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_get_profile(UUID) IS
  'Admin-only PII read with audit. Logs `admin.pii_read` to security_events '
  'on every successful invocation. Audit failures are warned but do not fail '
  'the read — see Postgres logs for `admin_pii_read_audit_failed`.';

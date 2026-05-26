-- Auto-revoke active sessions when a user is added to user_blocklist.
--
-- WHY: the JWT a blocked user is currently holding stays valid until expiry
-- (~1h by default). The user_blocklist check in `requireUserMfa` only fires
-- on the *next* request, so without revoking refresh tokens the user can keep
-- working until their access token expires. This trigger marks every
-- outstanding refresh token for that user as revoked at the moment they're
-- added to the blocklist — once their current access token expires (and
-- usually well before then, since clients refresh proactively) they'll be
-- forced back to login and the user-blocklist gate will reject them there.
--
-- We also expose `public.admin_force_logout_user(_user_id)` so admins can
-- revoke a user's sessions on demand without blocking the account, e.g.
-- after a "I left my laptop on the train" report.

CREATE OR REPLACE FUNCTION public.revoke_user_refresh_tokens(_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Match user_id by string compare since auth.refresh_tokens.user_id is
  -- typed as text in some Supabase versions and uuid in others.
  WITH revoked AS (
    UPDATE auth.refresh_tokens
       SET revoked = TRUE,
           updated_at = now()
     WHERE user_id::TEXT = _user_id::TEXT
       AND COALESCE(revoked, FALSE) = FALSE
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM revoked;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_refresh_tokens(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_user_refresh_tokens(UUID) TO service_role;

COMMENT ON FUNCTION public.revoke_user_refresh_tokens(UUID) IS
  'Service-role only. Marks all unexpired refresh tokens for user_id as '
  'revoked. Used by the user_blocklist trigger and by '
  'admin_force_logout_user. Returns rows affected.';

-- Admin-callable wrapper. Logs to security_events.
CREATE OR REPLACE FUNCTION public.admin_force_logout_user(_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_count := public.revoke_user_refresh_tokens(_user_id);

  INSERT INTO public.security_events (event_type, severity, user_id, event_data, is_blocked)
  VALUES (
    'admin.force_logout',
    'info',
    _user_id,
    jsonb_build_object(
      'actor_id', auth.uid(),
      'tokens_revoked', v_count
    ),
    false
  );

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_force_logout_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_force_logout_user(UUID) TO authenticated;

COMMENT ON FUNCTION public.admin_force_logout_user(UUID) IS
  'Admin-only. Revokes all refresh tokens for user_id and audits the action. '
  'Returns number of tokens revoked.';

-- Trigger: auto-revoke when user_blocklist gains a row.
CREATE OR REPLACE FUNCTION public._trg_user_blocklist_revoke_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  v_count := public.revoke_user_refresh_tokens(NEW.user_id);

  INSERT INTO public.security_events (event_type, severity, user_id, event_data, is_blocked)
  VALUES (
    'user_blocklist.sessions_revoked',
    'warn',
    NEW.user_id,
    jsonb_build_object(
      'reason', NEW.reason,
      'tokens_revoked', v_count,
      'block_id', NEW.id
    ),
    true
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_blocklist_revoke_sessions ON public.user_blocklist;
CREATE TRIGGER user_blocklist_revoke_sessions
  AFTER INSERT ON public.user_blocklist
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_user_blocklist_revoke_sessions();

COMMENT ON TRIGGER user_blocklist_revoke_sessions ON public.user_blocklist IS
  'Revokes all refresh tokens for the blocked user immediately on insert, so '
  'their current JWT cannot be refreshed. The access token still works until '
  'expiry (~1h default), but the blocklist check in requireUserMfa rejects '
  'the next request anyway.';

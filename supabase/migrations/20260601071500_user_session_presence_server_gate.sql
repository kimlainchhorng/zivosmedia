-- Legacy user_sessions writes and login_alert creation are routed through
-- user-session-presence/account-security-settings so audit events are scoped
-- to the authenticated user server-side.

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_sessions_block_direct_insert ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_block_direct_insert" ON public.user_sessions;
CREATE POLICY "user_sessions_block_direct_insert"
ON public.user_sessions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS user_sessions_block_direct_update ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_block_direct_update" ON public.user_sessions;
CREATE POLICY "user_sessions_block_direct_update"
ON public.user_sessions
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS user_sessions_block_direct_delete ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_block_direct_delete" ON public.user_sessions;
CREATE POLICY "user_sessions_block_direct_delete"
ON public.user_sessions
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS login_alerts_block_direct_insert ON public.login_alerts;
DROP POLICY IF EXISTS "login_alerts_block_direct_insert" ON public.login_alerts;
CREATE POLICY "login_alerts_block_direct_insert"
ON public.login_alerts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON TABLE public.user_sessions IS
  'Legacy active session rows; client writes are blocked and trusted server-side ingestion is required.';
COMMENT ON TABLE public.login_alerts IS
  'Login and account-security alerts; client inserts are blocked and trusted server-side ingestion is required.';

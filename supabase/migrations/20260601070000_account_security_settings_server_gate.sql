-- Account security setting writes are routed through account-security-settings
-- so user_id scoping and audit alerts happen server-side.

ALTER TABLE public.two_step_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_passcode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS two_step_auth_block_direct_insert ON public.two_step_auth;
DROP POLICY IF EXISTS "two_step_auth_block_direct_insert" ON public.two_step_auth;
CREATE POLICY "two_step_auth_block_direct_insert"
ON public.two_step_auth
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS two_step_auth_block_direct_update ON public.two_step_auth;
DROP POLICY IF EXISTS "two_step_auth_block_direct_update" ON public.two_step_auth;
CREATE POLICY "two_step_auth_block_direct_update"
ON public.two_step_auth
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS two_step_auth_block_direct_delete ON public.two_step_auth;
DROP POLICY IF EXISTS "two_step_auth_block_direct_delete" ON public.two_step_auth;
CREATE POLICY "two_step_auth_block_direct_delete"
ON public.two_step_auth
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

DROP POLICY IF EXISTS user_passcode_block_direct_insert ON public.user_passcode;
DROP POLICY IF EXISTS "user_passcode_block_direct_insert" ON public.user_passcode;
CREATE POLICY "user_passcode_block_direct_insert"
ON public.user_passcode
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS user_passcode_block_direct_update ON public.user_passcode;
DROP POLICY IF EXISTS "user_passcode_block_direct_update" ON public.user_passcode;
CREATE POLICY "user_passcode_block_direct_update"
ON public.user_passcode
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS user_passcode_block_direct_delete ON public.user_passcode;
DROP POLICY IF EXISTS "user_passcode_block_direct_delete" ON public.user_passcode;
CREATE POLICY "user_passcode_block_direct_delete"
ON public.user_passcode
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.two_step_auth IS
  'Local two-step security settings; client writes are blocked and trusted server-side ingestion is required.';
COMMENT ON TABLE public.user_passcode IS
  'Local app passcode settings; client writes are blocked and trusted server-side ingestion is required.';

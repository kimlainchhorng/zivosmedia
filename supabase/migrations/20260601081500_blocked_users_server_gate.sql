-- Force block/unblock writes through block-user-manage so the server owns
-- blocker_id attribution, bulk validation, and social-graph cleanup.

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blocked_users_block_direct_insert ON public.blocked_users;
DROP POLICY IF EXISTS blocked_users_block_direct_update ON public.blocked_users;
DROP POLICY IF EXISTS blocked_users_block_direct_delete ON public.blocked_users;

CREATE POLICY blocked_users_block_direct_insert
ON public.blocked_users
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY blocked_users_block_direct_update
ON public.blocked_users
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY blocked_users_block_direct_delete
ON public.blocked_users
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY blocked_users_block_direct_insert ON public.blocked_users
IS 'Blocks direct authenticated user-block inserts; use block-user-manage for trusted server-side ingestion.';

COMMENT ON POLICY blocked_users_block_direct_update ON public.blocked_users
IS 'Blocks direct authenticated user-block updates; use block-user-manage for trusted server-side ingestion.';

COMMENT ON POLICY blocked_users_block_direct_delete ON public.blocked_users
IS 'Blocks direct authenticated user-block deletes; use block-user-manage for trusted server-side ingestion.';

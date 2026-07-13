-- Force authenticated browser writes to user_safety_actions through
-- user-safety-action-manage while preserving service-role/trusted ingestion.

ALTER TABLE public.user_safety_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_safety_actions_block_direct_insert ON public.user_safety_actions;
DROP POLICY IF EXISTS user_safety_actions_block_direct_update ON public.user_safety_actions;
DROP POLICY IF EXISTS user_safety_actions_block_direct_delete ON public.user_safety_actions;

CREATE POLICY user_safety_actions_block_direct_insert
ON public.user_safety_actions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY user_safety_actions_block_direct_update
ON public.user_safety_actions
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY user_safety_actions_block_direct_delete
ON public.user_safety_actions
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY user_safety_actions_block_direct_insert ON public.user_safety_actions
IS 'Blocks direct authenticated safety action inserts; use user-safety-action-manage for trusted server-side ingestion.';

COMMENT ON POLICY user_safety_actions_block_direct_update ON public.user_safety_actions
IS 'Blocks direct authenticated safety action updates; use user-safety-action-manage for trusted server-side ingestion.';

COMMENT ON POLICY user_safety_actions_block_direct_delete ON public.user_safety_actions
IS 'Blocks direct authenticated safety action deletes; use user-safety-action-manage for trusted server-side ingestion.';

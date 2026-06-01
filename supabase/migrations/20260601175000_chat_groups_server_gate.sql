-- Force group lifecycle mutations through chat-group-manage so membership,
-- role authority, invite issuance, and group metadata updates are trusted
-- server-side. Reads remain governed by the existing RLS policies.

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_groups_block_direct_insert ON public.chat_groups;
DROP POLICY IF EXISTS chat_groups_block_direct_update ON public.chat_groups;
DROP POLICY IF EXISTS chat_groups_block_direct_delete ON public.chat_groups;
DROP POLICY IF EXISTS chat_group_members_block_direct_insert ON public.chat_group_members;
DROP POLICY IF EXISTS chat_group_members_block_direct_update ON public.chat_group_members;
DROP POLICY IF EXISTS chat_group_members_block_direct_delete ON public.chat_group_members;
DROP POLICY IF EXISTS chat_group_invites_block_direct_insert ON public.chat_group_invites;
DROP POLICY IF EXISTS chat_group_invites_block_direct_update ON public.chat_group_invites;
DROP POLICY IF EXISTS chat_group_invites_block_direct_delete ON public.chat_group_invites;

CREATE POLICY chat_groups_block_direct_insert
ON public.chat_groups
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY chat_groups_block_direct_update
ON public.chat_groups
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY chat_groups_block_direct_delete
ON public.chat_groups
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY chat_group_members_block_direct_insert
ON public.chat_group_members
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY chat_group_members_block_direct_update
ON public.chat_group_members
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY chat_group_members_block_direct_delete
ON public.chat_group_members
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY chat_group_invites_block_direct_insert
ON public.chat_group_invites
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY chat_group_invites_block_direct_update
ON public.chat_group_invites
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY chat_group_invites_block_direct_delete
ON public.chat_group_invites
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY chat_groups_block_direct_insert ON public.chat_groups
IS 'Blocks direct authenticated group creation; use chat-group-manage for trusted server-side ingestion.';

COMMENT ON POLICY chat_groups_block_direct_update ON public.chat_groups
IS 'Blocks direct authenticated group metadata updates; use chat-group-manage for admin-verified updates.';

COMMENT ON POLICY chat_groups_block_direct_delete ON public.chat_groups
IS 'Blocks direct authenticated group deletes; group lifecycle changes must be server-side.';

COMMENT ON POLICY chat_group_members_block_direct_insert ON public.chat_group_members
IS 'Blocks direct authenticated member inserts; use chat-group-manage for admin-verified membership changes.';

COMMENT ON POLICY chat_group_members_block_direct_update ON public.chat_group_members
IS 'Blocks direct authenticated member updates; use chat-group-manage for role and mute changes.';

COMMENT ON POLICY chat_group_members_block_direct_delete ON public.chat_group_members
IS 'Blocks direct authenticated member deletes; use chat-group-manage for leave and kick flows.';

COMMENT ON POLICY chat_group_invites_block_direct_insert ON public.chat_group_invites
IS 'Blocks direct authenticated invite creation; chat-group-manage generates invite codes server-side.';

COMMENT ON POLICY chat_group_invites_block_direct_update ON public.chat_group_invites
IS 'Blocks direct authenticated invite updates; use chat-group-manage for revocation.';

COMMENT ON POLICY chat_group_invites_block_direct_delete ON public.chat_group_invites
IS 'Blocks direct authenticated invite deletes; invite lifecycle changes must be server-side.';

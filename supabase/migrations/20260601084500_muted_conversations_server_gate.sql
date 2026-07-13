-- Force legacy muted_conversations writes through muted-conversation-manage so
-- user_id attribution and mute/unmute validation are owned by trusted code.

ALTER TABLE public.muted_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS muted_conversations_block_direct_insert ON public.muted_conversations;
DROP POLICY IF EXISTS muted_conversations_block_direct_update ON public.muted_conversations;
DROP POLICY IF EXISTS muted_conversations_block_direct_delete ON public.muted_conversations;

CREATE POLICY muted_conversations_block_direct_insert
ON public.muted_conversations
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY muted_conversations_block_direct_update
ON public.muted_conversations
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY muted_conversations_block_direct_delete
ON public.muted_conversations
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY muted_conversations_block_direct_insert ON public.muted_conversations
IS 'Blocks direct authenticated muted conversation inserts; use muted-conversation-manage for trusted server-side ingestion.';

COMMENT ON POLICY muted_conversations_block_direct_update ON public.muted_conversations
IS 'Blocks direct authenticated muted conversation updates; use muted-conversation-manage for trusted server-side ingestion.';

COMMENT ON POLICY muted_conversations_block_direct_delete ON public.muted_conversations
IS 'Blocks direct authenticated muted conversation deletes; use muted-conversation-manage for trusted server-side ingestion.';

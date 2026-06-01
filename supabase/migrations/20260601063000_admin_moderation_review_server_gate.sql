-- Admin moderation review actions are applied through admin-moderation-review
-- so queue updates and moderation_actions audit rows are written together
-- after server-side admin and MFA checks.

ALTER TABLE public.content_moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_moderation_queue_block_direct_update ON public.content_moderation_queue;
DROP POLICY IF EXISTS "content_moderation_queue_block_direct_update" ON public.content_moderation_queue;
CREATE POLICY "content_moderation_queue_block_direct_update"
ON public.content_moderation_queue
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS moderation_actions_block_direct_insert ON public.moderation_actions;
DROP POLICY IF EXISTS "moderation_actions_block_direct_insert" ON public.moderation_actions;
CREATE POLICY "moderation_actions_block_direct_insert"
ON public.moderation_actions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON TABLE public.content_moderation_queue IS
  'Content moderation review queue; admin review updates require trusted server-side ingestion.';
COMMENT ON TABLE public.moderation_actions IS
  'Moderation audit actions; client inserts are blocked and trusted server-side ingestion is required.';

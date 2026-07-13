-- Force job invite notification creation through talent-invite-notification.
-- Admin broadcast and trusted notification producers are handled separately.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_block_direct_job_invite_insert ON public.notifications;

CREATE POLICY notifications_block_direct_job_invite_insert
ON public.notifications
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(template, '') <> 'job_invite');

COMMENT ON POLICY notifications_block_direct_job_invite_insert ON public.notifications
IS 'Blocks direct authenticated job_invite notification inserts; use talent-invite-notification for trusted server-side ingestion.';

-- Force authenticated user notification update/delete actions through
-- notification-manage. Insert remains open for existing sender/admin flows.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_block_direct_update ON public.notifications;
DROP POLICY IF EXISTS notifications_block_direct_delete ON public.notifications;

CREATE POLICY notifications_block_direct_update
ON public.notifications
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY notifications_block_direct_delete
ON public.notifications
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY notifications_block_direct_update ON public.notifications
IS 'Blocks direct authenticated notification updates; use notification-manage for trusted server-side ingestion.';

COMMENT ON POLICY notifications_block_direct_delete ON public.notifications
IS 'Blocks direct authenticated notification deletes; use notification-manage for trusted server-side ingestion.';

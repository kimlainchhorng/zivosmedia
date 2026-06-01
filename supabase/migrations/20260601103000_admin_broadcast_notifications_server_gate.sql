-- Force admin broadcast notification creation through admin-broadcast-notification.
-- This keeps privileged audience selection and batch notification inserts server-side.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS role text;

DROP POLICY IF EXISTS notifications_block_direct_admin_broadcast_insert ON public.notifications;

CREATE POLICY notifications_block_direct_admin_broadcast_insert
ON public.notifications
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(template, '') <> 'admin_broadcast');

COMMENT ON POLICY notifications_block_direct_admin_broadcast_insert ON public.notifications
IS 'Blocks direct authenticated admin_broadcast notification inserts; use admin-broadcast-notification for trusted server-side ingestion.';

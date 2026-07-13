-- Force browser-side social notification writes through social-notification-manage.
-- System/webhook functions keep using service-role writes for trusted producers.

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_block_direct_insert ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_block_direct_insert" ON public.user_notifications;
CREATE POLICY "user_notifications_block_direct_insert"
ON public.user_notifications
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS user_notifications_block_direct_update ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_block_direct_update" ON public.user_notifications;
CREATE POLICY "user_notifications_block_direct_update"
ON public.user_notifications
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS user_notifications_block_direct_delete ON public.user_notifications;
DROP POLICY IF EXISTS "user_notifications_block_direct_delete" ON public.user_notifications;
CREATE POLICY "user_notifications_block_direct_delete"
ON public.user_notifications
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.user_notifications IS
'Social notification writes and read-state changes are routed through social-notification-manage for trusted server-side validation.';

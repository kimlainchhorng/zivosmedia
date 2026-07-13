-- Force notification preference writes through notification-preferences-update.
-- Reads remain user-scoped through the existing SELECT policy.

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_preferences_block_direct_insert ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_block_direct_insert" ON public.notification_preferences;
CREATE POLICY "notification_preferences_block_direct_insert"
ON public.notification_preferences
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS notification_preferences_block_direct_update ON public.notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_block_direct_update" ON public.notification_preferences;
CREATE POLICY "notification_preferences_block_direct_update"
ON public.notification_preferences
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.notification_preferences IS
'User notification preference writes are routed through notification-preferences-update for trusted server-side validation.';

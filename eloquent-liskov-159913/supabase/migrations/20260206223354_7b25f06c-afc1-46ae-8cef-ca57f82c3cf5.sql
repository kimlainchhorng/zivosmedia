-- Drop any existing overly permissive policies on notification_preferences
DROP POLICY IF EXISTS "Enable read access for all users" ON public.notification_preferences;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.notification_preferences;
DROP POLICY IF EXISTS "Enable update for all users" ON public.notification_preferences;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.notification_preferences;
DROP POLICY IF EXISTS "Anyone can view notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Anyone can insert notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Anyone can update notification_preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.notification_preferences;

-- Ensure RLS is enabled
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notification preferences
CREATE POLICY "Users can view own preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only insert their own notification preferences
CREATE POLICY "Users can insert own preferences"
ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own notification preferences
CREATE POLICY "Users can update own preferences"
ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own notification preferences
CREATE POLICY "Users can delete own preferences"
ON public.notification_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all preferences for support purposes
CREATE POLICY "Admins can view all preferences"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
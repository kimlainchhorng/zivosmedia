DROP POLICY IF EXISTS "Authenticated read public profile fields" ON public.profiles;

CREATE POLICY "Authenticated read visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR COALESCE(profile_visibility, 'public') IN ('public', 'friends')
);
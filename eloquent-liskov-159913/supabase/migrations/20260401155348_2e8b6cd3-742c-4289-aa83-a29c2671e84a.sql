-- Create a security definer function to get current role/admin_role values
-- This avoids infinite recursion by bypassing RLS
CREATE OR REPLACE FUNCTION public.get_profile_protected_fields(profile_id uuid)
RETURNS TABLE(role text, admin_role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role, p.admin_role
  FROM public.profiles p
  WHERE p.id = profile_id;
$$;

-- Drop the old update policy
DROP POLICY IF EXISTS "zivo_profiles_update" ON public.profiles;

-- Recreate update policy without self-referencing query
CREATE POLICY "zivo_profiles_update" ON public.profiles
FOR UPDATE
USING (
  (user_id = auth.uid()) OR (id = auth.uid()) OR is_admin(auth.uid())
)
WITH CHECK (
  CASE
    WHEN is_admin(auth.uid()) THEN true
    ELSE (
      (role IS NOT DISTINCT FROM (SELECT gp.role FROM public.get_profile_protected_fields(profiles.id) gp))
      AND
      (admin_role IS NOT DISTINCT FROM (SELECT gp.admin_role FROM public.get_profile_protected_fields(profiles.id) gp))
    )
  END
);
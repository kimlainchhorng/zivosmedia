-- Drop the restrictive select policy
DROP POLICY IF EXISTS "zivo_profiles_select" ON public.profiles;

-- Create a new select policy: any authenticated user can view any profile
-- This is needed for people search, public profiles, friend lists, etc.
CREATE POLICY "zivo_profiles_select"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon users to view profiles (for public profile pages)
CREATE POLICY "zivo_profiles_select_anon"
ON public.profiles
FOR SELECT
TO anon
USING (true);
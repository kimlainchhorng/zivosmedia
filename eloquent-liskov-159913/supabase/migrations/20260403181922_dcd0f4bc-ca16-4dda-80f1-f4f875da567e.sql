-- Drop the anonymous SELECT policy that exposes all profile data to unauthenticated visitors
DROP POLICY IF EXISTS "zivo_profiles_select_anon" ON public.profiles;
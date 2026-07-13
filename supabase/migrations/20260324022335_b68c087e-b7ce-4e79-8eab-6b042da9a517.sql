DROP POLICY IF EXISTS "zivo_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "zivo_profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "zivo_profiles_update" ON public.profiles;

CREATE POLICY "zivo_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR (id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

CREATE POLICY "zivo_profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = (SELECT auth.uid())) OR (id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));

CREATE POLICY "zivo_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((user_id = (SELECT auth.uid())) OR (id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())))
  WITH CHECK ((user_id = (SELECT auth.uid())) OR (id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid())));
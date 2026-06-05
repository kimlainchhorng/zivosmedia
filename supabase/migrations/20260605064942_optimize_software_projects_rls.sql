-- Cache auth.uid() once per statement in projects RLS policies.

DROP POLICY IF EXISTS "Owners can read their projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can insert their projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Owners can delete their projects" ON public.projects;

CREATE POLICY "Owners can read their projects"
  ON public.projects
  FOR SELECT
  TO public
  USING ((select auth.uid()) = owner);

CREATE POLICY "Owners can insert their projects"
  ON public.projects
  FOR INSERT
  TO public
  WITH CHECK ((select auth.uid()) = owner);

CREATE POLICY "Owners can update their projects"
  ON public.projects
  FOR UPDATE
  TO public
  USING ((select auth.uid()) = owner)
  WITH CHECK ((select auth.uid()) = owner);

CREATE POLICY "Owners can delete their projects"
  ON public.projects
  FOR DELETE
  TO public
  USING ((select auth.uid()) = owner);

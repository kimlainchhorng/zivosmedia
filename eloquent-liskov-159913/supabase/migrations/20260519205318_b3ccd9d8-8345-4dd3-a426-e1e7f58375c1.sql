DROP POLICY IF EXISTS "user_posts_visible_unless_hidden" ON public.user_posts;

CREATE POLICY "Public user posts visible unless hidden"
ON public.user_posts
AS RESTRICTIVE
FOR SELECT
TO anon
USING (hidden_at IS NULL);

CREATE POLICY "Authenticated user posts visible unless hidden"
ON public.user_posts
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  hidden_at IS NULL
  OR user_id = (SELECT auth.uid())
  OR is_admin((SELECT auth.uid()))
);
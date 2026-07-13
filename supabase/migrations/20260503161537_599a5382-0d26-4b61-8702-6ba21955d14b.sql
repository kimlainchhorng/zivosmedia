
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.user_posts;
CREATE POLICY "Authenticated view published posts" ON public.user_posts
FOR SELECT TO authenticated USING (is_published = true);

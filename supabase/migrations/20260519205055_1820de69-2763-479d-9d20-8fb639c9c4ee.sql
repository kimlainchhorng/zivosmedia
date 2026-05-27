CREATE POLICY "Public can view published user posts"
ON public.user_posts
FOR SELECT
TO anon
USING (is_published = true);
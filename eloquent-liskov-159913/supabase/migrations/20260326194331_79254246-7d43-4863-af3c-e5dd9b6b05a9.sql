DROP POLICY IF EXISTS "Authenticated users can insert store posts" ON public.store_posts;

CREATE POLICY "Authenticated users can insert store posts"
ON public.store_posts
FOR INSERT
TO authenticated
WITH CHECK (true);
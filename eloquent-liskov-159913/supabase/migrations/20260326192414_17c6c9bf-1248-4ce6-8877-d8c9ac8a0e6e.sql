-- Fix store_posts admin RLS to use the SECURITY DEFINER role helper
DROP POLICY IF EXISTS "Admins full access to store posts" ON public.store_posts;

CREATE POLICY "Admins full access to store posts"
ON public.store_posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Drop the conflicting policy and any others that might exist
DROP POLICY IF EXISTS "Admins can delete abandoned searches" ON public.abandoned_searches;
DROP POLICY IF EXISTS "Only admins can view abandoned searches" ON public.abandoned_searches;
DROP POLICY IF EXISTS "Service role can insert abandoned searches" ON public.abandoned_searches;
DROP POLICY IF EXISTS "Service role can update abandoned searches" ON public.abandoned_searches;

-- Recreate all policies cleanly
-- Only admins can read abandoned searches (contains PII - emails)
CREATE POLICY "Only admins can view abandoned searches"
ON public.abandoned_searches
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert (from edge functions)
CREATE POLICY "Service role can insert abandoned searches"
ON public.abandoned_searches
FOR INSERT
TO service_role
WITH CHECK (true);

-- Service role can update (from edge functions)
CREATE POLICY "Service role can update abandoned searches"
ON public.abandoned_searches
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can delete
CREATE POLICY "Admins can delete abandoned searches"
ON public.abandoned_searches
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
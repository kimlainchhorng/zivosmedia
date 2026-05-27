CREATE POLICY "Admins can manage site_versions"
ON public.site_versions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
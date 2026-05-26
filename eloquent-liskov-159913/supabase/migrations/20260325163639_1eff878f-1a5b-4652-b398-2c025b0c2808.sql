DROP POLICY "Authenticated users can insert store_profiles" ON public.store_profiles;
DROP POLICY "Authenticated users can update store_profiles" ON public.store_profiles;
DROP POLICY "Authenticated users can delete store_profiles" ON public.store_profiles;

CREATE POLICY "Admins can insert store_profiles"
  ON public.store_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update store_profiles"
  ON public.store_profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete store_profiles"
  ON public.store_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
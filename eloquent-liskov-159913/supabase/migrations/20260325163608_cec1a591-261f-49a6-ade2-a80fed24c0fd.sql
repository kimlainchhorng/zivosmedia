CREATE POLICY "Authenticated users can insert store_profiles"
  ON public.store_profiles FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update store_profiles"
  ON public.store_profiles FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete store_profiles"
  ON public.store_profiles FOR DELETE TO authenticated
  USING (true);
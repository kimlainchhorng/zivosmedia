CREATE POLICY "Admins can insert store_products"
  ON public.store_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update store_products"
  ON public.store_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete store_products"
  ON public.store_products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
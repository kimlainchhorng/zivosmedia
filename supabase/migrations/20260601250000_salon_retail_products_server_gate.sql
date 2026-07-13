-- Gate salon retail product mutations through salon-retail-product-manage.
-- Public active-product reads remain available for storefronts.

ALTER TABLE public.salon_retail_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage retail - all" ON public.salon_retail_products;

DROP POLICY IF EXISTS "Owners read retail products" ON public.salon_retail_products;
CREATE POLICY "Owners read retail products"
  ON public.salon_retail_products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_retail_products.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon retail product inserts require trusted server-side validation" ON public.salon_retail_products;
CREATE POLICY "Salon retail product inserts require trusted server-side validation"
  ON public.salon_retail_products
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon retail product updates require trusted server-side validation" ON public.salon_retail_products;
CREATE POLICY "Salon retail product updates require trusted server-side validation"
  ON public.salon_retail_products
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon retail product deletes require trusted server-side validation" ON public.salon_retail_products;
CREATE POLICY "Salon retail product deletes require trusted server-side validation"
  ON public.salon_retail_products
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_retail_products FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_retail_products TO anon, authenticated;
GRANT ALL ON TABLE public.salon_retail_products TO service_role;

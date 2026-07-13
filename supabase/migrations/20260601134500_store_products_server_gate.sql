-- Store catalog reads remain public, but mutations must go through the
-- store-product-manage Edge Function so owner/admin authorization and payload
-- validation happen server-side.

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert store_products" ON public.store_products;
DROP POLICY IF EXISTS "Admins can update store_products" ON public.store_products;
DROP POLICY IF EXISTS "Admins can delete store_products" ON public.store_products;
DROP POLICY IF EXISTS "Store owners can delete their products" ON public.store_products;
DROP POLICY IF EXISTS "Store product inserts require trusted server-side validation" ON public.store_products;
DROP POLICY IF EXISTS "Store product updates require trusted server-side validation" ON public.store_products;
DROP POLICY IF EXISTS "Store product deletes require trusted server-side validation" ON public.store_products;

CREATE POLICY "Store product inserts require trusted server-side validation"
  ON public.store_products
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store product updates require trusted server-side validation"
  ON public.store_products
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store product deletes require trusted server-side validation"
  ON public.store_products
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_products FROM authenticated;
GRANT SELECT ON TABLE public.store_products TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_products TO service_role;

COMMENT ON TABLE public.store_products IS
  'Public store catalog. Client reads are allowed by RLS; mutations are routed through store-product-manage for trusted server-side validation.';

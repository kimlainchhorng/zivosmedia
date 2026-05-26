-- Allow store owners (and admins) to DELETE their own products.
-- Previously only an admin DELETE policy existed on public.store_products,
-- so authenticated store-owner deletes silently returned 204 without removing rows.

DROP POLICY IF EXISTS "Store owners can delete their products" ON public.store_products;

CREATE POLICY "Store owners can delete their products"
  ON public.store_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

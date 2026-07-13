-- Store owners need to manage payment method rows for their own store from
-- the shop payments workflow. Keep admin access, but do not reopen the older
-- broad authenticated policy.

DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.store_payment_methods;
DROP POLICY IF EXISTS "Store owners and admins can manage store payment methods" ON public.store_payment_methods;

CREATE POLICY "Store owners and admins can manage store payment methods"
  ON public.store_payment_methods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = store_payment_methods.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.is_admin((SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = store_payment_methods.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.is_admin((SELECT auth.uid()))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_payment_methods TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_payment_methods TO service_role;

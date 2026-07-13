-- Payment account metadata contains sensitive payout setup details. Keep
-- owner/admin reads in the client, but require trusted Edge Functions for
-- insert/update/delete mutations.

ALTER TABLE public.store_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage payment methods" ON public.store_payment_methods;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.store_payment_methods;
DROP POLICY IF EXISTS "Store owners and admins can manage store payment methods" ON public.store_payment_methods;
DROP POLICY IF EXISTS "Store owners and admins can read store payment methods" ON public.store_payment_methods;
DROP POLICY IF EXISTS "Store payment methods inserts require trusted server-side validation" ON public.store_payment_methods;
DROP POLICY IF EXISTS "Store payment methods updates require trusted server-side validation" ON public.store_payment_methods;
DROP POLICY IF EXISTS "Store payment methods deletes require trusted server-side validation" ON public.store_payment_methods;

CREATE POLICY "Store owners and admins can read store payment methods"
  ON public.store_payment_methods
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = store_payment_methods.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.is_admin((SELECT auth.uid()))
  );

CREATE POLICY "Store payment methods inserts require trusted server-side validation"
  ON public.store_payment_methods
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store payment methods updates require trusted server-side validation"
  ON public.store_payment_methods
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store payment methods deletes require trusted server-side validation"
  ON public.store_payment_methods
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payment_methods FROM authenticated;
GRANT SELECT ON TABLE public.store_payment_methods TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_payment_methods TO service_role;

COMMENT ON TABLE public.store_payment_methods IS
  'Store payment method metadata. Client reads are owner/admin scoped; writes are routed through store-payment-methods-update for trusted server-side validation.';

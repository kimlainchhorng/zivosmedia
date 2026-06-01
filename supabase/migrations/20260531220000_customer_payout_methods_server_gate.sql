-- Payout destination records contain sensitive bank/ABA identifiers. Reads stay
-- RLS-scoped, while writes go through customer-payout-method-record for MFA,
-- format validation, default handling, and store ownership checks.

DROP POLICY IF EXISTS "Users can insert own payout methods" ON public.customer_payout_methods;
DROP POLICY IF EXISTS "Users can update own payout methods" ON public.customer_payout_methods;
DROP POLICY IF EXISTS "Users can delete own payout methods" ON public.customer_payout_methods;
DROP POLICY IF EXISTS "Store owners manage their store payout methods" ON public.customer_payout_methods;

ALTER TABLE public.customer_payout_methods
  DROP CONSTRAINT IF EXISTS customer_payout_methods_method_type_check;
ALTER TABLE public.customer_payout_methods
  ADD CONSTRAINT customer_payout_methods_method_type_check
  CHECK (method_type IN ('bank_transfer', 'aba', 'paypal'));

DROP POLICY IF EXISTS "Store owners view their store payout methods" ON public.customer_payout_methods;
CREATE POLICY "Store owners view their store payout methods"
  ON public.customer_payout_methods
  FOR SELECT
  TO authenticated
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = customer_payout_methods.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.customer_payout_methods IS
  'Payout methods are written by customer-payout-method-record after MFA, format validation, default handling, and store ownership checks.';

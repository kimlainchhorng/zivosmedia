-- Merchant payout requests must go through the Edge Function gate so balance,
-- owner, and idempotency checks run server-side.

DROP POLICY IF EXISTS "Merchants can request payouts" ON public.merchant_payouts;

DROP POLICY IF EXISTS "Merchants can view own payouts" ON public.merchant_payouts;
CREATE POLICY "Merchants can view own payouts"
  ON public.merchant_payouts
  FOR SELECT
  TO authenticated
  USING (
    merchant_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = merchant_payouts.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.merchant_payouts IS
  'Merchant payout requests are inserted by merchant-payout-request after server-side owner and balance checks.';

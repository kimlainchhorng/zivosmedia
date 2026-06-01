-- Salon commission payout rows are financial ledger records. Keep reads for
-- owners/admins/stylists, but route owner writes through
-- salon-commission-payout-record so the backend re-computes payout totals.

DROP POLICY IF EXISTS "Owners manage commission payouts - all" ON public.salon_commission_payouts;

CREATE POLICY "Owners read commission payouts"
  ON public.salon_commission_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = salon_commission_payouts.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

COMMENT ON TABLE public.salon_commission_payouts IS
  'Salon commission payouts are written by salon-commission-payout-record after owner/admin, MFA, stylist ownership, and completed-booking total checks.';

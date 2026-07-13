-- Cafe tip payout headers and lines are immutable financial records.
-- Reads stay owner-scoped, but writes go through cafe-tip-payout-record so the
-- backend can validate owner/admin access, barista ownership, and line totals.

DROP POLICY IF EXISTS cafe_tip_payouts_owner_manage ON public.cafe_tip_payouts;
CREATE POLICY cafe_tip_payouts_owner_read ON public.cafe_tip_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_profiles s
      WHERE s.id = cafe_tip_payouts.store_id
        AND s.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS cafe_tip_payout_lines_owner_manage ON public.cafe_tip_payout_lines;
CREATE POLICY cafe_tip_payout_lines_owner_read ON public.cafe_tip_payout_lines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cafe_tip_payouts p
      JOIN public.store_profiles s ON s.id = p.store_id
      WHERE p.id = cafe_tip_payout_lines.payout_id
        AND s.owner_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.cafe_tip_payouts IS
  'Cafe tip payout headers are written by cafe-tip-payout-record after owner/admin, MFA, barista ownership, and line-total checks.';
COMMENT ON TABLE public.cafe_tip_payout_lines IS
  'Cafe tip payout line items are written by cafe-tip-payout-record after validating they belong to the payout store.';

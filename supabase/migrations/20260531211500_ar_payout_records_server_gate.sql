-- Auto-repair payout ledger writes must go through `ar-payout-record`.
-- Owners keep read access, while owner create/delete is validated server-side
-- with MFA and idempotency.

DROP POLICY IF EXISTS "Owners manage their ar_payouts" ON public.ar_payouts;

CREATE POLICY "Owners view their ar_payouts"
  ON public.ar_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.restaurants r
      WHERE r.id = ar_payouts.store_id
        AND r.owner_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = ar_payouts.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.ar_payouts IS
  'Auto-repair payout records are written by ar-payout-record after owner/admin, MFA, and idempotency checks.';

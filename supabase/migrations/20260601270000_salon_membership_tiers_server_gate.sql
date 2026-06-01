-- Gate owner/admin salon membership tier mutations through salon-membership-tier-manage.
-- Public active-tier reads and owner/admin full reads remain available.

ALTER TABLE public.salon_membership_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage tiers - all" ON public.salon_membership_tiers;

DROP POLICY IF EXISTS "Owners read membership tiers" ON public.salon_membership_tiers;
CREATE POLICY "Owners read membership tiers"
  ON public.salon_membership_tiers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_membership_tiers.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon membership tier inserts require trusted server-side validation" ON public.salon_membership_tiers;
CREATE POLICY "Salon membership tier inserts require trusted server-side validation"
  ON public.salon_membership_tiers
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon membership tier updates require trusted server-side validation" ON public.salon_membership_tiers;
CREATE POLICY "Salon membership tier updates require trusted server-side validation"
  ON public.salon_membership_tiers
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon membership tier deletes require trusted server-side validation" ON public.salon_membership_tiers;
CREATE POLICY "Salon membership tier deletes require trusted server-side validation"
  ON public.salon_membership_tiers
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_membership_tiers FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_membership_tiers TO anon, authenticated;
GRANT ALL ON TABLE public.salon_membership_tiers TO service_role;

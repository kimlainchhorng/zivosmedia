-- Gate owner/admin salon blockout mutations through salon-blockout-manage.
-- The public availability RPC remains the anon-safe read path.

ALTER TABLE public.salon_blockouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage blockouts - all" ON public.salon_blockouts;

DROP POLICY IF EXISTS "Owners read blockouts" ON public.salon_blockouts;
CREATE POLICY "Owners read blockouts"
  ON public.salon_blockouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_blockouts.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon blockout inserts require trusted server-side validation" ON public.salon_blockouts;
CREATE POLICY "Salon blockout inserts require trusted server-side validation"
  ON public.salon_blockouts
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon blockout updates require trusted server-side validation" ON public.salon_blockouts;
CREATE POLICY "Salon blockout updates require trusted server-side validation"
  ON public.salon_blockouts
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon blockout deletes require trusted server-side validation" ON public.salon_blockouts;
CREATE POLICY "Salon blockout deletes require trusted server-side validation"
  ON public.salon_blockouts
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_blockouts FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_blockouts TO authenticated;
GRANT ALL ON TABLE public.salon_blockouts TO service_role;

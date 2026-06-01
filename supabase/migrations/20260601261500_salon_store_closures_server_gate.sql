-- Gate owner/admin salon store-closure mutations through salon-store-closure-manage.
-- The public booking RPC remains the anon-safe closure read path.

ALTER TABLE public.salon_store_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage store closures - all" ON public.salon_store_closures;

DROP POLICY IF EXISTS "Owners read store closures" ON public.salon_store_closures;
CREATE POLICY "Owners read store closures"
  ON public.salon_store_closures
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_store_closures.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon store closure inserts require trusted server-side validation" ON public.salon_store_closures;
CREATE POLICY "Salon store closure inserts require trusted server-side validation"
  ON public.salon_store_closures
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon store closure updates require trusted server-side validation" ON public.salon_store_closures;
CREATE POLICY "Salon store closure updates require trusted server-side validation"
  ON public.salon_store_closures
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon store closure deletes require trusted server-side validation" ON public.salon_store_closures;
CREATE POLICY "Salon store closure deletes require trusted server-side validation"
  ON public.salon_store_closures
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_store_closures FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_store_closures TO authenticated;
GRANT ALL ON TABLE public.salon_store_closures TO service_role;

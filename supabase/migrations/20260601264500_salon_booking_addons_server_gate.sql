-- Gate owner/admin salon booking add-on mutations through salon-booking-addon-manage.
-- The tg_salon_booking_addons_rollup trigger remains responsible for keeping
-- booking add-on totals, duration, and end_at in sync after trusted inserts.

ALTER TABLE public.salon_booking_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage booking addons - all" ON public.salon_booking_addons;

DROP POLICY IF EXISTS "Owners read booking addons" ON public.salon_booking_addons;
CREATE POLICY "Owners read booking addons"
  ON public.salon_booking_addons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_booking_addons.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon booking add-on inserts require trusted server-side validation" ON public.salon_booking_addons;
CREATE POLICY "Salon booking add-on inserts require trusted server-side validation"
  ON public.salon_booking_addons
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon booking add-on updates require trusted server-side validation" ON public.salon_booking_addons;
CREATE POLICY "Salon booking add-on updates require trusted server-side validation"
  ON public.salon_booking_addons
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon booking add-on deletes require trusted server-side validation" ON public.salon_booking_addons;
CREATE POLICY "Salon booking add-on deletes require trusted server-side validation"
  ON public.salon_booking_addons
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_booking_addons FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_booking_addons TO authenticated;
GRANT ALL ON TABLE public.salon_booking_addons TO service_role;

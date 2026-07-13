-- Gate owner/admin salon booking mutations through salon-booking-manage.
-- Public/customer booking intake already flows through salon-booking-submit.

ALTER TABLE public.salon_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their bookings - insert" ON public.salon_bookings;
DROP POLICY IF EXISTS "Owners manage their bookings - update" ON public.salon_bookings;
DROP POLICY IF EXISTS "Owners manage their bookings - delete" ON public.salon_bookings;

DROP POLICY IF EXISTS "Salon booking owner inserts require trusted server-side validation" ON public.salon_bookings;
CREATE POLICY "Salon booking owner inserts require trusted server-side validation"
  ON public.salon_bookings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon booking owner updates require trusted server-side validation" ON public.salon_bookings;
CREATE POLICY "Salon booking owner updates require trusted server-side validation"
  ON public.salon_bookings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon booking owner deletes require trusted server-side validation" ON public.salon_bookings;
CREATE POLICY "Salon booking owner deletes require trusted server-side validation"
  ON public.salon_bookings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_bookings FROM authenticated;
GRANT SELECT ON TABLE public.salon_bookings TO authenticated;
GRANT ALL ON TABLE public.salon_bookings TO service_role;

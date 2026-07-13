-- Authenticated service booking writes must be mediated by service-booking-manage.

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can create service bookings" ON public.service_bookings;
DROP POLICY IF EXISTS "Store owners can update their bookings" ON public.service_bookings;
DROP POLICY IF EXISTS "Store owners can delete their bookings" ON public.service_bookings;

CREATE POLICY "Service booking owner inserts require trusted server-side validation"
  ON public.service_bookings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Service booking owner updates require trusted server-side validation"
  ON public.service_bookings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service booking owner deletes require trusted server-side validation"
  ON public.service_bookings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.service_bookings FROM authenticated;
GRANT SELECT ON TABLE public.service_bookings TO authenticated;
GRANT ALL ON TABLE public.service_bookings TO service_role;

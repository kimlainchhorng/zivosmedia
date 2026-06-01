-- Public service bookings must be submitted through service-booking-submit.
-- Authenticated owner/admin inserts remain available for the existing booking board.

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can create a booking" ON public.service_bookings;
DROP POLICY IF EXISTS "Public can create service bookings" ON public.service_bookings;
DROP POLICY IF EXISTS service_bookings_public_insert ON public.service_bookings;
DROP POLICY IF EXISTS "Store owners can create service bookings" ON public.service_bookings;

CREATE POLICY "Service booking public inserts require trusted server-side validation"
  ON public.service_bookings
  AS RESTRICTIVE
  FOR INSERT
  TO anon
  WITH CHECK (false);

CREATE POLICY "Store owners can create service bookings"
  ON public.service_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.store_profiles s
      WHERE s.id = service_bookings.store_id
        AND s.owner_id = auth.uid()
    )
  );

REVOKE INSERT ON TABLE public.service_bookings FROM anon;
GRANT INSERT ON TABLE public.service_bookings TO authenticated;
GRANT ALL ON TABLE public.service_bookings TO service_role;

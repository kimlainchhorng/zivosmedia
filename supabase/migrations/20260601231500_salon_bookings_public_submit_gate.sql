-- Public salon booking intake now flows through the salon-booking-submit Edge
-- Function, which validates store/service/stylist/contact/timing data with the
-- service-role client before inserting. Keep owner/admin authenticated booking
-- workflows intact while removing direct anonymous writes from the Data API.

ALTER TABLE public.salon_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can request bookings" ON public.salon_bookings;

DROP POLICY IF EXISTS "Salon booking public inserts require trusted server-side validation" ON public.salon_bookings;
CREATE POLICY "Salon booking public inserts require trusted server-side validation"
  ON public.salon_bookings
  AS RESTRICTIVE
  FOR INSERT
  TO anon
  WITH CHECK (false);

REVOKE INSERT ON TABLE public.salon_bookings FROM anon;
GRANT INSERT ON TABLE public.salon_bookings TO authenticated;
GRANT ALL ON TABLE public.salon_bookings TO service_role;

DROP POLICY IF EXISTS "Anyone can create a booking" ON public.service_bookings;

CREATE POLICY "Public can create service bookings"
ON public.service_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
-- Update flight_bookings SELECT policy to allow admins via has_role
DROP POLICY IF EXISTS "flight_bookings_select" ON public.flight_bookings;
CREATE POLICY "flight_bookings_select" ON public.flight_bookings
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Update flight_bookings UPDATE policy
DROP POLICY IF EXISTS "flight_bookings_update" ON public.flight_bookings;
CREATE POLICY "flight_bookings_update" ON public.flight_bookings
  FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Update flight_bookings DELETE policy
DROP POLICY IF EXISTS "flight_bookings_delete" ON public.flight_bookings;
CREATE POLICY "flight_bookings_delete" ON public.flight_bookings
  FOR DELETE TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );
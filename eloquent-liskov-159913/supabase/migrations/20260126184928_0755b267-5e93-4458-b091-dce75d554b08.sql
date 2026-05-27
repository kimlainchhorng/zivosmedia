-- Allow drivers to update their own online status and location
CREATE POLICY "Drivers can update their online status"
ON public.drivers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow drivers to accept and update trips assigned to them
CREATE POLICY "Drivers can update their assigned trips"
ON public.trips FOR UPDATE
TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()))
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- Allow drivers to accept unassigned trip requests (claim trips)
CREATE POLICY "Drivers can claim unassigned trips"
ON public.trips FOR UPDATE
TO authenticated
USING (driver_id IS NULL AND status = 'requested')
WITH CHECK (
  (SELECT id FROM public.drivers WHERE user_id = auth.uid() AND status = 'verified') IS NOT NULL
);

-- Allow riders to insert new trips
CREATE POLICY "Authenticated users can create trips"
ON public.trips FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = rider_id);

-- Allow riders to update their own trips (for cancellation)
CREATE POLICY "Riders can update their own trips"
ON public.trips FOR UPDATE
TO authenticated
USING (auth.uid() = rider_id)
WITH CHECK (auth.uid() = rider_id);
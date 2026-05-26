-- Drop redundant/conflicting INSERT policies on trips table
DROP POLICY IF EXISTS "Authenticated users can create trips" ON public.trips;
DROP POLICY IF EXISTS "customers_create_trips" ON public.trips;
DROP POLICY IF EXISTS "trips_insert" ON public.trips;
DROP POLICY IF EXISTS "trips_owner_insert" ON public.trips;

-- Create unified insert policy: authenticated users with rider_id OR guests with customer_name
CREATE POLICY "trips_insert_authenticated_or_guest"
ON public.trips
FOR INSERT
TO public
WITH CHECK (
  -- Option 1: Authenticated user creating their own trip
  (auth.uid() IS NOT NULL AND rider_id = auth.uid())
  OR
  -- Option 2: Guest booking with customer_name (no rider_id required)
  (rider_id IS NULL AND customer_name IS NOT NULL AND customer_name <> '')
);

-- Add policy for guests to view their trips by ID (needed for realtime subscription)
CREATE POLICY "trips_select_by_id_public"
ON public.trips
FOR SELECT
TO public
USING (true);

-- Add policy for guests/anyone to update trip status (cancel)
-- This is already handled by trips_update for public role
-- Just ensure the guest can update trips where rider_id is null
DROP POLICY IF EXISTS "trips_update" ON public.trips;

CREATE POLICY "trips_update_participants_or_guest"
ON public.trips
FOR UPDATE
TO public
USING (
  -- Authenticated rider
  (auth.uid() IS NOT NULL AND rider_id = auth.uid())
  OR
  -- Assigned driver
  (driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()))
  OR
  -- Admin
  public.is_admin(auth.uid())
  OR
  -- Guest trip (rider_id is null) - allow update for status changes like cancel
  (rider_id IS NULL AND customer_name IS NOT NULL)
);
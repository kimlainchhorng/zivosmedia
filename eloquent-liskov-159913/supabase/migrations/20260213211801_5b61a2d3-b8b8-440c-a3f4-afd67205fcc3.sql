-- Add explicit UPDATE policy for flight_passengers
-- Deny all user updates to make immutability explicit (admins already have ALL policy)
CREATE POLICY "Passenger data is immutable after creation"
  ON public.flight_passengers FOR UPDATE TO authenticated
  USING (false);
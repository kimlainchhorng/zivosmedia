
-- Add car seat fields to ride_requests
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS requires_car_seat boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS car_seat_type text DEFAULT 'standard';

-- Add car seat capability to drivers
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS car_seat_capable boolean NOT NULL DEFAULT false;

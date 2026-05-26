-- Add flight-linked pickup columns to jobs table
ALTER TABLE public.jobs 
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS flight_arrival_time timestamptz,
  ADD COLUMN IF NOT EXISTS is_airport_pickup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS linked_flight_booking_id uuid REFERENCES public.flight_bookings(id) ON DELETE SET NULL;

-- Index for driver queries on airport pickups
CREATE INDEX IF NOT EXISTS idx_jobs_airport_pickup ON public.jobs (is_airport_pickup) WHERE is_airport_pickup = true;
CREATE INDEX IF NOT EXISTS idx_jobs_flight_booking ON public.jobs (linked_flight_booking_id) WHERE linked_flight_booking_id IS NOT NULL;
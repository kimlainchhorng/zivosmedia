ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
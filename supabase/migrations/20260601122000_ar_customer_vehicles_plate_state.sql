-- Store the issuing state of a saved customer vehicle's license plate so plate
-- lookups (invoices, estimates, labor time) can match on plate + state and avoid
-- collisions when two states reuse the same plate string.
ALTER TABLE public.ar_customer_vehicles
  ADD COLUMN IF NOT EXISTS plate_state text;

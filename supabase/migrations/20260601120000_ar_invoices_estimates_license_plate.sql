-- Add license plate to auto-repair invoices and estimates so the vehicle
-- details captured on a document include the plate alongside VIN / year / make / model.
ALTER TABLE public.ar_invoices
  ADD COLUMN IF NOT EXISTS license_plate text;

ALTER TABLE public.ar_estimates
  ADD COLUMN IF NOT EXISTS license_plate text;

-- Add license-plate issuing state to auto-repair invoices and estimates so the
-- plate captured on a document records which state issued it (matches the labor
-- time / vehicles plate + state pattern).
ALTER TABLE public.ar_invoices
  ADD COLUMN IF NOT EXISTS plate_state text;

ALTER TABLE public.ar_estimates
  ADD COLUMN IF NOT EXISTS plate_state text;

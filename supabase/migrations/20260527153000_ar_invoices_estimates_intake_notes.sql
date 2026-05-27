-- Auto Repair — capture the service intake method + customer / diagnosis
-- notes that the invoice form has been collecting all along but never
-- persisting (no matching columns on ar_invoices, missing intake_method on
-- ar_estimates). Brings both tables to the shape the unified form expects.

alter table public.ar_invoices
  add column if not exists customer_notes text,
  add column if not exists diagnosis_notes text,
  add column if not exists intake_method text;

alter table public.ar_estimates
  add column if not exists intake_method text;

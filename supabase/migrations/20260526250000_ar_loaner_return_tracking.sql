-- Auto Repair — Loaner Vehicles: capture return / check-in data.
-- Today the check-in button just flips status back to "available" and wipes
-- current_customer_name / due_back_date / mileage_out — so no record exists of
-- when a vehicle came back, the mileage on return, or any condition notes.
-- Add the columns the check-in dialog needs to persist that info.

alter table public.ar_loaner_vehicles
  add column if not exists mileage_in integer,
  add column if not exists return_notes text,
  add column if not exists returned_at timestamptz,
  add column if not exists last_customer_name text;

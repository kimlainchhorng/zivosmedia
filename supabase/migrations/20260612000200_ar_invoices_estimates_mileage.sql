-- Auto Repair — capture odometer readings on estimates + invoices.
-- mileage_in  = odometer when the vehicle arrives.
-- mileage_out = odometer when the vehicle leaves; used to auto-fill the
--               next visit's mileage_in for the same VIN.
alter table public.ar_invoices
  add column if not exists mileage_in integer,
  add column if not exists mileage_out integer;

alter table public.ar_estimates
  add column if not exists mileage_in integer,
  add column if not exists mileage_out integer;

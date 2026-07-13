-- Auto Repair — per-vehicle oil specs (capacity / viscosity / filter) so the
-- Build R.O. vehicle dialog can record them and R.O.s can show them, matching
-- the VSM "Vehicle Data" oil fields. Additive, nullable text columns.
alter table public.ar_customer_vehicles
  add column if not exists oil_capacity text,
  add column if not exists oil_viscosity text,
  add column if not exists oil_filter text;

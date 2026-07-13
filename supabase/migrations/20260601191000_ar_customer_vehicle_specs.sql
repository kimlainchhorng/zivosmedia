alter table public.ar_customer_vehicles
  add column if not exists trim text,
  add column if not exists engine_size text,
  add column if not exists drivetrain text,
  add column if not exists body_style text;

create index if not exists idx_ar_cust_vehicles_vin
  on public.ar_customer_vehicles(store_id, lower(vin))
  where vin is not null and vin <> '';

create index if not exists idx_ar_cust_vehicles_plate
  on public.ar_customer_vehicles(store_id, lower(plate))
  where plate is not null and plate <> '';

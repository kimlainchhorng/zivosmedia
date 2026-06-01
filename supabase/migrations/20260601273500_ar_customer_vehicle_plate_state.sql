alter table public.ar_customer_vehicles
  add column if not exists plate_state text;

create index if not exists idx_ar_cust_vehicles_plate_state
  on public.ar_customer_vehicles(store_id, lower(plate), plate_state)
  where plate is not null and plate <> '';

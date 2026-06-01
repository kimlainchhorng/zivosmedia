alter table public.ar_labor_entries
  add column if not exists vehicle_label text,
  add column if not exists vehicle_vin text,
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_engine text;

create index if not exists idx_ar_labor_entries_vehicle_vin
  on public.ar_labor_entries(store_id, lower(vehicle_vin))
  where vehicle_vin is not null and vehicle_vin <> '';

create index if not exists idx_ar_labor_entries_vehicle_plate
  on public.ar_labor_entries(store_id, lower(vehicle_plate))
  where vehicle_plate is not null and vehicle_plate <> '';

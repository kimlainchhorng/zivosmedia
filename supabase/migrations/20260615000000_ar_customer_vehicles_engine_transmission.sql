-- Add engine + transmission to customer vehicles so the Add/Edit Vehicle form
-- can capture what the VIN decode (vin-decode edge function) already returns.
alter table public.ar_customer_vehicles
  add column if not exists engine text,
  add column if not exists transmission text;

comment on column public.ar_customer_vehicles.engine is 'Engine size/description (e.g. "2.0L 4cyl"), auto-filled from VIN decode.';
comment on column public.ar_customer_vehicles.transmission is 'Transmission (e.g. "Automatic 6-spd"), auto-filled from VIN decode.';

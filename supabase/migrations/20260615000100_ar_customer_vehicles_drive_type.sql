-- Add drive_type to customer vehicles (FWD/AWD/RWD/4WD). The vin-decode edge
-- function already returns driveType; this lets the Add/Edit Vehicle form show
-- and store it alongside engine + transmission.
alter table public.ar_customer_vehicles
  add column if not exists drive_type text;

comment on column public.ar_customer_vehicles.drive_type is 'Drive type (FWD/AWD/RWD/4WD), auto-filled from VIN decode.';

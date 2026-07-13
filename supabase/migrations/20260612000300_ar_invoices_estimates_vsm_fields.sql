-- Auto Repair — fields needed for the full shop-style (VSM) invoice/estimate:
--   service writer / technician + cert, promise date, vehicle color / unit #,
--   key tag, payment method, four-corner tire pressures, and the add-on charge
--   lines (sublet, fees, EPA, shop supplies) that feed the totals box.
-- license_plate, plate_state, mileage_in, mileage_out already exist on both.
alter table public.ar_invoices
  add column if not exists promised_at date,
  add column if not exists service_writer text,
  add column if not exists technician text,
  add column if not exists technician_cert text,
  add column if not exists unit_number text,
  add column if not exists vehicle_color text,
  add column if not exists keytag text,
  add column if not exists payment_method text,
  add column if not exists tire_pressures jsonb,
  add column if not exists sublet_cents integer,
  add column if not exists fees_cents integer,
  add column if not exists epa_cents integer,
  add column if not exists shop_supplies_cents integer;

alter table public.ar_estimates
  add column if not exists promised_at date,
  add column if not exists service_writer text,
  add column if not exists technician text,
  add column if not exists technician_cert text,
  add column if not exists unit_number text,
  add column if not exists vehicle_color text,
  add column if not exists keytag text,
  add column if not exists payment_method text,
  add column if not exists tire_pressures jsonb,
  add column if not exists sublet_cents integer,
  add column if not exists fees_cents integer,
  add column if not exists epa_cents integer,
  add column if not exists shop_supplies_cents integer;

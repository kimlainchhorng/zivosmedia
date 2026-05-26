-- Auto Repair — Inspections: add customer contact columns
-- The UI form captures customer_name / customer_phone but the table previously
-- only stored vehicle_label and technician_name. Add the missing columns so
-- the values entered in the inspection dialog actually persist.

alter table public.ar_inspections
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text;

create index if not exists ar_inspections_customer_name_idx
  on public.ar_inspections (store_id, customer_name)
  where customer_name is not null;

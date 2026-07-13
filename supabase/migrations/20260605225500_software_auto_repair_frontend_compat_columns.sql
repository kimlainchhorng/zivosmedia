-- ZIVO Software: frontend compatibility columns for auto-repair workflows.
-- These columns match fields written by the existing admin UI forms.

alter table public.store_posts
  add column if not exists media_urls text[] not null default '{}',
  add column if not exists hashtags text[] not null default '{}',
  add column if not exists location text,
  add column if not exists scheduled_at timestamptz,
  add column if not exists likes_count integer not null default 0,
  add column if not exists comments_count integer not null default 0;

alter table public.ar_job_photos
  add column if not exists photo_url text,
  add column if not exists photo_type text,
  add column if not exists uploaded_at timestamptz not null default now();

update public.ar_job_photos
set photo_url = coalesce(photo_url, url)
where photo_url is null;

alter table public.ar_parts
  add column if not exists core_charge_cents integer not null default 0,
  add column if not exists oem_number text,
  add column if not exists interchange_number text,
  add column if not exists condition text not null default 'New',
  add column if not exists warranty_months integer not null default 12,
  add column if not exists location_in_store text;

alter table public.ar_customer_vehicles
  add column if not exists color text,
  add column if not exists engine text,
  add column if not exists oil_type text,
  add column if not exists oil_capacity_quarts numeric(6,2),
  add column if not exists last_service_date date;

alter table public.ar_work_orders
  add column if not exists promised_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists workflow_stage text,
  add column if not exists mileage integer,
  add column if not exists vehicle_vin text,
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_engine text,
  add column if not exists intake_notes text;

alter table public.ar_invoices
  add column if not exists customer_address text,
  add column if not exists customer_street text,
  add column if not exists customer_city text,
  add column if not exists customer_state text,
  add column if not exists customer_zip text,
  add column if not exists vehicle_vin text,
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_engine text,
  add column if not exists estimate_date date default current_date,
  add column if not exists start_date date,
  add column if not exists share_token text unique;

alter table public.ar_estimates
  add column if not exists vehicle_vin text,
  add column if not exists vehicle_plate text,
  add column if not exists vehicle_engine text,
  add column if not exists estimate_date date default current_date,
  add column if not exists start_date date,
  add column if not exists notes text,
  add column if not exists intake_notes text;

create index if not exists idx_store_posts_scheduled
  on public.store_posts(store_id, scheduled_at) where scheduled_at is not null;

create index if not exists idx_ar_job_photos_work_order
  on public.ar_job_photos(work_order_id, created_at desc);

create index if not exists idx_ar_parts_sku
  on public.ar_parts(store_id, sku) where sku is not null;

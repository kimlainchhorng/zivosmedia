-- ZIVO Software: core auto-repair workspace schema.
-- The dedicated software project is intentionally smaller than the media app,
-- so these tables use store_profiles.owner_id directly for owner access.

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.store_profiles
  drop constraint if exists store_profiles_category_check;

alter table public.store_profiles
  add constraint store_profiles_category_check
  check (category in ('software', 'auto-repair'));

alter table public.store_profiles
  add column if not exists ar_settings jsonb not null default '{}'::jsonb;

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric,
  price_cents integer,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_posts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  title text,
  caption text,
  content text,
  media_url text,
  media_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  customer_name text,
  customer_phone text,
  customer_email text,
  service_name text,
  preferred_date date,
  preferred_time text,
  status text not null default 'pending',
  notes text,
  workorder_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  owner_name text,
  owner_phone text,
  owner_email text,
  year integer,
  make text,
  model text,
  vin text,
  plate text,
  plate_state text,
  mileage integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_technicians (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  avatar_url text,
  hourly_rate_cents integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_work_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  number text,
  customer_name text,
  customer_phone text,
  customer_email text,
  vehicle_label text,
  customer_vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  technician_id uuid references public.ar_technicians(id) on delete set null,
  technician text,
  status text not null default 'awaiting',
  notes text,
  complaint text,
  diagnosis text,
  parts jsonb not null default '[]'::jsonb,
  labor jsonb not null default '[]'::jsonb,
  labor_hours numeric(8,2) not null default 0,
  subtotal_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  share_token text unique,
  eta_date date,
  ready_message text,
  converted_invoice boolean not null default false,
  is_comeback boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_bookings
  drop constraint if exists service_bookings_workorder_id_fkey;

alter table public.service_bookings
  add constraint service_bookings_workorder_id_fkey
  foreign key (workorder_id) references public.ar_work_orders(id) on delete set null;

create table if not exists public.ar_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  number text,
  status text not null default 'draft',
  customer_name text,
  customer_phone text,
  customer_email text,
  vehicle_label text,
  work_order_id uuid references public.ar_work_orders(id) on delete set null,
  source_workorder_id uuid references public.ar_work_orders(id) on delete set null,
  line_items jsonb not null default '[]'::jsonb,
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  amount_paid_cents integer not null default 0,
  paid_at timestamptz,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_estimates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  number text,
  status text not null default 'draft',
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  customer_street text,
  customer_city text,
  customer_state text,
  customer_zip text,
  vehicle_label text,
  customer_vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  technician text,
  workflow_stage text,
  line_items jsonb not null default '[]'::jsonb,
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  share_token text unique,
  converted_workorder_id uuid references public.ar_work_orders(id) on delete set null,
  converted_invoice_id uuid references public.ar_invoices(id) on delete set null,
  customer_viewed_at timestamptz,
  customer_responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  invoice_id uuid references public.ar_invoices(id) on delete cascade,
  amount_cents integer not null default 0,
  method text,
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.ar_service_catalog (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  name text not null,
  category text not null default 'general',
  description text,
  labor_hours numeric(5,2) not null default 0,
  labor_rate_cents integer not null default 0,
  parts jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_parts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  sku text,
  name text not null,
  category text,
  brand text,
  cost_cents integer not null default 0,
  price_cents integer not null default 0,
  stock integer not null default 0,
  image_url text,
  fitment_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_products_store on public.store_products(store_id, sort_order, name);
create index if not exists idx_store_posts_store on public.store_posts(store_id, created_at desc);
create index if not exists idx_service_bookings_store_date on public.service_bookings(store_id, preferred_date, preferred_time);
create index if not exists idx_ar_customer_vehicles_store on public.ar_customer_vehicles(store_id);
create index if not exists idx_ar_technicians_store on public.ar_technicians(store_id, active);
create index if not exists idx_ar_work_orders_store on public.ar_work_orders(store_id, created_at desc);
create index if not exists idx_ar_invoices_store on public.ar_invoices(store_id, created_at desc);
create index if not exists idx_ar_estimates_store on public.ar_estimates(store_id, created_at desc);
create index if not exists idx_ar_invoice_payments_store on public.ar_invoice_payments(store_id, paid_at desc);
create index if not exists idx_ar_service_catalog_store on public.ar_service_catalog(store_id, category);
create index if not exists idx_ar_parts_store on public.ar_parts(store_id, category);
create unique index if not exists ar_parts_store_sku_unique on public.ar_parts(store_id, sku) where sku is not null;

alter table public.store_products enable row level security;
alter table public.store_posts enable row level security;
alter table public.service_bookings enable row level security;
alter table public.ar_customer_vehicles enable row level security;
alter table public.ar_technicians enable row level security;
alter table public.ar_work_orders enable row level security;
alter table public.ar_invoices enable row level security;
alter table public.ar_estimates enable row level security;
alter table public.ar_invoice_payments enable row level security;
alter table public.ar_service_catalog enable row level security;
alter table public.ar_parts enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'store_products', 'store_posts', 'service_bookings', 'ar_customer_vehicles',
    'ar_technicians', 'ar_work_orders', 'ar_invoices', 'ar_estimates',
    'ar_invoice_payments', 'ar_service_catalog', 'ar_parts'
  ] loop
    execute format('drop policy if exists "Software store owners manage %1$s" on public.%1$I', tbl);
    execute format($p$
      create policy "Software store owners manage %1$s"
      on public.%1$I
      for all
      to authenticated
      using (exists (
        select 1 from public.store_profiles sp
        where sp.id = %1$I.store_id and sp.owner_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.store_profiles sp
        where sp.id = %1$I.store_id and sp.owner_id = auth.uid()
      ))
    $p$, tbl);
    execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
  end loop;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'store_products', 'store_posts', 'service_bookings', 'ar_customer_vehicles',
    'ar_technicians', 'ar_work_orders', 'ar_invoices', 'ar_estimates',
    'ar_service_catalog', 'ar_parts'
  ] loop
    execute format('drop trigger if exists update_%1$s_updated_at on public.%1$I', tbl);
    execute format(
      'create trigger update_%1$s_updated_at before update on public.%1$I for each row execute function public.update_updated_at_column()',
      tbl
    );
  end loop;
end $$;

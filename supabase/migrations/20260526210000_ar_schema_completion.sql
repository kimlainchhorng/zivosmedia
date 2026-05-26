-- Auto Repair — schema completion
-- Several migrations under supabase/migrations/20260430* were never recorded
-- against this project (the schema_migrations table jumps from 20260429... to
-- 20260501...). The UI references these columns/tables; without them the
-- estimate-share, work-order-share, booking-to-WO conversion, service catalog,
-- and customer-notes flows fail silently. This migration is idempotent and
-- re-applies just the missing pieces.

-- 1. Booking → Work Order link
alter table public.service_bookings
  add column if not exists workorder_id uuid references public.ar_work_orders(id) on delete set null;
create index if not exists idx_service_bookings_workorder
  on public.service_bookings(workorder_id) where workorder_id is not null;

-- 2. Estimate share token (customer-facing approval link)
alter table public.ar_estimates
  add column if not exists share_token text unique,
  add column if not exists customer_viewed_at timestamptz,
  add column if not exists customer_responded_at timestamptz;
create index if not exists idx_ar_estimates_share_token
  on public.ar_estimates(share_token) where share_token is not null;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ar_estimates' and policyname='Public estimate view by token') then
    create policy "Public estimate view by token"
      on public.ar_estimates for select
      using (share_token is not null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ar_estimates' and policyname='Customer can approve or decline estimate by token') then
    create policy "Customer can approve or decline estimate by token"
      on public.ar_estimates for update
      using (share_token is not null)
      with check (share_token is not null);
  end if;
end $$;

-- 3. Work order share token + ETA + ready message + converted_invoice flag
alter table public.ar_work_orders
  add column if not exists share_token text unique,
  add column if not exists eta_date date,
  add column if not exists ready_message text,
  add column if not exists converted_invoice boolean not null default false;
create index if not exists idx_ar_work_orders_share_token
  on public.ar_work_orders(share_token) where share_token is not null;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ar_work_orders' and policyname='Public repair status view by token') then
    create policy "Public repair status view by token"
      on public.ar_work_orders for select
      using (share_token is not null);
  end if;
end $$;

-- 4. Auto-repair shop settings on store profile
alter table public.store_profiles
  add column if not exists ar_settings jsonb default '{}'::jsonb;

-- 5. Service Catalog / Price Book
create table if not exists public.ar_service_catalog (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
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
create index if not exists idx_ar_service_catalog_store
  on public.ar_service_catalog(store_id, category);

alter table public.ar_service_catalog enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ar_service_catalog' and policyname='Owners manage their ar_service_catalog') then
    create policy "Owners manage their ar_service_catalog"
      on public.ar_service_catalog for all
      using (exists (select 1 from public.restaurants r where r.id = ar_service_catalog.store_id and r.owner_id = auth.uid()))
      with check (exists (select 1 from public.restaurants r where r.id = ar_service_catalog.store_id and r.owner_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ar_service_catalog' and policyname='Admins manage all ar_service_catalog') then
    create policy "Admins manage all ar_service_catalog"
      on public.ar_service_catalog for all
      using (has_role(auth.uid(), 'admin'::text))
      with check (has_role(auth.uid(), 'admin'::text));
  end if;
end $$;

drop trigger if exists update_ar_service_catalog_updated_at on public.ar_service_catalog;
create trigger update_ar_service_catalog_updated_at
  before update on public.ar_service_catalog
  for each row execute function public.update_updated_at_column();

-- 6. Customer Notes / Communication Log
create table if not exists public.ar_customer_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  workorder_id uuid references public.ar_work_orders(id) on delete set null,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  customer_name text,
  note_type text not null default 'internal',
  body text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_ar_customer_notes_store
  on public.ar_customer_notes(store_id, created_at desc);
create index if not exists idx_ar_customer_notes_workorder
  on public.ar_customer_notes(workorder_id) where workorder_id is not null;
create index if not exists idx_ar_customer_notes_vehicle
  on public.ar_customer_notes(vehicle_id) where vehicle_id is not null;

alter table public.ar_customer_notes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ar_customer_notes' and policyname='Owners manage their ar_customer_notes') then
    create policy "Owners manage their ar_customer_notes"
      on public.ar_customer_notes for all
      using (exists (select 1 from public.restaurants r where r.id = ar_customer_notes.store_id and r.owner_id = auth.uid()))
      with check (exists (select 1 from public.restaurants r where r.id = ar_customer_notes.store_id and r.owner_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ar_customer_notes' and policyname='Admins manage all ar_customer_notes') then
    create policy "Admins manage all ar_customer_notes"
      on public.ar_customer_notes for all
      using (has_role(auth.uid(), 'admin'::text))
      with check (has_role(auth.uid(), 'admin'::text));
  end if;
end $$;

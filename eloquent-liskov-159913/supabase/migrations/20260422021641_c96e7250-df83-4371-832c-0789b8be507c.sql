-- Estimates
create table public.ar_estimates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  customer_id uuid,
  vehicle_id uuid,
  number text not null,
  status text not null default 'draft' check (status in ('draft','sent','approved','declined','expired')),
  subtotal_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null default 0,
  expires_at date,
  notes text,
  line_items jsonb not null default '[]'::jsonb,
  converted_workorder_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ar_estimates_store on public.ar_estimates(store_id);

-- Work Orders
create table public.ar_work_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  estimate_id uuid,
  customer_id uuid,
  vehicle_id uuid,
  technician_id uuid,
  bay_id uuid,
  number text not null,
  status text not null default 'awaiting' check (status in ('awaiting','in_progress','on_hold','qc','done')),
  labor_hours numeric(6,2) not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  checklist jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  customer_signature_url text,
  parts_used jsonb not null default '[]'::jsonb,
  is_comeback boolean not null default false,
  parent_workorder_id uuid,
  total_cents int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ar_work_orders_store on public.ar_work_orders(store_id);
create index idx_ar_work_orders_status on public.ar_work_orders(store_id, status);

-- Technicians
create table public.ar_technicians (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  name text not null,
  email text,
  phone text,
  certifications text[] not null default '{}',
  hourly_rate_cents int not null default 0,
  active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ar_technicians_store on public.ar_technicians(store_id);

-- Bays
create table public.ar_bays (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  name text not null,
  lift_type text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index idx_ar_bays_store on public.ar_bays(store_id);

-- Service Reminders
create table public.ar_service_reminders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  customer_id uuid,
  vehicle_id uuid,
  reminder_type text not null,
  due_at timestamptz,
  due_mileage int,
  channel text not null default 'email' check (channel in ('email','sms','push','inapp')),
  status text not null default 'scheduled' check (status in ('scheduled','sent','cancelled','failed')),
  sent_at timestamptz,
  message text,
  created_at timestamptz not null default now()
);
create index idx_ar_service_reminders_store on public.ar_service_reminders(store_id);

-- Recall Checks
create table public.ar_recall_checks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  vehicle_id uuid,
  vin text not null,
  campaign_id text,
  summary text,
  severity text,
  fetched_at timestamptz not null default now()
);
create index idx_ar_recall_checks_store on public.ar_recall_checks(store_id);

-- Tires
create table public.ar_tires (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  brand text,
  model text,
  size text not null,
  load_index text,
  speed_rating text,
  season text,
  dot text,
  qty int not null default 0,
  cost_cents int not null default 0,
  retail_cents int not null default 0,
  reorder_point int not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ar_tires_store on public.ar_tires(store_id);

-- Warranties
create table public.ar_warranties (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  workorder_id uuid not null,
  service_name text,
  period_days int,
  mileage_limit int,
  starts_at date not null default current_date,
  expires_at date,
  notes text,
  created_at timestamptz not null default now()
);
create index idx_ar_warranties_store on public.ar_warranties(store_id);

-- Fleet Accounts
create table public.ar_fleet_accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  billing_terms text not null default 'net_30' check (billing_terms in ('net_15','net_30','net_60','prepaid')),
  credit_limit_cents int not null default 0,
  po_required boolean not null default false,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_ar_fleet_accounts_store on public.ar_fleet_accounts(store_id);

-- Fleet Vehicles
create table public.ar_fleet_vehicles (
  id uuid primary key default gen_random_uuid(),
  fleet_account_id uuid not null references public.ar_fleet_accounts(id) on delete cascade,
  vehicle_id uuid,
  vin text,
  plate text,
  label text,
  created_at timestamptz not null default now()
);
create index idx_ar_fleet_vehicles_account on public.ar_fleet_vehicles(fleet_account_id);

-- Enable RLS on all
alter table public.ar_estimates enable row level security;
alter table public.ar_work_orders enable row level security;
alter table public.ar_technicians enable row level security;
alter table public.ar_bays enable row level security;
alter table public.ar_service_reminders enable row level security;
alter table public.ar_recall_checks enable row level security;
alter table public.ar_tires enable row level security;
alter table public.ar_warranties enable row level security;
alter table public.ar_fleet_accounts enable row level security;
alter table public.ar_fleet_vehicles enable row level security;

-- Helper: store owner check inline via restaurants.owner_id
-- Generic policies (per-table, store-scoped). Admins via has_role.

-- ar_estimates
create policy "Admins manage all ar_estimates" on public.ar_estimates
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_estimates" on public.ar_estimates
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_estimates.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_estimates.store_id and r.owner_id = auth.uid()));

-- ar_work_orders
create policy "Admins manage all ar_work_orders" on public.ar_work_orders
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_work_orders" on public.ar_work_orders
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_work_orders.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_work_orders.store_id and r.owner_id = auth.uid()));

-- ar_technicians
create policy "Admins manage all ar_technicians" on public.ar_technicians
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_technicians" on public.ar_technicians
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_technicians.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_technicians.store_id and r.owner_id = auth.uid()));

-- ar_bays
create policy "Admins manage all ar_bays" on public.ar_bays
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_bays" on public.ar_bays
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_bays.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_bays.store_id and r.owner_id = auth.uid()));

-- ar_service_reminders
create policy "Admins manage all ar_service_reminders" on public.ar_service_reminders
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_service_reminders" on public.ar_service_reminders
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_service_reminders.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_service_reminders.store_id and r.owner_id = auth.uid()));

-- ar_recall_checks
create policy "Admins manage all ar_recall_checks" on public.ar_recall_checks
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_recall_checks" on public.ar_recall_checks
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_recall_checks.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_recall_checks.store_id and r.owner_id = auth.uid()));

-- ar_tires
create policy "Admins manage all ar_tires" on public.ar_tires
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_tires" on public.ar_tires
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_tires.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_tires.store_id and r.owner_id = auth.uid()));

-- ar_warranties
create policy "Admins manage all ar_warranties" on public.ar_warranties
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_warranties" on public.ar_warranties
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_warranties.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_warranties.store_id and r.owner_id = auth.uid()));

-- ar_fleet_accounts
create policy "Admins manage all ar_fleet_accounts" on public.ar_fleet_accounts
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_fleet_accounts" on public.ar_fleet_accounts
  for all to authenticated
  using (exists (select 1 from public.restaurants r where r.id = ar_fleet_accounts.store_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.restaurants r where r.id = ar_fleet_accounts.store_id and r.owner_id = auth.uid()));

-- ar_fleet_vehicles (scoped via parent fleet account)
create policy "Admins manage all ar_fleet_vehicles" on public.ar_fleet_vehicles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Owners manage their ar_fleet_vehicles" on public.ar_fleet_vehicles
  for all to authenticated
  using (exists (
    select 1 from public.ar_fleet_accounts fa
    join public.restaurants r on r.id = fa.store_id
    where fa.id = ar_fleet_vehicles.fleet_account_id and r.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.ar_fleet_accounts fa
    join public.restaurants r on r.id = fa.store_id
    where fa.id = ar_fleet_vehicles.fleet_account_id and r.owner_id = auth.uid()
  ));

-- updated_at triggers
create or replace function public.touch_ar_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_ar_estimates before update on public.ar_estimates
  for each row execute function public.touch_ar_updated_at();
create trigger trg_touch_ar_work_orders before update on public.ar_work_orders
  for each row execute function public.touch_ar_updated_at();
create trigger trg_touch_ar_technicians before update on public.ar_technicians
  for each row execute function public.touch_ar_updated_at();
create trigger trg_touch_ar_tires before update on public.ar_tires
  for each row execute function public.touch_ar_updated_at();
create trigger trg_touch_ar_fleet_accounts before update on public.ar_fleet_accounts
  for each row execute function public.touch_ar_updated_at();
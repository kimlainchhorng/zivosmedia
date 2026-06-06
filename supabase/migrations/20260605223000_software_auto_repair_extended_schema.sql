-- ZIVO Software: extended auto-repair workspace tables.
-- Keeps deeper dashboard tabs from failing on missing tables in the dedicated
-- Software Supabase project. RLS is tied directly to store_profiles.owner_id.

create table if not exists public.ar_bays (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_inspections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  work_order_id uuid references public.ar_work_orders(id) on delete set null,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  customer_name text,
  vehicle_label text,
  status text not null default 'draft',
  checklist jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_customer_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  workorder_id uuid references public.ar_work_orders(id) on delete set null,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  customer_name text,
  note_type text not null default 'internal',
  body text not null default '',
  created_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.ar_service_reminders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  source_workorder_id uuid references public.ar_work_orders(id) on delete set null,
  customer_name text,
  customer_phone text,
  vehicle_label text,
  service_name text,
  due_date date,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_recall_checks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  vin text,
  status text not null default 'checked',
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ar_warranties (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  work_order_id uuid references public.ar_work_orders(id) on delete set null,
  customer_name text,
  vehicle_label text,
  title text,
  provider text,
  starts_at date,
  expires_at date,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_job_photos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  work_order_id uuid references public.ar_work_orders(id) on delete set null,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.ar_loaner_vehicles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  name text not null,
  plate text,
  status text not null default 'available',
  assigned_work_order_id uuid references public.ar_work_orders(id) on delete set null,
  customer_name text,
  checked_out_at timestamptz,
  returned_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_fleet_accounts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  billing_terms text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_labor_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  tech_id uuid references public.ar_technicians(id) on delete set null,
  work_order_id uuid references public.ar_work_orders(id) on delete set null,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  description text,
  duration_minutes integer not null default 0,
  rate_override_cents integer,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_tires (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  sku text,
  brand text,
  model text,
  size text,
  qty integer not null default 0,
  cost_cents integer not null default 0,
  price_cents integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  vendor text,
  category text,
  description text,
  amount_cents integer not null default 0,
  expense_date date not null default current_date,
  status text not null default 'recorded',
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.ar_expenses(id) on delete cascade,
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  description text,
  amount_cents integer not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ar_payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  amount_cents integer not null default 0,
  payout_date date not null default current_date,
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ar_supplier_credentials (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  supplier_id text not null,
  label text,
  username text,
  encrypted_secret text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, supplier_id)
);

create table if not exists public.ar_vin_lookups (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  vin text not null,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.store_promotions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  rating integer,
  customer_name text,
  body text,
  reply text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  customer_name text,
  customer_email text,
  customer_phone text,
  body text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ar_bays_store on public.ar_bays(store_id, sort_order);
create index if not exists idx_ar_inspections_store on public.ar_inspections(store_id, created_at desc);
create index if not exists idx_ar_customer_notes_store on public.ar_customer_notes(store_id, created_at desc);
create index if not exists idx_ar_service_reminders_store on public.ar_service_reminders(store_id, due_date);
create index if not exists idx_ar_recall_checks_store on public.ar_recall_checks(store_id, created_at desc);
create index if not exists idx_ar_warranties_store on public.ar_warranties(store_id, starts_at desc);
create index if not exists idx_ar_job_photos_store on public.ar_job_photos(store_id, created_at desc);
create index if not exists idx_ar_loaner_vehicles_store on public.ar_loaner_vehicles(store_id, status);
create index if not exists idx_ar_fleet_accounts_store on public.ar_fleet_accounts(store_id, active);
create index if not exists idx_ar_labor_entries_store on public.ar_labor_entries(store_id, created_at desc);
create index if not exists idx_ar_tires_store on public.ar_tires(store_id, active);
create index if not exists idx_ar_expenses_store on public.ar_expenses(store_id, expense_date desc);
create index if not exists idx_ar_expense_items_expense on public.ar_expense_items(expense_id, position);
create index if not exists idx_ar_payouts_store on public.ar_payouts(store_id, payout_date desc);
create index if not exists idx_ar_supplier_credentials_store on public.ar_supplier_credentials(store_id, supplier_id);
create index if not exists idx_ar_vin_lookups_store on public.ar_vin_lookups(store_id, created_at desc);
create index if not exists idx_store_promotions_store on public.store_promotions(store_id, created_at desc);
create index if not exists idx_store_reviews_store on public.store_reviews(store_id, created_at desc);
create index if not exists idx_store_messages_store on public.store_messages(store_id, created_at desc);

alter table public.ar_bays enable row level security;
alter table public.ar_inspections enable row level security;
alter table public.ar_customer_notes enable row level security;
alter table public.ar_service_reminders enable row level security;
alter table public.ar_recall_checks enable row level security;
alter table public.ar_warranties enable row level security;
alter table public.ar_job_photos enable row level security;
alter table public.ar_loaner_vehicles enable row level security;
alter table public.ar_fleet_accounts enable row level security;
alter table public.ar_labor_entries enable row level security;
alter table public.ar_tires enable row level security;
alter table public.ar_expenses enable row level security;
alter table public.ar_expense_items enable row level security;
alter table public.ar_payouts enable row level security;
alter table public.ar_supplier_credentials enable row level security;
alter table public.ar_vin_lookups enable row level security;
alter table public.store_promotions enable row level security;
alter table public.store_reviews enable row level security;
alter table public.store_messages enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'ar_bays','ar_inspections','ar_customer_notes','ar_service_reminders','ar_recall_checks',
    'ar_warranties','ar_job_photos','ar_loaner_vehicles','ar_fleet_accounts','ar_labor_entries',
    'ar_tires','ar_expenses','ar_payouts','ar_supplier_credentials','ar_vin_lookups',
    'store_promotions','store_reviews','store_messages'
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

drop policy if exists "Software store owners manage ar_expense_items" on public.ar_expense_items;
create policy "Software store owners manage ar_expense_items"
on public.ar_expense_items
for all
to authenticated
using (exists (
  select 1 from public.ar_expenses e
  join public.store_profiles sp on sp.id = e.store_id
  where e.id = ar_expense_items.expense_id and sp.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.ar_expenses e
  join public.store_profiles sp on sp.id = e.store_id
  where e.id = ar_expense_items.expense_id and sp.owner_id = auth.uid()
));
grant select, insert, update, delete on public.ar_expense_items to authenticated;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'ar_bays','ar_inspections','ar_service_reminders','ar_warranties','ar_loaner_vehicles',
    'ar_fleet_accounts','ar_labor_entries','ar_tires','ar_expenses','ar_payouts',
    'ar_supplier_credentials','store_promotions','store_reviews','store_messages'
  ] loop
    execute format('drop trigger if exists update_%1$s_updated_at on public.%1$I', tbl);
    execute format(
      'create trigger update_%1$s_updated_at before update on public.%1$I for each row execute function public.update_updated_at_column()',
      tbl
    );
  end loop;
end $$;

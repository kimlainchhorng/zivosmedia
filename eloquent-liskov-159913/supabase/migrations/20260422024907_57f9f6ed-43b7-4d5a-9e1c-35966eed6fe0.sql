
-- ============ TABLES ============

create table public.lodge_rooms (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  name text not null,
  room_type text,
  beds text,
  max_guests int default 2,
  size_sqm numeric,
  units_total int default 1,
  base_rate_cents int default 0,
  weekend_rate_cents int default 0,
  weekly_discount_pct numeric default 0,
  monthly_discount_pct numeric default 0,
  breakfast_included boolean default false,
  amenities text[] default '{}',
  photos jsonb default '[]'::jsonb,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lodge_reservations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  room_id uuid,
  guest_id uuid,
  number text not null,
  guest_name text,
  guest_phone text,
  guest_email text,
  guest_country text,
  adults int default 1,
  children int default 0,
  check_in date not null,
  check_out date not null,
  nights int generated always as ((check_out - check_in)) stored,
  room_number text,
  status text not null default 'confirmed',
  source text default 'direct',
  rate_cents int default 0,
  extras_cents int default 0,
  tax_cents int default 0,
  total_cents int default 0,
  paid_cents int default 0,
  payment_status text default 'unpaid',
  notes text,
  signature_url text,
  id_photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lodge_room_blocks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  room_id uuid not null,
  block_date date not null,
  reason text default 'maintenance',
  rate_override_cents int,
  created_at timestamptz not null default now(),
  unique(room_id, block_date)
);

create table public.lodge_guests (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  name text not null,
  phone text,
  email text,
  country text,
  id_number text,
  vip boolean default false,
  notes text,
  total_stays int default 0,
  lifetime_spend_cents int default 0,
  last_visit date,
  created_at timestamptz not null default now()
);

create table public.lodge_housekeeping (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  room_id uuid not null,
  room_number text,
  status text not null default 'clean',
  assignee_id uuid,
  notes text,
  last_cleaned_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.lodge_amenities (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique,
  amenities jsonb default '{}'::jsonb,
  policies jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.lodge_reservation_charges (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  reservation_id uuid not null,
  label text not null,
  amount_cents int not null,
  created_at timestamptz not null default now()
);

-- ============ INDEXES ============
create index idx_lodge_rooms_store on public.lodge_rooms(store_id);
create index idx_lodge_reservations_store on public.lodge_reservations(store_id);
create index idx_lodge_reservations_dates on public.lodge_reservations(store_id, check_in, check_out);
create index idx_lodge_reservations_room on public.lodge_reservations(room_id);
create index idx_lodge_blocks_store on public.lodge_room_blocks(store_id);
create index idx_lodge_blocks_room_date on public.lodge_room_blocks(room_id, block_date);
create index idx_lodge_guests_store on public.lodge_guests(store_id);
create index idx_lodge_housekeeping_store on public.lodge_housekeeping(store_id);
create index idx_lodge_housekeeping_room on public.lodge_housekeeping(room_id);
create index idx_lodge_amenities_store on public.lodge_amenities(store_id);
create index idx_lodge_charges_store on public.lodge_reservation_charges(store_id);
create index idx_lodge_charges_reservation on public.lodge_reservation_charges(reservation_id);

-- ============ updated_at TRIGGERS ============
create trigger trg_lodge_rooms_updated
  before update on public.lodge_rooms
  for each row execute function public.update_updated_at_column();

create trigger trg_lodge_reservations_updated
  before update on public.lodge_reservations
  for each row execute function public.update_updated_at_column();

create trigger trg_lodge_housekeeping_updated
  before update on public.lodge_housekeeping
  for each row execute function public.update_updated_at_column();

create trigger trg_lodge_amenities_updated
  before update on public.lodge_amenities
  for each row execute function public.update_updated_at_column();

-- ============ HELPER: store ownership check ============
create or replace function public.is_lodge_store_owner(_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.store_profiles
    where id = _store_id and owner_id = auth.uid()
  );
$$;

-- ============ ENABLE RLS ============
alter table public.lodge_rooms enable row level security;
alter table public.lodge_reservations enable row level security;
alter table public.lodge_room_blocks enable row level security;
alter table public.lodge_guests enable row level security;
alter table public.lodge_housekeeping enable row level security;
alter table public.lodge_amenities enable row level security;
alter table public.lodge_reservation_charges enable row level security;

-- ============ POLICIES (owner OR admin, all actions) ============
-- lodge_rooms
create policy "Owners manage their rooms"
  on public.lodge_rooms for all
  using (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'));

-- lodge_reservations
create policy "Owners manage their reservations"
  on public.lodge_reservations for all
  using (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'));

-- lodge_room_blocks
create policy "Owners manage their blocks"
  on public.lodge_room_blocks for all
  using (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'));

-- lodge_guests
create policy "Owners manage their guests"
  on public.lodge_guests for all
  using (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'));

-- lodge_housekeeping
create policy "Owners manage their housekeeping"
  on public.lodge_housekeeping for all
  using (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'));

-- lodge_amenities
create policy "Owners manage their amenities"
  on public.lodge_amenities for all
  using (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'));

-- lodge_reservation_charges
create policy "Owners manage their reservation charges"
  on public.lodge_reservation_charges for all
  using (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'))
  with check (public.is_lodge_store_owner(store_id) or public.has_role(auth.uid(), 'admin'));

-- Zivo Travel bus target migration draft
-- Date: 2026-06-05
--
-- Purpose:
--   Draft the first small backend cutover batch for xbllvmpomorawkcrtbcq.
--   This file is intentionally under docs/ so it cannot be applied by accident.
--
-- Before applying to the Zivo Travel project:
--   1. Confirm store_profiles exists, or replace it with the approved travel
--      operator profile table and update app/Edge Function code accordingly.
--   2. Confirm helper functions exist:
--      - public.set_updated_at()
--      - public.is_store_owner(uuid, uuid)
--      - public.is_admin(uuid)
--   3. Confirm private remains out of Supabase Data API exposed schemas.
--   4. Deploy create-bus-payment-intent and capture-bus-payment to the target
--      project with sandbox Stripe secrets first.
--   5. Keep VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=false until smoke-tested.

do $$
begin
  if to_regclass('public.store_profiles') is null then
    raise exception 'Missing dependency: public.store_profiles';
  end if;
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Missing dependency: public.set_updated_at()';
  end if;
  if to_regprocedure('public.is_store_owner(uuid, uuid)') is null then
    raise exception 'Missing dependency: public.is_store_owner(uuid, uuid)';
  end if;
  if to_regprocedure('public.is_admin(uuid)') is null then
    raise exception 'Missing dependency: public.is_admin(uuid)';
  end if;
end $$;

-- Keep privileged helper routines outside exposed API schemas.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create table if not exists public.bus_routes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  origin text not null,
  destination text not null,
  distance_km numeric,
  duration_mins integer,
  base_price_cents integer not null default 0 check (base_price_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_vehicles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  label text not null,
  plate text,
  vehicle_type text not null default 'Coach',
  total_seats integer not null default 40 check (total_seats > 0 and total_seats <= 80),
  seat_layout text not null default '2-2',
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_drivers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  name text not null,
  phone text,
  license_number text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_trips (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  route_id uuid not null references public.bus_routes(id) on delete cascade,
  depart_date date not null,
  depart_time text not null,
  arrive_time text,
  bus_type text not null default 'Coach',
  total_seats integer not null default 40 check (total_seats > 0 and total_seats <= 80),
  seat_layout text not null default '2-2',
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd',
  amenities jsonb not null default '[]'::jsonb,
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'departed')),
  vehicle_id uuid references public.bus_vehicles(id) on delete set null,
  driver_id uuid references public.bus_drivers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_bookings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  trip_id uuid not null references public.bus_trips(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  seats jsonb not null default '[]'::jsonb,
  passenger_count integer not null default 1 check (passenger_count > 0),
  contact_name text,
  contact_phone text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'hold' check (status in ('hold', 'confirmed', 'cancelled')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'authorized', 'captured', 'failed', 'refunded', 'voided')),
  stripe_payment_intent_id text,
  booking_ref text,
  boarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_route_stops (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  route_id uuid not null references public.bus_routes(id) on delete cascade,
  name text not null,
  stop_order integer not null default 0 check (stop_order >= 0),
  offset_mins integer check (offset_mins is null or offset_mins >= 0),
  kind text not null default 'both' check (kind in ('pickup', 'dropoff', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_promos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  code text not null,
  description text,
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  discount_value integer not null default 0 check (discount_value > 0),
  min_fare_cents integer not null default 0 check (min_fare_cents >= 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_on date,
  ends_on date,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bus_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  trip_id uuid references public.bus_trips(id) on delete set null,
  booking_id uuid references public.bus_bookings(id) on delete set null,
  customer_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  reply text,
  replied_at timestamptz,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep one stable index per access pattern; do not copy duplicate live indexes.
create index if not exists idx_bus_routes_store on public.bus_routes(store_id);
create index if not exists idx_bus_routes_origin_destination on public.bus_routes(origin, destination);
create index if not exists idx_bus_trips_store on public.bus_trips(store_id);
create index if not exists idx_bus_trips_route on public.bus_trips(route_id);
create index if not exists idx_bus_trips_depart_date on public.bus_trips(depart_date);
create index if not exists idx_bus_bookings_store on public.bus_bookings(store_id);
create index if not exists idx_bus_bookings_trip on public.bus_bookings(trip_id);
create index if not exists idx_bus_bookings_customer on public.bus_bookings(customer_id);
create index if not exists idx_bus_route_stops_route_order on public.bus_route_stops(route_id, stop_order);
create index if not exists idx_bus_route_stops_store on public.bus_route_stops(store_id);
create index if not exists idx_bus_promos_store_status on public.bus_promos(store_id, status);
create unique index if not exists idx_bus_promos_store_code_upper on public.bus_promos(store_id, upper(code));
create index if not exists idx_bus_reviews_store_created on public.bus_reviews(store_id, created_at desc);
create index if not exists idx_bus_reviews_trip on public.bus_reviews(trip_id);
create index if not exists idx_bus_reviews_customer on public.bus_reviews(customer_id);
create index if not exists idx_bus_vehicles_store on public.bus_vehicles(store_id);
create index if not exists idx_bus_drivers_store on public.bus_drivers(store_id);

drop trigger if exists trg_bus_routes_updated on public.bus_routes;
create trigger trg_bus_routes_updated before update on public.bus_routes
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bus_trips_updated on public.bus_trips;
create trigger trg_bus_trips_updated before update on public.bus_trips
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bus_bookings_updated on public.bus_bookings;
create trigger trg_bus_bookings_updated before update on public.bus_bookings
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bus_vehicles_updated on public.bus_vehicles;
create trigger trg_bus_vehicles_updated before update on public.bus_vehicles
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bus_drivers_updated on public.bus_drivers;
create trigger trg_bus_drivers_updated before update on public.bus_drivers
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bus_route_stops_updated on public.bus_route_stops;
create trigger trg_bus_route_stops_updated before update on public.bus_route_stops
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bus_promos_updated on public.bus_promos;
create trigger trg_bus_promos_updated before update on public.bus_promos
  for each row execute function public.set_updated_at();
drop trigger if exists trg_bus_reviews_updated on public.bus_reviews;
create trigger trg_bus_reviews_updated before update on public.bus_reviews
  for each row execute function public.set_updated_at();

alter table public.bus_routes enable row level security;
alter table public.bus_trips enable row level security;
alter table public.bus_bookings enable row level security;
alter table public.bus_vehicles enable row level security;
alter table public.bus_drivers enable row level security;
alter table public.bus_route_stops enable row level security;
alter table public.bus_promos enable row level security;
alter table public.bus_reviews enable row level security;

drop policy if exists bus_routes_select on public.bus_routes;
create policy bus_routes_select on public.bus_routes for select
  using (status = 'active' or public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists bus_routes_manage on public.bus_routes;
create policy bus_routes_manage on public.bus_routes for all
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists bus_trips_select on public.bus_trips;
create policy bus_trips_select on public.bus_trips for select
  using (status = 'scheduled' or public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists bus_trips_manage on public.bus_trips;
create policy bus_trips_manage on public.bus_trips for all
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists bus_bookings_select on public.bus_bookings;
create policy bus_bookings_select on public.bus_bookings for select
  using (customer_id = auth.uid() or public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists bus_bookings_owner_update on public.bus_bookings;
create policy bus_bookings_owner_update on public.bus_bookings for update
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists bus_vehicles_owner_manage on public.bus_vehicles;
create policy bus_vehicles_owner_manage on public.bus_vehicles for all
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists bus_drivers_owner_manage on public.bus_drivers;
create policy bus_drivers_owner_manage on public.bus_drivers for all
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists bus_route_stops_public_read on public.bus_route_stops;
create policy bus_route_stops_public_read on public.bus_route_stops for select
  using (exists (
    select 1 from public.bus_routes r
    where r.id = route_id
      and (r.status = 'active' or public.is_store_owner(r.store_id, auth.uid()) or public.is_admin(auth.uid()))
  ));
drop policy if exists bus_route_stops_owner_manage on public.bus_route_stops;
create policy bus_route_stops_owner_manage on public.bus_route_stops for all
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists bus_promos_public_read on public.bus_promos;
create policy bus_promos_public_read on public.bus_promos for select
  using (
    status = 'active'
    and (starts_on is null or starts_on <= current_date)
    and (ends_on is null or ends_on >= current_date)
    or public.is_store_owner(store_id, auth.uid())
    or public.is_admin(auth.uid())
  );
drop policy if exists bus_promos_owner_manage on public.bus_promos;
create policy bus_promos_owner_manage on public.bus_promos for all
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists bus_reviews_read on public.bus_reviews;
create policy bus_reviews_read on public.bus_reviews for select
  using (status = 'published' or customer_id = auth.uid() or public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));
drop policy if exists bus_reviews_customer_insert on public.bus_reviews;
create policy bus_reviews_customer_insert on public.bus_reviews for insert
  with check (customer_id = auth.uid());
drop policy if exists bus_reviews_owner_update on public.bus_reviews;
create policy bus_reviews_owner_update on public.bus_reviews for update
  using (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()))
  with check (public.is_store_owner(store_id, auth.uid()) or public.is_admin(auth.uid()));

grant select on table public.bus_routes, public.bus_trips, public.bus_route_stops, public.bus_promos, public.bus_reviews to anon, authenticated;
grant select, insert, update, delete on table public.bus_routes, public.bus_trips to authenticated;
grant select, update on table public.bus_bookings to authenticated;
grant select, insert, update, delete on table public.bus_vehicles, public.bus_drivers, public.bus_route_stops, public.bus_promos to authenticated;
grant select, insert, update on table public.bus_reviews to authenticated;
grant all privileges on table public.bus_routes, public.bus_trips, public.bus_bookings, public.bus_vehicles, public.bus_drivers, public.bus_route_stops, public.bus_promos, public.bus_reviews to service_role;

create or replace function private.search_bus_trips(
  p_from text default null,
  p_to text default null,
  p_date date default null
)
returns table (
  trip_id uuid,
  store_id uuid,
  operator text,
  logo_url text,
  origin text,
  destination text,
  depart_date date,
  depart_time text,
  arrive_time text,
  duration_mins integer,
  bus_type text,
  seat_layout text,
  total_seats integer,
  price_cents integer,
  currency text,
  amenities jsonb,
  rating numeric,
  review_count integer,
  seats_left integer
)
language sql stable security definer set search_path = public, private
as $$
  select
    t.id,
    t.store_id,
    sp.name,
    sp.logo_url,
    r.origin,
    r.destination,
    t.depart_date,
    t.depart_time,
    t.arrive_time,
    r.duration_mins,
    t.bus_type,
    t.seat_layout,
    t.total_seats,
    t.price_cents,
    t.currency,
    t.amenities,
    sp.rating,
    0::integer as review_count,
    greatest(
      t.total_seats - coalesce((
        select sum(jsonb_array_length(b.seats))::int
        from public.bus_bookings b
        where b.trip_id = t.id and b.status in ('hold', 'confirmed')
      ), 0), 0
    ) as seats_left
  from public.bus_trips t
  join public.bus_routes r on r.id = t.route_id
  join public.store_profiles sp on sp.id = t.store_id
  where t.status = 'scheduled'
    and r.status = 'active'
    and (p_date is null or t.depart_date = p_date)
    and (p_from is null or p_from = '' or r.origin ilike '%' || p_from || '%')
    and (p_to is null or p_to = '' or r.destination ilike '%' || p_to || '%')
  order by t.depart_time;
$$;

create or replace function public.search_bus_trips(
  p_from text default null,
  p_to text default null,
  p_date date default null
)
returns table (
  trip_id uuid,
  store_id uuid,
  operator text,
  logo_url text,
  origin text,
  destination text,
  depart_date date,
  depart_time text,
  arrive_time text,
  duration_mins integer,
  bus_type text,
  seat_layout text,
  total_seats integer,
  price_cents integer,
  currency text,
  amenities jsonb,
  rating numeric,
  review_count integer,
  seats_left integer
)
language sql stable security invoker set search_path = public, private
as $$
  select * from private.search_bus_trips(p_from, p_to, p_date);
$$;

create or replace function private.get_bus_trip_seats(p_trip_id uuid)
returns table (seat text)
language sql stable security definer set search_path = public, private
as $$
  select distinct s.seat
  from public.bus_bookings b
  cross join lateral jsonb_array_elements_text(b.seats) as s(seat)
  where b.trip_id = p_trip_id and b.status in ('hold', 'confirmed');
$$;

create or replace function public.get_bus_trip_seats(p_trip_id uuid)
returns table (seat text)
language sql stable security invoker set search_path = public, private
as $$
  select * from private.get_bus_trip_seats(p_trip_id);
$$;

create or replace function private.create_bus_booking(
  p_trip_id uuid,
  p_seats jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_promo_code text default null
)
returns table (booking_id uuid, booking_ref text, amount_cents integer, currency text)
language plpgsql security definer set search_path = public, private, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_trip public.bus_trips%rowtype;
  v_seats text[];
  v_seat text;
  v_row int;
  v_col int;
  v_idx int;
  v_count int;
  v_subtotal int;
  v_discount int := 0;
  v_promo public.bus_promos%rowtype;
  v_ref text;
  v_id uuid;
begin
  if v_uid is null then raise exception 'auth_required'; end if;
  if p_seats is null or jsonb_typeof(p_seats) <> 'array' or jsonb_array_length(p_seats) = 0 then
    raise exception 'no_seats';
  end if;

  select array_agg(upper(trim(value))) into v_seats
  from jsonb_array_elements_text(p_seats);
  v_count := coalesce(array_length(v_seats, 1), 0);
  if v_count = 0 or v_count > 6 then raise exception 'invalid_seats'; end if;
  if (select count(*) from unnest(v_seats) as s(seat)) <> (select count(distinct seat) from unnest(v_seats) as s(seat)) then
    raise exception 'duplicate_seats';
  end if;

  select * into v_trip from public.bus_trips where id = p_trip_id for update;
  if not found then raise exception 'trip_not_found'; end if;
  if v_trip.status <> 'scheduled' then raise exception 'trip_unavailable'; end if;

  foreach v_seat in array v_seats loop
    if v_seat !~ '^[1-9][0-9]*[A-D]$' then raise exception 'invalid_seats'; end if;
    v_row := substring(v_seat from '^[0-9]+')::int;
    v_col := position(right(v_seat, 1) in 'ABCD') - 1;
    v_idx := ((v_row - 1) * 4) + v_col;
    if v_idx < 0 or v_idx >= v_trip.total_seats then raise exception 'invalid_seats'; end if;
  end loop;

  if exists (
    select 1 from public.bus_bookings b
    cross join lateral jsonb_array_elements_text(b.seats) as bs(seat)
    where b.trip_id = p_trip_id and b.status in ('hold', 'confirmed')
      and upper(trim(bs.seat)) = any(v_seats)
  ) then raise exception 'seat_taken'; end if;

  v_subtotal := v_trip.price_cents * v_count;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo
    from public.bus_promos
    where store_id = v_trip.store_id
      and upper(code) = upper(trim(p_promo_code))
      and status = 'active'
    for update;

    if not found then raise exception 'promo_invalid'; end if;
    if v_promo.starts_on is not null and v_promo.starts_on > current_date then raise exception 'promo_invalid'; end if;
    if v_promo.ends_on is not null and v_promo.ends_on < current_date then raise exception 'promo_invalid'; end if;
    if v_promo.max_uses is not null and v_promo.used_count >= v_promo.max_uses then raise exception 'promo_exhausted'; end if;
    if v_subtotal < v_promo.min_fare_cents then raise exception 'promo_min_fare'; end if;

    v_discount := case
      when v_promo.discount_type = 'fixed' then least(v_promo.discount_value, v_subtotal)
      else least(floor(v_subtotal * v_promo.discount_value / 100.0)::int, v_subtotal)
    end;
    update public.bus_promos set used_count = used_count + 1 where id = v_promo.id;
  end if;

  v_ref := 'ZB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.bus_bookings (
    store_id, trip_id, customer_id, seats, passenger_count,
    contact_name, contact_phone, amount_cents, currency,
    status, payment_status, booking_ref
  ) values (
    v_trip.store_id, p_trip_id, v_uid, to_jsonb(v_seats), v_count,
    p_contact_name, p_contact_phone, greatest(v_subtotal - v_discount, 0), v_trip.currency,
    'hold', 'pending', v_ref
  ) returning id, amount_cents into v_id, v_subtotal;

  return query select v_id, v_ref, v_subtotal, v_trip.currency;
end;
$$;

create or replace function public.create_bus_booking(
  p_trip_id uuid,
  p_seats jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_promo_code text default null
)
returns table (booking_id uuid, booking_ref text, amount_cents integer, currency text)
language sql volatile security invoker set search_path = public, private
as $$
  select * from private.create_bus_booking(p_trip_id, p_seats, p_contact_name, p_contact_phone, p_promo_code);
$$;

create or replace function private.get_my_bus_bookings()
returns table (
  booking_id uuid,
  booking_ref text,
  status text,
  payment_status text,
  seats jsonb,
  passenger_count integer,
  amount_cents integer,
  currency text,
  operator text,
  origin text,
  destination text,
  depart_date date,
  depart_time text,
  created_at timestamptz
)
language sql stable security definer set search_path = public, private
as $$
  select
    b.id,
    b.booking_ref,
    b.status,
    b.payment_status,
    b.seats,
    b.passenger_count,
    b.amount_cents,
    b.currency,
    sp.name,
    r.origin,
    r.destination,
    t.depart_date,
    t.depart_time,
    b.created_at
  from public.bus_bookings b
  join public.bus_trips t on t.id = b.trip_id
  join public.bus_routes r on r.id = t.route_id
  join public.store_profiles sp on sp.id = b.store_id
  where b.customer_id = auth.uid()
  order by b.created_at desc;
$$;

create or replace function public.get_my_bus_bookings()
returns table (
  booking_id uuid,
  booking_ref text,
  status text,
  payment_status text,
  seats jsonb,
  passenger_count integer,
  amount_cents integer,
  currency text,
  operator text,
  origin text,
  destination text,
  depart_date date,
  depart_time text,
  created_at timestamptz
)
language sql stable security invoker set search_path = public, private
as $$
  select * from private.get_my_bus_bookings();
$$;

create or replace function public.get_popular_bus_routes(p_limit integer default 6)
returns table (
  origin text,
  destination text,
  trip_count integer,
  next_depart_date date,
  min_price_cents integer,
  currency text
)
language sql stable security invoker set search_path = public
as $$
  select
    r.origin,
    r.destination,
    count(t.id)::int as trip_count,
    min(t.depart_date) as next_depart_date,
    min(t.price_cents)::int as min_price_cents,
    min(t.currency) as currency
  from public.bus_routes r
  join public.bus_trips t on t.route_id = r.id
  where r.status = 'active'
    and t.status = 'scheduled'
    and t.depart_date >= current_date
  group by r.origin, r.destination
  order by count(t.id) desc, min(t.depart_date), r.origin, r.destination
  limit greatest(1, least(coalesce(p_limit, 6), 12));
$$;

revoke execute on function private.search_bus_trips(text, text, date) from public;
revoke execute on function private.get_bus_trip_seats(uuid) from public;
revoke execute on function private.create_bus_booking(uuid, jsonb, text, text, text) from public;
revoke execute on function private.get_my_bus_bookings() from public;

grant execute on function private.search_bus_trips(text, text, date) to anon, authenticated, service_role;
grant execute on function private.get_bus_trip_seats(uuid) to anon, authenticated, service_role;
grant execute on function private.create_bus_booking(uuid, jsonb, text, text, text) to authenticated, service_role;
grant execute on function private.get_my_bus_bookings() to authenticated, service_role;

revoke execute on function public.search_bus_trips(text, text, date) from public;
revoke execute on function public.get_bus_trip_seats(uuid) from public;
revoke execute on function public.create_bus_booking(uuid, jsonb, text, text, text) from public;
revoke execute on function public.get_my_bus_bookings() from public;
revoke execute on function public.get_popular_bus_routes(integer) from public;

grant execute on function public.search_bus_trips(text, text, date) to anon, authenticated;
grant execute on function public.get_bus_trip_seats(uuid) to anon, authenticated;
grant execute on function public.create_bus_booking(uuid, jsonb, text, text, text) to authenticated;
revoke execute on function public.create_bus_booking(uuid, jsonb, text, text, text) from anon;
grant execute on function public.get_my_bus_bookings() to authenticated;
revoke execute on function public.get_my_bus_bookings() from anon;
grant execute on function public.get_popular_bus_routes(integer) to anon, authenticated;

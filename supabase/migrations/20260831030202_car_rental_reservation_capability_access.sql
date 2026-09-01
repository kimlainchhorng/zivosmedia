-- Replace confirmation-code/raw-UUID authority for car-rental reservations
-- with an expiring, scoped capability or the authenticated customer account.
--
-- The plaintext capability is returned only when issued. The database stores
-- only its SHA-256 digest. Customer links carry the plaintext in the URL
-- fragment, so it is not sent in HTTP requests or Referrer headers.
--
-- Phase one is additive. The separate ACL cutover migration revokes the
-- legacy browser RPCs only after compatible web/PWA/native clients are live.

do $assert_car_rental_capability_prerequisites$
declare
  v_missing_relations text[];
  v_missing_columns text[];
begin
  select pg_catalog.array_agg(required.relation_name order by required.relation_name)
  into v_missing_relations
  from (
    values
      ('public.car_rental_addons'),
      ('public.car_rental_customers'),
      ('public.car_rental_locations'),
      ('public.car_rental_promo_redemptions'),
      ('public.car_rental_promotions'),
      ('public.car_rental_reservation_addons'),
      ('public.car_rental_reservations'),
      ('public.car_rental_reviews'),
      ('public.car_rental_store_settings'),
      ('public.car_rental_vehicle_blackouts'),
      ('public.car_rental_vehicles'),
      ('public.store_profiles')
  ) as required(relation_name)
  where pg_catalog.to_regclass(required.relation_name) is null;

  if coalesce(pg_catalog.cardinality(v_missing_relations), 0) > 0 then
    raise exception
      'Car-rental capability prerequisites are missing relations: %',
      pg_catalog.array_to_string(v_missing_relations, ', ')
      using
        errcode = '42P01',
        hint = 'Reconcile and verify the live car-rental schema before this capability migration.';
  end if;

  select pg_catalog.array_agg(required.column_name order by required.column_name)
  into v_missing_columns
  from (
    values
      ('amount_paid_cents'),
      ('confirmation_code'),
      ('customer_id'),
      ('deposit_paid_cents'),
      ('discount_cents'),
      ('payment_status'),
      ('refund_amount_cents'),
      ('security_deposit_cents'),
      ('stripe_balance_payment_intent_id'),
      ('stripe_payment_intent_id')
  ) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'car_rental_reservations'
      and c.column_name = required.column_name
  );

  if coalesce(pg_catalog.cardinality(v_missing_columns), 0) > 0 then
    raise exception
      'Car-rental capability prerequisites are missing reservation columns: %',
      pg_catalog.array_to_string(v_missing_columns, ', ')
      using
        errcode = '42703',
        hint = 'Reconcile and verify the live car-rental payment/refund schema before this capability migration.';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_extension e where e.extname = 'pgcrypto'
  )
  or pg_catalog.to_regprocedure('extensions.digest(bytea,text)') is null
  or pg_catalog.to_regprocedure('extensions.gen_random_bytes(integer)') is null then
    raise exception 'The pgcrypto extension must be installed in the extensions schema.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_extension e where e.extname = 'btree_gist'
  ) then
    raise exception 'The btree_gist extension is required for reservation overlap protection.'
      using errcode = '55000';
  end if;
end;
$assert_car_rental_capability_prerequisites$;

create schema if not exists private;

create table if not exists private.car_rental_reservation_access (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null
    references public.car_rental_reservations(id) on delete cascade,
  token_hash bytea not null unique,
  scope text not null check (scope in ('manage', 'review', 'status')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint car_rental_reservation_access_future_expiry
    check (expires_at > created_at)
);

create index if not exists car_rental_reservation_access_reservation_scope_idx
  on private.car_rental_reservation_access
  (reservation_id, scope, expires_at desc);

alter table private.car_rental_reservation_access enable row level security;
revoke all on table private.car_rental_reservation_access
  from public, anon, authenticated;

-- A guest capability must never become valid again after a reservation has
-- been linked to an account. Revocation is permanent even if an operator
-- later changes/clears customer_id, a customer is deleted, or auth cleanup
-- sets car_rental_customers.user_id back to null.
create or replace function private.car_rental_revoke_access_on_customer_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_customer_id uuid;
begin
  v_customer_id := case when tg_op = 'DELETE' then old.id else new.id end;

  if tg_op = 'DELETE'
     or old.user_id is distinct from new.user_id then
    perform 1
    from public.car_rental_reservations reservation
    where reservation.customer_id = v_customer_id
    order by reservation.id
    for update;

    update private.car_rental_reservation_access access
    set revoked_at = coalesce(access.revoked_at, pg_catalog.now())
    from public.car_rental_reservations reservation
    where reservation.customer_id = v_customer_id
      and access.reservation_id = reservation.id
      and access.revoked_at is null;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private.car_rental_revoke_access_on_customer_change()
  from public, anon, authenticated, service_role;

drop trigger if exists car_rental_revoke_access_on_customer_change
  on public.car_rental_customers;
create trigger car_rental_revoke_access_on_customer_change
  after update of user_id or delete on public.car_rental_customers
  for each row
  execute function private.car_rental_revoke_access_on_customer_change();

create or replace function private.car_rental_revoke_access_on_reservation_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.customer_id is distinct from new.customer_id then
    update private.car_rental_reservation_access access
    set revoked_at = coalesce(access.revoked_at, pg_catalog.now())
    where access.reservation_id = new.id
      and access.revoked_at is null;
  end if;
  return new;
end;
$function$;

revoke all on function private.car_rental_revoke_access_on_reservation_link()
  from public, anon, authenticated, service_role;

drop trigger if exists car_rental_revoke_access_on_reservation_link
  on public.car_rental_reservations;
create trigger car_rental_revoke_access_on_reservation_link
  after update of customer_id on public.car_rental_reservations
  for each row
  when (old.customer_id is distinct from new.customer_id)
  execute function private.car_rental_revoke_access_on_reservation_link();

-- One completed reservation can create at most one review. The partial index
-- remains compatible with legacy reviews whose reservation_id is null and
-- closes the old count-then-insert race.
create unique index if not exists car_rental_reviews_one_per_reservation_idx
  on public.car_rental_reviews (reservation_id)
  where reservation_id is not null;

-- Some live environments retained only a standalone GiST index named like
-- the original constraint. Restore the real exclusion constraint so every
-- writer (including service-role Edge Functions) is protected atomically.
do $restore_car_rental_reservation_overlap_constraint$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint c
    where c.conrelid = 'public.car_rental_reservations'::pg_catalog.regclass
      and c.conname = 'car_rental_reservations_no_overlap'
      and c.contype = 'x'
  ) then
    if exists (
      select 1
      from pg_catalog.pg_class i
      join pg_catalog.pg_namespace n on n.oid = i.relnamespace
      where n.nspname = 'public'
        and i.relname = 'car_rental_reservations_no_overlap'
        and i.relkind in ('i', 'I')
        and not exists (
          select 1
          from pg_catalog.pg_constraint c
          where c.conindid = i.oid
        )
    ) then
      execute 'drop index public.car_rental_reservations_no_overlap';
    end if;

    execute $ddl$
      alter table public.car_rental_reservations
        add constraint car_rental_reservations_no_overlap
        exclude using gist (
          vehicle_id with =,
          tstzrange(pickup_at, dropoff_at, '[)') with &&
        )
        where (
          status in ('pending', 'confirmed', 'picked_up')
          and vehicle_id is not null
        )
    $ddl$;
  end if;
end;
$restore_car_rental_reservation_overlap_constraint$;

-- Reservation windows and owner blackout windows live in separate tables, so
-- their individual GiST constraints cannot prevent a cross-table race. Every
-- writer now takes the same transaction-level vehicle schedule lock and the
-- trigger performs the opposite-table check while that lock is held.
create or replace function private.car_rental_enforce_vehicle_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_old_vehicle_id uuid;
  v_new_vehicle_id uuid;
  v_lock_key bigint;
begin
  if tg_table_schema <> 'public'
     or tg_table_name not in (
       'car_rental_reservations',
       'car_rental_vehicle_blackouts'
     ) then
    raise exception 'Unsupported car-rental schedule trigger target.'
      using errcode = '55000';
  end if;

  v_new_vehicle_id := new.vehicle_id;
  if tg_op = 'UPDATE' then
    v_old_vehicle_id := old.vehicle_id;
  end if;

  for v_lock_key in
    select distinct pg_catalog.hashtextextended(
      'car-rental-vehicle-schedule:' || vehicle_id::text,
      0
    )
    from pg_catalog.unnest(
      array[v_old_vehicle_id, v_new_vehicle_id]::uuid[]
    ) as requested(vehicle_id)
    where vehicle_id is not null
    order by 1
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_lock_key);
  end loop;

  if tg_table_name = 'car_rental_reservations' then
    if new.vehicle_id is not null
       and new.status::text in ('pending', 'confirmed', 'picked_up')
       and exists (
         select 1
         from public.car_rental_vehicle_blackouts blackout
         where blackout.vehicle_id = new.vehicle_id
           and blackout.starts_at < new.dropoff_at
           and blackout.ends_at > new.pickup_at
       ) then
      raise exception 'Vehicle is unavailable for those dates.'
        using errcode = '23P01';
    end if;
  elsif exists (
    select 1
    from public.car_rental_reservations reservation
    where reservation.vehicle_id = new.vehicle_id
      and reservation.status::text in ('pending', 'confirmed', 'picked_up')
      and reservation.pickup_at < new.ends_at
      and reservation.dropoff_at > new.starts_at
  ) then
    raise exception 'Blackout overlaps an active reservation.'
      using errcode = '23P01';
  end if;

  return new;
end;
$function$;

revoke all on function private.car_rental_enforce_vehicle_schedule()
  from public, anon, authenticated, service_role;

drop trigger if exists car_rental_reservations_schedule_guard
  on public.car_rental_reservations;
create trigger car_rental_reservations_schedule_guard
  before insert or update of vehicle_id, pickup_at, dropoff_at, status
  on public.car_rental_reservations
  for each row
  execute function private.car_rental_enforce_vehicle_schedule();

drop trigger if exists car_rental_blackouts_schedule_guard
  on public.car_rental_vehicle_blackouts;
create trigger car_rental_blackouts_schedule_guard
  before insert or update of vehicle_id, starts_at, ends_at
  on public.car_rental_vehicle_blackouts
  for each row
  execute function private.car_rental_enforce_vehicle_schedule();

-- Account ownership is represented only by car_rental_customers.user_id.
-- created_by_user_id is an operator/audit field and is deliberately not an
-- end-customer authority signal. Once a customer record is account-linked,
-- an older guest capability cannot override that account boundary.
create or replace function private.car_rental_reservation_access_allowed(
  p_reservation_id uuid,
  p_access_token text,
  p_required_scope text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.car_rental_reservations r
    left join public.car_rental_customers c on c.id = r.customer_id
    where r.id = p_reservation_id
      and (
        (
          c.user_id is not null
          and p_user_id is not null
          and c.user_id = p_user_id
        )
        or (
          c.user_id is null
          and p_access_token is not null
          and p_access_token ~ '^[0-9a-f]{64}$'
          and exists (
            select 1
            from private.car_rental_reservation_access a
            where a.reservation_id = r.id
              and a.token_hash = extensions.digest(
                pg_catalog.convert_to(p_access_token, 'UTF8'),
                'sha256'
              )
              and a.scope = p_required_scope
              and a.revoked_at is null
              and a.expires_at > pg_catalog.now()
          )
        )
      )
  );
$function$;

revoke all on function private.car_rental_reservation_access_allowed(
  uuid, text, text, uuid
) from public, anon, authenticated, service_role;

-- Service workers and an authenticated store owner/admin/customer may issue
-- a new link. Anonymous callers can never mint a capability merely by knowing
-- a reservation UUID or its human confirmation code.
create or replace function public.car_rental_issue_reservation_access(
  p_reservation_id uuid,
  p_scope text default 'manage'
)
returns table (
  access_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_reservation public.car_rental_reservations;
  v_token text;
  v_expires_at timestamptz;
  v_user_id uuid := auth.uid();
  v_is_service boolean := auth.role() = 'service_role';
  v_customer_id uuid;
  v_account_user_id uuid;
  v_authorized boolean := false;
begin
  if p_scope not in ('manage', 'review', 'status') then
    raise exception 'Invalid reservation access scope.' using errcode = '22023';
  end if;

  -- Customer account transitions take their row lock before the revocation
  -- trigger locks reservations. Use the same customer -> reservation order so
  -- a guest token cannot be issued between an account link and its revocation.
  select r.customer_id
  into v_customer_id
  from public.car_rental_reservations r
  where r.id = p_reservation_id;

  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    select c.user_id
    into v_account_user_id
    from public.car_rental_customers c
    where c.id = v_customer_id
    for update;

    if not found then
      raise exception 'Reservation customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select r.*
  into v_reservation
  from public.car_rental_reservations r
  where r.id = p_reservation_id
    and r.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Reservation changed; retry.' using errcode = '40001';
  end if;

  v_authorized := v_is_service
    or (
      v_user_id is not null
      and v_account_user_id = v_user_id
    )
    or exists (
      select 1
      from public.store_profiles sp
      where sp.id = v_reservation.store_id
        and sp.owner_id = v_user_id
    )
    or (
      v_user_id is not null
      and coalesce(
        public.has_role(v_user_id, 'admin'::public.app_role),
        false
      )
    );

  if not coalesce(v_authorized, false) then
    raise exception 'Reservation access denied.' using errcode = '42501';
  end if;

  if p_scope = 'review' and v_reservation.status <> 'returned' then
    raise exception 'A review link can be issued only after the vehicle is returned.'
      using errcode = 'P0001';
  end if;

  -- Account-linked reservations deliberately do not receive a bearer token.
  -- Trusted link generators create a tokenless URL requiring that customer's
  -- ZIVO session instead.
  if v_account_user_id is not null then
    return query select null::text, null::timestamptz;
    return;
  end if;

  v_expires_at := case
    when p_scope = 'review' then pg_catalog.now() + interval '30 days'
    when p_scope = 'status' then pg_catalog.now() + interval '30 minutes'
    else least(
      pg_catalog.now() + interval '400 days',
      greatest(
        pg_catalog.now() + interval '7 days',
        v_reservation.dropoff_at + interval '30 days'
      )
    )
  end;
  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.car_rental_reservation_access (
    reservation_id,
    token_hash,
    scope,
    expires_at,
    created_by_user_id
  ) values (
    v_reservation.id,
    extensions.digest(pg_catalog.convert_to(v_token, 'UTF8'), 'sha256'),
    p_scope,
    v_expires_at,
    v_user_id
  );

  delete from private.car_rental_reservation_access a
  where a.reservation_id = v_reservation.id
    and coalesce(a.revoked_at, a.expires_at)
      < pg_catalog.now() - interval '30 days';

  return query select v_token, v_expires_at;
end;
$function$;

revoke all on function public.car_rental_issue_reservation_access(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.car_rental_issue_reservation_access(uuid, text)
  to authenticated, service_role;

-- Edge Functions call this only after independently resolving an optional
-- bearer JWT to a user id. Browser roles cannot forge p_user_id because this
-- verifier is service-role-only.
create or replace function public.car_rental_verify_reservation_access(
  p_reservation_id uuid,
  p_access_token text,
  p_scope text,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_scope not in ('manage', 'review', 'status') then
    return false;
  end if;
  return private.car_rental_reservation_access_allowed(
    p_reservation_id,
    p_access_token,
    p_scope,
    p_user_id
  );
end;
$function$;

revoke all on function public.car_rental_verify_reservation_access(
  uuid, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.car_rental_verify_reservation_access(
  uuid, text, text, uuid
) to service_role;

-- Public booking creation keeps the legacy JSON input contract but treats all
-- client-supplied labels, rates, totals, discount, tax, status and source as
-- untrusted. Catalog rows and settings are the only pricing authority.
create or replace function public.create_car_rental_app_reservation(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_store_id uuid;
  v_vehicle_id uuid;
  v_pickup_location_id uuid;
  v_dropoff_location_id uuid;
  v_vehicle public.car_rental_vehicles;
  v_pickup_at timestamptz;
  v_dropoff_at timestamptz;
  v_pickup_location_name text;
  v_dropoff_location_name text;
  v_customer_name text;
  v_customer_phone text;
  v_customer_email text;
  v_customer_id uuid;
  v_user_id uuid := auth.uid();
  v_days integer;
  v_base_total bigint;
  v_candidate bigint;
  v_remainder integer;
  v_remainder_total bigint;
  v_tax_rate_bps integer := 0;
  v_taxes bigint;
  v_total bigint;
  v_status text := 'pending';
  v_id uuid;
  v_code text;
  v_manage_token text;
  v_manage_expires_at timestamptz;
  v_status_token text;
  v_status_expires_at timestamptz;
begin
  begin
    v_store_id := nullif(p->>'store_id', '')::uuid;
    v_vehicle_id := nullif(p->>'vehicle_id', '')::uuid;
    v_pickup_location_id := nullif(p->>'pickup_location_id', '')::uuid;
    v_dropoff_location_id := nullif(p->>'dropoff_location_id', '')::uuid;
    v_pickup_at := nullif(p->>'pickup_at', '')::timestamptz;
    v_dropoff_at := nullif(p->>'dropoff_at', '')::timestamptz;
  exception when invalid_text_representation or datetime_field_overflow then
    raise exception 'Invalid booking identifiers or dates.' using errcode = '22023';
  end;

  v_customer_name := pg_catalog.btrim(coalesce(p->>'customer_name', ''));
  v_customer_phone := nullif(pg_catalog.btrim(coalesce(p->>'customer_phone', '')), '');
  v_customer_email := nullif(pg_catalog.btrim(coalesce(p->>'customer_email', '')), '');

  if v_store_id is null then
    raise exception 'store_id is required.' using errcode = '22023';
  end if;
  if v_vehicle_id is null then
    raise exception 'vehicle_id is required.' using errcode = '22023';
  end if;
  if v_customer_name = '' or pg_catalog.char_length(v_customer_name) > 120 then
    raise exception 'customer_name must contain 1 to 120 characters.'
      using errcode = '22023';
  end if;
  if v_pickup_at is null or v_dropoff_at is null then
    raise exception 'pickup_at and dropoff_at are required.' using errcode = '22023';
  end if;
  if v_pickup_at <= pg_catalog.now() then
    raise exception 'Pickup time must be in the future.' using errcode = '22023';
  end if;
  if v_dropoff_at <= v_pickup_at then
    raise exception 'Drop-off must be after pickup.' using errcode = '22023';
  end if;

  v_days := greatest(
    1,
    pg_catalog.ceil(
      extract(epoch from (v_dropoff_at - v_pickup_at)) / 86400.0
    )::integer
  );
  if v_days > 365 then
    raise exception 'A rental cannot exceed 365 days.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.store_profiles sp
    where sp.id = v_store_id
      and coalesce(sp.is_active, false) = true
  ) then
    raise exception 'Rental store is unavailable.' using errcode = 'P0002';
  end if;

  select v.*
  into v_vehicle
  from public.car_rental_vehicles v
  where v.id = v_vehicle_id
    and v.store_id = v_store_id
    and v.is_active = true
    and v.status <> 'retired'
  for share;

  if v_vehicle.id is null then
    raise exception 'Vehicle is unavailable.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.car_rental_vehicle_blackouts b
    where b.vehicle_id = v_vehicle.id
      and b.store_id = v_store_id
      and b.starts_at < v_dropoff_at
      and b.ends_at > v_pickup_at
  ) then
    raise exception 'Vehicle is unavailable for those dates.' using errcode = '23P01';
  end if;

  if v_pickup_location_id is not null then
    select l.name
    into v_pickup_location_name
    from public.car_rental_locations l
    where l.id = v_pickup_location_id
      and l.store_id = v_store_id
      and l.is_active = true;
    if v_pickup_location_name is null then
      raise exception 'Pickup location is unavailable.' using errcode = 'P0002';
    end if;
  end if;

  if v_dropoff_location_id is not null then
    select l.name
    into v_dropoff_location_name
    from public.car_rental_locations l
    where l.id = v_dropoff_location_id
      and l.store_id = v_store_id
      and l.is_active = true;
    if v_dropoff_location_name is null then
      raise exception 'Drop-off location is unavailable.' using errcode = 'P0002';
    end if;
  end if;

  select
    coalesce(s.tax_rate_bps, 0),
    case
      when coalesce(s.auto_confirm_app_bookings, false)
        then 'confirmed'
      else 'pending'
    end
  into v_tax_rate_bps, v_status
  from public.car_rental_store_settings s
  where s.store_id = v_store_id;

  v_tax_rate_bps := coalesce(v_tax_rate_bps, 0);
  v_status := coalesce(v_status, 'pending');

  -- Mirror bestBaseTotal(): daily, weekly + daily remainder, then monthly
  -- plus the cheapest daily/weekly remainder.
  v_base_total := v_vehicle.daily_rate_cents::bigint * v_days;

  if v_vehicle.weekly_rate_cents > 0 and v_days >= 7 then
    v_candidate := (v_days / 7)::bigint * v_vehicle.weekly_rate_cents
      + (v_days % 7)::bigint * v_vehicle.daily_rate_cents;
    v_base_total := least(v_base_total, v_candidate);
  end if;

  if v_vehicle.monthly_rate_cents > 0 and v_days >= 30 then
    v_remainder := v_days % 30;
    v_remainder_total := v_remainder::bigint * v_vehicle.daily_rate_cents;
    if v_vehicle.weekly_rate_cents > 0 and v_remainder >= 7 then
      v_remainder_total := least(
        v_remainder_total,
        (v_remainder / 7)::bigint * v_vehicle.weekly_rate_cents
          + (v_remainder % 7)::bigint * v_vehicle.daily_rate_cents
      );
    end if;
    v_candidate := (v_days / 30)::bigint * v_vehicle.monthly_rate_cents
      + v_remainder_total;
    v_base_total := least(v_base_total, v_candidate);
  end if;

  v_taxes := pg_catalog.round(v_base_total * v_tax_rate_bps / 10000.0)::bigint;
  v_total := v_base_total + v_taxes + v_vehicle.security_deposit_cents;

  if v_base_total > 2147483647
     or v_taxes > 2147483647
     or v_total > 2147483647 then
    raise exception 'Calculated booking total exceeds the supported amount.'
      using errcode = '22003';
  end if;

  if v_user_id is not null then
    -- Serialize first-booking customer creation without trusting an email
    -- address as account authority.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_store_id::text || ':' || v_user_id::text, 0)
    );

    select c.id
    into v_customer_id
    from public.car_rental_customers c
    where c.store_id = v_store_id
      and c.user_id = v_user_id
    order by c.created_at, c.id
    limit 1;

    if v_customer_id is null then
      insert into public.car_rental_customers (
        store_id,
        user_id,
        display_name,
        email,
        phone
      ) values (
        v_store_id,
        v_user_id,
        v_customer_name,
        v_customer_email,
        v_customer_phone
      )
      returning car_rental_customers.id into v_customer_id;
    elsif exists (
      select 1
      from public.car_rental_customers c
      where c.id = v_customer_id
        and c.is_blocked = true
    ) then
      raise exception 'This customer account cannot create a reservation.'
        using errcode = '42501';
    end if;
  end if;

  insert into public.car_rental_reservations (
    store_id,
    vehicle_id,
    customer_id,
    pickup_location_id,
    dropoff_location_id,
    vehicle_label,
    vehicle_category,
    customer_name,
    customer_phone,
    customer_email,
    pickup_location_name,
    dropoff_location_name,
    pickup_at,
    dropoff_at,
    rental_days,
    daily_rate_cents,
    base_total_cents,
    addons_total_cents,
    insurance_total_cents,
    taxes_cents,
    fees_cents,
    discount_cents,
    security_deposit_cents,
    total_cents,
    customer_notes,
    source,
    status
  ) values (
    v_store_id,
    v_vehicle.id,
    v_customer_id,
    v_pickup_location_id,
    v_dropoff_location_id,
    pg_catalog.btrim(
      pg_catalog.concat_ws(
        ' ',
        v_vehicle.year::text,
        v_vehicle.make,
        v_vehicle.model
      )
    ),
    v_vehicle.category,
    v_customer_name,
    v_customer_phone,
    v_customer_email,
    v_pickup_location_name,
    v_dropoff_location_name,
    v_pickup_at,
    v_dropoff_at,
    v_days,
    v_vehicle.daily_rate_cents,
    v_base_total::integer,
    0,
    0,
    v_taxes::integer,
    0,
    0,
    v_vehicle.security_deposit_cents,
    v_total::integer,
    nullif(pg_catalog.btrim(coalesce(p->>'customer_notes', '')), ''),
    'app',
    v_status::public.car_rental_reservation_status
  )
  returning car_rental_reservations.id, car_rental_reservations.confirmation_code
    into v_id, v_code;

  if v_customer_id is null then
    v_manage_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
    v_manage_expires_at := least(
      pg_catalog.now() + interval '400 days',
      greatest(
        pg_catalog.now() + interval '7 days',
        v_dropoff_at + interval '30 days'
      )
    );
    v_status_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
    v_status_expires_at := pg_catalog.now() + interval '30 minutes';

    insert into private.car_rental_reservation_access (
      reservation_id,
      token_hash,
      scope,
      expires_at,
      created_by_user_id
    ) values
      (
        v_id,
        extensions.digest(pg_catalog.convert_to(v_manage_token, 'UTF8'), 'sha256'),
        'manage',
        v_manage_expires_at,
        null
      ),
      (
        v_id,
        extensions.digest(pg_catalog.convert_to(v_status_token, 'UTF8'), 'sha256'),
        'status',
        v_status_expires_at,
        null
      );
  end if;

  return pg_catalog.jsonb_build_object(
    'id', v_id,
    'confirmation_code', v_code,
    'access_token', v_manage_token,
    'access_expires_at', v_manage_expires_at,
    'status_access_token', v_status_token,
    'status_access_expires_at', v_status_expires_at
  );
end;
$function$;

revoke all on function public.create_car_rental_app_reservation(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.create_car_rental_app_reservation(jsonb)
  to anon, authenticated, service_role;

-- Replace add-ons, promotion redemption, and the reservation totals in one
-- database transaction. The service-role-only RPC locks the reservation and
-- involved promotion rows, re-prices every catalog item, and rejects all
-- changes after payment activity. A reusable manage capability therefore
-- cannot be raced or replayed into a partially updated bill.
create or replace function public.car_rental_apply_booking_extras(
  p_reservation_id uuid,
  p_store_id uuid,
  p_addons jsonb default '[]'::jsonb,
  p_promo_id uuid default null,
  p_confirmation_code text default null,
  p_access_token text default null,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_reservation public.car_rental_reservations;
  v_promotion public.car_rental_promotions;
  v_addons jsonb := coalesce(p_addons, '[]'::jsonb);
  v_addon_snapshot jsonb := '[]'::jsonb;
  v_addon record;
  v_addon_count integer;
  v_unique_addon_count integer;
  v_locked_addon_count integer := 0;
  v_line_total bigint;
  v_locked_customer_id uuid;
  v_existing_promo_id uuid;
  v_customer_user_id uuid;
  v_global_redemptions integer := 0;
  v_customer_redemptions integer := 0;
  v_addons_total bigint := 0;
  v_discountable bigint;
  v_discount bigint := 0;
  v_taxable bigint;
  v_tax_rate_bps integer := 0;
  v_taxes bigint;
  v_total bigint;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_reservation_id is null or p_store_id is null then
    raise exception 'Reservation and store are required.' using errcode = '22023';
  end if;
  if pg_catalog.jsonb_typeof(v_addons) <> 'array'
     or pg_catalog.jsonb_array_length(v_addons) > 20 then
    raise exception 'Invalid add-ons.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_addons) item
    where pg_catalog.jsonb_typeof(item) <> 'object'
  ) then
    raise exception 'Invalid add-on.' using errcode = '22023';
  end if;

  -- Serialize account linking/unlinking with capability use. The customer
  -- revocation trigger takes locks customer -> reservation, so this function
  -- deliberately uses the same order and rechecks that the relationship did
  -- not change between its initial lookup and the locked reservation read.
  select r.customer_id
  into v_locked_customer_id
  from public.car_rental_reservations r
  where r.id = p_reservation_id
    and r.store_id = p_store_id;

  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  if v_locked_customer_id is not null then
    perform 1
    from public.car_rental_customers customer
    where customer.id = v_locked_customer_id
    for update;

    if not found then
      raise exception 'Reservation customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select r.*
  into v_reservation
  from public.car_rental_reservations r
  where r.id = p_reservation_id
    and r.store_id = p_store_id
    and r.customer_id is not distinct from v_locked_customer_id
  for update;

  if not found then
    raise exception 'Reservation changed; retry.' using errcode = '40001';
  end if;
  if not private.car_rental_reservation_access_allowed(
    v_reservation.id,
    p_access_token,
    'manage',
    p_user_id
  ) then
    raise exception 'Reservation access denied or expired.' using errcode = '42501';
  end if;
  if p_confirmation_code is not null
     and v_reservation.confirmation_code
       <> pg_catalog.upper(pg_catalog.btrim(p_confirmation_code)) then
    raise exception 'Reservation reference does not match.' using errcode = 'P0002';
  end if;
  if v_reservation.source <> 'app'
     or v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'Reservation cannot accept checkout extras.' using errcode = 'P0001';
  end if;
  if coalesce(v_reservation.deposit_paid_cents, 0) > 0
     or coalesce(v_reservation.amount_paid_cents, 0) > 0
     or coalesce(v_reservation.refund_amount_cents, 0) > 0
     or coalesce(v_reservation.payment_status, 'unpaid')
        not in ('unpaid', 'failed')
     or v_reservation.stripe_payment_intent_id is not null
     or v_reservation.stripe_balance_payment_intent_id is not null then
    raise exception 'Checkout extras cannot change after payment activity.'
      using errcode = 'P0001';
  end if;

  begin
    select
      pg_catalog.count(*)::integer,
      pg_catalog.count(distinct input.addon_id)::integer
    into v_addon_count, v_unique_addon_count
    from pg_catalog.jsonb_to_recordset(v_addons)
      as input(addon_id uuid, quantity integer);
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Invalid add-on.' using errcode = '22023';
  end;

  if v_addon_count <> pg_catalog.jsonb_array_length(v_addons)
     or v_unique_addon_count <> v_addon_count
     or exists (
       select 1
       from pg_catalog.jsonb_to_recordset(v_addons)
         as input(addon_id uuid, quantity integer)
       where input.addon_id is null
         or input.quantity is null
         or input.quantity < 1
         or input.quantity > 20
     ) then
    raise exception 'Invalid add-on.' using errcode = '22023';
  end if;

  -- Lock the exact catalog rows once, in deterministic id order, and retain a
  -- transaction-local snapshot. Pricing and the child-row insert below both
  -- consume this snapshot, so an owner edit cannot split the calculated total
  -- from the persisted name/price/billing values under READ COMMITTED.
  for v_addon in
    select
      catalog_addon.id,
      catalog_addon.store_id,
      catalog_addon.name,
      catalog_addon.price_cents,
      catalog_addon.billing,
      catalog_addon.is_active,
      input.quantity
    from pg_catalog.jsonb_to_recordset(v_addons)
      as input(addon_id uuid, quantity integer)
    join public.car_rental_addons catalog_addon
      on catalog_addon.id = input.addon_id
    order by catalog_addon.id
    for update of catalog_addon
  loop
    v_locked_addon_count := v_locked_addon_count + 1;

    if v_addon.store_id <> v_reservation.store_id
       or not v_addon.is_active
       or v_addon.price_cents < 0
       or v_addon.billing not in ('per_day', 'per_rental') then
      raise exception 'One or more add-ons are unavailable.' using errcode = '22023';
    end if;

    v_line_total := v_addon.price_cents::bigint
      * v_addon.quantity
      * case when v_addon.billing = 'per_day'
        then v_reservation.rental_days
        else 1
      end;

    if v_line_total < 0 or v_line_total > 2147483647 then
      raise exception 'Calculated add-on total exceeds the supported amount.'
        using errcode = '22003';
    end if;

    v_addons_total := v_addons_total + v_line_total;
    v_addon_snapshot := v_addon_snapshot || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'addon_id', v_addon.id,
        'name', pg_catalog.left(v_addon.name, 120),
        'unit_price_cents', v_addon.price_cents,
        'billing', v_addon.billing,
        'quantity', v_addon.quantity,
        'total_cents', v_line_total
      )
    );
  end loop;

  if v_locked_addon_count <> v_addon_count then
    raise exception 'One or more add-ons are unavailable.' using errcode = '22023';
  end if;

  if v_addons_total < 0 or v_addons_total > 2147483647 then
    raise exception 'Calculated add-on total exceeds the supported amount.'
      using errcode = '22003';
  end if;

  select redemption.promo_id
  into v_existing_promo_id
  from public.car_rental_promo_redemptions redemption
  where redemption.reservation_id = v_reservation.id
  for update;

  -- Promotion-row locks serialize global and per-account limit checks across
  -- different reservations. The redemption trigger also updates the same row,
  -- so legacy trusted writers cannot pass this lock concurrently.
  perform 1
  from public.car_rental_promotions promotion
  where promotion.id in (v_existing_promo_id, p_promo_id)
  order by promotion.id
  for update;

  v_discountable := v_reservation.base_total_cents::bigint + v_addons_total;
  if v_discountable < 0 or v_discountable > 2147483647 then
    raise exception 'Calculated booking subtotal exceeds the supported amount.'
      using errcode = '22003';
  end if;

  if p_promo_id is not null then
    select promotion.*
    into v_promotion
    from public.car_rental_promotions promotion
    where promotion.id = p_promo_id
      and promotion.store_id = v_reservation.store_id;

    if v_promotion.id is null or not v_promotion.is_active then
      raise exception 'Promo is no longer available.' using errcode = '22023';
    end if;
    if v_promotion.starts_at is not null
       and v_promotion.starts_at > pg_catalog.now() then
      raise exception 'Promo is not active yet.' using errcode = '22023';
    end if;
    if v_promotion.ends_at is not null
       and v_promotion.ends_at <= pg_catalog.now() then
      raise exception 'Promo has expired.' using errcode = '22023';
    end if;
    if v_reservation.rental_days < v_promotion.min_rental_days then
      raise exception 'Promo minimum rental duration was not met.'
        using errcode = '22023';
    end if;
    if v_discountable < v_promotion.min_amount_cents then
      raise exception 'Promo minimum spend was not met.' using errcode = '22023';
    end if;
    if v_promotion.kind = 'percent' and v_promotion.amount > 100 then
      raise exception 'Promo configuration is invalid.' using errcode = '22023';
    end if;

    select pg_catalog.count(*)::integer
    into v_global_redemptions
    from public.car_rental_promo_redemptions redemption
    where redemption.promo_id = v_promotion.id
      and redemption.reservation_id <> v_reservation.id;

    if v_promotion.max_redemptions is not null
       and v_global_redemptions >= v_promotion.max_redemptions then
      raise exception 'Promo redemption limit reached.' using errcode = 'P0001';
    end if;

    if v_promotion.max_per_customer is not null then
      select customer.user_id
      into v_customer_user_id
      from public.car_rental_customers customer
      where customer.id = v_reservation.customer_id;

      if v_customer_user_id is null then
        raise exception 'Sign in is required for this limited promo.'
          using errcode = '42501';
      end if;

      select pg_catalog.count(*)::integer
      into v_customer_redemptions
      from public.car_rental_promo_redemptions redemption
      join public.car_rental_customers customer
        on customer.id = redemption.customer_id
      where redemption.promo_id = v_promotion.id
        and customer.user_id = v_customer_user_id
        and redemption.reservation_id <> v_reservation.id;

      if v_customer_redemptions >= v_promotion.max_per_customer then
        raise exception 'Promo customer limit reached.' using errcode = 'P0001';
      end if;
    end if;

    v_discount := case v_promotion.kind
      when 'percent' then least(
        v_discountable,
        pg_catalog.round(
          v_discountable * v_promotion.amount / 100.0
        )::bigint
      )
      when 'flat' then least(v_discountable, v_promotion.amount::bigint)
      else 0
    end;
  end if;

  select coalesce(settings.tax_rate_bps, 0)
  into v_tax_rate_bps
  from public.car_rental_store_settings settings
  where settings.store_id = v_reservation.store_id;
  v_tax_rate_bps := coalesce(v_tax_rate_bps, 0);
  if v_tax_rate_bps < 0 or v_tax_rate_bps > 10000 then
    raise exception 'Store tax settings are invalid.' using errcode = '22023';
  end if;

  v_taxable := greatest(0::bigint, v_discountable - v_discount);
  v_taxes := pg_catalog.round(v_taxable * v_tax_rate_bps / 10000.0)::bigint;
  v_total := v_taxable
    + v_taxes
    + coalesce(v_reservation.insurance_total_cents, 0)
    + coalesce(v_reservation.fees_cents, 0)
    + coalesce(v_reservation.security_deposit_cents, 0);

  if v_discount < 0
     or v_discount > 2147483647
     or v_taxes < 0
     or v_taxes > 2147483647
     or v_total < 0
     or v_total > 2147483647 then
    raise exception 'Calculated booking total exceeds the supported amount.'
      using errcode = '22003';
  end if;

  delete from public.car_rental_reservation_addons addon
  where addon.reservation_id = v_reservation.id;

  insert into public.car_rental_reservation_addons (
    reservation_id,
    addon_id,
    name,
    unit_price_cents,
    billing,
    quantity,
    total_cents
  )
  select
    v_reservation.id,
    snapshot.addon_id,
    snapshot.name,
    snapshot.unit_price_cents,
    snapshot.billing,
    snapshot.quantity,
    snapshot.total_cents
  from pg_catalog.jsonb_to_recordset(v_addon_snapshot)
    as snapshot(
      addon_id uuid,
      name text,
      unit_price_cents integer,
      billing text,
      quantity integer,
      total_cents integer
    );

  delete from public.car_rental_promo_redemptions redemption
  where redemption.reservation_id = v_reservation.id;

  if v_promotion.id is not null then
    insert into public.car_rental_promo_redemptions (
      store_id,
      promo_id,
      reservation_id,
      customer_id,
      amount_discounted_cents
    ) values (
      v_reservation.store_id,
      v_promotion.id,
      v_reservation.id,
      v_reservation.customer_id,
      v_discount::integer
    );
  end if;

  update public.car_rental_reservations reservation
  set addons_total_cents = v_addons_total::integer,
      discount_cents = v_discount::integer,
      taxes_cents = v_taxes::integer,
      total_cents = v_total::integer
  where reservation.id = v_reservation.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation.id,
    'addons_total_cents', v_addons_total::integer,
    'discount_cents', v_discount::integer,
    'taxes_cents', v_taxes::integer,
    'total_cents', v_total::integer
  );
end;
$function$;

revoke all on function public.car_rental_apply_booking_extras(
  uuid, uuid, jsonb, uuid, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.car_rental_apply_booking_extras(
  uuid, uuid, jsonb, uuid, text, text, uuid
) to service_role;

create or replace function public.car_rental_customer_get_reservation(
  p_id uuid,
  p_access_token text default null
)
returns table (
  id uuid,
  store_id uuid,
  vehicle_id uuid,
  vehicle_label text,
  vehicle_category text,
  customer_name text,
  customer_phone text,
  customer_email text,
  pickup_location_name text,
  dropoff_location_name text,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  rental_days integer,
  daily_rate_cents integer,
  base_total_cents integer,
  addons_total_cents integer,
  insurance_total_cents integer,
  taxes_cents integer,
  fees_cents integer,
  discount_cents integer,
  security_deposit_cents integer,
  total_cents integer,
  deposit_paid_cents integer,
  amount_paid_cents integer,
  status text,
  confirmation_code text,
  customer_notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  payment_status text,
  store_name text,
  store_slug text,
  store_logo_url text,
  store_address text,
  vehicle_features jsonb,
  addons jsonb
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    r.id,
    r.store_id,
    r.vehicle_id,
    r.vehicle_label,
    r.vehicle_category,
    r.customer_name,
    r.customer_phone,
    r.customer_email,
    r.pickup_location_name,
    r.dropoff_location_name,
    r.pickup_at,
    r.dropoff_at,
    r.rental_days,
    r.daily_rate_cents,
    r.base_total_cents,
    r.addons_total_cents,
    r.insurance_total_cents,
    r.taxes_cents,
    r.fees_cents,
    r.discount_cents,
    r.security_deposit_cents,
    r.total_cents,
    r.deposit_paid_cents,
    r.amount_paid_cents,
    r.status::text,
    r.confirmation_code,
    r.customer_notes,
    r.cancelled_at,
    r.cancellation_reason,
    r.payment_status,
    sp.name,
    sp.slug,
    sp.logo_url,
    sp.address,
    coalesce(v.features, '[]'::jsonb),
    coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', a.id,
            'name', a.name,
            'quantity', a.quantity,
            'unit_price_cents', a.unit_price_cents,
            'billing', a.billing,
            'total_cents', a.total_cents
          ) order by a.created_at, a.id
        )
        from public.car_rental_reservation_addons a
        where a.reservation_id = r.id
      ),
      '[]'::jsonb
    )
  from public.car_rental_reservations r
  join public.store_profiles sp on sp.id = r.store_id
  left join public.car_rental_vehicles v on v.id = r.vehicle_id
  where r.id = p_id
    and private.car_rental_reservation_access_allowed(
      r.id,
      p_access_token,
      'manage',
      auth.uid()
    );
$function$;

revoke all on function public.car_rental_customer_get_reservation(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.car_rental_customer_get_reservation(uuid, text)
  to anon, authenticated, service_role;

create or replace function public.car_rental_customer_cancel_reservation(
  p_id uuid,
  p_access_token text,
  p_reason text
)
returns table (
  id uuid,
  status text,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_reservation public.car_rental_reservations;
  v_customer_id uuid;
begin
  select r.customer_id
  into v_customer_id
  from public.car_rental_reservations r
  where r.id = p_id;

  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    perform 1
    from public.car_rental_customers customer
    where customer.id = v_customer_id
    for update;

    if not found then
      raise exception 'Reservation customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select r.*
  into v_reservation
  from public.car_rental_reservations r
  where r.id = p_id
    and r.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Reservation changed; retry.' using errcode = '40001';
  end if;
  if not private.car_rental_reservation_access_allowed(
    v_reservation.id,
    p_access_token,
    'manage',
    auth.uid()
  ) then
    raise exception 'Reservation access denied or expired.' using errcode = '42501';
  end if;
  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'This reservation cannot be cancelled online in its current state.'
      using errcode = 'P0001';
  end if;
  if v_reservation.pickup_at <= pg_catalog.now() then
    raise exception 'This rental has already started or passed.' using errcode = 'P0001';
  end if;
  if coalesce(v_reservation.deposit_paid_cents, 0) > 0
     or coalesce(v_reservation.amount_paid_cents, 0) > 0
     or coalesce(v_reservation.refund_amount_cents, 0) > 0
     or coalesce(v_reservation.payment_status, 'unpaid')
        not in ('unpaid', 'failed')
     or v_reservation.stripe_payment_intent_id is not null
     or v_reservation.stripe_balance_payment_intent_id is not null then
    raise exception 'Online cancellation is unavailable after payment activity; please contact the rental team.'
      using errcode = 'P0001';
  end if;

  update public.car_rental_reservations r
  set status = 'cancelled',
      cancelled_at = coalesce(r.cancelled_at, pg_catalog.now()),
      cancellation_reason = pg_catalog.left(
        coalesce(
          nullif(pg_catalog.btrim(p_reason), ''),
          'Cancelled by customer'
        ),
        1000
      )
  where r.id = p_id;

  return query
    select r.id, r.status::text, r.cancelled_at
    from public.car_rental_reservations r
    where r.id = p_id;
end;
$function$;

revoke all on function public.car_rental_customer_cancel_reservation(
  uuid, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.car_rental_customer_cancel_reservation(
  uuid, text, text
) to anon, authenticated, service_role;

create or replace function public.car_rental_customer_reschedule_reservation(
  p_id uuid,
  p_access_token text,
  p_pickup_at timestamptz,
  p_dropoff_at timestamptz
)
returns table (
  id uuid,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  rental_days integer,
  total_cents integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_reservation public.car_rental_reservations;
  v_customer_id uuid;
  v_days integer;
  v_base_total bigint;
  v_addons_total bigint;
  v_discount bigint;
  v_taxable bigint;
  v_taxes bigint;
  v_total bigint;
  v_tax_rate_bps integer := 0;
begin
  select r.customer_id
  into v_customer_id
  from public.car_rental_reservations r
  where r.id = p_id;

  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    perform 1
    from public.car_rental_customers customer
    where customer.id = v_customer_id
    for update;

    if not found then
      raise exception 'Reservation customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select r.*
  into v_reservation
  from public.car_rental_reservations r
  where r.id = p_id
    and r.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Reservation changed; retry.' using errcode = '40001';
  end if;
  if not private.car_rental_reservation_access_allowed(
    v_reservation.id,
    p_access_token,
    'manage',
    auth.uid()
  ) then
    raise exception 'Reservation access denied or expired.' using errcode = '42501';
  end if;
  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception 'This reservation cannot be rescheduled in its current state.'
      using errcode = 'P0001';
  end if;
  if v_reservation.pickup_at <= pg_catalog.now() + interval '24 hours' then
    raise exception 'This reservation is within 24 hours of pickup; please contact the rental team.'
      using errcode = 'P0001';
  end if;
  if p_pickup_at is null or p_dropoff_at is null or p_dropoff_at <= p_pickup_at then
    raise exception 'Drop-off must be after pickup.' using errcode = '22023';
  end if;
  if p_pickup_at <= pg_catalog.now() + interval '24 hours' then
    raise exception 'New pickup must be at least 24 hours from now.'
      using errcode = '22023';
  end if;

  v_days := greatest(
    1,
    pg_catalog.ceil(
      extract(epoch from (p_dropoff_at - p_pickup_at)) / 86400.0
    )::integer
  );
  if v_days > 365 then
    raise exception 'A rental cannot exceed 365 days.' using errcode = '22023';
  end if;

  if coalesce(v_reservation.deposit_paid_cents, 0) > 0
     or coalesce(v_reservation.amount_paid_cents, 0) > 0
     or coalesce(v_reservation.refund_amount_cents, 0) > 0
     or coalesce(v_reservation.payment_status, 'unpaid')
        not in ('unpaid', 'failed')
     or v_reservation.stripe_payment_intent_id is not null
     or v_reservation.stripe_balance_payment_intent_id is not null then
    raise exception 'Online rescheduling is unavailable after payment activity; please contact the rental team.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.car_rental_vehicle_blackouts b
    where b.vehicle_id = v_reservation.vehicle_id
      and b.store_id = v_reservation.store_id
      and b.starts_at < p_dropoff_at
      and b.ends_at > p_pickup_at
  ) then
    raise exception 'Vehicle is unavailable for those dates.' using errcode = '23P01';
  end if;

  -- The reservation snapshot is authoritative for rescheduling. Weekly and
  -- monthly catalog rates are intentionally not re-read because they may have
  -- changed since the customer booked.
  v_base_total := v_reservation.daily_rate_cents::bigint * v_days;

  update public.car_rental_reservation_addons a
  set total_cents = case
    when a.billing = 'per_day'
      then (a.unit_price_cents::bigint * a.quantity * v_days)::integer
    else (a.unit_price_cents::bigint * a.quantity)::integer
  end
  where a.reservation_id = p_id;

  select coalesce(pg_catalog.sum(a.total_cents), 0)::bigint
  into v_addons_total
  from public.car_rental_reservation_addons a
  where a.reservation_id = p_id;

  v_discount := least(
    coalesce(v_reservation.discount_cents, 0)::bigint,
    v_base_total + v_addons_total
  );
  v_taxable := greatest(0::bigint, v_base_total + v_addons_total - v_discount);

  select coalesce(s.tax_rate_bps, 0)
  into v_tax_rate_bps
  from public.car_rental_store_settings s
  where s.store_id = v_reservation.store_id;

  v_tax_rate_bps := coalesce(v_tax_rate_bps, 0);
  v_taxes := pg_catalog.round(v_taxable * v_tax_rate_bps / 10000.0)::bigint;
  v_total := v_base_total
    + v_addons_total
    + coalesce(v_reservation.insurance_total_cents, 0)
    + coalesce(v_reservation.fees_cents, 0)
    + v_taxes
    + coalesce(v_reservation.security_deposit_cents, 0)
    - v_discount;

  if v_base_total > 2147483647
     or v_addons_total > 2147483647
     or v_taxes > 2147483647
     or v_total > 2147483647 then
    raise exception 'Calculated booking total exceeds the supported amount.'
      using errcode = '22003';
  end if;

  -- The exclusion constraint added above is the final atomic race guard.
  update public.car_rental_reservations r
  set pickup_at = p_pickup_at,
      dropoff_at = p_dropoff_at,
      rental_days = v_days,
      base_total_cents = v_base_total::integer,
      addons_total_cents = v_addons_total::integer,
      discount_cents = v_discount::integer,
      taxes_cents = v_taxes::integer,
      total_cents = v_total::integer
  where r.id = p_id;

  return query
    select r.id, r.pickup_at, r.dropoff_at, r.rental_days, r.total_cents
    from public.car_rental_reservations r
    where r.id = p_id;
end;
$function$;

revoke all on function public.car_rental_customer_reschedule_reservation(
  uuid, text, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.car_rental_customer_reschedule_reservation(
  uuid, text, timestamptz, timestamptz
) to anon, authenticated, service_role;

-- Review authorization and insertion must share one transaction. The Edge
-- wrapper supplies only an already-normalized capability/user id, while this
-- service-only function takes the customer and reservation locks, rechecks the
-- exact review scope, and inserts authoritative reservation identity fields.
create or replace function public.car_rental_submit_review(
  p_reservation_id uuid,
  p_access_token text,
  p_user_id uuid,
  p_rating integer,
  p_cleanliness integer default null,
  p_service integer default null,
  p_value integer default null,
  p_comment text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_reservation public.car_rental_reservations;
  v_customer_id uuid;
  v_comment text := nullif(pg_catalog.btrim(coalesce(p_comment, '')), '');
  v_review_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_reservation_id is null then
    raise exception 'Reservation is required.' using errcode = '22023';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5
     or (p_cleanliness is not null and (p_cleanliness < 1 or p_cleanliness > 5))
     or (p_service is not null and (p_service < 1 or p_service > 5))
     or (p_value is not null and (p_value < 1 or p_value > 5)) then
    raise exception 'Review ratings must be between 1 and 5.' using errcode = '22023';
  end if;
  if v_comment is not null and pg_catalog.char_length(v_comment) > 2000 then
    raise exception 'Review comment is too long.' using errcode = '22023';
  end if;

  select reservation.customer_id
  into v_customer_id
  from public.car_rental_reservations reservation
  where reservation.id = p_reservation_id;

  if not found then
    raise exception 'Reservation not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    perform 1
    from public.car_rental_customers customer
    where customer.id = v_customer_id
    for update;

    if not found then
      raise exception 'Reservation customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select reservation.*
  into v_reservation
  from public.car_rental_reservations reservation
  where reservation.id = p_reservation_id
    and reservation.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Reservation changed; retry.' using errcode = '40001';
  end if;
  if not private.car_rental_reservation_access_allowed(
    v_reservation.id,
    p_access_token,
    'review',
    p_user_id
  ) then
    raise exception 'Reservation access denied or expired.' using errcode = '42501';
  end if;
  if pg_catalog.lower(v_reservation.status::text)
       not in ('completed', 'delivered', 'returned', 'closed') then
    raise exception 'Reservation is not ready for review.' using errcode = 'P0001';
  end if;

  insert into public.car_rental_reviews (
    store_id,
    reservation_id,
    customer_id,
    vehicle_id,
    customer_name,
    vehicle_label,
    rating,
    cleanliness,
    service,
    value,
    comment,
    is_published,
    is_acknowledged
  ) values (
    v_reservation.store_id,
    v_reservation.id,
    v_reservation.customer_id,
    v_reservation.vehicle_id,
    pg_catalog.left(v_reservation.customer_name, 160),
    pg_catalog.left(v_reservation.vehicle_label, 160),
    p_rating,
    p_cleanliness,
    p_service,
    p_value,
    v_comment,
    false,
    false
  )
  returning id into v_review_id;

  return v_review_id;
end;
$function$;

revoke all on function public.car_rental_submit_review(
  uuid, text, uuid, integer, integer, integer, integer, text
) from public, anon, authenticated, service_role;
grant execute on function public.car_rental_submit_review(
  uuid, text, uuid, integer, integer, integer, integer, text
) to service_role;

create or replace function public.car_rental_customer_get_payment_status(
  p_reservation_id uuid,
  p_access_token text default null
)
returns table (
  payment_status text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select r.payment_status, r.status::text
  from public.car_rental_reservations r
  where r.id = p_reservation_id
    and private.car_rental_reservation_access_allowed(
      r.id,
      p_access_token,
      'status',
      auth.uid()
    );
$function$;

revoke all on function public.car_rental_customer_get_payment_status(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.car_rental_customer_get_payment_status(uuid, text)
  to anon, authenticated, service_role;

create or replace function public.car_rental_customer_get_reservation_for_review(
  p_id uuid,
  p_access_token text default null
)
returns table (
  id uuid,
  store_id uuid,
  store_name text,
  store_slug text,
  store_logo_url text,
  customer_id uuid,
  vehicle_id uuid,
  customer_name text,
  vehicle_label text,
  status text,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  already_reviewed boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    r.id,
    r.store_id,
    sp.name,
    sp.slug,
    sp.logo_url,
    r.customer_id,
    r.vehicle_id,
    r.customer_name,
    r.vehicle_label,
    r.status::text,
    r.pickup_at,
    r.dropoff_at,
    exists (
      select 1
      from public.car_rental_reviews review
      where review.reservation_id = r.id
    )
  from public.car_rental_reservations r
  join public.store_profiles sp on sp.id = r.store_id
  where r.id = p_id
    and private.car_rental_reservation_access_allowed(
      r.id,
      p_access_token,
      'review',
      auth.uid()
    );
$function$;

revoke all on function public.car_rental_customer_get_reservation_for_review(
  uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.car_rental_customer_get_reservation_for_review(
  uuid, text
) to anon, authenticated, service_role;

create or replace function public.car_rental_customer_list_reservations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_total_rentals integer;
  v_reservations jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select pg_catalog.count(*) filter (where r.status = 'returned')::integer
  into v_total_rentals
  from public.car_rental_reservations r
  join public.car_rental_customers c on c.id = r.customer_id
  where c.user_id = v_user_id;

  select coalesce(
    pg_catalog.jsonb_agg(row_data.item order by row_data.pickup_at desc),
    '[]'::jsonb
  )
  into v_reservations
  from (
    select
      r.pickup_at,
      pg_catalog.jsonb_build_object(
        'id', r.id,
        'store_id', r.store_id,
        'vehicle_label', r.vehicle_label,
        'vehicle_category', r.vehicle_category,
        'pickup_at', r.pickup_at,
        'dropoff_at', r.dropoff_at,
        'rental_days', r.rental_days,
        'total_cents', r.total_cents,
        'status', r.status::text,
        'confirmation_code', r.confirmation_code,
        'pickup_location_name', r.pickup_location_name,
        'payment_status', r.payment_status,
        'deposit_paid_cents', r.deposit_paid_cents,
        'amount_paid_cents', r.amount_paid_cents,
        'store_name', sp.name,
        'store_slug', sp.slug,
        'store_logo_url', sp.logo_url,
        'currency_code', coalesce(settings.currency_code, 'USD')
      ) as item
    from public.car_rental_reservations r
    join public.car_rental_customers c on c.id = r.customer_id
    join public.store_profiles sp on sp.id = r.store_id
    left join public.car_rental_store_settings settings
      on settings.store_id = r.store_id
    where c.user_id = v_user_id
  ) as row_data;

  return pg_catalog.jsonb_build_object(
    'total_rentals', coalesce(v_total_rentals, 0),
    'reservations', coalesce(v_reservations, '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.car_rental_customer_list_reservations()
  from public, anon, authenticated, service_role;
grant execute on function public.car_rental_customer_list_reservations()
  to authenticated, service_role;

-- Additive-phase ACL assertions. Legacy code/UUID RPC grants intentionally
-- remain until the separate cutover migration.
do $assert_car_rental_capability_additive_acl$
begin
  if pg_catalog.has_table_privilege(
       'anon',
       'private.car_rental_reservation_access',
       'select'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'private.car_rental_reservation_access',
       'select'
     ) then
    raise exception 'Car-rental capability hashes are browser-readable.';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_verify_reservation_access(uuid,text,text,uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_verify_reservation_access(uuid,text,text,uuid)',
       'execute'
     ) then
    raise exception 'The trusted car-rental access verifier is browser-executable.';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_issue_reservation_access(uuid,text)',
       'execute'
     ) then
    raise exception 'Anonymous callers can mint car-rental capabilities.';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)',
       'execute'
     ) then
    raise exception 'Atomic car-rental extras authority has unsafe grants.';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)',
       'execute'
     ) then
    raise exception 'Atomic car-rental review authority has unsafe grants.';
  end if;

  if not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_customers'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_revoke_access_on_customer_change'
         and not trigger.tgisinternal
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_reservations'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_revoke_access_on_reservation_link'
         and not trigger.tgisinternal
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_reservations'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_reservations_schedule_guard'
         and not trigger.tgisinternal
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_vehicle_blackouts'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_blackouts_schedule_guard'
         and not trigger.tgisinternal
     ) then
    raise exception 'Car-rental account-transition or vehicle-schedule guards are missing.';
  end if;
end;
$assert_car_rental_capability_additive_acl$;

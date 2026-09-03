-- Replace raw test-drive/sale UUID authority with expiring, hash-only
-- capabilities or the exact authenticated customer account.
--
-- Plaintext capabilities are returned only once. The database stores only a
-- SHA-256 digest of a 32-byte random value. Phase one is additive: the legacy
-- browser RPCs remain available until the guarded phase-two cutover.

do $assert_car_dealership_capability_prerequisites$
declare
  v_missing_relations text[];
  v_missing_columns text[];
begin
  select pg_catalog.array_agg(required.relation_name order by required.relation_name)
  into v_missing_relations
  from (
    values
      ('auth.users'),
      ('public.car_dealership_customers'),
      ('public.car_dealership_leads'),
      ('public.car_dealership_reviews'),
      ('public.car_dealership_sales'),
      ('public.car_dealership_test_drives'),
      ('public.car_dealership_vehicles'),
      ('public.store_profiles')
  ) as required(relation_name)
  where pg_catalog.to_regclass(required.relation_name) is null;

  if coalesce(pg_catalog.cardinality(v_missing_relations), 0) > 0 then
    raise exception
      'Car-dealership capability prerequisites are missing relations: %',
      pg_catalog.array_to_string(v_missing_relations, ', ')
      using
        errcode = '42P01',
        hint = 'Reconcile and verify the live dealership schema before this capability migration.';
  end if;

  select pg_catalog.array_agg(
    required.table_name || '.' || required.column_name
    order by required.table_name, required.column_name
  )
  into v_missing_columns
  from (
    values
      ('car_dealership_customers', 'id'),
      ('car_dealership_customers', 'store_id'),
      ('car_dealership_customers', 'user_id'),
      ('car_dealership_customers', 'display_name'),
      ('car_dealership_customers', 'email'),
      ('car_dealership_customers', 'phone'),
      ('car_dealership_customers', 'created_at'),
      ('car_dealership_leads', 'id'),
      ('car_dealership_leads', 'store_id'),
      ('car_dealership_leads', 'customer_id'),
      ('car_dealership_leads', 'vehicle_id'),
      ('car_dealership_leads', 'display_name'),
      ('car_dealership_leads', 'email'),
      ('car_dealership_leads', 'phone'),
      ('car_dealership_leads', 'vehicle_label'),
      ('car_dealership_leads', 'source'),
      ('car_dealership_leads', 'status'),
      ('car_dealership_leads', 'desired_make'),
      ('car_dealership_leads', 'budget_max_cents'),
      ('car_dealership_leads', 'trade_in_interested'),
      ('car_dealership_leads', 'financing_needed'),
      ('car_dealership_leads', 'notes'),
      ('car_dealership_reviews', 'id'),
      ('car_dealership_reviews', 'store_id'),
      ('car_dealership_reviews', 'sale_id'),
      ('car_dealership_reviews', 'customer_id'),
      ('car_dealership_reviews', 'customer_name'),
      ('car_dealership_reviews', 'vehicle_label'),
      ('car_dealership_reviews', 'rating'),
      ('car_dealership_reviews', 'title'),
      ('car_dealership_reviews', 'body'),
      ('car_dealership_reviews', 'owner_response'),
      ('car_dealership_reviews', 'owner_responded_at'),
      ('car_dealership_reviews', 'is_visible'),
      ('car_dealership_reviews', 'created_at'),
      ('car_dealership_reviews', 'updated_at'),
      ('car_dealership_sales', 'id'),
      ('car_dealership_sales', 'store_id'),
      ('car_dealership_sales', 'vehicle_id'),
      ('car_dealership_sales', 'customer_id'),
      ('car_dealership_sales', 'customer_name'),
      ('car_dealership_sales', 'vehicle_label'),
      ('car_dealership_sales', 'status'),
      ('car_dealership_sales', 'sold_at'),
      ('car_dealership_sales', 'delivered_at'),
      ('car_dealership_sales', 'created_at'),
      ('car_dealership_sales', 'updated_at'),
      ('car_dealership_test_drives', 'id'),
      ('car_dealership_test_drives', 'store_id'),
      ('car_dealership_test_drives', 'lead_id'),
      ('car_dealership_test_drives', 'vehicle_id'),
      ('car_dealership_test_drives', 'customer_id'),
      ('car_dealership_test_drives', 'customer_name'),
      ('car_dealership_test_drives', 'customer_phone'),
      ('car_dealership_test_drives', 'vehicle_label'),
      ('car_dealership_test_drives', 'scheduled_at'),
      ('car_dealership_test_drives', 'duration_minutes'),
      ('car_dealership_test_drives', 'status'),
      ('car_dealership_test_drives', 'notes'),
      ('car_dealership_test_drives', 'cancellation_reason'),
      ('car_dealership_test_drives', 'created_at'),
      ('car_dealership_test_drives', 'updated_at'),
      ('car_dealership_vehicles', 'id'),
      ('car_dealership_vehicles', 'store_id'),
      ('car_dealership_vehicles', 'year'),
      ('car_dealership_vehicles', 'make'),
      ('car_dealership_vehicles', 'model'),
      ('car_dealership_vehicles', 'trim'),
      ('car_dealership_vehicles', 'status'),
      ('car_dealership_vehicles', 'is_active'),
      ('store_profiles', 'id'),
      ('store_profiles', 'owner_id'),
      ('store_profiles', 'is_active'),
      ('store_profiles', 'name'),
      ('store_profiles', 'slug'),
      ('store_profiles', 'logo_url'),
      ('store_profiles', 'address'),
      ('store_profiles', 'phone')
  ) as required(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = required.table_name
      and column_info.column_name = required.column_name
  );

  if coalesce(pg_catalog.cardinality(v_missing_columns), 0) > 0 then
    raise exception
      'Car-dealership capability prerequisites are missing columns: %',
      pg_catalog.array_to_string(v_missing_columns, ', ')
      using
        errcode = '42703',
        hint = 'Reconcile and verify the live dealership schema before this capability migration.';
  end if;

  if pg_catalog.to_regtype('public.car_dealership_lead_status') is null
     or pg_catalog.to_regtype('public.car_dealership_sale_status') is null
     or pg_catalog.to_regtype('public.car_dealership_test_drive_status') is null
     or pg_catalog.to_regtype('public.car_dealership_vehicle_status') is null
     or pg_catalog.to_regtype('public.app_role') is null
     or pg_catalog.to_regprocedure('public.has_role(uuid,public.app_role)') is null then
    raise exception 'Required dealership enums or role authority function are missing.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_extension extension_info
    where extension_info.extname = 'pgcrypto'
  )
  or pg_catalog.to_regprocedure('extensions.digest(bytea,text)') is null
  or pg_catalog.to_regprocedure('extensions.gen_random_bytes(integer)') is null then
    raise exception 'The pgcrypto extension must be installed in the extensions schema.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_extension extension_info
    where extension_info.extname = 'btree_gist'
  ) then
    raise exception 'The btree_gist extension is required for test-drive overlap protection.'
      using errcode = '55000';
  end if;
end;
$assert_car_dealership_capability_prerequisites$;

alter table public.car_dealership_test_drives
  add column if not exists created_by_user_id uuid;

do $ensure_car_dealership_test_drive_creator_fk$
declare
  v_created_by_attnum smallint;
begin
  select attribute_info.attnum
  into v_created_by_attnum
  from pg_catalog.pg_attribute attribute_info
  where attribute_info.attrelid =
      'public.car_dealership_test_drives'::pg_catalog.regclass
    and attribute_info.attname = 'created_by_user_id'
    and not attribute_info.attisdropped
    and attribute_info.atttypid = 'pg_catalog.uuid'::pg_catalog.regtype;

  if v_created_by_attnum is null then
    raise exception 'car_dealership_test_drives.created_by_user_id must be uuid.'
      using errcode = '42804';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.conname =
        'car_dealership_test_drives_created_by_user_id_fkey'
      and not (
        constraint_info.contype = 'f'
        and constraint_info.confrelid = 'auth.users'::pg_catalog.regclass
        and constraint_info.confdeltype = 'n'
        and constraint_info.conkey = array[v_created_by_attnum]::smallint[]
      )
  ) then
    raise exception 'The named dealership test-drive creator foreign key has an incompatible definition.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.contype = 'f'
      and constraint_info.confrelid = 'auth.users'::pg_catalog.regclass
      and constraint_info.confdeltype = 'n'
      and constraint_info.conkey = array[v_created_by_attnum]::smallint[]
  ) then
    alter table public.car_dealership_test_drives
      add constraint car_dealership_test_drives_created_by_user_id_fkey
      foreign key (created_by_user_id)
      references auth.users(id)
      on delete set null;
  end if;
end;
$ensure_car_dealership_test_drive_creator_fk$;

create index if not exists car_dealership_test_drives_created_by_user_id_idx
  on public.car_dealership_test_drives (created_by_user_id)
  where created_by_user_id is not null;

-- Persist the end of each window because timestamptz + interval is not an
-- immutable index expression. A trigger owns this derived value for every
-- writer; the GiST constraint below is the final atomic race guard.
alter table public.car_dealership_test_drives
  add column if not exists scheduled_until_at timestamptz;

do $assert_car_dealership_test_drive_window_column$
begin
  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'car_dealership_test_drives'
      and column_info.column_name = 'scheduled_until_at'
      and column_info.data_type = 'timestamp with time zone'
  ) then
    raise exception 'car_dealership_test_drives.scheduled_until_at must be timestamptz.'
      using errcode = '42804';
  end if;
end;
$assert_car_dealership_test_drive_window_column$;

update public.car_dealership_test_drives test_drive
set scheduled_until_at = test_drive.scheduled_at
  + test_drive.duration_minutes * interval '1 minute'
where test_drive.scheduled_until_at is distinct from (
  test_drive.scheduled_at + test_drive.duration_minutes * interval '1 minute'
);

alter table public.car_dealership_test_drives
  alter column scheduled_until_at set not null;

do $ensure_car_dealership_test_drive_window_check$
begin
  if exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.conname =
        'car_dealership_test_drives_valid_window'
      and (
        constraint_info.contype <> 'c'
        or not constraint_info.convalidated
        or pg_catalog.pg_get_constraintdef(constraint_info.oid)
          not ilike '%scheduled_until_at > scheduled_at%'
      )
  ) then
    raise exception 'The named dealership test-drive window check is incompatible.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.conname =
        'car_dealership_test_drives_valid_window'
  ) then
    alter table public.car_dealership_test_drives
      add constraint car_dealership_test_drives_valid_window
      check (scheduled_until_at > scheduled_at);
  end if;
end;
$ensure_car_dealership_test_drive_window_check$;

create schema if not exists private;

create table if not exists private.car_dealership_test_drive_access (
  id uuid primary key default gen_random_uuid(),
  test_drive_id uuid not null
    references public.car_dealership_test_drives(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint car_dealership_test_drive_access_hash_length
    check (pg_catalog.octet_length(token_hash) = 32),
  constraint car_dealership_test_drive_access_future_expiry
    check (expires_at > created_at)
);

create index if not exists car_dealership_test_drive_access_subject_idx
  on private.car_dealership_test_drive_access
  (test_drive_id, expires_at desc);

create table if not exists private.car_dealership_sale_review_access (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null
    references public.car_dealership_sales(id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint car_dealership_sale_review_access_hash_length
    check (pg_catalog.octet_length(token_hash) = 32),
  constraint car_dealership_sale_review_access_future_expiry
    check (expires_at > created_at)
);

create index if not exists car_dealership_sale_review_access_subject_idx
  on private.car_dealership_sale_review_access
  (sale_id, expires_at desc);

-- A request UUID is consumed in the same transaction as the CRM writes. The
-- record stores only a normalized-input digest and result identifiers; it
-- never stores capability plaintext. A replay can therefore return the prior
-- identifiers truthfully, but must return a null capability.
create table if not exists private.car_dealership_interest_requests (
  request_id uuid primary key,
  request_hash bytea not null,
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  mode text not null check (mode in ('info', 'test_drive')),
  submitted_user_id uuid references auth.users(id) on delete set null,
  lead_id uuid references public.car_dealership_leads(id) on delete set null,
  test_drive_id uuid
    references public.car_dealership_test_drives(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint car_dealership_interest_requests_hash_length
    check (pg_catalog.octet_length(request_hash) = 32),
  constraint car_dealership_interest_requests_result_shape
    check (
      (completed_at is null and lead_id is null and test_drive_id is null)
      or (
        completed_at is not null
        and lead_id is not null
        and (
          (mode = 'info' and test_drive_id is null)
          or mode = 'test_drive'
        )
      )
    )
);

alter table private.car_dealership_test_drive_access enable row level security;
alter table private.car_dealership_sale_review_access enable row level security;
alter table private.car_dealership_interest_requests enable row level security;

revoke all on table private.car_dealership_test_drive_access
  from public, anon, authenticated;
revoke all on table private.car_dealership_sale_review_access
  from public, anon, authenticated;
revoke all on table private.car_dealership_interest_requests
  from public, anon, authenticated;

-- Close the alternate sale-id representation in visible review rows. The
-- narrow barrier view contains public content only and omits sale/customer
-- identifiers; full base rows remain owner/admin/service-only.
create or replace view public.car_dealership_public_reviews
with (security_barrier = true, security_invoker = true)
as
select
  review.id,
  review.store_id,
  review.customer_name,
  review.vehicle_label,
  review.rating,
  review.title,
  review.body,
  review.owner_response,
  review.owner_responded_at,
  review.is_visible,
  review.created_at,
  review.updated_at
from public.car_dealership_reviews review
where review.is_visible = true;

revoke all on table public.car_dealership_public_reviews
  from public, anon, authenticated, service_role;
grant select on table public.car_dealership_public_reviews
  to anon, authenticated, service_role;

-- Keep legacy base-table review grants and policies intact in phase one so
-- the additive migration can land before compatible web/PWA/native clients.
-- The guarded phase-two cutover moves public reads onto the safe projection
-- and server-gates all base-table review mutations.

-- Fail rather than preserving duplicate sale reviews under a drifted live
-- schema. This index makes review insertion atomic for every writer.
create unique index if not exists car_dealership_reviews_unique_per_sale
  on public.car_dealership_reviews (sale_id)
  where sale_id is not null;

-- Customer account transitions are serialized customer -> subject. Revoking
-- every existing capability is permanent even if the link is later cleared.
create or replace function private.car_dealership_revoke_access_on_customer_change()
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
    from public.car_dealership_test_drives test_drive
    where test_drive.customer_id = v_customer_id
    order by test_drive.id
    for update;

    update private.car_dealership_test_drive_access access_record
    set revoked_at = coalesce(access_record.revoked_at, pg_catalog.now())
    from public.car_dealership_test_drives test_drive
    where test_drive.customer_id = v_customer_id
      and access_record.test_drive_id = test_drive.id
      and access_record.revoked_at is null;

    perform 1
    from public.car_dealership_sales sale
    where sale.customer_id = v_customer_id
    order by sale.id
    for update;

    update private.car_dealership_sale_review_access access_record
    set revoked_at = coalesce(access_record.revoked_at, pg_catalog.now())
    from public.car_dealership_sales sale
    where sale.customer_id = v_customer_id
      and access_record.sale_id = sale.id
      and access_record.revoked_at is null;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private.car_dealership_revoke_access_on_customer_change()
  from public, anon, authenticated, service_role;

drop trigger if exists car_dealership_revoke_access_on_customer_change
  on public.car_dealership_customers;
create trigger car_dealership_revoke_access_on_customer_change
  after update of user_id or delete on public.car_dealership_customers
  for each row
  execute function private.car_dealership_revoke_access_on_customer_change();

-- PostgreSQL foreign-key SET NULL actions are also row triggers. Revoke in a
-- BEFORE DELETE guard so trigger-name ordering can never clear subject links
-- before the revoker finds them; the AFTER trigger above remains the update
-- transition guard and a harmless delete-time defense in depth.
drop trigger if exists car_dealership_revoke_access_before_customer_delete
  on public.car_dealership_customers;
create trigger car_dealership_revoke_access_before_customer_delete
  before delete on public.car_dealership_customers
  for each row
  execute function private.car_dealership_revoke_access_on_customer_change();

create or replace function private.car_dealership_revoke_access_on_test_drive_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.customer_id is distinct from new.customer_id
     or old.created_by_user_id is distinct from new.created_by_user_id then
    update private.car_dealership_test_drive_access access_record
    set revoked_at = coalesce(access_record.revoked_at, pg_catalog.now())
    where access_record.test_drive_id = new.id
      and access_record.revoked_at is null;
  end if;
  return new;
end;
$function$;

revoke all on function private.car_dealership_revoke_access_on_test_drive_change()
  from public, anon, authenticated, service_role;

drop trigger if exists car_dealership_revoke_access_on_test_drive_change
  on public.car_dealership_test_drives;
create trigger car_dealership_revoke_access_on_test_drive_change
  after update of customer_id, created_by_user_id
  on public.car_dealership_test_drives
  for each row
  when (
    old.customer_id is distinct from new.customer_id
    or old.created_by_user_id is distinct from new.created_by_user_id
  )
  execute function private.car_dealership_revoke_access_on_test_drive_change();

create or replace function private.car_dealership_revoke_access_on_sale_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if old.customer_id is distinct from new.customer_id then
    update private.car_dealership_sale_review_access access_record
    set revoked_at = coalesce(access_record.revoked_at, pg_catalog.now())
    where access_record.sale_id = new.id
      and access_record.revoked_at is null;
  end if;
  return new;
end;
$function$;

revoke all on function private.car_dealership_revoke_access_on_sale_change()
  from public, anon, authenticated, service_role;

drop trigger if exists car_dealership_revoke_access_on_sale_change
  on public.car_dealership_sales;
create trigger car_dealership_revoke_access_on_sale_change
  after update of customer_id on public.car_dealership_sales
  for each row
  when (old.customer_id is distinct from new.customer_id)
  execute function private.car_dealership_revoke_access_on_sale_change();

create or replace function private.car_dealership_enforce_test_drive_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_old_vehicle_id uuid;
  v_lock_key bigint;
begin
  if tg_table_schema <> 'public'
     or tg_table_name <> 'car_dealership_test_drives' then
    raise exception 'Unsupported dealership test-drive schedule trigger target.'
      using errcode = '55000';
  end if;

  if new.scheduled_at is null
     or new.duration_minutes is null
     or new.duration_minutes < 5
     or new.duration_minutes > 480 then
    raise exception 'Invalid test-drive window.' using errcode = '22023';
  end if;

  new.scheduled_until_at := new.scheduled_at
    + new.duration_minutes * interval '1 minute';

  if tg_op = 'UPDATE' then
    v_old_vehicle_id := old.vehicle_id;
  end if;

  for v_lock_key in
    select distinct pg_catalog.hashtextextended(
      'car-dealership-test-drive-schedule:' || requested.vehicle_id::text,
      0
    )
    from pg_catalog.unnest(
      array[v_old_vehicle_id, new.vehicle_id]::uuid[]
    ) as requested(vehicle_id)
    where requested.vehicle_id is not null
    order by 1
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_lock_key);
  end loop;

  if new.vehicle_id is not null
     and new.status::text in ('scheduled', 'confirmed', 'in_progress')
     and exists (
       select 1
       from public.car_dealership_test_drives existing
       where existing.vehicle_id = new.vehicle_id
         and existing.id <> new.id
         and existing.status::text in ('scheduled', 'confirmed', 'in_progress')
         and existing.scheduled_at < new.scheduled_until_at
         and existing.scheduled_until_at > new.scheduled_at
     ) then
    raise exception 'Vehicle already has an overlapping active test drive.'
      using errcode = '23P01';
  end if;

  return new;
end;
$function$;

revoke all on function private.car_dealership_enforce_test_drive_window()
  from public, anon, authenticated, service_role;

drop trigger if exists car_dealership_test_drives_window_guard
  on public.car_dealership_test_drives;
create trigger car_dealership_test_drives_window_guard
  before insert or update of
    vehicle_id, scheduled_at, scheduled_until_at, duration_minutes, status
  on public.car_dealership_test_drives
  for each row
  execute function private.car_dealership_enforce_test_drive_window();

do $restore_car_dealership_test_drive_overlap_constraint$
declare
  v_first_id uuid;
  v_second_id uuid;
  v_definition text;
begin
  select first_drive.id, second_drive.id
  into v_first_id, v_second_id
  from public.car_dealership_test_drives first_drive
  join public.car_dealership_test_drives second_drive
    on second_drive.vehicle_id = first_drive.vehicle_id
   and second_drive.id > first_drive.id
   and second_drive.status::text in ('scheduled', 'confirmed', 'in_progress')
   and second_drive.scheduled_at < first_drive.scheduled_until_at
   and second_drive.scheduled_until_at > first_drive.scheduled_at
  where first_drive.vehicle_id is not null
    and first_drive.status::text in ('scheduled', 'confirmed', 'in_progress')
  order by first_drive.id, second_drive.id
  limit 1;

  if v_first_id is not null then
    raise exception
      'Existing active dealership test drives overlap (% and %); reconcile them before enabling the atomic constraint.',
      v_first_id,
      v_second_id
      using errcode = '23P01';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.conname =
        'car_dealership_test_drives_no_active_overlap'
      and constraint_info.contype <> 'x'
  ) then
    raise exception 'The named dealership test-drive overlap object is not an exclusion constraint.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.conname =
        'car_dealership_test_drives_no_active_overlap'
      and constraint_info.contype = 'x'
  ) then
    if exists (
      select 1
      from pg_catalog.pg_class index_info
      join pg_catalog.pg_namespace namespace_info
        on namespace_info.oid = index_info.relnamespace
      where namespace_info.nspname = 'public'
        and index_info.relname =
          'car_dealership_test_drives_no_active_overlap'
        and index_info.relkind in ('i', 'I')
        and not exists (
          select 1
          from pg_catalog.pg_constraint constraint_info
          where constraint_info.conindid = index_info.oid
        )
    ) then
      execute 'drop index public.car_dealership_test_drives_no_active_overlap';
    end if;

    alter table public.car_dealership_test_drives
      add constraint car_dealership_test_drives_no_active_overlap
      exclude using gist (
        vehicle_id with =,
        tstzrange(scheduled_at, scheduled_until_at, '[)') with &&
      )
      where (
        status in ('scheduled', 'confirmed', 'in_progress')
        and vehicle_id is not null
      );
  end if;

  select pg_catalog.lower(pg_catalog.pg_get_constraintdef(constraint_info.oid))
  into v_definition
  from pg_catalog.pg_constraint constraint_info
  where constraint_info.conrelid =
      'public.car_dealership_test_drives'::pg_catalog.regclass
    and constraint_info.conname =
      'car_dealership_test_drives_no_active_overlap'
    and constraint_info.contype = 'x'
    and constraint_info.convalidated;

  if v_definition is null
     or v_definition not like '%vehicle_id with =%'
     or v_definition not like '%tstzrange(scheduled_at, scheduled_until_at%'
     or v_definition not like '%with &&%'
     or v_definition not like '%scheduled%'
     or v_definition not like '%confirmed%'
     or v_definition not like '%in_progress%'
     or v_definition not like '%vehicle_id is not null%' then
    raise exception 'The dealership test-drive exclusion constraint has an incompatible definition.'
      using errcode = '55000';
  end if;
end;
$restore_car_dealership_test_drive_overlap_constraint$;

-- A test drive is account-owned when either its immutable creator link or its
-- linked customer resolves to an account. Once either link exists, a bearer
-- token cannot authorize, even if the token has not yet been revoked.
create or replace function private.car_dealership_test_drive_access_allowed(
  p_test_drive_id uuid,
  p_access_token text,
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
    from public.car_dealership_test_drives test_drive
    left join public.car_dealership_customers customer
      on customer.id = test_drive.customer_id
    where test_drive.id = p_test_drive_id
      and (
        (
          p_user_id is not null
          and (
            test_drive.created_by_user_id = p_user_id
            or customer.user_id = p_user_id
          )
        )
        or (
          test_drive.created_by_user_id is null
          and customer.user_id is null
          and p_access_token is not null
          and p_access_token ~ '^[0-9a-f]{64}$'
          and exists (
            select 1
            from private.car_dealership_test_drive_access access_record
            where access_record.test_drive_id = test_drive.id
              and access_record.token_hash = extensions.digest(
                pg_catalog.convert_to(p_access_token, 'UTF8'),
                'sha256'
              )
              and access_record.revoked_at is null
              and access_record.expires_at > pg_catalog.now()
          )
        )
      )
  );
$function$;

revoke all on function private.car_dealership_test_drive_access_allowed(
  uuid, text, uuid
) from public, anon, authenticated, service_role;

-- Sale account authority is represented only by the linked customer user.
-- Review capabilities are one-time and therefore require used_at to be null.
create or replace function private.car_dealership_sale_review_access_allowed(
  p_sale_id uuid,
  p_access_token text,
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
    from public.car_dealership_sales sale
    left join public.car_dealership_customers customer
      on customer.id = sale.customer_id
    where sale.id = p_sale_id
      and (
        (
          customer.user_id is not null
          and p_user_id is not null
          and customer.user_id = p_user_id
        )
        or (
          customer.user_id is null
          and p_access_token is not null
          and p_access_token ~ '^[0-9a-f]{64}$'
          and exists (
            select 1
            from private.car_dealership_sale_review_access access_record
            where access_record.sale_id = sale.id
              and access_record.token_hash = extensions.digest(
                pg_catalog.convert_to(p_access_token, 'UTF8'),
                'sha256'
              )
              and access_record.revoked_at is null
              and access_record.used_at is null
              and access_record.expires_at > pg_catalog.now()
          )
        )
      )
  );
$function$;

revoke all on function private.car_dealership_sale_review_access_allowed(
  uuid, text, uuid
) from public, anon, authenticated, service_role;

-- Service workers and authenticated store owners/admins/customers may rotate
-- a test-drive manage link. Anonymous callers can never mint a capability by
-- knowing a test-drive UUID. Account-owned subjects receive a tokenless route.
create or replace function public.car_dealership_issue_test_drive_access(
  p_test_drive_id uuid
)
returns table (
  access_token text,
  expires_at timestamptz,
  account_owned boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_test_drive public.car_dealership_test_drives;
  v_customer_id uuid;
  v_customer_user_id uuid;
  v_user_id uuid := auth.uid();
  v_is_service boolean := auth.role() is not distinct from 'service_role';
  v_authorized boolean := false;
  v_account_owned boolean := false;
  v_token text;
  v_expires_at timestamptz;
begin
  if p_test_drive_id is null then
    raise exception 'Test drive is required.' using errcode = '22023';
  end if;

  -- Match the account-transition trigger's customer -> subject lock order and
  -- repeat the relationship check after both locks are held.
  select test_drive.customer_id
  into v_customer_id
  from public.car_dealership_test_drives test_drive
  where test_drive.id = p_test_drive_id;

  if not found then
    raise exception 'Test drive not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    select customer.user_id
    into v_customer_user_id
    from public.car_dealership_customers customer
    where customer.id = v_customer_id
    for update;

    if not found then
      raise exception 'Test-drive customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select test_drive.*
  into v_test_drive
  from public.car_dealership_test_drives test_drive
  where test_drive.id = p_test_drive_id
    and test_drive.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Test drive changed; retry.' using errcode = '40001';
  end if;

  v_account_owned := v_test_drive.created_by_user_id is not null
    or v_customer_user_id is not null;

  v_authorized := v_is_service
    or (
      v_user_id is not null
      and (
        v_test_drive.created_by_user_id = v_user_id
        or v_customer_user_id = v_user_id
      )
    )
    or exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = v_test_drive.store_id
        and store_profile.owner_id = v_user_id
    )
    or (
      v_user_id is not null
      and coalesce(
        public.has_role(v_user_id, 'admin'::public.app_role),
        false
      )
    );

  if not coalesce(v_authorized, false) then
    raise exception 'Test-drive access denied.' using errcode = '42501';
  end if;

  update private.car_dealership_test_drive_access access_record
  set revoked_at = coalesce(access_record.revoked_at, pg_catalog.now())
  where access_record.test_drive_id = v_test_drive.id
    and access_record.revoked_at is null
    and access_record.expires_at > pg_catalog.now();

  if v_account_owned then
    return query select null::text, null::timestamptz, true;
    return;
  end if;

  v_expires_at := least(
    pg_catalog.now() + interval '210 days',
    greatest(
      pg_catalog.now() + interval '7 days',
      v_test_drive.scheduled_until_at + interval '7 days'
    )
  );
  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.car_dealership_test_drive_access (
    test_drive_id,
    token_hash,
    expires_at,
    created_by_user_id
  ) values (
    v_test_drive.id,
    extensions.digest(pg_catalog.convert_to(v_token, 'UTF8'), 'sha256'),
    v_expires_at,
    v_user_id
  );

  delete from private.car_dealership_test_drive_access access_record
  where access_record.test_drive_id = v_test_drive.id
    and coalesce(access_record.revoked_at, access_record.expires_at)
      < pg_catalog.now() - interval '30 days';

  return query select v_token, v_expires_at, false;
end;
$function$;

revoke all on function public.car_dealership_issue_test_drive_access(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_issue_test_drive_access(uuid)
  to authenticated, service_role;

create or replace function public.car_dealership_issue_sale_review_access(
  p_sale_id uuid
)
returns table (
  access_token text,
  expires_at timestamptz,
  account_owned boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_sale public.car_dealership_sales;
  v_customer_id uuid;
  v_customer_user_id uuid;
  v_user_id uuid := auth.uid();
  v_is_service boolean := auth.role() is not distinct from 'service_role';
  v_authorized boolean := false;
  v_token text;
  v_expires_at timestamptz;
begin
  if p_sale_id is null then
    raise exception 'Sale is required.' using errcode = '22023';
  end if;

  select sale.customer_id
  into v_customer_id
  from public.car_dealership_sales sale
  where sale.id = p_sale_id;

  if not found then
    raise exception 'Sale not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    select customer.user_id
    into v_customer_user_id
    from public.car_dealership_customers customer
    where customer.id = v_customer_id
    for update;

    if not found then
      raise exception 'Sale customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select sale.*
  into v_sale
  from public.car_dealership_sales sale
  where sale.id = p_sale_id
    and sale.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Sale changed; retry.' using errcode = '40001';
  end if;

  v_authorized := v_is_service
    or (
      v_user_id is not null
      and v_customer_user_id = v_user_id
    )
    or exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = v_sale.store_id
        and store_profile.owner_id = v_user_id
    )
    or (
      v_user_id is not null
      and coalesce(
        public.has_role(v_user_id, 'admin'::public.app_role),
        false
      )
    );

  if not coalesce(v_authorized, false) then
    raise exception 'Sale review access denied.' using errcode = '42501';
  end if;

  if v_sale.status::text not in ('completed', 'delivered') then
    raise exception 'A review link can be issued only for a completed or delivered sale.'
      using errcode = 'P0001';
  end if;

  update private.car_dealership_sale_review_access access_record
  set revoked_at = coalesce(access_record.revoked_at, pg_catalog.now())
  where access_record.sale_id = v_sale.id
    and access_record.revoked_at is null
    and access_record.expires_at > pg_catalog.now();

  if v_customer_user_id is not null then
    return query select null::text, null::timestamptz, true;
    return;
  end if;

  v_expires_at := pg_catalog.now() + interval '30 days';
  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.car_dealership_sale_review_access (
    sale_id,
    token_hash,
    expires_at,
    created_by_user_id
  ) values (
    v_sale.id,
    extensions.digest(pg_catalog.convert_to(v_token, 'UTF8'), 'sha256'),
    v_expires_at,
    v_user_id
  );

  delete from private.car_dealership_sale_review_access access_record
  where access_record.sale_id = v_sale.id
    and coalesce(access_record.revoked_at, access_record.expires_at)
      < pg_catalog.now() - interval '30 days';

  return query select v_token, v_expires_at, false;
end;
$function$;

revoke all on function public.car_dealership_issue_sale_review_access(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_issue_sale_review_access(uuid)
  to authenticated, service_role;

-- Edge Functions pass only a user id obtained from an independently verified
-- bearer JWT. Browser roles cannot forge p_user_id because this verifier is
-- executable by service_role only.
create or replace function public.car_dealership_verify_sale_review_access(
  p_sale_id uuid,
  p_access_token text,
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

  return private.car_dealership_sale_review_access_allowed(
    p_sale_id,
    p_access_token,
    p_user_id
  ) or exists (
    -- A consumed guest capability or the exact linked account may retry only
    -- through the transactional submit RPC. The RPC additionally requires an
    -- existing review with identical normalized content, so this verifier does
    -- not restore general read or mutation authority to a used token.
    select 1
    from public.car_dealership_sales sale
    left join public.car_dealership_customers customer
      on customer.id = sale.customer_id
    where sale.id = p_sale_id
      and exists (
        select 1
        from public.car_dealership_reviews review
        where review.sale_id = sale.id
      )
      and (
        (
          customer.user_id is not null
          and p_user_id is not null
          and customer.user_id = p_user_id
        )
        or (
          customer.user_id is null
          and p_access_token is not null
          and p_access_token ~ '^[0-9a-f]{64}$'
          and exists (
            select 1
            from private.car_dealership_sale_review_access access_record
            where access_record.sale_id = sale.id
              and access_record.token_hash = extensions.digest(
                pg_catalog.convert_to(p_access_token, 'UTF8'),
                'sha256'
              )
              and access_record.used_at is not null
          )
        )
      )
  );
end;
$function$;

revoke all on function public.car_dealership_verify_sale_review_access(
  uuid, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_verify_sale_review_access(
  uuid, text, uuid
) to service_role;

-- Unified public-interest intake. The trusted Edge Function supplies only
-- contact intent, a verified optional auth user, and an idempotency UUID. This
-- transaction derives the customer/lead relationships and, for test_drive,
-- creates the scheduled drive plus its guest capability atomically.
create or replace function public.car_dealership_customer_submit_interest(
  p_store_id uuid,
  p_vehicle_id uuid,
  p_mode text,
  p_scheduled_at timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text,
  p_desired_make text,
  p_budget_max_cents integer,
  p_trade_in_interested boolean,
  p_financing_needed boolean,
  p_user_id uuid,
  p_request_id uuid
)
returns table (
  lead_id uuid,
  test_drive_id uuid,
  test_drive_scheduled boolean,
  access_token text,
  access_expires_at timestamptz,
  account_owned boolean,
  already_processed boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_mode text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_mode, '')));
  v_customer_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  v_customer_email text := nullif(
    pg_catalog.lower(pg_catalog.btrim(coalesce(p_customer_email, ''))),
    ''
  );
  v_customer_phone text := nullif(
    pg_catalog.btrim(coalesce(p_customer_phone, '')),
    ''
  );
  v_notes text := nullif(pg_catalog.btrim(coalesce(p_notes, '')), '');
  v_desired_make text := nullif(
    pg_catalog.btrim(coalesce(p_desired_make, '')),
    ''
  );
  v_request_hash bytea;
  v_claimed_request_id uuid;
  v_existing_request private.car_dealership_interest_requests;
  v_vehicle public.car_dealership_vehicles;
  v_customer_id uuid;
  v_lead_id uuid;
  v_test_drive_id uuid;
  v_vehicle_label text;
  v_access_token text;
  v_access_expires_at timestamptz;
  v_account_owned boolean := false;
  v_test_drive_scheduled boolean := false;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_request_id is null
     or p_store_id is null
     or v_mode not in ('info', 'test_drive') then
    raise exception 'Invalid dealership request identifiers or mode.'
      using errcode = '22023';
  end if;
  if v_customer_name = ''
     or pg_catalog.char_length(v_customer_name) > 160 then
    raise exception 'Customer name must contain 1 to 160 characters.'
      using errcode = '22023';
  end if;
  if v_customer_email is null and v_customer_phone is null then
    raise exception 'Email or phone is required.' using errcode = '22023';
  end if;
  if v_customer_email is not null
     and (
       pg_catalog.char_length(v_customer_email) > 320
       or v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     ) then
    raise exception 'Customer email is invalid.' using errcode = '22023';
  end if;
  if v_customer_phone is not null
     and pg_catalog.char_length(v_customer_phone) > 64 then
    raise exception 'Customer phone is too long.' using errcode = '22023';
  end if;
  if v_notes is not null and pg_catalog.char_length(v_notes) > 1000 then
    raise exception 'Request notes are too long.' using errcode = '22023';
  end if;
  if v_desired_make is not null
     and pg_catalog.char_length(v_desired_make) > 160 then
    raise exception 'Desired vehicle description is too long.'
      using errcode = '22023';
  end if;
  if p_budget_max_cents is not null and p_budget_max_cents < 0 then
    raise exception 'Maximum budget cannot be negative.' using errcode = '22023';
  end if;
  if v_mode = 'info' and p_scheduled_at is not null then
    raise exception 'An information request cannot include a test-drive time.'
      using errcode = '22023';
  end if;
  if v_mode = 'test_drive' then
    if p_vehicle_id is null then
      raise exception 'A test drive requires a vehicle.' using errcode = '22023';
    end if;
    if p_scheduled_at is null or p_scheduled_at <= pg_catalog.now() then
      raise exception 'Test drive must be scheduled in the future.'
        using errcode = '22023';
    end if;
    if p_scheduled_at > pg_catalog.now() + interval '180 days' then
      raise exception 'Test drive cannot be more than 180 days out.'
        using errcode = '22023';
    end if;
  end if;
  if p_user_id is not null
     and not exists (
       select 1 from auth.users auth_user where auth_user.id = p_user_id
     ) then
    raise exception 'Verified customer account does not exist.' using errcode = '22023';
  end if;

  v_request_hash := extensions.digest(
    pg_catalog.convert_to(
      pg_catalog.jsonb_build_object(
        'store_id', p_store_id,
        'vehicle_id', p_vehicle_id,
        'mode', v_mode,
        'scheduled_at', p_scheduled_at,
        'customer_name', v_customer_name,
        'customer_email', v_customer_email,
        'customer_phone', v_customer_phone,
        'notes', v_notes,
        'desired_make', v_desired_make,
        'budget_max_cents', p_budget_max_cents,
        'trade_in_interested', coalesce(p_trade_in_interested, false),
        'financing_needed', coalesce(p_financing_needed, false),
        'user_id', p_user_id
      )::text,
      'UTF8'
    ),
    'sha256'
  );

  insert into private.car_dealership_interest_requests (
    request_id,
    request_hash,
    store_id,
    mode,
    submitted_user_id
  ) values (
    p_request_id,
    v_request_hash,
    p_store_id,
    v_mode,
    p_user_id
  )
  on conflict (request_id) do nothing
  returning request_id into v_claimed_request_id;

  if v_claimed_request_id is null then
    select request_record.*
    into v_existing_request
    from private.car_dealership_interest_requests request_record
    where request_record.request_id = p_request_id
    for update;

    if not found then
      raise exception 'Dealership request changed; retry.' using errcode = '40001';
    end if;
    if v_existing_request.request_hash <> v_request_hash then
      raise exception 'Request id was already used for different input.'
        using errcode = '22023';
    end if;
    if v_existing_request.completed_at is null
       or v_existing_request.lead_id is null then
      raise exception 'A prior dealership request is incomplete; operator review is required.'
        using errcode = '55000';
    end if;
    if not exists (
      select 1
      from public.car_dealership_leads lead
      where lead.id = v_existing_request.lead_id
    ) then
      raise exception 'The prior dealership lead no longer exists.' using errcode = 'P0002';
    end if;

    if v_existing_request.mode = 'test_drive'
       and v_existing_request.test_drive_id is not null then
      select (
        test_drive.created_by_user_id is not null
        or customer.user_id is not null
      )
      into v_account_owned
      from public.car_dealership_test_drives test_drive
      left join public.car_dealership_customers customer
        on customer.id = test_drive.customer_id
      where test_drive.id = v_existing_request.test_drive_id;

      if not found then
        raise exception 'The prior dealership test drive no longer exists.'
          using errcode = 'P0002';
      end if;
    else
      select customer.user_id is not null
      into v_account_owned
      from public.car_dealership_leads lead
      left join public.car_dealership_customers customer
        on customer.id = lead.customer_id
      where lead.id = v_existing_request.lead_id;
    end if;

    return query
      select
        v_existing_request.lead_id,
        v_existing_request.test_drive_id,
        v_existing_request.test_drive_id is not null,
        null::text,
        null::timestamptz,
        coalesce(v_account_owned, false),
        true;
    return;
  end if;

  if not exists (
    select 1
    from public.store_profiles store_profile
    where store_profile.id = p_store_id
      and coalesce(store_profile.is_active, false) = true
  ) then
    raise exception 'Dealership is unavailable.' using errcode = 'P0002';
  end if;

  if p_vehicle_id is not null then
    select vehicle.*
    into v_vehicle
    from public.car_dealership_vehicles vehicle
    where vehicle.id = p_vehicle_id
      and vehicle.store_id = p_store_id
      and vehicle.is_active = true
      and vehicle.status::text = 'available'
    for share;

    if not found then
      raise exception 'Vehicle is unavailable.' using errcode = 'P0002';
    end if;

    v_vehicle_label := pg_catalog.btrim(
      pg_catalog.concat_ws(
        ' ',
        v_vehicle.year::text,
        v_vehicle.make,
        v_vehicle.model,
        nullif(pg_catalog.btrim(coalesce(v_vehicle.trim, '')), '')
      )
    );
  end if;

  if p_user_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'car-dealership-customer:' || p_store_id::text || ':' || p_user_id::text,
        0
      )
    );

    select customer.id
    into v_customer_id
    from public.car_dealership_customers customer
    where customer.store_id = p_store_id
      and customer.user_id = p_user_id
    order by customer.created_at, customer.id
    limit 1
    for update;

    if v_customer_id is null then
      insert into public.car_dealership_customers (
        store_id,
        user_id,
        display_name,
        email,
        phone
      ) values (
        p_store_id,
        p_user_id,
        v_customer_name,
        v_customer_email,
        v_customer_phone
      )
      returning car_dealership_customers.id into v_customer_id;
    end if;
  end if;

  if v_mode = 'test_drive' then
    -- Every writer uses this same vehicle-scoped lock through the table
    -- trigger, so an unavailable slot can be converted into a saved inquiry
    -- without racing another appointment into the same window.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'car-dealership-test-drive-schedule:' || v_vehicle.id::text,
        0
      )
    );

    v_test_drive_scheduled := not exists (
      select 1
      from public.car_dealership_test_drives existing
      where existing.vehicle_id = v_vehicle.id
        and existing.status::text in ('scheduled', 'confirmed', 'in_progress')
        and existing.scheduled_at < p_scheduled_at + interval '30 minutes'
        and existing.scheduled_until_at > p_scheduled_at
    );
  end if;

  insert into public.car_dealership_leads (
    store_id,
    customer_id,
    vehicle_id,
    display_name,
    email,
    phone,
    vehicle_label,
    source,
    status,
    desired_make,
    budget_max_cents,
    trade_in_interested,
    financing_needed,
    notes
  ) values (
    p_store_id,
    v_customer_id,
    v_vehicle.id,
    v_customer_name,
    v_customer_email,
    v_customer_phone,
    v_vehicle_label,
    'web',
    case
      when v_mode = 'test_drive' and v_test_drive_scheduled
        then 'test_drive_scheduled'::public.car_dealership_lead_status
      else 'new'::public.car_dealership_lead_status
    end,
    v_desired_make,
    p_budget_max_cents,
    coalesce(p_trade_in_interested, false),
    coalesce(p_financing_needed, false),
    v_notes
  )
  returning car_dealership_leads.id into v_lead_id;

  if v_mode = 'test_drive' and v_test_drive_scheduled then
    insert into public.car_dealership_test_drives (
      store_id,
      lead_id,
      vehicle_id,
      customer_id,
      created_by_user_id,
      customer_name,
      customer_phone,
      vehicle_label,
      scheduled_at,
      duration_minutes,
      status,
      notes
    ) values (
      p_store_id,
      v_lead_id,
      v_vehicle.id,
      v_customer_id,
      p_user_id,
      v_customer_name,
      v_customer_phone,
      v_vehicle_label,
      p_scheduled_at,
      30,
      'scheduled',
      v_notes
    )
    returning car_dealership_test_drives.id into v_test_drive_id;

    select
      issued.access_token,
      issued.expires_at,
      issued.account_owned
    into
      v_access_token,
      v_access_expires_at,
      v_account_owned
    from public.car_dealership_issue_test_drive_access(v_test_drive_id) issued;
  else
    v_account_owned := v_customer_id is not null;
  end if;

  update private.car_dealership_interest_requests request_record
  set lead_id = v_lead_id,
      test_drive_id = v_test_drive_id,
      completed_at = pg_catalog.now()
  where request_record.request_id = p_request_id;

  return query
    select
      v_lead_id,
      v_test_drive_id,
      v_test_drive_id is not null,
      v_access_token,
      v_access_expires_at,
      coalesce(v_account_owned, false),
      false;
end;
$function$;

revoke all on function public.car_dealership_customer_submit_interest(
  uuid, uuid, text, timestamptz, text, text, text, text,
  text, integer, boolean, boolean, uuid, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_customer_submit_interest(
  uuid, uuid, text, timestamptz, text, text, text, text,
  text, integer, boolean, boolean, uuid, uuid
) to service_role;

-- Compatibility service RPC for callers that only schedule test drives. New
-- intake uses the idempotent unified RPC above; this wrapper retains the
-- explicitly requested narrow contract without accepting a browser lead id.
create or replace function public.car_dealership_customer_create_test_drive(
  p_store_id uuid,
  p_vehicle_id uuid,
  p_scheduled_at timestamptz,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text,
  p_user_id uuid
)
returns table (
  id uuid,
  access_token text,
  access_expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;

  return query
    select
      result.test_drive_id,
      result.access_token,
      result.access_expires_at
    from public.car_dealership_customer_submit_interest(
      p_store_id,
      p_vehicle_id,
      'test_drive',
      p_scheduled_at,
      p_customer_name,
      p_customer_email,
      p_customer_phone,
      p_notes,
      null,
      null,
      false,
      false,
      p_user_id,
      gen_random_uuid()
    ) result;
end;
$function$;

revoke all on function public.car_dealership_customer_create_test_drive(
  uuid, uuid, timestamptz, text, text, text, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_customer_create_test_drive(
  uuid, uuid, timestamptz, text, text, text, text, uuid
) to service_role;

create or replace function public.car_dealership_customer_get_test_drive(
  p_test_drive_id uuid,
  p_access_token text default null
)
returns table (
  id uuid,
  store_id uuid,
  vehicle_label text,
  scheduled_at timestamptz,
  duration_minutes integer,
  status text,
  cancellation_reason text,
  store_name text,
  store_slug text,
  store_logo_url text,
  store_address text,
  store_phone text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    test_drive.id,
    test_drive.store_id,
    test_drive.vehicle_label,
    test_drive.scheduled_at,
    test_drive.duration_minutes,
    test_drive.status::text,
    test_drive.cancellation_reason,
    store_profile.name,
    store_profile.slug,
    store_profile.logo_url,
    store_profile.address,
    store_profile.phone
  from public.car_dealership_test_drives test_drive
  join public.store_profiles store_profile
    on store_profile.id = test_drive.store_id
  where test_drive.id = p_test_drive_id
    and private.car_dealership_test_drive_access_allowed(
      test_drive.id,
      p_access_token,
      auth.uid()
    );
$function$;

revoke all on function public.car_dealership_customer_get_test_drive(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_customer_get_test_drive(uuid, text)
  to anon, authenticated;

create or replace function public.car_dealership_customer_cancel_test_drive(
  p_test_drive_id uuid,
  p_access_token text,
  p_reason text default null
)
returns table (
  id uuid,
  store_id uuid,
  vehicle_label text,
  scheduled_at timestamptz,
  duration_minutes integer,
  status text,
  cancellation_reason text,
  store_name text,
  store_slug text,
  store_logo_url text,
  store_address text,
  store_phone text
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_test_drive public.car_dealership_test_drives;
  v_customer_id uuid;
  v_reason text := coalesce(
    nullif(pg_catalog.btrim(coalesce(p_reason, '')), ''),
    'Cancelled by customer'
  );
begin
  if p_test_drive_id is null then
    raise exception 'Test drive is required.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_reason) > 500 then
    raise exception 'Cancellation reason is too long.' using errcode = '22023';
  end if;

  select test_drive.customer_id
  into v_customer_id
  from public.car_dealership_test_drives test_drive
  where test_drive.id = p_test_drive_id;

  if not found then
    raise exception 'Test drive not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    perform 1
    from public.car_dealership_customers customer
    where customer.id = v_customer_id
    for update;

    if not found then
      raise exception 'Test-drive customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select test_drive.*
  into v_test_drive
  from public.car_dealership_test_drives test_drive
  where test_drive.id = p_test_drive_id
    and test_drive.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Test drive changed; retry.' using errcode = '40001';
  end if;
  if not private.car_dealership_test_drive_access_allowed(
    v_test_drive.id,
    p_access_token,
    auth.uid()
  ) then
    raise exception 'Test-drive access denied or expired.' using errcode = '42501';
  end if;
  if v_test_drive.status::text not in ('scheduled', 'confirmed', 'cancelled') then
    raise exception 'This test drive cannot be cancelled online in its current state.'
      using errcode = 'P0001';
  end if;

  if v_test_drive.status::text <> 'cancelled' then
    update public.car_dealership_test_drives test_drive
    set status = 'cancelled'::public.car_dealership_test_drive_status,
        cancellation_reason = v_reason
    where test_drive.id = v_test_drive.id;
  end if;

  return query
    select
      test_drive.id,
      test_drive.store_id,
      test_drive.vehicle_label,
      test_drive.scheduled_at,
      test_drive.duration_minutes,
      test_drive.status::text,
      test_drive.cancellation_reason,
      store_profile.name,
      store_profile.slug,
      store_profile.logo_url,
      store_profile.address,
      store_profile.phone
    from public.car_dealership_test_drives test_drive
    join public.store_profiles store_profile
      on store_profile.id = test_drive.store_id
    where test_drive.id = v_test_drive.id;
end;
$function$;

revoke all on function public.car_dealership_customer_cancel_test_drive(
  uuid, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_customer_cancel_test_drive(
  uuid, text, text
) to anon, authenticated;

create or replace function public.car_dealership_customer_get_sale_for_review(
  p_sale_id uuid,
  p_access_token text default null
)
returns table (
  id uuid,
  store_id uuid,
  vehicle_label text,
  customer_name text,
  status text,
  already_reviewed boolean,
  store_name text,
  store_slug text,
  store_logo_url text,
  store_address text,
  store_phone text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    sale.id,
    sale.store_id,
    sale.vehicle_label,
    sale.customer_name,
    sale.status::text,
    exists (
      select 1
      from public.car_dealership_reviews review
      where review.sale_id = sale.id
    ),
    store_profile.name,
    store_profile.slug,
    store_profile.logo_url,
    store_profile.address,
    store_profile.phone
  from public.car_dealership_sales sale
  join public.store_profiles store_profile
    on store_profile.id = sale.store_id
  where sale.id = p_sale_id
    and sale.status::text in ('completed', 'delivered')
    and private.car_dealership_sale_review_access_allowed(
      sale.id,
      p_access_token,
      auth.uid()
    );
$function$;

revoke all on function public.car_dealership_customer_get_sale_for_review(
  uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_customer_get_sale_for_review(
  uuid, text
) to anon, authenticated;

-- Review authorization and insertion share one transaction. The trusted Edge
-- wrapper supplies only a normalized capability/user id; this function locks
-- customer -> sale, repeats authorization, derives identity from the sale,
-- inserts once, and consumes the guest capability.
create or replace function public.car_dealership_submit_review(
  p_sale_id uuid,
  p_access_token text,
  p_user_id uuid,
  p_rating integer,
  p_title text,
  p_body text
)
returns table (
  review_id uuid,
  already_processed boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_sale public.car_dealership_sales;
  v_customer_id uuid;
  v_customer_user_id uuid;
  v_title text := nullif(pg_catalog.btrim(coalesce(p_title, '')), '');
  v_body text := nullif(pg_catalog.btrim(coalesce(p_body, '')), '');
  v_review_id uuid;
  v_existing_review public.car_dealership_reviews;
  v_active_access boolean;
  v_replay_access boolean := false;
  v_consumed_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_sale_id is null then
    raise exception 'Sale is required.' using errcode = '22023';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Review rating must be between 1 and 5.' using errcode = '22023';
  end if;
  if v_title is not null and pg_catalog.char_length(v_title) > 160 then
    raise exception 'Review title is too long.' using errcode = '22023';
  end if;
  if v_body is null or pg_catalog.char_length(v_body) > 2000 then
    raise exception 'Review body must contain 1 to 2000 characters.'
      using errcode = '22023';
  end if;

  select sale.customer_id
  into v_customer_id
  from public.car_dealership_sales sale
  where sale.id = p_sale_id;

  if not found then
    raise exception 'Sale not found.' using errcode = 'P0002';
  end if;

  if v_customer_id is not null then
    select customer.user_id
    into v_customer_user_id
    from public.car_dealership_customers customer
    where customer.id = v_customer_id
    for update;

    if not found then
      raise exception 'Sale customer not found.' using errcode = 'P0002';
    end if;
  end if;

  select sale.*
  into v_sale
  from public.car_dealership_sales sale
  where sale.id = p_sale_id
    and sale.customer_id is not distinct from v_customer_id
  for update;

  if not found then
    raise exception 'Sale changed; retry.' using errcode = '40001';
  end if;
  v_active_access := private.car_dealership_sale_review_access_allowed(
    v_sale.id,
    p_access_token,
    p_user_id
  );
  if v_sale.status::text not in ('completed', 'delivered') then
    raise exception 'Sale is not ready for review.' using errcode = 'P0001';
  end if;

  select review.*
  into v_existing_review
  from public.car_dealership_reviews review
  where review.sale_id = v_sale.id
  order by review.created_at, review.id
  limit 1;

  if found then
    v_replay_access := (
      v_customer_user_id is not null
      and p_user_id is not null
      and v_customer_user_id = p_user_id
    ) or (
      v_customer_user_id is null
      and p_access_token is not null
      and p_access_token ~ '^[0-9a-f]{64}$'
      and exists (
        select 1
        from private.car_dealership_sale_review_access access_record
        where access_record.sale_id = v_sale.id
          and access_record.token_hash = extensions.digest(
            pg_catalog.convert_to(p_access_token, 'UTF8'),
            'sha256'
          )
          and access_record.used_at is not null
      )
    );

    if v_replay_access
       and v_existing_review.rating = p_rating
       and v_existing_review.title is not distinct from v_title
       and v_existing_review.body = v_body then
      return query select v_existing_review.id, true;
      return;
    end if;

    if v_replay_access or v_active_access then
      raise exception 'Review already submitted for this sale.'
        using errcode = '23505';
    end if;
  end if;

  if not v_active_access then
    raise exception 'Sale review access denied or expired.' using errcode = '42501';
  end if;

  insert into public.car_dealership_reviews (
    store_id,
    sale_id,
    customer_id,
    customer_name,
    vehicle_label,
    rating,
    title,
    body,
    is_visible
  ) values (
    v_sale.store_id,
    v_sale.id,
    v_sale.customer_id,
    pg_catalog.left(v_sale.customer_name, 160),
    pg_catalog.left(v_sale.vehicle_label, 240),
    p_rating,
    v_title,
    v_body,
    false
  )
  returning car_dealership_reviews.id into v_review_id;

  if v_customer_user_id is null then
    update private.car_dealership_sale_review_access access_record
    set used_at = coalesce(access_record.used_at, pg_catalog.now()),
        revoked_at = coalesce(access_record.revoked_at, pg_catalog.now())
    where access_record.sale_id = v_sale.id
      and access_record.token_hash = extensions.digest(
        pg_catalog.convert_to(p_access_token, 'UTF8'),
        'sha256'
      )
      and access_record.used_at is null
      and access_record.revoked_at is null
      and access_record.expires_at > pg_catalog.now();

    get diagnostics v_consumed_count = row_count;
    if v_consumed_count <> 1 then
      raise exception 'Sale review capability changed; retry.' using errcode = '40001';
    end if;
  end if;

  return query select v_review_id, false;
  return;
exception
  when unique_violation then
    raise exception 'Review already submitted for this sale.'
      using errcode = '23505';
end;
$function$;

revoke all on function public.car_dealership_submit_review(
  uuid, text, uuid, integer, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.car_dealership_submit_review(
  uuid, text, uuid, integer, text, text
) to service_role;

-- Phase-one assertions intentionally leave the legacy UUID/raw intake RPCs
-- untouched. They verify that every replacement boundary is present and that
-- no hash/idempotency table or trusted mutation is browser-accessible.
do $assert_car_dealership_capability_additive_acl$
declare
  v_private_relation text;
  v_signature text;
  v_safe_browser_signatures constant text[] := array[
    'public.car_dealership_customer_get_test_drive(uuid,text)',
    'public.car_dealership_customer_cancel_test_drive(uuid,text,text)',
    'public.car_dealership_customer_get_sale_for_review(uuid,text)'
  ];
  v_service_only_signatures constant text[] := array[
    'public.car_dealership_verify_sale_review_access(uuid,text,uuid)',
    'public.car_dealership_customer_submit_interest(uuid,uuid,text,timestamptz,text,text,text,text,text,integer,boolean,boolean,uuid,uuid)',
    'public.car_dealership_customer_create_test_drive(uuid,uuid,timestamptz,text,text,text,text,uuid)',
    'public.car_dealership_submit_review(uuid,text,uuid,integer,text,text)'
  ];
begin
  foreach v_private_relation in array array[
    'private.car_dealership_test_drive_access',
    'private.car_dealership_sale_review_access',
    'private.car_dealership_interest_requests'
  ] loop
    if pg_catalog.has_table_privilege('anon', v_private_relation, 'select')
       or pg_catalog.has_table_privilege('anon', v_private_relation, 'insert')
       or pg_catalog.has_table_privilege('anon', v_private_relation, 'update')
       or pg_catalog.has_table_privilege('anon', v_private_relation, 'delete')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'select')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'insert')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'update')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'delete') then
      raise exception 'A private dealership capability/idempotency table is browser-accessible: %',
        v_private_relation;
    end if;
  end loop;

  if exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'private'
      and column_info.table_name in (
        'car_dealership_test_drive_access',
        'car_dealership_sale_review_access',
        'car_dealership_interest_requests'
      )
      and column_info.column_name in ('access_token', 'token', 'raw_token')
  ) then
    raise exception 'A private dealership table contains a plaintext token column.';
  end if;

  foreach v_signature in array v_safe_browser_signatures loop
    if pg_catalog.to_regprocedure(v_signature) is null
       or not pg_catalog.has_function_privilege('anon', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('authenticated', v_signature, 'execute')
       or pg_catalog.has_function_privilege('service_role', v_signature, 'execute') then
      raise exception 'A browser-safe dealership RPC has incorrect grants: %',
        v_signature;
    end if;
  end loop;

  foreach v_signature in array v_service_only_signatures loop
    if pg_catalog.to_regprocedure(v_signature) is null
       or pg_catalog.has_function_privilege('anon', v_signature, 'execute')
       or pg_catalog.has_function_privilege('authenticated', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('service_role', v_signature, 'execute') then
      raise exception 'A trusted dealership RPC has incorrect grants: %',
        v_signature;
    end if;
  end loop;

  foreach v_signature in array array[
    'public.car_dealership_issue_test_drive_access(uuid)',
    'public.car_dealership_issue_sale_review_access(uuid)'
  ] loop
    if pg_catalog.to_regprocedure(v_signature) is null
       or pg_catalog.has_function_privilege('anon', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('authenticated', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('service_role', v_signature, 'execute')
       or pg_catalog.pg_get_function_result(
         pg_catalog.to_regprocedure(v_signature)::pg_catalog.oid
       ) not ilike '%account_owned boolean%' then
      raise exception 'A dealership capability issuer has an unsafe or incompatible contract: %',
        v_signature;
    end if;
  end loop;

  if pg_catalog.to_regclass('public.car_dealership_public_reviews') is null
     or not pg_catalog.has_table_privilege(
       'anon',
       'public.car_dealership_public_reviews',
       'select'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_public_reviews',
       'select'
     ) then
    raise exception 'Dealership public-review projection is unavailable to compatible clients.';
  end if;

  if exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'car_dealership_public_reviews'
      and column_info.column_name in ('sale_id', 'customer_id')
  )
  or not exists (
    select 1
    from pg_catalog.pg_class relation_info
    where relation_info.oid =
        'public.car_dealership_public_reviews'::pg_catalog.regclass
      and relation_info.relkind = 'v'
      and coalesce(relation_info.reloptions, array[]::text[])
        @> array['security_barrier=true']::text[]
  ) then
    raise exception 'The dealership public-review projection exposes identifiers or lacks its barrier.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_customers'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_on_customer_change'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_customers'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_before_customer_delete'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_on_test_drive_change'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_sales'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_on_sale_change'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and trigger_info.tgname = 'car_dealership_test_drives_window_guard'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  ) then
    raise exception 'Dealership account-transition or schedule triggers are missing.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.conname =
        'car_dealership_test_drives_no_active_overlap'
      and constraint_info.contype = 'x'
      and constraint_info.convalidated
      and pg_catalog.pg_get_constraintdef(constraint_info.oid)
        ilike '%tstzrange(scheduled_at, scheduled_until_at%'
  ) then
    raise exception 'The atomic dealership test-drive overlap constraint is missing or wrong.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index index_info
    join pg_catalog.pg_class relation_info
      on relation_info.oid = index_info.indexrelid
    where relation_info.relnamespace = 'public'::pg_catalog.regnamespace
      and relation_info.relname =
        'car_dealership_test_drives_created_by_user_id_idx'
      and index_info.indisvalid
      and index_info.indnkeyatts = 1
      and index_info.indkey[0] = (
        select attribute_info.attnum
        from pg_catalog.pg_attribute attribute_info
        where attribute_info.attrelid = index_info.indrelid
          and attribute_info.attname = 'created_by_user_id'
          and not attribute_info.attisdropped
      )
  ) then
    raise exception 'The dealership test-drive creator index is missing or wrong.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index index_info
    join pg_catalog.pg_class relation_info
      on relation_info.oid = index_info.indexrelid
    where relation_info.relnamespace = 'public'::pg_catalog.regnamespace
      and relation_info.relname = 'car_dealership_reviews_unique_per_sale'
      and index_info.indisunique
      and index_info.indisvalid
      and index_info.indnkeyatts = 1
      and index_info.indkey[0] = (
        select attribute_info.attnum
        from pg_catalog.pg_attribute attribute_info
        where attribute_info.attrelid = index_info.indrelid
          and attribute_info.attname = 'sale_id'
          and not attribute_info.attisdropped
      )
      and pg_catalog.pg_get_expr(
        index_info.indpred,
        index_info.indrelid
      ) ilike '%sale_id is not null%'
  ) then
    raise exception 'The dealership one-review-per-sale guard is missing or wrong.';
  end if;
end;
$assert_car_dealership_capability_additive_acl$;

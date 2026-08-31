-- Close two phase-one gaps before the public dealership Edge boundary ships:
-- 1. keep public reviews in a real RLS table instead of a definer-rights view;
-- 2. make the car-dealership store category an authoritative child-row invariant.

do $assert_car_dealership_projection_hardening_prerequisites$
declare
  v_missing text[];
begin
  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'store_profiles'
      and column_info.column_name = 'category'
      and column_info.data_type = 'text'
  ) then
    raise exception 'store_profiles.category text is required for dealership store scoping.'
      using errcode = '42703';
  end if;

  select pg_catalog.array_agg(required.relation_name order by required.relation_name)
  into v_missing
  from (
    values
      ('public.car_dealership_customers'),
      ('public.car_dealership_leads'),
      ('public.car_dealership_reviews'),
      ('public.car_dealership_sales'),
      ('public.car_dealership_test_drives'),
      ('public.car_dealership_vehicles'),
      ('public.store_profiles')
  ) as required(relation_name)
  where pg_catalog.to_regclass(required.relation_name) is null;

  if coalesce(pg_catalog.cardinality(v_missing), 0) > 0 then
    raise exception 'Dealership projection hardening is missing relations: %',
      pg_catalog.array_to_string(v_missing, ', ')
      using errcode = '42P01';
  end if;
end;
$assert_car_dealership_projection_hardening_prerequisites$;

-- Every row in a dealership-owned relation must point at a store explicitly
-- classified as a car dealership. This protects trusted and legacy writers,
-- including the phase-one intake RPC, rather than relying on browser filters.
create or replace function private.car_dealership_enforce_store_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $car_dealership_enforce_store_category$
begin
  if new.store_id is null then
    raise exception 'Dealership store is unavailable.' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.store_id::text, 194713)
  );

  if not exists (
       select 1
       from public.store_profiles store_profile
       where store_profile.id = new.store_id
         and store_profile.category = 'car-dealership'
     ) then
    raise exception 'Dealership store is unavailable.' using errcode = '23514';
  end if;

  return new;
end;
$car_dealership_enforce_store_category$;

revoke all on function private.car_dealership_enforce_store_category()
  from public, anon, authenticated, service_role;

do $install_car_dealership_store_category_guards$
declare
  v_table text;
begin
  foreach v_table in array array[
    'car_dealership_customers',
    'car_dealership_leads',
    'car_dealership_reviews',
    'car_dealership_sales',
    'car_dealership_test_drives',
    'car_dealership_vehicles'
  ] loop
    execute pg_catalog.format(
      'drop trigger if exists car_dealership_enforce_store_category on public.%I',
      v_table
    );
    execute pg_catalog.format(
      'create trigger car_dealership_enforce_store_category '
      || 'before insert or update of store_id on public.%I '
      || 'for each row execute function private.car_dealership_enforce_store_category()',
      v_table
    );
  end loop;
end;
$install_car_dealership_store_category_guards$;

create or replace function private.car_dealership_guard_store_category_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $car_dealership_guard_store_category_change$
begin
  if old.category = 'car-dealership'
     and new.category is distinct from old.category then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(old.id::text, 194713)
    );

    if exists (select 1 from public.car_dealership_customers row_info where row_info.store_id = old.id)
       or exists (select 1 from public.car_dealership_leads row_info where row_info.store_id = old.id)
       or exists (select 1 from public.car_dealership_reviews row_info where row_info.store_id = old.id)
       or exists (select 1 from public.car_dealership_sales row_info where row_info.store_id = old.id)
       or exists (select 1 from public.car_dealership_test_drives row_info where row_info.store_id = old.id)
       or exists (select 1 from public.car_dealership_vehicles row_info where row_info.store_id = old.id) then
      raise exception 'A dealership store with dealership records cannot change category.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$car_dealership_guard_store_category_change$;

revoke all on function private.car_dealership_guard_store_category_change()
  from public, anon, authenticated, service_role;

drop trigger if exists car_dealership_guard_store_category_change
  on public.store_profiles;
create trigger car_dealership_guard_store_category_change
  before update of category on public.store_profiles
  for each row
  execute function private.car_dealership_guard_store_category_change();

-- PostgreSQL views execute with owner rights unless security_invoker is set.
-- A security-invoker view would still require browser access to the full base
-- review table, so replace the view with a trigger-maintained safe projection.
do $replace_car_dealership_public_review_view$
declare
  v_relkind "char";
begin
  select relation_info.relkind
  into v_relkind
  from pg_catalog.pg_class relation_info
  where relation_info.oid =
    pg_catalog.to_regclass('public.car_dealership_public_reviews');

  if v_relkind = 'v' then
    drop view public.car_dealership_public_reviews;
  elsif v_relkind is not null and v_relkind not in ('r', 'p') then
    raise exception 'car_dealership_public_reviews has an incompatible relation kind: %',
      v_relkind
      using errcode = '55000';
  end if;
end;
$replace_car_dealership_public_review_view$;

create table if not exists public.car_dealership_public_reviews (
  id uuid primary key
    references public.car_dealership_reviews(id) on delete cascade,
  store_id uuid not null
    references public.store_profiles(id) on delete cascade,
  customer_name text not null,
  vehicle_label text,
  rating integer not null,
  title text,
  body text,
  owner_response text,
  owner_responded_at timestamptz,
  is_visible boolean not null default true
    constraint car_dealership_public_reviews_visible_only check (is_visible),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists car_dealership_public_reviews_store_created_idx
  on public.car_dealership_public_reviews (store_id, created_at desc);

alter table public.car_dealership_public_reviews enable row level security;

drop policy if exists "Public reads visible dealership review projection"
  on public.car_dealership_public_reviews;
create policy "Public reads visible dealership review projection"
  on public.car_dealership_public_reviews
  for select
  to anon, authenticated
  using (
    is_visible = true
    and exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = car_dealership_public_reviews.store_id
        and store_profile.category = 'car-dealership'
        and coalesce(store_profile.is_active, false) = true
    )
  );

revoke all on table public.car_dealership_public_reviews
  from public, anon, authenticated, service_role;
grant select on table public.car_dealership_public_reviews
  to anon, authenticated, service_role;

create or replace function private.car_dealership_sync_public_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $car_dealership_sync_public_review$
begin
  if tg_op = 'DELETE' then
    delete from public.car_dealership_public_reviews projection
    where projection.id = old.id;
    return old;
  end if;

  if new.is_visible then
    insert into public.car_dealership_public_reviews (
      id,
      store_id,
      customer_name,
      vehicle_label,
      rating,
      title,
      body,
      owner_response,
      owner_responded_at,
      is_visible,
      created_at,
      updated_at
    ) values (
      new.id,
      new.store_id,
      new.customer_name,
      new.vehicle_label,
      new.rating,
      new.title,
      new.body,
      new.owner_response,
      new.owner_responded_at,
      true,
      new.created_at,
      new.updated_at
    )
    on conflict (id) do update
    set store_id = excluded.store_id,
        customer_name = excluded.customer_name,
        vehicle_label = excluded.vehicle_label,
        rating = excluded.rating,
        title = excluded.title,
        body = excluded.body,
        owner_response = excluded.owner_response,
        owner_responded_at = excluded.owner_responded_at,
        is_visible = true,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at;
  else
    delete from public.car_dealership_public_reviews projection
    where projection.id = new.id;
  end if;

  if tg_op = 'UPDATE' and old.id is distinct from new.id then
    delete from public.car_dealership_public_reviews projection
    where projection.id = old.id;
  end if;

  return new;
end;
$car_dealership_sync_public_review$;

revoke all on function private.car_dealership_sync_public_review()
  from public, anon, authenticated, service_role;

drop trigger if exists car_dealership_sync_public_review
  on public.car_dealership_reviews;
create trigger car_dealership_sync_public_review
  after insert or update or delete on public.car_dealership_reviews
  for each row
  execute function private.car_dealership_sync_public_review();

insert into public.car_dealership_public_reviews (
  id,
  store_id,
  customer_name,
  vehicle_label,
  rating,
  title,
  body,
  owner_response,
  owner_responded_at,
  is_visible,
  created_at,
  updated_at
)
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
  true,
  review.created_at,
  review.updated_at
from public.car_dealership_reviews review
where review.is_visible = true
on conflict (id) do update
set store_id = excluded.store_id,
    customer_name = excluded.customer_name,
    vehicle_label = excluded.vehicle_label,
    rating = excluded.rating,
    title = excluded.title,
    body = excluded.body,
    owner_response = excluded.owner_response,
    owner_responded_at = excluded.owner_responded_at,
    is_visible = true,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

delete from public.car_dealership_public_reviews projection
where not exists (
  select 1
  from public.car_dealership_reviews review
  where review.id = projection.id
    and review.is_visible = true
);

do $assert_car_dealership_projection_hardening$
declare
  v_table text;
begin
  if not exists (
    select 1
    from pg_catalog.pg_class relation_info
    where relation_info.oid =
        'public.car_dealership_public_reviews'::pg_catalog.regclass
      and relation_info.relkind in ('r', 'p')
      and relation_info.relrowsecurity
  ) then
    raise exception 'The dealership public-review projection is not an RLS table.';
  end if;

  if exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'car_dealership_public_reviews'
      and column_info.column_name in ('sale_id', 'customer_id')
  ) then
    raise exception 'The dealership public-review projection exposes private identifiers.';
  end if;

  if not pg_catalog.has_table_privilege(
       'anon', 'public.car_dealership_public_reviews', 'select'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated', 'public.car_dealership_public_reviews', 'select'
     )
     or pg_catalog.has_table_privilege(
       'anon', 'public.car_dealership_public_reviews', 'insert'
     )
     or pg_catalog.has_table_privilege(
       'anon', 'public.car_dealership_public_reviews', 'update'
     )
     or pg_catalog.has_table_privilege(
       'anon', 'public.car_dealership_public_reviews', 'delete'
     )
     or pg_catalog.has_table_privilege(
       'authenticated', 'public.car_dealership_public_reviews', 'insert'
     )
     or pg_catalog.has_table_privilege(
       'authenticated', 'public.car_dealership_public_reviews', 'update'
     )
     or pg_catalog.has_table_privilege(
       'authenticated', 'public.car_dealership_public_reviews', 'delete'
     ) then
    raise exception 'The dealership public-review projection has unsafe grants.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies policy_info
    where policy_info.schemaname = 'public'
      and policy_info.tablename = 'car_dealership_public_reviews'
      and policy_info.policyname =
        'Public reads visible dealership review projection'
      and policy_info.cmd = 'SELECT'
  ) then
    raise exception 'The dealership public-review projection read policy is missing.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_reviews'::pg_catalog.regclass
      and trigger_info.tgname = 'car_dealership_sync_public_review'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  ) then
    raise exception 'The dealership public-review sync trigger is missing.';
  end if;

  if exists (
    (select
       review.id,
       review.store_id,
       review.customer_name,
       review.vehicle_label,
       review.rating,
       review.title,
       review.body,
       review.owner_response,
       review.owner_responded_at,
       review.created_at,
       review.updated_at
     from public.car_dealership_reviews review
     where review.is_visible = true)
    except
    (select
       projection.id,
       projection.store_id,
       projection.customer_name,
       projection.vehicle_label,
       projection.rating,
       projection.title,
       projection.body,
       projection.owner_response,
       projection.owner_responded_at,
       projection.created_at,
       projection.updated_at
     from public.car_dealership_public_reviews projection)
  ) or exists (
    (select
       projection.id,
       projection.store_id,
       projection.customer_name,
       projection.vehicle_label,
       projection.rating,
       projection.title,
       projection.body,
       projection.owner_response,
       projection.owner_responded_at,
       projection.created_at,
       projection.updated_at
     from public.car_dealership_public_reviews projection)
    except
    (select
       review.id,
       review.store_id,
       review.customer_name,
       review.vehicle_label,
       review.rating,
       review.title,
       review.body,
       review.owner_response,
       review.owner_responded_at,
       review.created_at,
       review.updated_at
     from public.car_dealership_reviews review
     where review.is_visible = true)
  ) then
    raise exception 'The dealership public-review projection is out of sync.';
  end if;

  foreach v_table in array array[
    'car_dealership_customers',
    'car_dealership_leads',
    'car_dealership_reviews',
    'car_dealership_sales',
    'car_dealership_test_drives',
    'car_dealership_vehicles'
  ] loop
    if not exists (
      select 1
      from pg_catalog.pg_trigger trigger_info
      where trigger_info.tgrelid =
          pg_catalog.to_regclass('public.' || v_table)
        and trigger_info.tgname = 'car_dealership_enforce_store_category'
        and not trigger_info.tgisinternal
        and trigger_info.tgenabled <> 'D'
    ) then
      raise exception 'Dealership store-category trigger is missing on %.', v_table;
    end if;
  end loop;

  if pg_catalog.has_function_privilege(
       'anon', 'private.car_dealership_enforce_store_category()', 'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated', 'private.car_dealership_enforce_store_category()', 'execute'
     )
     or pg_catalog.has_function_privilege(
       'anon', 'private.car_dealership_sync_public_review()', 'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated', 'private.car_dealership_sync_public_review()', 'execute'
     ) then
    raise exception 'A private dealership hardening function is browser-executable.';
  end if;
end;
$assert_car_dealership_projection_hardening$;

-- Restrict privileged helper RPCs to their intended caller identities.
--
-- This migration deliberately keeps the public signatures used by the app.
-- Authenticated users can only act on themselves, cafe forecasts require the
-- store owner, and the lodging diagnostic performs an explicit admin check.

create schema if not exists private;

-- Preserve the current lodging diagnostic implementation without copying its
-- evolving report body into this security-only migration. The public function
-- becomes a narrow, caller-authorizing wrapper; the implementation is moved out
-- of the exposed Data API schema and has no browser-role grant.
do $migration$
begin
  if pg_catalog.to_regprocedure('private.lodging_wiring_report_internal()') is null then
    if pg_catalog.to_regprocedure('public.lodging_wiring_report()') is null then
      raise exception 'lodging_wiring_report() is required before caller hardening';
    end if;

    execute 'alter function public.lodging_wiring_report() rename to lodging_wiring_report_internal';
    execute 'alter function public.lodging_wiring_report_internal() set schema private';
  end if;
end;
$migration$;

revoke all on function private.lodging_wiring_report_internal()
  from public, anon, authenticated, service_role;

create or replace function public.lodging_wiring_report()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_caller_role text := coalesce(auth.role(), '');
begin
  if v_caller_role <> 'service_role'
     and not (
       v_actor_id is not null
       and (
         public.has_role(v_actor_id, 'admin'::public.app_role)
         or public.has_role(v_actor_id, 'super_admin'::public.app_role)
       )
     ) then
    raise exception 'lodging_wiring_report_admin_required'
      using errcode = '42501';
  end if;

  return private.lodging_wiring_report_internal();
end;
$function$;

revoke all on function public.lodging_wiring_report()
  from public, anon, authenticated, service_role;
grant execute on function public.lodging_wiring_report()
  to authenticated, service_role;

create or replace function public.get_or_create_referral_code(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_caller_role text := coalesce(auth.role(), '');
  v_code text;
begin
  if p_user_id is null then
    raise exception 'referral_user_required'
      using errcode = '22023';
  end if;

  if v_caller_role <> 'service_role'
     and (v_actor_id is null or p_user_id is distinct from v_actor_id) then
    raise exception 'referral_user_mismatch'
      using errcode = '42501';
  end if;

  select codes.code
    into v_code
    from public.zivo_referral_codes as codes
   where codes.user_id = p_user_id;

  if v_code is null then
    v_code := public.generate_referral_code();
    insert into public.zivo_referral_codes (user_id, code)
    values (p_user_id, v_code);
  end if;

  return v_code;
end;
$function$;

revoke all on function public.get_or_create_referral_code(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_or_create_referral_code(uuid)
  to authenticated, service_role;

create or replace function public.track_user_interest(
  p_user_id uuid,
  p_category text,
  p_source text default 'view',
  p_weight numeric default 1
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_caller_role text := coalesce(auth.role(), '');
begin
  if p_user_id is null then
    raise exception 'interest_user_required'
      using errcode = '22023';
  end if;

  if v_caller_role <> 'service_role'
     and (v_actor_id is null or p_user_id is distinct from v_actor_id) then
    raise exception 'interest_user_mismatch'
      using errcode = '42501';
  end if;

  insert into public.user_interest_tags as existing (
    user_id,
    category,
    score,
    source,
    last_seen_at
  )
  values (
    p_user_id,
    p_category,
    p_weight,
    p_source,
    pg_catalog.now()
  )
  on conflict (user_id, category)
  do update set
    score = existing.score + p_weight,
    source = p_source,
    last_seen_at = pg_catalog.now();
end;
$function$;

revoke all on function public.track_user_interest(uuid, text, text, numeric)
  from public, anon, authenticated, service_role;
grant execute on function public.track_user_interest(uuid, text, text, numeric)
  to authenticated, service_role;

create or replace function public.cafe_prep_forecast(
  p_store_id uuid,
  p_target_date date default (pg_catalog.now() at time zone 'UTC')::date,
  p_limit integer default 10
)
returns table (
  menu_item_id uuid,
  item_name text,
  category_id uuid,
  category_name text,
  weeks_observed integer,
  total_qty integer,
  avg_qty numeric,
  suggested_prep integer
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_caller_role text := coalesce(auth.role(), '');
  v_target_dow integer := extract(dow from p_target_date)::integer;
begin
  if v_caller_role <> 'service_role'
     and (
       v_actor_id is null
       or not exists (
         select 1
           from public.store_profiles as stores
          where stores.id = p_store_id
            and stores.owner_id = v_actor_id
       )
     ) then
    raise exception 'cafe_prep_forecast_store_owner_required'
      using errcode = '42501';
  end if;

  return query
  with same_weekday_orders as (
    select orders.id, orders.placed_at::date as day
      from public.cafe_orders as orders
     where orders.store_id = p_store_id
       and orders.status = 'completed'
       and orders.placed_at::date < p_target_date
       and extract(dow from orders.placed_at)::integer = v_target_dow
       and orders.placed_at >= (p_target_date - interval '28 days')
  ),
  per_day as (
    select items.menu_item_id,
           same_weekday_orders.day,
           pg_catalog.sum(items.quantity)::integer as day_qty
      from same_weekday_orders
      join public.cafe_order_items as items
        on items.order_id = same_weekday_orders.id
     where items.menu_item_id is not null
     group by items.menu_item_id, same_weekday_orders.day
  ),
  rollup as (
    select per_day.menu_item_id,
           pg_catalog.count(distinct per_day.day)::integer as weeks_observed,
           pg_catalog.sum(per_day.day_qty)::integer as total_qty,
           pg_catalog.avg(per_day.day_qty)::numeric as avg_qty
      from per_day
     group by per_day.menu_item_id
  )
  select rollup.menu_item_id,
         menu_items.name as item_name,
         menu_items.category_id,
         categories.name as category_name,
         rollup.weeks_observed,
         rollup.total_qty,
         pg_catalog.round(rollup.avg_qty, 1) as avg_qty,
         pg_catalog.ceil(rollup.avg_qty * 1.2)::integer as suggested_prep
    from rollup
    join public.cafe_menu_items as menu_items
      on menu_items.id = rollup.menu_item_id
    left join public.cafe_categories as categories
      on categories.id = menu_items.category_id
   where menu_items.is_active = true
   order by rollup.avg_qty desc nulls last
   limit greatest(p_limit, 1);
end;
$function$;

revoke all on function public.cafe_prep_forecast(uuid, date, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.cafe_prep_forecast(uuid, date, integer)
  to authenticated, service_role;

-- Fail the migration if inherited PUBLIC grants would still leave any of these
-- endpoints anonymously executable.
do $migration$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.lodging_wiring_report()',
    'public.get_or_create_referral_code(uuid)',
    'public.track_user_interest(uuid,text,text,numeric)',
    'public.cafe_prep_forecast(uuid,date,integer)',
    'private.lodging_wiring_report_internal()'
  ] loop
    if pg_catalog.has_function_privilege('anon', v_signature, 'EXECUTE') then
      raise exception 'anonymous execution remains on %', v_signature;
    end if;
  end loop;
end;
$migration$;

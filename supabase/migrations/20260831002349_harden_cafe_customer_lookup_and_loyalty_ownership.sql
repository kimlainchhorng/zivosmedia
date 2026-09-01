-- Bind private cafe customer history and loyalty value to authenticated identity.
--
-- Guest ordering remains available through cafe_place_public_order, but a typed
-- phone number is no longer sufficient to read another customer's name/history
-- or points. Existing RPC signatures stay compatible with the storefront while
-- authenticated callers are resolved through auth.uid(). The service role keeps
-- a phone-based recovery path for trusted support/background operations.

create or replace function public.cafe_public_customer_summary(
  p_store_id uuid,
  p_phone text
)
returns table (
  name text,
  visit_count integer,
  first_visit_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := coalesce(auth.role(), '');
  v_phone text := nullif(pg_catalog.btrim(p_phone), '');
begin
  if p_store_id is null then
    return;
  end if;

  if v_actor_role <> 'service_role' and v_actor_id is null then
    return;
  end if;

  return query
  with matching as (
    select
      orders.customer_name,
      orders.placed_at,
      pg_catalog.row_number() over (order by orders.placed_at desc) as row_number
    from public.cafe_orders as orders
    where orders.store_id = p_store_id
      and orders.status not in ('cancelled', 'refunded')
      and (
        (v_actor_role = 'service_role'
          and v_phone is not null
          and pg_catalog.length(v_phone) >= 6
          and orders.customer_phone = v_phone)
        or
        (v_actor_role <> 'service_role' and orders.customer_user_id = v_actor_id)
      )
  ),
  rolled as (
    select
      (
        select recent.customer_name
        from matching as recent
        where recent.row_number = 1
          and recent.customer_name is not null
      ) as recent_name,
      pg_catalog.count(*)::integer as visits,
      pg_catalog.min(matching.placed_at) as first_visit
    from matching
  )
  select rolled.recent_name, rolled.visits, rolled.first_visit
  from rolled
  where rolled.visits > 0;
end;
$$;

revoke all on function public.cafe_public_customer_summary(uuid, text)
  from public, anon;
grant execute on function public.cafe_public_customer_summary(uuid, text)
  to authenticated, service_role;

create or replace function public.cafe_public_last_order_items(
  p_store_id uuid,
  p_phone text
)
returns table (
  menu_item_id uuid,
  item_name text,
  quantity integer,
  modifier_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := coalesce(auth.role(), '');
  v_phone text := nullif(pg_catalog.btrim(p_phone), '');
  v_order_id uuid;
begin
  if p_store_id is null then
    return;
  end if;

  if v_actor_role <> 'service_role' and v_actor_id is null then
    return;
  end if;

  select orders.id
  into v_order_id
  from public.cafe_orders as orders
  where orders.store_id = p_store_id
    and orders.status not in ('cancelled', 'refunded')
    and (
      (v_actor_role = 'service_role'
        and v_phone is not null
        and pg_catalog.length(v_phone) >= 6
        and orders.customer_phone = v_phone)
      or
      (v_actor_role <> 'service_role' and orders.customer_user_id = v_actor_id)
    )
  order by orders.placed_at desc
  limit 1;

  if v_order_id is null then
    return;
  end if;

  return query
  select
    items.menu_item_id,
    items.item_name,
    items.quantity,
    coalesce(
      array(
        select modifiers.modifier_id
        from public.cafe_order_item_modifiers as modifiers
        where modifiers.order_item_id = items.id
        order by modifiers.created_at nulls last
      ),
      array[]::uuid[]
    ) as modifier_ids
  from public.cafe_order_items as items
  where items.order_id = v_order_id
    and items.menu_item_id is not null
  order by items.created_at nulls last;
end;
$$;

revoke all on function public.cafe_public_last_order_items(uuid, text)
  from public, anon;
grant execute on function public.cafe_public_last_order_items(uuid, text)
  to authenticated, service_role;

create or replace function public.cafe_public_loyalty_balance(
  p_store_id uuid,
  p_phone text
)
returns table (
  has_program boolean,
  points integer,
  redeem_threshold integer,
  reward_value_cents integer,
  can_redeem boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := coalesce(auth.role(), '');
  v_phone text := nullif(pg_catalog.btrim(p_phone), '');
  v_program record;
  v_balance record;
begin
  if p_store_id is null then
    return;
  end if;

  if v_actor_role <> 'service_role' and v_actor_id is null then
    return;
  end if;

  select
    programs.id,
    programs.redeem_threshold,
    programs.reward_value_cents
  into v_program
  from public.cafe_loyalty_programs as programs
  where programs.store_id = p_store_id
    and programs.is_active = true
  limit 1;

  if v_program.id is null then
    return query select false, 0, 0, 0, false;
    return;
  end if;

  select balances.id, balances.points
  into v_balance
  from public.cafe_loyalty_balances as balances
  where balances.store_id = p_store_id
    and (
      (v_actor_role = 'service_role'
        and v_phone is not null
        and balances.phone = v_phone)
      or
      (v_actor_role <> 'service_role' and balances.user_id = v_actor_id)
    )
  limit 1;

  if v_balance.id is null then
    return query
      select true, 0, v_program.redeem_threshold, v_program.reward_value_cents, false;
    return;
  end if;

  return query
    select
      true,
      v_balance.points,
      v_program.redeem_threshold,
      v_program.reward_value_cents,
      v_balance.points >= v_program.redeem_threshold;
end;
$$;

revoke all on function public.cafe_public_loyalty_balance(uuid, text)
  from public, anon;
grant execute on function public.cafe_public_loyalty_balance(uuid, text)
  to authenticated, service_role;

-- The public order RPC historically selected a loyalty balance by submitted
-- phone. Guard the value-moving event itself so a crafted request cannot spend
-- a phone-only or another account's balance. This avoids duplicating the large
-- order-pricing function while protecting every current and future caller.
create or replace function public.tg_cafe_loyalty_authorize_redeem()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := coalesce(auth.role(), '');
  v_order_user_id uuid;
  v_order_store_id uuid;
  v_balance_user_id uuid;
  v_balance_store_id uuid;
begin
  if new.kind <> 'redeem' then
    return new;
  end if;

  -- Trusted backend callers may perform a separately verified recovery flow.
  if v_actor_role = 'service_role' or session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if v_actor_id is null then
    raise exception 'cafe_loyalty_authenticated_customer_required'
      using errcode = '42501';
  end if;

  select
    orders.customer_user_id,
    orders.store_id,
    balances.user_id,
    balances.store_id
  into
    v_order_user_id,
    v_order_store_id,
    v_balance_user_id,
    v_balance_store_id
  from public.cafe_orders as orders
  join public.cafe_loyalty_balances as balances
    on balances.id = new.balance_id
  where orders.id = new.order_id;

  if not found
     or v_order_store_id is distinct from new.store_id
     or v_balance_store_id is distinct from new.store_id
     or v_order_user_id is distinct from v_actor_id
     or v_balance_user_id is distinct from v_actor_id then
    raise exception 'cafe_loyalty_balance_owner_mismatch'
      using errcode = '42501';
  end if;

  new.created_by_user_id := coalesce(new.created_by_user_id, v_actor_id);
  return new;
end;
$$;

revoke all on function public.tg_cafe_loyalty_authorize_redeem()
  from public, anon, authenticated;
grant execute on function public.tg_cafe_loyalty_authorize_redeem()
  to service_role;

drop trigger if exists cafe_loyalty_authorize_redeem
  on public.cafe_loyalty_events;
create trigger cafe_loyalty_authorize_redeem
  before insert on public.cafe_loyalty_events
  for each row
  execute function public.tg_cafe_loyalty_authorize_redeem();

-- Fail migration review if inherited PUBLIC privileges still make any private
-- lookup callable by anonymous clients.
do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.cafe_public_customer_summary(uuid,text)',
    'public.cafe_public_last_order_items(uuid,text)',
    'public.cafe_public_loyalty_balance(uuid,text)'
  ]
  loop
    if pg_catalog.has_function_privilege('anon', v_signature, 'execute') then
      raise exception '% remains anonymously executable', v_signature;
    end if;

    if not pg_catalog.has_function_privilege('authenticated', v_signature, 'execute') then
      raise exception '% is unavailable to authenticated customers', v_signature;
    end if;
  end loop;
end;
$$;

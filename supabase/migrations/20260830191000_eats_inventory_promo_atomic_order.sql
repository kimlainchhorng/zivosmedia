-- Make server-priced Eats order creation, limited-stock reservation, and
-- promo consumption one Postgres transaction. The public RPC is callable only
-- with the service-role JWT used by the create-eats-order Edge Function.

begin;

create schema if not exists private;

create table if not exists private.eats_inventory_reservations (
  order_id uuid not null
    references public.food_orders(id) on delete cascade,
  menu_item_id uuid not null
    references public.menu_items(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  stock_column text not null
    check (stock_column in ('stock_quantity', 'stock_qty')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  primary key (order_id, menu_item_id)
);

create table if not exists private.eats_promo_reservations (
  order_id uuid primary key
    references public.food_orders(id) on delete cascade,
  promo_id uuid not null
    references public.promo_codes(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  -- Deliberately not a foreign key: cancelling an unfulfilled order deletes
  -- the public redemption while retaining this private idempotency record.
  redemption_id uuid not null,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

-- One customer-scoped UUID represents one logical checkout attempt. The
-- request fingerprint prevents a reused UUID from being attached to changed
-- order intent, while the order_id uniqueness prevents one saved order from
-- being aliased by multiple request records.
create table if not exists private.eats_order_requests (
  customer_id uuid not null
    references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_fingerprint text not null
    check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  order_id uuid not null unique
    references public.food_orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, idempotency_key)
);

revoke all on table private.eats_inventory_reservations
  from public, anon, authenticated, service_role;
revoke all on table private.eats_promo_reservations
  from public, anon, authenticated, service_role;
revoke all on table private.eats_order_requests
  from public, anon, authenticated, service_role;

alter table public.food_orders
  add column if not exists payment_expires_at timestamptz;

create index if not exists idx_food_orders_payment_expiry
  on public.food_orders (payment_expires_at)
  where payment_expires_at is not null;

comment on column public.food_orders.payment_expires_at is
  'Server-owned deadline for an unpaid provider checkout; null for cash and wallet orders.';

create or replace function private.food_order_payment_expiry_server_gate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' and new.payment_expires_at is not null then
      raise exception 'food_order_payment_expiry_server_gate_required'
        using errcode = '42501';
    elsif tg_op = 'UPDATE'
          and new.payment_expires_at is distinct from old.payment_expires_at then
      raise exception 'food_order_payment_expiry_server_gate_required'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.food_order_payment_expiry_server_gate()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_food_order_payment_expiry_server_gate
  on public.food_orders;
create trigger trg_food_order_payment_expiry_server_gate
before insert or update of payment_expires_at on public.food_orders
for each row
execute function private.food_order_payment_expiry_server_gate();

create or replace function private.eats_order_customer_projection(
  p_order public.food_orders,
  p_idempotent_replay boolean
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'idempotent_replay', p_idempotent_replay,
    'order', pg_catalog.jsonb_build_object(
      'id', (p_order).id,
      'customer_id', (p_order).customer_id,
      'restaurant_id', (p_order).restaurant_id,
      'tracking_code', (p_order).tracking_code,
      'total_amount', (p_order).total_amount,
      'payment_type', (p_order).payment_type,
      'status', (p_order).status,
      'payment_status', (p_order).payment_status,
      'payment_expires_at', (p_order).payment_expires_at
    )
  );
$$;

revoke all on function private.eats_order_customer_projection(
  public.food_orders, boolean
) from public, anon, authenticated, service_role;

-- Browser-written redemptions can fabricate quota use and make an otherwise
-- valid promo appear exhausted. Redemptions are now created only inside the
-- service-only atomic order boundary.
drop policy if exists promo_redemptions_insert_auth
  on public.promo_redemptions;
drop policy if exists "System can insert redemptions"
  on public.promo_redemptions;

revoke insert, update, delete on table public.promo_redemptions
  from public, anon, authenticated;
grant select on table public.promo_redemptions to authenticated;
grant all privileges on table public.promo_redemptions to service_role;

create unique index if not exists idx_promo_redemptions_promo_order
  on public.promo_redemptions (promo_id, order_id)
  where order_id is not null;

-- Cheap retry lookup before the Edge Function re-reads time-sensitive menu,
-- promo, and restaurant state. It takes the same customer/request advisory
-- lock as creation, so a concurrent original request either completes first
-- or the retry observes no order and then serializes again in the create RPC.
create or replace function public.find_eats_order_idempotency_v1(
  p_customer_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request private.eats_order_requests%rowtype;
  v_order public.food_orders%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'eats_atomic_forbidden' using errcode = '42501';
  end if;

  if p_customer_id is null
     or p_idempotency_key is null
     or p_request_fingerprint is null
     or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'eats_atomic_invalid_request' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_customer_id::text || ':' || p_idempotency_key::text,
      0
    )
  );

  select *
    into v_request
  from private.eats_order_requests
  where customer_id = p_customer_id
    and idempotency_key = p_idempotency_key;

  if not found then
    return null;
  end if;
  if v_request.request_fingerprint is distinct from p_request_fingerprint then
    raise exception 'eats_atomic_idempotency_conflict'
      using errcode = 'P0001';
  end if;

  select *
    into strict v_order
  from public.food_orders
  where id = v_request.order_id
    and customer_id = p_customer_id;

  return private.eats_order_customer_projection(v_order, true);
end;
$$;

revoke all on function public.find_eats_order_idempotency_v1(
  uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.find_eats_order_idempotency_v1(
  uuid, uuid, text
) to service_role;

-- Remove the earlier non-idempotent overload if this draft was exercised in
-- a local database before the final migration was applied.
drop function if exists public.create_eats_order_atomic_v1(
  uuid, uuid, text, jsonb, jsonb, uuid
);

create or replace function public.create_eats_order_atomic_v1(
  p_customer_id uuid,
  p_idempotency_key uuid,
  p_request_fingerprint text,
  p_restaurant_id uuid,
  p_order_mode text,
  p_items jsonb,
  p_order jsonb,
  p_promo_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_request private.eats_order_requests%rowtype;
  v_menu public.menu_items%rowtype;
  v_item record;
  v_order public.food_orders%rowtype;
  v_promo public.promo_codes%rowtype;
  v_redemption_id uuid;
  v_requested_count integer;
  v_distinct_count integer;
  v_available_stock integer;
  v_unit_price_cents integer;
  v_subtotal_cents integer := 0;
  v_min_order_cents integer;
  v_delivery_fee_cents integer;
  v_service_fee_percent numeric;
  v_service_fee_cents integer;
  v_tax_cents integer;
  v_tip_cents integer;
  v_express_fee_cents integer;
  v_discount_cents integer := 0;
  v_total_cents integer;
  v_promo_uses integer;
  v_user_uses integer;
  v_discount_value numeric;
  v_saved_delivery_address text;
  v_saved_delivery_lat numeric;
  v_saved_delivery_lng numeric;
  v_is_express boolean;
  v_payment_type text;
  v_payment_provider text;
  v_payment_expires_at timestamptz;
  v_now timestamptz := now();
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'eats_atomic_forbidden' using errcode = '42501';
  end if;

  if p_customer_id is null
     or p_idempotency_key is null
     or p_request_fingerprint is null
     or p_request_fingerprint !~ '^[0-9a-f]{64}$'
     or p_restaurant_id is null
     or p_order_mode is null
     or p_order_mode not in ('delivery', 'pickup')
     or jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_typeof(p_order) is distinct from 'object' then
    raise exception 'eats_atomic_invalid_request' using errcode = '22023';
  end if;

  -- Serialize one logical request before taking any restaurant/menu/promo
  -- locks. The private primary key is the durable uniqueness backstop; the
  -- advisory lock gives deterministic replay/conflict behavior under races.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_customer_id::text || ':' || p_idempotency_key::text,
      0
    )
  );

  select *
    into v_request
  from private.eats_order_requests
  where customer_id = p_customer_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_request.request_fingerprint is distinct from p_request_fingerprint then
      raise exception 'eats_atomic_idempotency_conflict'
        using errcode = 'P0001';
    end if;

    select *
      into strict v_order
    from public.food_orders
    where id = v_request.order_id
      and customer_id = p_customer_id;

    return private.eats_order_customer_projection(v_order, true);
  end if;

  v_requested_count := jsonb_array_length(p_items);
  if v_requested_count < 1 or v_requested_count > 50 then
    raise exception 'eats_atomic_invalid_request' using errcode = '22023';
  end if;

  select count(distinct x.id)
    into v_distinct_count
  from jsonb_to_recordset(p_items)
    as x(id uuid, quantity integer, price numeric, name text);

  if v_distinct_count <> v_requested_count then
    raise exception 'eats_atomic_invalid_request' using errcode = '22023';
  end if;

  -- Lock order is always restaurant -> menu UUIDs -> promo UUID. The release
  -- trigger uses menu UUIDs -> promo UUID, so concurrent calls cannot invert
  -- resource locks and deadlock one another.
  select *
    into v_restaurant
  from public.restaurants
  where id = p_restaurant_id
  for update;

  if not found
     or v_restaurant.status is distinct from 'active'
     or v_restaurant.is_open is distinct from true
     or v_restaurant.pause_new_orders is true then
    raise exception 'eats_atomic_restaurant_unavailable'
      using errcode = 'P0001';
  end if;

  if v_restaurant.currency is distinct from 'USD'
     or (p_order_mode = 'delivery'
         and v_restaurant.accepts_delivery is distinct from true)
     or (p_order_mode = 'pickup'
         and v_restaurant.accepts_pickup is distinct from true) then
    raise exception 'eats_atomic_restaurant_unavailable'
      using errcode = 'P0001';
  end if;

  -- Both delivery dispatch and customer pickup need a real restaurant origin.
  -- Never persist or dispatch with the historic 0,0 fallback.
  if nullif(pg_catalog.btrim(v_restaurant.address), '') is null
     or v_restaurant.lat is null
     or v_restaurant.lat < -90
     or v_restaurant.lat > 90
     or v_restaurant.lng is null
     or v_restaurant.lng < -180
     or v_restaurant.lng > 180
     or (v_restaurant.lat = 0 and v_restaurant.lng = 0) then
    raise exception 'eats_atomic_restaurant_location_unavailable'
      using errcode = 'P0001';
  end if;

  for v_item in
    select x.id, x.quantity, x.price, x.name
    from jsonb_to_recordset(p_items)
      as x(id uuid, quantity integer, price numeric, name text)
    order by x.id
  loop
    if v_item.id is null
       or v_item.quantity is null
       or v_item.quantity < 1
       or v_item.quantity > 50
       or v_item.price is null
       or v_item.name is null then
      raise exception 'eats_atomic_invalid_request' using errcode = '22023';
    end if;

    select *
      into v_menu
    from public.menu_items
    where id = v_item.id
    for update;

    if not found
       or v_menu.restaurant_id <> p_restaurant_id
       or v_menu.is_available is distinct from true
       or v_menu.stock_mode = 'out'
       or v_menu.name is distinct from v_item.name then
      raise exception 'eats_atomic_menu_changed' using errcode = 'P0001';
    end if;

    if v_menu.price < 0
       or round(v_menu.price * 100) > 5000000
       or round(v_menu.price * 100) <> round(v_item.price * 100) then
      raise exception 'eats_atomic_price_changed' using errcode = 'P0001';
    end if;
    v_unit_price_cents := round(v_menu.price * 100)::integer;

    if v_menu.stock_mode = 'limited' then
      v_available_stock := coalesce(
        v_menu.stock_quantity,
        v_menu.stock_qty,
        0
      );
      if v_available_stock < v_item.quantity then
        raise exception 'eats_atomic_menu_changed' using errcode = 'P0001';
      end if;
    end if;

    if v_subtotal_cents::numeric
         + (v_unit_price_cents::numeric * v_item.quantity) > 5000000 then
      raise exception 'eats_atomic_price_changed' using errcode = 'P0001';
    end if;
    v_subtotal_cents := (
      v_subtotal_cents::numeric
        + (v_unit_price_cents::numeric * v_item.quantity)
    )::integer;
  end loop;

  v_min_order_cents := coalesce(v_restaurant.min_order_cents, 0);
  if v_min_order_cents < 0 or v_subtotal_cents < v_min_order_cents then
    raise exception 'eats_atomic_price_changed' using errcode = 'P0001';
  end if;

  if v_restaurant.delivery_fee_cents is not null
     and (v_restaurant.delivery_fee_cents < 0
          or v_restaurant.delivery_fee_cents > 1000000) then
    raise exception 'eats_atomic_price_changed' using errcode = 'P0001';
  end if;

  v_delivery_fee_cents := case
    when p_order_mode = 'pickup' or v_subtotal_cents >= 2000 then 0
    else coalesce(v_restaurant.delivery_fee_cents, 399)
  end;

  v_service_fee_percent := coalesce(
    v_restaurant.service_fee_percent,
    5
  );
  if v_service_fee_percent < 0 or v_service_fee_percent > 50 then
    raise exception 'eats_atomic_price_changed' using errcode = 'P0001';
  end if;
  v_service_fee_cents := round(
    v_subtotal_cents * (v_service_fee_percent / 100)
  )::integer;
  v_tax_cents := round(v_subtotal_cents * 0.10)::integer;

  v_tip_cents := round(
    coalesce(nullif(p_order ->> 'tip_amount', '')::numeric, 0) * 100
  )::integer;
  if p_order_mode = 'pickup' then
    v_tip_cents := 0;
  elsif v_tip_cents < 0
        or v_tip_cents > 10000
        or v_tip_cents > v_subtotal_cents then
    raise exception 'eats_atomic_price_changed' using errcode = 'P0001';
  end if;

  v_is_express := p_order_mode = 'delivery'
    and coalesce((p_order ->> 'is_express')::boolean, false);
  v_express_fee_cents := case when v_is_express then 299 else 0 end;

  if p_promo_id is not null then
    select *
      into v_promo
    from public.promo_codes
    where id = p_promo_id
    for update;

    if not found
       or v_promo.code is distinct from (p_order ->> 'promo_code')
       or v_promo.is_active is distinct from true
       or (v_promo.start_at is not null and v_promo.start_at > v_now)
       or (v_promo.end_at is not null and v_promo.end_at <= v_now)
       or (v_promo.expires_at is not null and v_promo.expires_at <= v_now) then
      raise exception 'eats_atomic_promo_unavailable' using errcode = 'P0001';
    end if;

    select count(*)::integer
      into v_promo_uses
    from public.promo_redemptions
    where promo_id = v_promo.id
      and status = 'applied';

    v_promo_uses := greatest(
      coalesce(v_promo.uses, 0),
      coalesce(v_promo.usage_count, 0),
      coalesce(v_promo_uses, 0)
    );
    if v_promo.max_uses is not null
       and v_promo_uses >= v_promo.max_uses then
      raise exception 'eats_atomic_promo_limit' using errcode = 'P0001';
    end if;

    if v_promo.max_uses_per_user is not null then
      select count(*)::integer
        into v_user_uses
      from public.promo_redemptions
      where promo_id = v_promo.id
        and user_id = p_customer_id
        and status = 'applied';
      if coalesce(v_user_uses, 0) >= v_promo.max_uses_per_user then
        raise exception 'eats_atomic_promo_limit' using errcode = 'P0001';
      end if;
    end if;

    if v_promo.min_fare is not null then
      if v_promo.min_fare < 0
         or v_subtotal_cents < round(v_promo.min_fare * 100) then
        raise exception 'eats_atomic_promo_unavailable' using errcode = 'P0001';
      end if;
    end if;

    v_discount_value := v_promo.discount_value;
    if v_discount_value is null or v_discount_value <= 0 then
      raise exception 'eats_atomic_promo_unavailable' using errcode = 'P0001';
    end if;

    v_discount_value := case v_promo.discount_type
      when 'percent' then round(
        v_subtotal_cents * (v_discount_value / 100)
      )
      when 'fixed' then round(v_discount_value * 100)
      else null
    end;
    if v_discount_value is null then
      raise exception 'eats_atomic_promo_unavailable' using errcode = 'P0001';
    end if;
    if v_promo.max_discount is not null then
      if v_promo.max_discount < 0 then
        raise exception 'eats_atomic_promo_unavailable' using errcode = 'P0001';
      end if;
      v_discount_value := least(
        v_discount_value,
        round(v_promo.max_discount * 100)
      );
    end if;
    v_discount_cents := least(
      greatest(v_discount_value, 0),
      v_subtotal_cents
    )::integer;
  elsif nullif(p_order ->> 'promo_code', '') is not null then
    raise exception 'eats_atomic_promo_unavailable' using errcode = 'P0001';
  end if;

  v_total_cents := greatest(
    0,
    v_subtotal_cents
      + v_delivery_fee_cents
      + v_service_fee_cents
      + v_tax_cents
      + v_tip_cents
      + v_express_fee_cents
      - v_discount_cents
  );

  -- The handler already built this quote from the same live rows. Requiring
  -- an exact match under the locks closes the final read/insert race.
  if round(coalesce((p_order ->> 'subtotal')::numeric, -1) * 100)::integer
       <> v_subtotal_cents
     or coalesce((p_order ->> 'delivery_fee_cents')::integer, -1)
       <> v_delivery_fee_cents
     or coalesce((p_order ->> 'service_fee_cents')::integer, -1)
       <> v_service_fee_cents
     or round(coalesce((p_order ->> 'tax')::numeric, -1) * 100)::integer
       <> v_tax_cents
     or round(coalesce((p_order ->> 'tip_amount')::numeric, -1) * 100)::integer
       <> v_tip_cents
     or coalesce((p_order ->> 'express_fee_cents')::integer, -1)
       <> v_express_fee_cents
     or round(
       coalesce((p_order ->> 'discount_amount')::numeric, -1) * 100
     )::integer <> v_discount_cents
     or round(
       coalesce((p_order ->> 'total_amount')::numeric, -1) * 100
     )::integer <> v_total_cents then
    raise exception 'eats_atomic_price_changed' using errcode = 'P0001';
  end if;

  v_payment_type := p_order ->> 'payment_type';
  if v_payment_type not in ('cash', 'card', 'wallet', 'paypal', 'square') then
    raise exception 'eats_atomic_invalid_request' using errcode = '22023';
  end if;
  v_payment_provider := case
    when v_payment_type = 'card' then 'stripe'
    else v_payment_type
  end;
  v_payment_expires_at := case
    when v_payment_type in ('card', 'paypal', 'square')
      then v_now + interval '60 minutes'
    else null
  end;
  if p_order ->> 'payment_provider' is distinct from v_payment_provider then
    raise exception 'eats_atomic_invalid_request' using errcode = '22023';
  end if;

  if p_order_mode = 'pickup' then
    v_saved_delivery_address := nullif(trim(v_restaurant.address), '');
    v_saved_delivery_lat := v_restaurant.lat;
    v_saved_delivery_lng := v_restaurant.lng;
  else
    v_saved_delivery_address := nullif(trim(p_order ->> 'delivery_address'), '');
    v_saved_delivery_lat := nullif(p_order ->> 'delivery_lat', '')::numeric;
    v_saved_delivery_lng := nullif(p_order ->> 'delivery_lng', '')::numeric;
  end if;
  if v_saved_delivery_address is null
     or v_saved_delivery_lat is null
     or v_saved_delivery_lat < -90
     or v_saved_delivery_lat > 90
     or v_saved_delivery_lng is null
     or v_saved_delivery_lng < -180
     or v_saved_delivery_lng > 180
     or (v_saved_delivery_lat = 0 and v_saved_delivery_lng = 0) then
    raise exception 'eats_atomic_invalid_request' using errcode = '22023';
  end if;

  insert into public.food_orders (
    customer_id,
    restaurant_id,
    items,
    subtotal,
    delivery_fee,
    delivery_fee_cents,
    service_fee,
    service_fee_cents,
    tax,
    tip_amount,
    tip_cents,
    express_fee_cents,
    discount_amount,
    total_amount,
    delivery_address,
    delivery_lat,
    delivery_lng,
    pickup_lat,
    pickup_lng,
    special_instructions,
    status,
    payment_status,
    payment_expires_at,
    payment_type,
    payment_provider,
    is_scheduled,
    scheduled_for,
    is_express,
    promo_code,
    tracking_code,
    needs_driver,
    ride_type,
    credit_used_amount,
    quoted_subtotal,
    quoted_delivery_fee,
    quoted_service_fee,
    quoted_small_order_fee,
    quoted_tax,
    quoted_tip,
    quoted_total,
    pricing_breakdown
  ) values (
    p_customer_id,
    p_restaurant_id,
    p_items,
    v_subtotal_cents / 100.0,
    v_delivery_fee_cents / 100.0,
    v_delivery_fee_cents,
    v_service_fee_cents / 100.0,
    v_service_fee_cents,
    v_tax_cents / 100.0,
    v_tip_cents / 100.0,
    v_tip_cents,
    v_express_fee_cents,
    v_discount_cents / 100.0,
    v_total_cents / 100.0,
    v_saved_delivery_address,
    v_saved_delivery_lat,
    v_saved_delivery_lng,
    v_restaurant.lat,
    v_restaurant.lng,
    nullif(trim(p_order ->> 'special_instructions'), ''),
    'pending'::public.booking_status,
    'pending',
    v_payment_expires_at,
    v_payment_type,
    v_payment_provider,
    coalesce((p_order ->> 'is_scheduled')::boolean, false),
    nullif(p_order ->> 'scheduled_for', '')::timestamptz,
    v_is_express,
    case when p_promo_id is null then null else v_promo.code end,
    nullif(trim(p_order ->> 'tracking_code'), ''),
    p_order_mode = 'delivery',
    p_order_mode,
    0,
    v_subtotal_cents / 100.0,
    v_delivery_fee_cents / 100.0,
    v_service_fee_cents / 100.0,
    0,
    v_tax_cents / 100.0,
    v_tip_cents / 100.0,
    v_total_cents / 100.0,
    jsonb_build_object(
      'currency', 'USD',
      'fulfillment_type', p_order_mode,
      'subtotal_cents', v_subtotal_cents,
      'delivery_fee_cents', v_delivery_fee_cents,
      'service_fee_cents', v_service_fee_cents,
      'tax_cents', v_tax_cents,
      'tip_cents', v_tip_cents,
      'express_fee_cents', v_express_fee_cents,
      'discount_cents', v_discount_cents,
      'total_cents', v_total_cents
    )
  )
  returning * into v_order;

  for v_item in
    select x.id, x.quantity
    from jsonb_to_recordset(p_items)
      as x(id uuid, quantity integer)
    order by x.id
  loop
    select *
      into v_menu
    from public.menu_items
    where id = v_item.id;

    if v_menu.stock_mode = 'limited' then
      if v_menu.stock_quantity is not null then
        update public.menu_items
        set stock_quantity = stock_quantity - v_item.quantity
        where id = v_item.id;

        insert into private.eats_inventory_reservations (
          order_id, menu_item_id, quantity, stock_column
        ) values (
          v_order.id, v_item.id, v_item.quantity, 'stock_quantity'
        );
      else
        update public.menu_items
        set stock_qty = stock_qty - v_item.quantity
        where id = v_item.id;

        insert into private.eats_inventory_reservations (
          order_id, menu_item_id, quantity, stock_column
        ) values (
          v_order.id, v_item.id, v_item.quantity, 'stock_qty'
        );
      end if;
    end if;
  end loop;

  if p_promo_id is not null then
    insert into public.promo_redemptions (
      promo_id,
      user_id,
      order_id,
      original_amount,
      discount_amount,
      final_amount,
      status
    ) values (
      v_promo.id,
      p_customer_id,
      v_order.id,
      v_subtotal_cents / 100.0,
      v_discount_cents / 100.0,
      (v_subtotal_cents - v_discount_cents) / 100.0,
      'applied'
    )
    returning id into v_redemption_id;

    update public.promo_codes
    set uses = v_promo_uses + 1,
        usage_count = v_promo_uses + 1
    where id = v_promo.id;

    insert into private.eats_promo_reservations (
      order_id,
      promo_id,
      user_id,
      redemption_id
    ) values (
      v_order.id,
      v_promo.id,
      p_customer_id,
      v_redemption_id
    );
  end if;

  insert into private.eats_order_requests (
    customer_id,
    idempotency_key,
    request_fingerprint,
    order_id
  ) values (
    p_customer_id,
    p_idempotency_key,
    p_request_fingerprint,
    v_order.id
  );

  return private.eats_order_customer_projection(v_order, false);
end;
$$;

revoke all on function public.create_eats_order_atomic_v1(
  uuid, uuid, text, uuid, text, jsonb, jsonb, uuid
) from public, anon, authenticated;
grant execute on function public.create_eats_order_atomic_v1(
  uuid, uuid, text, uuid, text, jsonb, jsonb, uuid
) to service_role;

create or replace function public.expire_stale_eats_orders_v1(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_ids uuid[];
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'eats_expiry_forbidden' using errcode = '42501';
  end if;

  with candidates as (
    select food_order.id
    from public.food_orders as food_order
    where food_order.payment_expires_at is not null
      and food_order.payment_expires_at <= pg_catalog.now()
      and food_order.payment_type in ('card', 'paypal', 'square')
      and food_order.payment_status in (
        'pending', 'unpaid', 'processing', 'authorized', 'failed'
      )
      and food_order.paid_at is null
      and food_order.status::text in ('pending', 'placed', 'confirmed')
      and food_order.driver_id is null
      and food_order.prepared_at is null
      and food_order.picked_up_at is null
      and food_order.delivered_at is null
    order by food_order.payment_expires_at, food_order.id
    for update skip locked
    limit greatest(
      1,
      least(coalesce(p_limit, 100), 500)
    )
  ), cancelled as (
    update public.food_orders as food_order
    set status = 'cancelled'::public.booking_status,
        payment_status = 'failed',
        payment_expires_at = null,
        cancelled_at = coalesce(food_order.cancelled_at, pg_catalog.now()),
        last_payment_error = 'payment_expired_unpaid',
        updated_at = pg_catalog.now()
    from candidates
    where food_order.id = candidates.id
      -- Repeat every safety predicate in the UPDATE. The row locks serialize
      -- payment/cancellation workers, while this recheck makes the transition
      -- safe if a trigger or same-transaction mutation changed eligibility.
      and food_order.payment_expires_at is not null
      and food_order.payment_expires_at <= pg_catalog.now()
      and food_order.payment_type in ('card', 'paypal', 'square')
      and food_order.payment_status in (
        'pending', 'unpaid', 'processing', 'authorized', 'failed'
      )
      and food_order.paid_at is null
      and food_order.status::text in ('pending', 'placed', 'confirmed')
      and food_order.driver_id is null
      and food_order.prepared_at is null
      and food_order.picked_up_at is null
      and food_order.delivered_at is null
    returning food_order.id
  )
  select pg_catalog.array_agg(cancelled.id order by cancelled.id)
    into v_order_ids
  from cancelled;

  return pg_catalog.jsonb_build_object(
    'cancelled', coalesce(pg_catalog.array_length(v_order_ids, 1), 0),
    'order_ids', coalesce(pg_catalog.to_jsonb(v_order_ids), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.expire_stale_eats_orders_v1(integer)
  from public, anon, authenticated;
grant execute on function public.expire_stale_eats_orders_v1(integer)
  to service_role;

create or replace function private.clear_eats_payment_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.paid_at is not null
     or new.payment_status in (
       'paid', 'cash_on_delivery', 'refunded', 'cancelled'
     )
     or new.status::text in ('cancelled', 'delivered', 'completed', 'refunded') then
    new.payment_expires_at := null;
  end if;
  return new;
end;
$$;

revoke all on function private.clear_eats_payment_expiry()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_clear_eats_payment_expiry
  on public.food_orders;
create trigger trg_clear_eats_payment_expiry
before update of status, payment_status, paid_at on public.food_orders
for each row
execute function private.clear_eats_payment_expiry();

create or replace function private.release_eats_order_resources()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventory record;
  v_promo private.eats_promo_reservations%rowtype;
  v_deleted_redemption_id uuid;
begin
  -- Restore only the first cancellation of an order that has not entered food
  -- preparation/fulfillment. Historical/completed orders are never restocked.
  if new.status::text is distinct from 'cancelled'
     or old.status is not distinct from new.status
     or old.status::text not in ('pending', 'placed', 'confirmed')
     or new.prepared_at is not null
     or new.picked_up_at is not null
     or new.delivered_at is not null then
    return new;
  end if;

  for v_inventory in
    select order_id, menu_item_id, quantity, stock_column
    from private.eats_inventory_reservations
    where order_id = new.id
      and released_at is null
    order by menu_item_id
    for update
  loop
    perform 1
    from public.menu_items
    where id = v_inventory.menu_item_id
    for update;

    if found then
      if v_inventory.stock_column = 'stock_quantity' then
        update public.menu_items
        set stock_quantity = coalesce(stock_quantity, 0)
          + v_inventory.quantity
        where id = v_inventory.menu_item_id;
      else
        update public.menu_items
        set stock_qty = coalesce(stock_qty, 0) + v_inventory.quantity
        where id = v_inventory.menu_item_id;
      end if;
    end if;

    update private.eats_inventory_reservations
    set released_at = now()
    where order_id = v_inventory.order_id
      and menu_item_id = v_inventory.menu_item_id
      and released_at is null;
  end loop;

  select *
    into v_promo
  from private.eats_promo_reservations
  where order_id = new.id
    and released_at is null
  for update;

  if found then
    perform 1
    from public.promo_codes
    where id = v_promo.promo_id
    for update;

    if found then
      delete from public.promo_redemptions
      where id = v_promo.redemption_id
        and promo_id = v_promo.promo_id
        and order_id = new.id
      returning id into v_deleted_redemption_id;

      if found then
        update public.promo_codes
        set uses = greatest(coalesce(uses, 0) - 1, 0),
            usage_count = greatest(coalesce(usage_count, 0) - 1, 0)
        where id = v_promo.promo_id;
      end if;
    end if;

    update private.eats_promo_reservations
    set released_at = now()
    where order_id = new.id
      and released_at is null;
  end if;

  return new;
end;
$$;

revoke all on function private.release_eats_order_resources()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_release_eats_order_resources
  on public.food_orders;
create trigger trg_release_eats_order_resources
after update of status on public.food_orders
for each row
execute function private.release_eats_order_resources();

comment on function public.create_eats_order_atomic_v1(
  uuid, uuid, text, uuid, text, jsonb, jsonb, uuid
) is
  'Service-only idempotent atomic boundary for Eats order insert, limited-stock reservation, and promo consumption.';

comment on function public.find_eats_order_idempotency_v1(
  uuid, uuid, text
) is
  'Service-only customer-scoped idempotency replay lookup used before time-sensitive catalog validation.';

comment on function public.expire_stale_eats_orders_v1(integer) is
  'Service-only race-safe cleanup for unpaid provider Eats orders whose 60-minute payment window elapsed.';

commit;

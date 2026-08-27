-- Durable CutLuy/Bakong KHQR payment authority for lodging reservations.
--
-- The browser never writes these tables. Edge Functions use the service role
-- to create a provider payment from the reservation's server-owned balance,
-- persist a verified webhook before acknowledging it, and then apply the
-- event through a leased, idempotent transition.

begin;

create schema if not exists private;

alter table public.lodge_reservations
  add column if not exists payment_provider text,
  add column if not exists cutluy_payment_attempt_id uuid,
  add column if not exists cutluy_payment_id text,
  add column if not exists cutluy_payment_status text,
  add column if not exists cutluy_last_event_id uuid,
  add column if not exists cutluy_last_event_type text,
  add column if not exists cutluy_last_event_at timestamptz,
  add column if not exists cutluy_manual_review_required boolean not null default false,
  add column if not exists cutluy_manual_refund_required boolean not null default false,
  add column if not exists cutluy_manual_review_reason text;

alter table public.lodge_reservations
  drop constraint if exists lodge_reservations_payment_provider_check;

alter table public.lodge_reservations
  add constraint lodge_reservations_payment_provider_check
  check (
    payment_provider is null
    or payment_provider in (
      'stripe',
      'paypal',
      'square',
      'cash',
      'khqr',
      'bank_transfer'
    )
  ) not valid;

alter table public.lodge_reservations
  validate constraint lodge_reservations_payment_provider_check;

alter table public.lodge_reservations
  drop constraint if exists lodge_reservations_cutluy_payment_status_check;

alter table public.lodge_reservations
  add constraint lodge_reservations_cutluy_payment_status_check
  check (
    cutluy_payment_status is null
    or cutluy_payment_status in ('pending', 'scanned', 'paid', 'expired', 'failed')
  ) not valid;

alter table public.lodge_reservations
  validate constraint lodge_reservations_cutluy_payment_status_check;

alter table public.lodge_reservations
  drop constraint if exists lodge_reservations_cutluy_manual_refund_check;

alter table public.lodge_reservations
  add constraint lodge_reservations_cutluy_manual_refund_check
  check (
    not cutluy_manual_refund_required
    or cutluy_manual_review_required
  ) not valid;

alter table public.lodge_reservations
  validate constraint lodge_reservations_cutluy_manual_refund_check;

-- Reconcile the guest-booking authority that exists in source but is absent
-- from the live main project. Keep this logic in sync with
-- 20260526184329_lodge_guest_booking_rpc.sql: prices, capacity, blocks, room
-- rules, and guest identity remain server-owned.
create schema if not exists private;

create index if not exists idx_lodge_reservations_guest_created
  on public.lodge_reservations (guest_id, created_at desc)
  where guest_id is not null;

create index if not exists idx_lodge_reservations_room_active_window
  on public.lodge_reservations (room_id, check_in, check_out)
  where room_id is not null and status not in ('cancelled', 'no_show');

drop policy if exists "Guests read their own lodge reservations"
  on public.lodge_reservations;

drop policy if exists "Guests can view their own lodge reservations"
  on public.lodge_reservations;

create policy "Guests can view their own lodge reservations"
  on public.lodge_reservations
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and guest_id = (select auth.uid())
  );

create or replace function private.create_lodge_guest_reservation(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_room_id uuid;
  v_store_text text;
  v_room_text text;
  v_ci_text text;
  v_co_text text;
  v_check_in date;
  v_check_out date;
  v_nights int;
  v_adults int;
  v_children int;
  v_total_guests int;
  v_guest_name text;
  v_guest_phone text;
  v_guest_email text;
  v_guest_country text;
  v_notes text;
  v_source text;
  v_payment_method text;
  v_requested_status text;
  v_status text;
  v_payment_status text;
  v_payment_provider text;
  v_room record;
  v_units_total int;
  v_overlap_count int;
  v_block_count int;
  v_night date;
  v_base_rate_cents int;
  v_weekend_rate_cents int;
  v_room_total_cents int := 0;
  v_weekend_uplift_cents int := 0;
  v_discount_pct numeric := 0;
  v_discount_cents int := 0;
  v_room_after_discount_cents int := 0;
  v_requested_addons jsonb;
  v_room_addons jsonb;
  v_addon_request jsonb;
  v_addon_def jsonb;
  v_addons_snapshot jsonb := '[]'::jsonb;
  v_addons_total_cents int := 0;
  v_qty int;
  v_max_qty int;
  v_price_cents int;
  v_per text;
  v_addon_units int;
  v_addon_subtotal_cents int;
  v_extra_adults int;
  v_extra_children int;
  v_extra_adult_fee_each int := 0;
  v_extra_child_fee_each int := 0;
  v_extra_adult_fee_cents int := 0;
  v_extra_child_fee_cents int := 0;
  v_extra_guest_total_cents int := 0;
  v_city_tax_each_cents int := 0;
  v_resort_fee_each_cents int := 0;
  v_cleaning_fee_cents int := 0;
  v_service_charge_pct numeric := 0;
  v_vat_pct numeric := 0;
  v_city_tax_cents int := 0;
  v_resort_fee_cents int := 0;
  v_service_charge_cents int := 0;
  v_vat_cents int := 0;
  v_tax_cents int := 0;
  v_extras_cents int := 0;
  v_taxable_subtotal_cents int := 0;
  v_total_cents int := 0;
  v_deposit_cents int := 0;
  v_fee_breakdown jsonb;
  v_guest_details jsonb;
  v_policy_consent jsonb;
  v_policy_consent_version text;
  v_number text;
  v_attempt int;
  v_res record;
begin
  p_payload := coalesce(p_payload, '{}'::jsonb);

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  v_store_text := nullif(btrim(p_payload ->> 'store_id'), '');
  v_room_text := nullif(btrim(p_payload ->> 'room_id'), '');
  if v_store_text is null or v_store_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Valid hotel is required';
  end if;
  if v_room_text is null or v_room_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Valid room is required';
  end if;
  v_store_id := v_store_text::uuid;
  v_room_id := v_room_text::uuid;

  v_ci_text := nullif(btrim(p_payload ->> 'check_in'), '');
  v_co_text := nullif(btrim(p_payload ->> 'check_out'), '');
  if v_ci_text is null or v_ci_text !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Check-in date is required';
  end if;
  if v_co_text is null or v_co_text !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Check-out date is required';
  end if;
  v_check_in := v_ci_text::date;
  v_check_out := v_co_text::date;
  if v_check_in < current_date then
    raise exception 'Check-in date cannot be in the past';
  end if;
  if v_check_out <= v_check_in then
    raise exception 'Check-out must be after check-in';
  end if;
  v_nights := v_check_out - v_check_in;

  v_adults := case
    when coalesce(p_payload ->> 'adults', '') ~ '^\d+$'
      then least(greatest((p_payload ->> 'adults')::int, 1), 16)
    else 1
  end;
  v_children := case
    when coalesce(p_payload ->> 'children', '') ~ '^\d+$'
      then least(greatest((p_payload ->> 'children')::int, 0), 16)
    else 0
  end;
  v_total_guests := v_adults + v_children;

  v_guest_name := left(nullif(btrim(p_payload ->> 'guest_name'), ''), 160);
  v_guest_phone := left(nullif(btrim(p_payload ->> 'guest_phone'), ''), 40);
  v_guest_email := left(nullif(btrim(p_payload ->> 'guest_email'), ''), 255);
  v_guest_country := left(nullif(btrim(p_payload ->> 'guest_country'), ''), 80);
  v_notes := left(nullif(btrim(p_payload ->> 'notes'), ''), 2000);
  v_source := left(coalesce(nullif(btrim(p_payload ->> 'source'), ''), 'zivo_app'), 64);

  if coalesce(length(v_guest_name), 0) < 2 then
    raise exception 'Guest name is required';
  end if;
  if length(pg_catalog.regexp_replace(coalesce(v_guest_phone, ''), '\D', '', 'g')) < 7 then
    raise exception 'Valid guest phone is required';
  end if;

  v_payment_method := lower(coalesce(nullif(btrim(p_payload ->> 'payment_method'), ''), 'cash'));
  if v_payment_method not in ('cash', 'card', 'pay_at_property', 'card_on_arrival', 'bank_transfer', 'khqr') then
    raise exception 'Unsupported payment method';
  end if;

  v_requested_status := lower(coalesce(nullif(btrim(p_payload ->> 'status'), ''), 'hold'));
  v_status := case
    when v_requested_status = 'confirmed' and v_payment_method in ('cash', 'pay_at_property') then 'confirmed'
    else 'hold'
  end;
  v_payment_status := case
    when v_payment_method in ('cash', 'pay_at_property') then 'pending_cash'
    when v_payment_method = 'bank_transfer' then 'pending_bank_transfer'
    else 'pending'
  end;
  v_payment_provider := case
    when v_payment_method in ('card', 'card_on_arrival') then 'stripe'
    when v_payment_method = 'khqr' then 'khqr'
    when v_payment_method = 'bank_transfer' then 'bank_transfer'
    else 'cash'
  end;

  select *
    into v_room
  from public.lodge_rooms
  where id = v_room_id
    and store_id = v_store_id
    and coalesce(is_active, true) = true
  for update;

  if not found then
    raise exception 'Room is not available';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_room_id::text, 0));

  v_units_total := greatest(coalesce(v_room.units_total, 1), 1);
  if v_total_guests > greatest(coalesce(v_room.max_guests, 1), 1) then
    raise exception 'Guest count exceeds room capacity';
  end if;
  if v_nights < greatest(coalesce(v_room.min_stay, 1), 1) then
    raise exception 'Minimum stay is % night(s)', greatest(coalesce(v_room.min_stay, 1), 1);
  end if;
  if coalesce(v_room.max_stay, 0) > 0 and v_nights > v_room.max_stay then
    raise exception 'Maximum stay is % night(s)', v_room.max_stay;
  end if;
  if v_room.no_arrival_weekdays is not null
    and pg_catalog.array_position(v_room.no_arrival_weekdays, extract(dow from v_check_in)::int) is not null then
    raise exception 'This room cannot be booked to start on that weekday';
  end if;

  select count(*)::int
    into v_overlap_count
  from public.lodge_reservations r
  where r.room_id = v_room_id
    and r.status not in ('cancelled', 'no_show')
    and r.check_out > v_check_in
    and r.check_in < v_check_out;

  if v_overlap_count >= v_units_total then
    raise exception 'This room is no longer available for the selected dates';
  end if;

  select count(*)::int
    into v_block_count
  from public.lodge_room_blocks b
  where b.room_id = v_room_id
    and b.block_date >= v_check_in
    and b.block_date < v_check_out;

  if v_block_count > 0 then
    raise exception 'This room has blocked dates in the selected stay';
  end if;

  v_base_rate_cents := greatest(coalesce(v_room.base_rate_cents, 0), 0);
  v_weekend_rate_cents := greatest(coalesce(v_room.weekend_rate_cents, v_base_rate_cents), 0);
  if v_weekend_rate_cents = 0 then
    v_weekend_rate_cents := v_base_rate_cents;
  end if;

  for v_night in
    select d::date
    from pg_catalog.generate_series(v_check_in, v_check_out - 1, '1 day'::interval) as d
  loop
    if extract(dow from v_night)::int in (5, 6) then
      v_room_total_cents := v_room_total_cents + v_weekend_rate_cents;
      v_weekend_uplift_cents := v_weekend_uplift_cents + greatest(v_weekend_rate_cents - v_base_rate_cents, 0);
    else
      v_room_total_cents := v_room_total_cents + v_base_rate_cents;
    end if;
  end loop;

  if v_nights >= 28 and coalesce(v_room.monthly_discount_pct, 0) > 0 then
    v_discount_pct := v_room.monthly_discount_pct;
  elsif v_nights >= 7 and coalesce(v_room.weekly_discount_pct, 0) > 0 then
    v_discount_pct := v_room.weekly_discount_pct;
  end if;
  v_discount_pct := least(greatest(v_discount_pct, 0), 90);
  v_discount_cents := pg_catalog.round(v_room_total_cents * (v_discount_pct / 100.0))::int;
  v_room_after_discount_cents := greatest(v_room_total_cents - v_discount_cents, 0);

  v_requested_addons := case
    when pg_catalog.jsonb_typeof(p_payload -> 'addon_selections') = 'array' then p_payload -> 'addon_selections'
    when pg_catalog.jsonb_typeof(p_payload -> 'addons') = 'array' then p_payload -> 'addons'
    else '[]'::jsonb
  end;
  v_room_addons := case
    when pg_catalog.jsonb_typeof(v_room.addons) = 'array' then v_room.addons
    else '[]'::jsonb
  end;

  for v_addon_request in
    select value
    from pg_catalog.jsonb_array_elements(v_requested_addons)
  loop
    v_addon_def := null;
    select value
      into v_addon_def
    from pg_catalog.jsonb_array_elements(v_room_addons) as item(value)
    where (
        (v_addon_request ? 'id' and value ? 'id' and value ->> 'id' = v_addon_request ->> 'id')
        or (nullif(value ->> 'name', '') is not null and value ->> 'name' = v_addon_request ->> 'name')
      )
      and coalesce(nullif(value ->> 'active', '')::boolean, true) = true
      and coalesce(nullif(value ->> 'disabled', '')::boolean, false) = false
    limit 1;

    if v_addon_def is null then
      continue;
    end if;

    v_qty := case
      when coalesce(v_addon_request ->> 'qty', '') ~ '^\d+$' then (v_addon_request ->> 'qty')::int
      else 1
    end;
    v_max_qty := case
      when coalesce(v_addon_def ->> 'max_quantity', '') ~ '^\d+$' then greatest((v_addon_def ->> 'max_quantity')::int, 1)
      else 20
    end;
    v_qty := least(greatest(v_qty, 0), v_max_qty);
    if v_qty = 0 then
      continue;
    end if;

    if coalesce(v_addon_def ->> 'price_cents', '') !~ '^\d+$' then
      continue;
    end if;
    v_price_cents := greatest((v_addon_def ->> 'price_cents')::int, 0);
    v_per := coalesce(nullif(v_addon_def ->> 'per', ''), 'stay');
    if v_per not in ('stay', 'night', 'guest', 'person_night') then
      v_per := 'stay';
    end if;

    v_addon_units := case v_per
      when 'night' then v_qty * v_nights
      when 'guest' then v_qty * v_total_guests
      when 'person_night' then v_qty * v_total_guests * v_nights
      else v_qty
    end;
    v_addon_subtotal_cents := v_price_cents * v_addon_units;
    v_addons_total_cents := v_addons_total_cents + v_addon_subtotal_cents;
    v_addons_snapshot := v_addons_snapshot || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', v_addon_def ->> 'id',
        'name', v_addon_def ->> 'name',
        'price_cents', v_price_cents,
        'per', v_per,
        'qty', v_qty,
        'subtotal_cents', v_addon_subtotal_cents,
        'category', v_addon_def ->> 'category',
        'icon', v_addon_def ->> 'icon'
      )
    );
  end loop;

  v_extra_adult_fee_each := case
    when coalesce(v_room.child_policy ->> 'extra_adult_fee_cents', '') ~ '^\d+$'
      then greatest((v_room.child_policy ->> 'extra_adult_fee_cents')::int, 0)
    else 0
  end;
  v_extra_child_fee_each := case
    when coalesce(v_room.child_policy ->> 'extra_child_fee_cents', '') ~ '^\d+$'
      then greatest((v_room.child_policy ->> 'extra_child_fee_cents')::int, 0)
    else 0
  end;
  v_extra_adults := greatest(v_adults - 2, 0);
  v_extra_children := greatest(v_children, 0);
  v_extra_adult_fee_cents := v_extra_adult_fee_each * v_extra_adults * v_nights;
  v_extra_child_fee_cents := v_extra_child_fee_each * v_extra_children * v_nights;
  v_extra_guest_total_cents := v_extra_adult_fee_cents + v_extra_child_fee_cents;

  v_city_tax_each_cents := case
    when coalesce(v_room.fees ->> 'city_tax_cents', '') ~ '^\d+$' then greatest((v_room.fees ->> 'city_tax_cents')::int, 0)
    else 0
  end;
  v_resort_fee_each_cents := case
    when coalesce(v_room.fees ->> 'resort_fee_cents', '') ~ '^\d+$' then greatest((v_room.fees ->> 'resort_fee_cents')::int, 0)
    else 0
  end;
  v_cleaning_fee_cents := case
    when coalesce(v_room.fees ->> 'cleaning_fee_cents', '') ~ '^\d+$' then greatest((v_room.fees ->> 'cleaning_fee_cents')::int, 0)
    else 0
  end;
  v_service_charge_pct := case
    when coalesce(v_room.fees ->> 'service_charge_pct', '') ~ '^\d+(\.\d+)?$' then least(greatest((v_room.fees ->> 'service_charge_pct')::numeric, 0), 50)
    else 0
  end;
  v_vat_pct := case
    when coalesce(v_room.fees ->> 'vat_pct', '') ~ '^\d+(\.\d+)?$' then least(greatest((v_room.fees ->> 'vat_pct')::numeric, 0), 50)
    else 0
  end;
  v_deposit_cents := case
    when coalesce(v_room.child_policy ->> 'security_deposit_cents', '') ~ '^\d+$'
      then greatest((v_room.child_policy ->> 'security_deposit_cents')::int, 0)
    else 0
  end;

  v_city_tax_cents := v_city_tax_each_cents * v_total_guests * v_nights;
  v_resort_fee_cents := v_resort_fee_each_cents * v_nights;
  v_taxable_subtotal_cents := v_room_after_discount_cents
    + v_addons_total_cents
    + v_extra_guest_total_cents
    + v_resort_fee_cents
    + v_cleaning_fee_cents;
  v_service_charge_cents := pg_catalog.round(v_taxable_subtotal_cents * (v_service_charge_pct / 100.0))::int;
  v_vat_cents := pg_catalog.round((v_taxable_subtotal_cents + v_service_charge_cents) * (v_vat_pct / 100.0))::int;
  v_tax_cents := v_city_tax_cents + v_service_charge_cents + v_vat_cents;
  v_extras_cents := v_addons_total_cents + v_extra_guest_total_cents + v_resort_fee_cents + v_cleaning_fee_cents;
  v_total_cents := v_room_after_discount_cents + v_extras_cents + v_tax_cents;

  v_fee_breakdown := pg_catalog.jsonb_build_object(
    'city_tax_cents', v_city_tax_cents,
    'resort_fee_cents', v_resort_fee_cents,
    'cleaning_fee_cents', v_cleaning_fee_cents,
    'service_charge_cents', v_service_charge_cents,
    'vat_cents', v_vat_cents,
    'extra_adult_fee_cents', v_extra_adult_fee_cents,
    'extra_child_fee_cents', v_extra_child_fee_cents,
    'weekend_uplift_cents', v_weekend_uplift_cents,
    'discount_cents', v_discount_cents,
    'discount_pct', v_discount_pct,
    'addons_total_cents', v_addons_total_cents,
    'room_total_cents', v_room_total_cents,
    'room_after_discount_cents', v_room_after_discount_cents
  );

  v_guest_details := case
    when pg_catalog.jsonb_typeof(p_payload -> 'guest_details') = 'object' then p_payload -> 'guest_details'
    else '{}'::jsonb
  end;
  v_guest_details := v_guest_details || pg_catalog.jsonb_build_object(
    'name', v_guest_name,
    'phone', v_guest_phone,
    'email', v_guest_email,
    'country', v_guest_country,
    'notes', v_notes,
    'pay_method', v_payment_method
  );
  v_policy_consent := case
    when pg_catalog.jsonb_typeof(p_payload -> 'policy_consent') = 'object' then p_payload -> 'policy_consent'
    else null
  end;
  v_policy_consent_version := left(nullif(btrim(p_payload ->> 'policy_consent_version'), ''), 160);

  for v_attempt in 1..8 loop
    v_number := 'RES-' || lpad((pg_catalog.floor(pg_catalog.random() * 900000 + 100000)::int)::text, 6, '0');
    exit when not exists (
      select 1 from public.lodge_reservations
      where number = v_number
    );
  end loop;

  insert into public.lodge_reservations (
    store_id,
    room_id,
    guest_id,
    number,
    guest_name,
    guest_phone,
    guest_email,
    guest_country,
    adults,
    children,
    check_in,
    check_out,
    status,
    source,
    rate_cents,
    extras_cents,
    tax_cents,
    total_cents,
    paid_cents,
    payment_status,
    payment_provider,
    deposit_cents,
    addons,
    addon_selections,
    fee_breakdown,
    guest_details,
    notes,
    policy_consent,
    policy_consent_version
  )
  values (
    v_store_id,
    v_room_id,
    v_user_id,
    v_number,
    v_guest_name,
    v_guest_phone,
    v_guest_email,
    v_guest_country,
    v_adults,
    v_children,
    v_check_in,
    v_check_out,
    v_status,
    v_source,
    case when v_nights > 0 then pg_catalog.round(v_room_after_discount_cents::numeric / v_nights)::int else v_base_rate_cents end,
    v_extras_cents,
    v_tax_cents,
    v_total_cents,
    0,
    v_payment_status,
    v_payment_provider,
    v_deposit_cents,
    v_addons_snapshot,
    v_addons_snapshot,
    v_fee_breakdown,
    v_guest_details,
    v_notes,
    v_policy_consent,
    v_policy_consent_version
  )
  returning
    id,
    number,
    status,
    payment_status,
    payment_provider,
    rate_cents,
    extras_cents,
    tax_cents,
    total_cents,
    deposit_cents,
    check_in,
    check_out,
    nights
  into v_res;

  return pg_catalog.jsonb_build_object(
    'id', v_res.id,
    'number', v_res.number,
    'status', v_res.status,
    'payment_status', v_res.payment_status,
    'payment_provider', v_res.payment_provider,
    'rate_cents', v_res.rate_cents,
    'extras_cents', v_res.extras_cents,
    'tax_cents', v_res.tax_cents,
    'total_cents', v_res.total_cents,
    'deposit_cents', v_res.deposit_cents,
    'check_in', v_res.check_in,
    'check_out', v_res.check_out,
    'nights', v_res.nights
  );
end;
$$;

revoke all on function private.create_lodge_guest_reservation(jsonb)
  from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.create_lodge_guest_reservation(jsonb)
  to authenticated;

create or replace function public.create_lodge_guest_reservation(p_payload jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.create_lodge_guest_reservation(p_payload);
$$;

revoke all on function public.create_lodge_guest_reservation(jsonb)
  from public, anon;
grant execute on function public.create_lodge_guest_reservation(jsonb)
  to authenticated;

create table if not exists public.lodging_cutluy_payments (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  reservation_id uuid not null
    references public.lodge_reservations(id) on delete restrict,
  store_id uuid not null
    references public.store_profiles(id) on delete restrict,
  attempt_generation integer not null check (attempt_generation > 0),
  idempotency_scope text not null
    check (idempotency_scope ~ '^[A-Za-z0-9:_-]{1,160}$'),
  idempotency_key text not null unique
    check (idempotency_key ~ '^zl_[a-f0-9]{32}$'),
  cutluy_payment_id text unique
    check (
      cutluy_payment_id is null
      or cutluy_payment_id ~ '^[A-Za-z0-9_-]{16,128}$'
    ),
  reference_id text not null
    check (
      reference_id ~* '^zivo:lodging:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'pending'
    check (status in ('pending', 'scanned', 'paid', 'expired', 'failed')),
  creation_status text not null default 'creating'
    check (creation_status in ('creating', 'ready', 'retryable_error', 'terminal_error')),
  creation_lease_token text,
  creation_lease_expires_at timestamptz,
  provider_retry_after_at timestamptz,
  qr_string text
    check (
      qr_string is null
      or (
        pg_catalog.length(qr_string) between 12 and 1024
        and pg_catalog.left(qr_string, 6) = '000201'
        and qr_string !~ '[^ -~]'
      )
    ),
  checkout_url text
    check (
      checkout_url is null
      or checkout_url ~ '^https://cutluy[.]com/pay/[A-Za-z0-9_-]{16,128}$'
    ),
  provider_created_at timestamptz,
  expires_at timestamptz,
  approved_at timestamptz,
  reservation_paid_accounted_at timestamptz,
  reservation_paid_accounted_event_id uuid,
  reservation_paid_accounted_cents integer,
  ready_at timestamptz,
  fulfilled_at timestamptz,
  retired_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  manual_settlement_status text not null default 'not_applicable'
    check (
      manual_settlement_status in (
        'not_applicable',
        'manual_pending',
        'settled',
        'reconciliation_required',
        'external_refund_recorded'
      )
    ),
  manual_settlement_reviewed_at timestamptz,
  manual_settlement_reviewed_by uuid,
  manual_settlement_note text,
  manual_refund_required boolean not null default false,
  manual_refund_completed_at timestamptz,
  manual_refund_completed_by uuid,
  manual_refund_reference text,
  manual_refund_note text,
  manual_review_required boolean not null default false,
  manual_review_reason text,
  manual_reviewed_at timestamptz,
  manual_reviewed_by uuid,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (reservation_id, attempt_generation),
  check (
    (creation_status = 'creating'
      and creation_lease_token is not null
      and creation_lease_expires_at is not null)
    or (creation_status <> 'creating'
      and creation_lease_token is null
      and creation_lease_expires_at is null)
  ),
  check (
    provider_retry_after_at is null
    or creation_status = 'retryable_error'
  ),
  check (
    creation_status <> 'ready'
    or (
      cutluy_payment_id is not null
      and qr_string is not null
      and checkout_url is not null
      and ready_at is not null
    )
  ),
  check (fulfilled_at is null or status = 'paid'),
  check (
    (
      reservation_paid_accounted_at is null
      and reservation_paid_accounted_event_id is null
      and reservation_paid_accounted_cents is null
    )
    or (
      reservation_paid_accounted_at is not null
      and reservation_paid_accounted_event_id is not null
      and reservation_paid_accounted_cents is not null
      and reservation_paid_accounted_cents between 0 and amount_cents
      and status = 'paid'
    )
  ),
  check (
    fulfilled_at is null
    or (
      reservation_paid_accounted_cents is not null
      and reservation_paid_accounted_cents = amount_cents
    )
  ),
  check (not manual_refund_required or status = 'paid'),
  check (
    (
      manual_refund_completed_at is null
      and manual_refund_completed_by is null
      and manual_refund_reference is null
      and manual_refund_note is null
    )
    or (
      manual_refund_completed_at is not null
      and manual_refund_completed_by is not null
      and manual_refund_completed_by
        <> '00000000-0000-0000-0000-000000000000'::uuid
      and manual_refund_reference is not null
      and pg_catalog.length(pg_catalog.btrim(manual_refund_reference)) between 4 and 200
      and manual_refund_reference !~ '[[:cntrl:]]'
      and manual_refund_note is not null
      and pg_catalog.length(pg_catalog.btrim(manual_refund_note)) between 1 and 1000
      and status = 'paid'
      and not manual_refund_required
      and manual_settlement_status = 'external_refund_recorded'
    )
  ),
  check (
    cutluy_payment_id is null
    or checkout_url is null
    or checkout_url = 'https://cutluy.com/pay/' || cutluy_payment_id
  )
);

comment on table public.lodging_cutluy_payments is
  'Service-only CutLuy payment attempts. Amount/reference are copied from the locked lodging reservation; paid never regresses.';

comment on column public.lodging_cutluy_payments.manual_settlement_status is
  'Operational settlement review only. A paid KHQR is not represented as a Stripe payout or automatic store settlement.';

comment on column public.lodging_cutluy_payments.manual_refund_reference is
  'Operator-supplied evidence for a refund completed outside ZIVO. This is audit evidence only; no refund API is invoked by the database.';

comment on column public.lodging_cutluy_payments.reservation_paid_accounted_at is
  'One-time marker that this provider payment contributed reservation paid_cents. Duplicate completed event UUIDs for the same provider payment cannot contribute again.';

create unique index if not exists lodging_cutluy_one_active_attempt_uidx
  on public.lodging_cutluy_payments (reservation_id)
  where retired_at is null and status in ('pending', 'scanned');

create index if not exists lodging_cutluy_payments_reservation_created_idx
  on public.lodging_cutluy_payments (reservation_id, created_at desc);

create index if not exists lodging_cutluy_payments_store_status_idx
  on public.lodging_cutluy_payments (store_id, status, created_at desc);

create index if not exists lodging_cutluy_payments_manual_review_idx
  on public.lodging_cutluy_payments (created_at)
  where manual_review_required or manual_refund_required;

create index if not exists lodging_cutluy_payments_provider_retry_idx
  on public.lodging_cutluy_payments (provider_retry_after_at)
  where creation_status = 'retryable_error';

alter table public.lodge_reservations
  drop constraint if exists lodge_reservations_cutluy_payment_attempt_id_fkey;

alter table public.lodge_reservations
  add constraint lodge_reservations_cutluy_payment_attempt_id_fkey
  foreign key (cutluy_payment_attempt_id)
  references public.lodging_cutluy_payments(id)
  on delete set null
  not valid;

alter table public.lodge_reservations
  validate constraint lodge_reservations_cutluy_payment_attempt_id_fkey;

create index if not exists lodge_reservations_cutluy_payment_attempt_idx
  on public.lodge_reservations (cutluy_payment_attempt_id)
  where cutluy_payment_attempt_id is not null;

create index if not exists lodge_reservations_cutluy_payment_id_idx
  on public.lodge_reservations (cutluy_payment_id)
  where cutluy_payment_id is not null;

create table if not exists public.lodging_cutluy_webhook_events (
  event_id uuid primary key,
  event_fingerprint text not null unique
    check (event_fingerprint ~ '^[a-f0-9]{64}$'),
  cutluy_payment_id text not null
    check (cutluy_payment_id ~ '^[A-Za-z0-9_-]{16,128}$'),
  event_type text not null
    check (
      event_type in (
        'payment.completed',
        'payment.scanned',
        'payment.expired',
        'payment.failed'
      )
    ),
  payment_status text not null
    check (payment_status in ('scanned', 'paid', 'expired', 'failed')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency = 'USD'),
  reference_id text not null
    check (
      reference_id ~* '^zivo:lodging:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
  event_created_at timestamptz not null,
  received_at timestamptz not null default pg_catalog.now(),
  processing_status text not null default 'queued'
    check (
      processing_status in (
        'queued',
        'processing',
        'applied',
        'ignored',
        'manual_review',
        'error',
        'dead_letter'
      )
    ),
  lease_token text,
  lease_expires_at timestamptz,
  retry_count integer not null default 0 check (retry_count >= 0),
  next_attempt_at timestamptz not null default pg_catalog.now(),
  last_error text,
  processed_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (
    (event_type = 'payment.completed' and payment_status = 'paid')
    or (event_type = 'payment.scanned' and payment_status = 'scanned')
    or (event_type = 'payment.expired' and payment_status = 'expired')
    or (event_type = 'payment.failed' and payment_status = 'failed')
  ),
  check (
    (processing_status = 'processing'
      and lease_token is not null
      and lease_expires_at is not null)
    or (processing_status <> 'processing'
      and lease_token is null
      and lease_expires_at is null)
  )
);

comment on table public.lodging_cutluy_webhook_events is
  'Durable normalized CutLuy webhook inbox. Raw signatures and provider credentials are never stored.';

alter table public.lodging_cutluy_payments
  drop constraint if exists lodging_cutluy_payments_accounted_event_id_fkey;

alter table public.lodging_cutluy_payments
  add constraint lodging_cutluy_payments_accounted_event_id_fkey
  foreign key (reservation_paid_accounted_event_id)
  references public.lodging_cutluy_webhook_events(event_id)
  on delete restrict
  not valid;

alter table public.lodging_cutluy_payments
  validate constraint lodging_cutluy_payments_accounted_event_id_fkey;

create table if not exists public.lodging_cutluy_manual_actions (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  payment_attempt_id uuid
    references public.lodging_cutluy_payments(id) on delete restrict,
  webhook_event_id uuid
    references public.lodging_cutluy_webhook_events(event_id) on delete restrict,
  reservation_id uuid
    references public.lodge_reservations(id) on delete restrict,
  store_id uuid
    references public.store_profiles(id) on delete restrict,
  action text not null
    check (
      action in (
        'clear_terminal_nonpaid_review',
        'record_external_refund_completed'
      )
    ),
  reviewer_id uuid not null
    check (reviewer_id <> '00000000-0000-0000-0000-000000000000'::uuid),
  note text not null
    check (pg_catalog.length(pg_catalog.btrim(note)) between 1 and 1000),
  external_reference text,
  before_state jsonb not null
    check (pg_catalog.jsonb_typeof(before_state) = 'object'),
  after_state jsonb not null
    check (pg_catalog.jsonb_typeof(after_state) = 'object'),
  created_at timestamptz not null default pg_catalog.now(),
  check (payment_attempt_id is not null or webhook_event_id is not null),
  check (
    (
      action = 'clear_terminal_nonpaid_review'
      and external_reference is null
    )
    or (
      action = 'record_external_refund_completed'
      and external_reference is not null
      and pg_catalog.length(pg_catalog.btrim(external_reference)) between 4 and 200
      and external_reference !~ '[[:cntrl:]]'
    )
  )
);

comment on table public.lodging_cutluy_manual_actions is
  'Append-only service-role audit of explicit KHQR exception resolution. A refund action records operator-confirmed external evidence; it never sends money or changes booking/payment authority.';

create index if not exists lodging_cutluy_webhook_due_idx
  on public.lodging_cutluy_webhook_events (next_attempt_at, received_at)
  where processing_status in ('queued', 'error');

create index if not exists lodging_cutluy_webhook_stale_lease_idx
  on public.lodging_cutluy_webhook_events (lease_expires_at)
  where processing_status = 'processing';

create index if not exists lodging_cutluy_webhook_payment_idx
  on public.lodging_cutluy_webhook_events (cutluy_payment_id, event_created_at);

create index if not exists lodging_cutluy_manual_actions_reservation_idx
  on public.lodging_cutluy_manual_actions (reservation_id, created_at desc);

create index if not exists lodging_cutluy_manual_actions_reviewer_idx
  on public.lodging_cutluy_manual_actions (reviewer_id, created_at desc);

alter table public.lodging_cutluy_payments enable row level security;
alter table public.lodging_cutluy_webhook_events enable row level security;
alter table public.lodging_cutluy_manual_actions enable row level security;

revoke all on table public.lodging_cutluy_payments
  from public, anon, authenticated, service_role;
revoke all on table public.lodging_cutluy_webhook_events
  from public, anon, authenticated, service_role;
revoke all on table public.lodging_cutluy_manual_actions
  from public, anon, authenticated, service_role;

grant select on table public.lodging_cutluy_payments
  to service_role;
grant select on table public.lodging_cutluy_webhook_events
  to service_role;
grant select on table public.lodging_cutluy_manual_actions
  to service_role;

create or replace function private.reject_lodging_cutluy_manual_action_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  raise exception using
    errcode = '42501',
    message = 'lodging CutLuy manual-action audit is append-only';
end
$function$;

drop trigger if exists reject_lodging_cutluy_manual_action_mutation
  on public.lodging_cutluy_manual_actions;
create trigger reject_lodging_cutluy_manual_action_mutation
  before update or delete on public.lodging_cutluy_manual_actions
  for each row
  execute function private.reject_lodging_cutluy_manual_action_mutation();

create or replace function private.enforce_lodging_cutluy_payment_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.reservation_id is distinct from old.reservation_id
    or new.store_id is distinct from old.store_id
    or new.attempt_generation is distinct from old.attempt_generation
    or new.idempotency_scope is distinct from old.idempotency_scope
    or new.idempotency_key is distinct from old.idempotency_key
    or new.reference_id is distinct from old.reference_id
    or new.amount_cents is distinct from old.amount_cents
    or new.currency is distinct from old.currency
    or (
      old.cutluy_payment_id is not null
      and new.cutluy_payment_id is distinct from old.cutluy_payment_id
    )
    or (
      old.reservation_paid_accounted_at is not null
      and (
        new.reservation_paid_accounted_at
          is distinct from old.reservation_paid_accounted_at
        or new.reservation_paid_accounted_event_id
          is distinct from old.reservation_paid_accounted_event_id
        or new.reservation_paid_accounted_cents
          is distinct from old.reservation_paid_accounted_cents
      )
    ) then
    raise exception using errcode = '23514', message = 'immutable CutLuy payment identity changed';
  end if;

  if not (
    (old.status = 'pending' and new.status in ('pending', 'scanned', 'paid', 'expired', 'failed'))
    or (old.status = 'scanned' and new.status in ('scanned', 'paid', 'expired', 'failed'))
    or (old.status = 'expired' and new.status in ('expired', 'paid'))
    or (old.status = 'failed' and new.status in ('failed', 'paid'))
    or (old.status = 'paid' and new.status = 'paid')
  ) then
    raise exception using errcode = '23514', message = 'CutLuy payment status regression rejected';
  end if;

  return new;
end
$function$;

create or replace function private._apply_lodging_cutluy_webhook_core(
  p_event_id uuid,
  p_lease_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_lease_token text := pg_catalog.btrim(coalesce(p_lease_token, ''));
  v_event public.lodging_cutluy_webhook_events%rowtype;
  v_attempt public.lodging_cutluy_payments%rowtype;
  v_reservation public.lodge_reservations%rowtype;
  v_review_reason text;
  v_outstanding_cents integer;
  v_new_paid_cents integer;
  v_accounted_delta_cents integer;
  v_accounting_row_count integer := 0;
begin
  select event.*
    into v_event
  from public.lodging_cutluy_webhook_events as event
  where event.event_id = p_event_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('kind', 'missing', 'event_id', p_event_id);
  end if;

  if v_event.processing_status in (
    'applied',
    'ignored',
    'manual_review',
    'dead_letter'
  ) then
    return pg_catalog.jsonb_build_object(
      'kind', 'duplicate',
      'event_id', v_event.event_id,
      'processing_status', v_event.processing_status
    );
  end if;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.cutluy_payment_id = v_event.cutluy_payment_id;

  if not found then
    if v_event.processing_status = 'processing'
      and v_event.lease_token = v_lease_token
      and v_event.lease_expires_at > pg_catalog.now() then
      update public.lodging_cutluy_webhook_events
      set processing_status = 'manual_review',
          lease_token = null,
          lease_expires_at = null,
          last_error = 'payment_attempt_missing',
          processed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where event_id = v_event.event_id;
    end if;

    update public.lodge_reservations as reservation
    set cutluy_manual_review_required = true,
        cutluy_manual_refund_required = (
          reservation.cutluy_manual_refund_required
          or (
            v_event.event_type = 'payment.completed'
            and v_event.payment_status = 'paid'
          )
        ),
        cutluy_manual_review_reason = 'payment_attempt_missing',
        updated_at = pg_catalog.now()
    where reservation.id = pg_catalog.split_part(
      v_event.reference_id,
      ':',
      3
    )::uuid;

    return pg_catalog.jsonb_build_object(
      'kind', 'manual_review',
      'event_id', v_event.event_id,
      'fulfilled', false,
      'payment_id', v_event.cutluy_payment_id
    );
  end if;

  -- Webhook processors lock event -> reservation -> payment. Creation never
  -- waits on an event and keeps reservation -> payment, so the DB cron (which
  -- already owns its event leases) and Edge workers cannot form a lock cycle.
  select reservation.*
    into v_reservation
  from public.lodge_reservations as reservation
  where reservation.id = v_attempt.reservation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'lodging reservation not found';
  end if;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.id = v_attempt.id
  for update;

  if v_event.processing_status in (
    'applied',
    'ignored',
    'manual_review',
    'dead_letter'
  ) then
    return pg_catalog.jsonb_build_object(
      'kind', 'duplicate',
      'event_id', v_event.event_id,
      'processing_status', v_event.processing_status,
      'reservation_id', v_attempt.reservation_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'fulfilled', v_attempt.fulfilled_at is not null
    );
  end if;

  if v_event.processing_status <> 'processing'
    or v_event.lease_token is distinct from v_lease_token
    or v_event.lease_expires_at <= pg_catalog.now() then
    return pg_catalog.jsonb_build_object(
      'kind', 'missing',
      'event_id', v_event.event_id,
      'reason', 'lease_lost'
    );
  end if;

  if v_attempt.cutluy_payment_id is distinct from v_event.cutluy_payment_id
    or v_attempt.reference_id is distinct from v_event.reference_id
    or v_attempt.amount_cents is distinct from v_event.amount_cents
    or v_attempt.currency is distinct from v_event.currency
    or v_reservation.store_id is distinct from v_attempt.store_id then
    update public.lodging_cutluy_payments
    set status = case
          when v_event.event_type = 'payment.completed'
            and v_event.payment_status = 'paid' then 'paid'
          else status
        end,
        approved_at = case
          when v_event.event_type = 'payment.completed'
            and v_event.payment_status = 'paid' then
            coalesce(approved_at, v_event.event_created_at)
          else approved_at
        end,
        retired_at = case
          when v_event.event_type = 'payment.completed'
            and v_event.payment_status = 'paid' then
            coalesce(retired_at, pg_catalog.now())
          else retired_at
        end,
        manual_review_required = true,
        manual_refund_required = (
          manual_refund_required
          or (
            v_event.event_type = 'payment.completed'
            and v_event.payment_status = 'paid'
            and fulfilled_at is null
            and manual_refund_completed_at is null
          )
        ),
        manual_review_reason = 'payment_authority_mismatch',
        updated_at = pg_catalog.now()
    where id = v_attempt.id;

    update public.lodge_reservations
    set cutluy_manual_review_required = true,
        cutluy_manual_refund_required = (
          cutluy_manual_refund_required
          or (
            v_event.event_type = 'payment.completed'
            and v_event.payment_status = 'paid'
            and v_attempt.fulfilled_at is null
            and v_attempt.manual_refund_completed_at is null
          )
        ),
        cutluy_manual_review_reason = 'payment_authority_mismatch',
        updated_at = pg_catalog.now()
    where id = v_attempt.reservation_id;

    update public.lodging_cutluy_webhook_events
    set processing_status = 'manual_review',
        lease_token = null,
        lease_expires_at = null,
        last_error = 'payment_authority_mismatch',
        processed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where event_id = v_event.event_id;

    return pg_catalog.jsonb_build_object(
      'kind', 'manual_review',
      'event_id', v_event.event_id,
      'reservation_id', v_attempt.reservation_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'fulfilled', false
    );
  end if;

  -- A separately delivered completed event for the same provider payment is
  -- not a second refund obligation after an operator has recorded external
  -- refund completion. Persist it as ignored without reopening any authority.
  if v_event.event_type = 'payment.completed'
    and v_event.payment_status = 'paid'
    and v_attempt.manual_refund_completed_at is not null
    and v_attempt.manual_settlement_status = 'external_refund_recorded' then
    update public.lodging_cutluy_webhook_events
    set processing_status = 'ignored',
        lease_token = null,
        lease_expires_at = null,
        last_error = 'external_refund_already_recorded',
        processed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where event_id = v_event.event_id;

    return pg_catalog.jsonb_build_object(
      'kind', 'ignored',
      'event_id', v_event.event_id,
      'reservation_id', v_attempt.reservation_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'fulfilled', false,
      'external_refund_recorded', true
    );
  end if;

  if v_event.event_type = 'payment.completed'
    and v_event.payment_status = 'paid' then
    update public.lodging_cutluy_payments
    set status = 'paid',
        approved_at = coalesce(approved_at, v_event.event_created_at),
        retired_at = coalesce(retired_at, pg_catalog.now()),
        manual_settlement_status = case
          when manual_settlement_status = 'not_applicable' then 'manual_pending'
          else manual_settlement_status
        end,
        last_error_code = null,
        last_error_at = null,
        updated_at = pg_catalog.now()
    where id = v_attempt.id
    returning * into v_attempt;

    if v_attempt.fulfilled_at is not null then
      update public.lodging_cutluy_webhook_events
      set processing_status = 'applied',
          lease_token = null,
          lease_expires_at = null,
          processed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where event_id = v_event.event_id;

      return pg_catalog.jsonb_build_object(
        'kind', 'duplicate',
        'event_id', v_event.event_id,
        'reservation_id', v_attempt.reservation_id,
        'payment_id', v_attempt.cutluy_payment_id,
        'fulfilled', true
      );
    end if;

    v_outstanding_cents := coalesce(v_reservation.total_cents, 0)
      - coalesce(v_reservation.paid_cents, 0);

    if v_reservation.payment_status = 'paid'
      and v_reservation.cutluy_payment_id is distinct from v_attempt.cutluy_payment_id then
      v_review_reason := 'reservation_already_paid_by_another_attempt';
    elsif v_attempt.manual_review_required
      or v_attempt.manual_refund_required
      or v_reservation.cutluy_manual_review_required
      or v_reservation.cutluy_manual_refund_required then
      v_review_reason := coalesce(
        v_attempt.manual_review_reason,
        v_reservation.cutluy_manual_review_reason,
        'existing_manual_review_fence'
      );
    elsif v_reservation.status in ('cancelled', 'canceled', 'no_show') then
      v_review_reason := 'late_payment_for_inactive_reservation';
    elsif v_reservation.payment_provider is distinct from 'khqr'
      or v_reservation.store_id is distinct from v_attempt.store_id
      or v_reservation.status not in ('hold', 'pending', 'confirmed') then
      v_review_reason := 'reservation_state_conflict';
    elsif v_outstanding_cents is distinct from v_attempt.amount_cents then
      v_review_reason := 'reservation_balance_changed';
    end if;

    if v_review_reason is not null then
      update public.lodging_cutluy_payments
      set manual_refund_required = true,
          manual_review_required = true,
          manual_review_reason = v_review_reason,
          manual_settlement_status = 'reconciliation_required',
          updated_at = pg_catalog.now()
      where id = v_attempt.id;

      update public.lodge_reservations
      set cutluy_manual_review_required = true,
          cutluy_manual_refund_required = true,
          cutluy_manual_review_reason = v_review_reason,
          updated_at = pg_catalog.now()
      where id = v_reservation.id;

      if v_review_reason <> 'reservation_already_paid_by_another_attempt' then
        v_new_paid_cents := least(
          greatest(coalesce(v_reservation.total_cents, 0), 0),
          greatest(coalesce(v_reservation.paid_cents, 0), 0)
            + v_attempt.amount_cents
        );
        v_accounted_delta_cents := greatest(
          v_new_paid_cents - greatest(coalesce(v_reservation.paid_cents, 0), 0),
          0
        );

        update public.lodging_cutluy_payments
        set reservation_paid_accounted_at = pg_catalog.now(),
            reservation_paid_accounted_event_id = v_event.event_id,
            reservation_paid_accounted_cents = v_accounted_delta_cents,
            updated_at = pg_catalog.now()
        where id = v_attempt.id
          and reservation_paid_accounted_at is null;

        get diagnostics v_accounting_row_count = row_count;

        -- Money moved, so retain only the exact amount received without
        -- reopening the reservation or inflating it to a changed total. The
        -- provider-payment row is the one-time ledger fence, so another event
        -- UUID for this same CutLuy payment cannot add the amount again.
        if v_accounting_row_count = 1 then
          update public.lodge_reservations
          set paid_cents = v_new_paid_cents,
              payment_status = case
                when coalesce(total_cents, 0) > 0
                  and v_new_paid_cents >= total_cents then 'paid'
                else payment_status
              end,
              cutluy_payment_attempt_id = v_attempt.id,
              cutluy_payment_id = v_attempt.cutluy_payment_id,
              cutluy_payment_status = 'paid',
              cutluy_last_event_id = v_event.event_id,
              cutluy_last_event_type = v_event.event_type,
              cutluy_last_event_at = v_event.event_created_at,
              updated_at = pg_catalog.now()
          where id = v_reservation.id;
        end if;
      end if;

      update public.lodging_cutluy_webhook_events
      set processing_status = 'manual_review',
          lease_token = null,
          lease_expires_at = null,
          last_error = v_review_reason,
          processed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where event_id = v_event.event_id;

      return pg_catalog.jsonb_build_object(
        'kind', 'manual_review',
        'event_id', v_event.event_id,
        'reservation_id', v_attempt.reservation_id,
        'payment_id', v_attempt.cutluy_payment_id,
        'fulfilled', false
      );
    end if;

    update public.lodging_cutluy_payments
    set reservation_paid_accounted_at = pg_catalog.now(),
        reservation_paid_accounted_event_id = v_event.event_id,
        reservation_paid_accounted_cents = v_attempt.amount_cents,
        updated_at = pg_catalog.now()
    where id = v_attempt.id
      and reservation_paid_accounted_at is null;

    get diagnostics v_accounting_row_count = row_count;

    if v_accounting_row_count <> 1 then
      update public.lodging_cutluy_webhook_events
      set processing_status = 'ignored',
          lease_token = null,
          lease_expires_at = null,
          last_error = 'provider_payment_already_accounted',
          processed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where event_id = v_event.event_id;

      return pg_catalog.jsonb_build_object(
        'kind', 'ignored',
        'event_id', v_event.event_id,
        'reservation_id', v_attempt.reservation_id,
        'payment_id', v_attempt.cutluy_payment_id,
        'fulfilled', false,
        'payment_already_accounted', true
      );
    end if;

    update public.lodge_reservations
    set status = 'confirmed',
        paid_cents = coalesce(paid_cents, 0) + v_attempt.amount_cents,
        payment_status = 'paid',
        payment_provider = 'khqr',
        cutluy_payment_attempt_id = v_attempt.id,
        cutluy_payment_id = v_attempt.cutluy_payment_id,
        cutluy_payment_status = 'paid',
        cutluy_last_event_id = v_event.event_id,
        cutluy_last_event_type = v_event.event_type,
        cutluy_last_event_at = v_event.event_created_at,
        last_payment_error = null,
        updated_at = pg_catalog.now()
    where id = v_reservation.id;

    update public.lodging_cutluy_payments
    set fulfilled_at = coalesce(fulfilled_at, pg_catalog.now()),
        updated_at = pg_catalog.now()
    where id = v_attempt.id
    returning * into v_attempt;

    -- A late completion from an older attempt can race a newer QR. Retire the
    -- newer display attempt without lying about its provider status; if it is
    -- paid later, the exact same completed-only path flags a manual refund.
    update public.lodging_cutluy_payments
    set retired_at = coalesce(retired_at, pg_catalog.now()),
        manual_review_required = true,
        manual_review_reason = coalesce(
          manual_review_reason,
          'superseded_by_paid_attempt'
        ),
        updated_at = pg_catalog.now()
    where reservation_id = v_attempt.reservation_id
      and id <> v_attempt.id
      and retired_at is null
      and status in ('pending', 'scanned');

    update public.lodging_cutluy_webhook_events
    set processing_status = 'applied',
        lease_token = null,
        lease_expires_at = null,
        processed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where event_id = v_event.event_id;

    return pg_catalog.jsonb_build_object(
      'kind', 'applied',
      'event_id', v_event.event_id,
      'reservation_id', v_attempt.reservation_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'fulfilled', true
    );
  end if;

  if v_event.event_type = 'payment.scanned'
    and v_event.payment_status = 'scanned' then
    if v_attempt.status = 'paid' then
      update public.lodging_cutluy_webhook_events
      set processing_status = 'ignored',
          lease_token = null,
          lease_expires_at = null,
          processed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where event_id = v_event.event_id;

      return pg_catalog.jsonb_build_object(
        'kind', 'ignored',
        'event_id', v_event.event_id,
        'reservation_id', v_attempt.reservation_id,
        'payment_id', v_attempt.cutluy_payment_id,
        'fulfilled', true
      );
    end if;

    if v_attempt.status in ('pending', 'scanned') then
      update public.lodging_cutluy_payments
      set status = 'scanned',
          updated_at = pg_catalog.now()
      where id = v_attempt.id;

      update public.lodge_reservations
      set cutluy_payment_status = 'scanned',
          cutluy_last_event_id = v_event.event_id,
          cutluy_last_event_type = v_event.event_type,
          cutluy_last_event_at = v_event.event_created_at,
          updated_at = pg_catalog.now()
      where id = v_attempt.reservation_id
        and cutluy_payment_attempt_id = v_attempt.id
        and payment_status <> 'paid';
    end if;

    update public.lodging_cutluy_webhook_events
    set processing_status = case
          when v_attempt.status in ('pending', 'scanned') then 'applied'
          else 'ignored'
        end,
        lease_token = null,
        lease_expires_at = null,
        processed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where event_id = v_event.event_id;

    return pg_catalog.jsonb_build_object(
      'kind', case
        when v_attempt.status in ('pending', 'scanned') then 'applied'
        else 'ignored'
      end,
      'event_id', v_event.event_id,
      'reservation_id', v_attempt.reservation_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'fulfilled', false
    );
  end if;

  if v_event.event_type in ('payment.expired', 'payment.failed')
    and v_event.payment_status in ('expired', 'failed') then
    if v_attempt.status = 'paid' then
      update public.lodging_cutluy_webhook_events
      set processing_status = 'ignored',
          lease_token = null,
          lease_expires_at = null,
          processed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where event_id = v_event.event_id;

      return pg_catalog.jsonb_build_object(
        'kind', 'ignored',
        'event_id', v_event.event_id,
        'reservation_id', v_attempt.reservation_id,
        'payment_id', v_attempt.cutluy_payment_id,
        'fulfilled', true
      );
    end if;

    if v_attempt.status in ('expired', 'failed') then
      update public.lodging_cutluy_webhook_events
      set processing_status = 'ignored',
          lease_token = null,
          lease_expires_at = null,
          processed_at = pg_catalog.now(),
          updated_at = pg_catalog.now()
      where event_id = v_event.event_id;

      return pg_catalog.jsonb_build_object(
        'kind', 'ignored',
        'event_id', v_event.event_id,
        'reservation_id', v_attempt.reservation_id,
        'payment_id', v_attempt.cutluy_payment_id,
        'fulfilled', false
      );
    end if;

    update public.lodging_cutluy_payments
    set status = v_event.payment_status,
        retired_at = coalesce(retired_at, pg_catalog.now()),
        manual_review_required = case
          when manual_review_reason = 'provider_expiry_unknown_display_window_elapsed'
            and not manual_refund_required then false
          else manual_review_required
        end,
        manual_review_reason = case
          when manual_review_reason = 'provider_expiry_unknown_display_window_elapsed'
            and not manual_refund_required then null
          else manual_review_reason
        end,
        last_error_code = case
          when v_event.payment_status = 'failed' then 'payment_failed'
          when last_error_code = 'provider_expiry_unknown_display_window_elapsed' then null
          else last_error_code
        end,
        last_error_at = case
          when v_event.payment_status = 'failed' then pg_catalog.now()
          when last_error_code = 'provider_expiry_unknown_display_window_elapsed' then null
          else last_error_at
        end,
        updated_at = pg_catalog.now()
    where id = v_attempt.id;

    update public.lodge_reservations
    set cutluy_payment_status = v_event.payment_status,
        cutluy_last_event_id = v_event.event_id,
        cutluy_last_event_type = v_event.event_type,
        cutluy_last_event_at = v_event.event_created_at,
        cutluy_manual_review_required = case
          when cutluy_manual_review_reason = 'provider_expiry_unknown_display_window_elapsed'
            and not cutluy_manual_refund_required then false
          else cutluy_manual_review_required
        end,
        cutluy_manual_review_reason = case
          when cutluy_manual_review_reason = 'provider_expiry_unknown_display_window_elapsed'
            and not cutluy_manual_refund_required then null
          else cutluy_manual_review_reason
        end,
        last_payment_error = case
          when v_event.payment_status = 'failed' then 'payment_failed'
          when last_payment_error = 'provider_expiry_unknown_display_window_elapsed' then null
          else last_payment_error
        end,
        updated_at = pg_catalog.now()
    where id = v_attempt.reservation_id
      and cutluy_payment_attempt_id = v_attempt.id
      and payment_status <> 'paid';

    update public.lodging_cutluy_webhook_events
    set processing_status = 'applied',
        lease_token = null,
        lease_expires_at = null,
        processed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where event_id = v_event.event_id;

    return pg_catalog.jsonb_build_object(
      'kind', 'applied',
      'event_id', v_event.event_id,
      'reservation_id', v_attempt.reservation_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'fulfilled', false
    );
  end if;

  update public.lodging_cutluy_webhook_events
  set processing_status = 'manual_review',
      lease_token = null,
      lease_expires_at = null,
      last_error = 'unsupported_event_transition',
      processed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where event_id = v_event.event_id;

  update public.lodging_cutluy_payments
  set manual_review_required = true,
      manual_review_reason = 'unsupported_event_transition',
      updated_at = pg_catalog.now()
  where id = v_attempt.id;

  update public.lodge_reservations
  set cutluy_manual_review_required = true,
      cutluy_manual_review_reason = 'unsupported_event_transition',
      updated_at = pg_catalog.now()
  where id = v_attempt.reservation_id;

  return pg_catalog.jsonb_build_object(
    'kind', 'manual_review',
    'event_id', v_event.event_id,
    'reservation_id', v_attempt.reservation_id,
    'payment_id', v_attempt.cutluy_payment_id,
    'fulfilled', false
  );
end
$function$;

create or replace function private._apply_lodging_cutluy_webhook(
  p_event_id uuid,
  p_lease_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  return private._apply_lodging_cutluy_webhook_core(
    p_event_id,
    p_lease_token
  );
end
$function$;

create or replace function private._enqueue_lodging_cutluy_webhook(
  p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_event_id uuid;
  v_event_id_text text;
  v_event_type text;
  v_event_created_at timestamptz;
  v_fingerprint text;
  v_payment_id text;
  v_payment_status text;
  v_amount_text text;
  v_amount_numeric numeric;
  v_amount_cents integer;
  v_currency text;
  v_reference_id text;
  v_attempt public.lodging_cutluy_payments%rowtype;
  v_reservation public.lodge_reservations%rowtype;
  v_existing public.lodging_cutluy_webhook_events%rowtype;
  v_reservation_id uuid;
  v_inserted_count integer := 0;
  v_initial_status text := 'queued';
  v_mismatch boolean := false;
  v_refund_recorded boolean := false;
  v_payload jsonb;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  if pg_catalog.jsonb_typeof(p_event) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_event #> '{data,payment}') is distinct from 'object' then
    raise exception using errcode = '22023', message = 'invalid CutLuy event';
  end if;

  v_event_id_text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_event ->> 'id', '')));
  v_event_type := pg_catalog.lower(pg_catalog.btrim(coalesce(p_event ->> 'type', '')));
  v_fingerprint := pg_catalog.lower(pg_catalog.btrim(coalesce(p_event ->> 'fingerprint', '')));
  v_payment_id := pg_catalog.btrim(coalesce(p_event #>> '{data,payment,id}', ''));
  v_payment_status := pg_catalog.lower(pg_catalog.btrim(coalesce(p_event #>> '{data,payment,status}', '')));
  v_amount_text := pg_catalog.btrim(coalesce(p_event #>> '{data,payment,amount}', ''));
  v_currency := pg_catalog.upper(pg_catalog.btrim(coalesce(p_event #>> '{data,payment,currency}', '')));
  v_reference_id := pg_catalog.lower(pg_catalog.btrim(coalesce(p_event #>> '{data,payment,reference_id}', '')));

  if v_event_id_text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or v_event_type not in (
      'payment.completed',
      'payment.scanned',
      'payment.expired',
      'payment.failed'
    )
    or v_fingerprint !~ '^[a-f0-9]{64}$'
    or v_payment_id !~ '^[A-Za-z0-9_-]{16,128}$'
    or v_payment_status not in ('scanned', 'paid', 'expired', 'failed')
    or v_amount_text !~ '^[0-9]+([.][0-9]{1,2})?$'
    or v_currency <> 'USD'
    or v_reference_id !~ '^zivo:lodging:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception using errcode = '22023', message = 'invalid CutLuy event fields';
  end if;

  if not (
    (v_event_type = 'payment.completed' and v_payment_status = 'paid')
    or (v_event_type = 'payment.scanned' and v_payment_status = 'scanned')
    or (v_event_type = 'payment.expired' and v_payment_status = 'expired')
    or (v_event_type = 'payment.failed' and v_payment_status = 'failed')
  ) then
    raise exception using errcode = '22023', message = 'CutLuy event/status mismatch';
  end if;

  v_amount_numeric := v_amount_text::numeric * 100;
  if v_amount_numeric <> pg_catalog.trunc(v_amount_numeric)
    or v_amount_numeric < 1
    or v_amount_numeric > 2147483647 then
    raise exception using errcode = '22023', message = 'invalid CutLuy event amount';
  end if;
  v_amount_cents := v_amount_numeric::integer;

  v_event_id := v_event_id_text::uuid;
  if nullif(p_event ->> 'created', '') is null then
    raise exception using errcode = '22023', message = 'CutLuy event creation time required';
  end if;
  v_event_created_at := (p_event ->> 'created')::timestamptz;

  v_payload := pg_catalog.jsonb_build_object(
    'id', v_event_id,
    'type', v_event_type,
    'created', v_event_created_at,
    'data', pg_catalog.jsonb_build_object(
      'payment', pg_catalog.jsonb_build_object(
        'id', v_payment_id,
        'status', v_payment_status,
        'amount_cents', v_amount_cents,
        'currency', v_currency,
        'reference_id', v_reference_id
      )
    )
  );
  v_reservation_id := pg_catalog.split_part(v_reference_id, ':', 3)::uuid;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.cutluy_payment_id = v_payment_id;

  if not found then
    select exists (
      select 1
      from public.lodging_cutluy_manual_actions as action_row
      join public.lodging_cutluy_webhook_events as refunded_event
        on refunded_event.event_id = action_row.webhook_event_id
      where action_row.action = 'record_external_refund_completed'
        and refunded_event.cutluy_payment_id = v_payment_id
        and refunded_event.reference_id = v_reference_id
        and refunded_event.amount_cents = v_amount_cents
        and refunded_event.currency = v_currency
    ) into v_refund_recorded;

    -- A valid signed lodging event must remain durable even if creation did
    -- not finish storing the provider payment ID. Keep it out of automated
    -- fulfillment, dedupe it normally, and surface the referenced reservation
    -- for reconciliation instead of causing CutLuy to exhaust its retries.
    insert into public.lodging_cutluy_webhook_events (
      event_id,
      event_fingerprint,
      cutluy_payment_id,
      event_type,
      payment_status,
      amount_cents,
      currency,
      reference_id,
      event_created_at,
      processing_status,
      processed_at,
      last_error,
      payload
    ) values (
      v_event_id,
      v_fingerprint,
      v_payment_id,
      v_event_type,
      v_payment_status,
      v_amount_cents,
      v_currency,
      v_reference_id,
      v_event_created_at,
      case
        when v_refund_recorded
          and v_event_type = 'payment.completed'
          and v_payment_status = 'paid' then 'ignored'
        else 'manual_review'
      end,
      pg_catalog.now(),
      case
        when v_refund_recorded
          and v_event_type = 'payment.completed'
          and v_payment_status = 'paid' then 'external_refund_already_recorded'
        else 'payment_attempt_missing'
      end,
      v_payload
    )
    on conflict do nothing;

    get diagnostics v_inserted_count = row_count;

    if v_inserted_count = 0 then
      select event.*
        into v_existing
      from public.lodging_cutluy_webhook_events as event
      where event.event_id = v_event_id
        or event.event_fingerprint = v_fingerprint
      order by case when event.event_id = v_event_id then 0 else 1 end
      limit 1
      for update;

      if not found then
        raise exception using errcode = '40001', message = 'CutLuy event dedupe race';
      end if;

      if v_existing.event_id = v_event_id
        and v_existing.event_fingerprint = v_fingerprint
        and v_existing.cutluy_payment_id = v_payment_id
        and v_existing.event_type = v_event_type
        and v_existing.payment_status = v_payment_status
        and v_existing.amount_cents = v_amount_cents
        and v_existing.currency = v_currency
        and v_existing.reference_id = v_reference_id then
        return pg_catalog.jsonb_build_object(
          'kind', 'duplicate',
          'event_id', v_existing.event_id,
          'processing_status', v_existing.processing_status
        );
      end if;

      update public.lodging_cutluy_webhook_events
      set processing_status = 'manual_review',
          lease_token = null,
          lease_expires_at = null,
          last_error = 'event_identity_conflict',
          processed_at = coalesce(processed_at, pg_catalog.now()),
          updated_at = pg_catalog.now()
      where event_id = v_existing.event_id;

      update public.lodging_cutluy_payments
      set manual_review_required = true,
          manual_review_reason = 'event_identity_conflict',
          updated_at = pg_catalog.now()
      where cutluy_payment_id = v_existing.cutluy_payment_id;

      update public.lodge_reservations as reservation
      set cutluy_manual_review_required = true,
          cutluy_manual_refund_required = (
            reservation.cutluy_manual_refund_required
            or (
              v_event_type = 'payment.completed'
              and v_payment_status = 'paid'
              and not v_refund_recorded
            )
            or (
              v_existing.event_type = 'payment.completed'
              and v_existing.payment_status = 'paid'
              and (
                v_existing.cutluy_payment_id is distinct from v_payment_id
                or not v_refund_recorded
              )
            )
          ),
          cutluy_manual_review_reason = 'event_identity_conflict',
          updated_at = pg_catalog.now()
      where reservation.id = v_reservation_id
        or reservation.id in (
          select payment.reservation_id
          from public.lodging_cutluy_payments as payment
          where payment.cutluy_payment_id = v_existing.cutluy_payment_id
        );

      return pg_catalog.jsonb_build_object(
        'kind', 'manual_review',
        'event_id', v_existing.event_id,
        'processing_status', 'manual_review'
      );
    end if;

    update public.lodge_reservations as reservation
    set cutluy_manual_review_required = case
          when v_refund_recorded
            and v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then
            reservation.cutluy_manual_review_required
          else true
        end,
        cutluy_manual_refund_required = (
          reservation.cutluy_manual_refund_required
          or (
            v_event_type = 'payment.completed'
            and v_payment_status = 'paid'
            and not v_refund_recorded
          )
        ),
        cutluy_manual_review_reason = case
          when v_refund_recorded
            and v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then
            reservation.cutluy_manual_review_reason
          else 'payment_attempt_missing'
        end,
        updated_at = pg_catalog.now()
    where reservation.id = v_reservation_id;

    return pg_catalog.jsonb_build_object(
      'kind', case
        when v_refund_recorded
          and v_event_type = 'payment.completed'
          and v_payment_status = 'paid' then 'ignored'
        else 'manual_review'
      end,
      'event_id', v_event_id,
      'processing_status', case
        when v_refund_recorded
          and v_event_type = 'payment.completed'
          and v_payment_status = 'paid' then 'ignored'
        else 'manual_review'
      end
    );
  end if;

  select event.*
    into v_existing
  from public.lodging_cutluy_webhook_events as event
  where event.event_id = v_event_id
    or event.event_fingerprint = v_fingerprint
  order by case when event.event_id = v_event_id then 0 else 1 end
  limit 1
  for update;

  if found then
    if v_existing.event_id = v_event_id
      and v_existing.event_fingerprint = v_fingerprint
      and v_existing.cutluy_payment_id = v_payment_id
      and v_existing.event_type = v_event_type
      and v_existing.payment_status = v_payment_status
      and v_existing.amount_cents = v_amount_cents
      and v_existing.currency = v_currency
      and v_existing.reference_id = v_reference_id then
      return pg_catalog.jsonb_build_object(
        'kind', 'duplicate',
        'event_id', v_existing.event_id,
        'processing_status', v_existing.processing_status
      );
    end if;

    select reservation.*
      into v_reservation
    from public.lodge_reservations as reservation
    where reservation.id = v_attempt.reservation_id
    for update;

    select payment.*
      into v_attempt
    from public.lodging_cutluy_payments as payment
    where payment.id = v_attempt.id
    for update;

    update public.lodging_cutluy_webhook_events
    set processing_status = 'manual_review',
        lease_token = null,
        lease_expires_at = null,
        last_error = 'event_identity_conflict',
        processed_at = coalesce(processed_at, pg_catalog.now()),
        updated_at = pg_catalog.now()
    where event_id = v_existing.event_id;

    update public.lodging_cutluy_payments
    set status = case
          when v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then 'paid'
          else status
        end,
        approved_at = case
          when v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then
            coalesce(approved_at, v_event_created_at)
          else approved_at
        end,
        retired_at = case
          when v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then
            coalesce(retired_at, pg_catalog.now())
          else retired_at
        end,
        manual_refund_required = (
          manual_refund_required
          or (
            v_event_type = 'payment.completed'
            and v_payment_status = 'paid'
            and fulfilled_at is null
            and manual_refund_completed_at is null
          )
        ),
        manual_review_required = true,
        manual_review_reason = 'event_identity_conflict',
        updated_at = pg_catalog.now()
    where id = v_attempt.id;

    update public.lodge_reservations as reservation
    set cutluy_manual_review_required = true,
        cutluy_manual_refund_required = (
          reservation.cutluy_manual_refund_required
          or (
            v_event_type = 'payment.completed'
            and v_payment_status = 'paid'
            and v_attempt.fulfilled_at is null
            and v_attempt.manual_refund_completed_at is null
          )
          or (
            v_existing.event_type = 'payment.completed'
            and v_existing.payment_status = 'paid'
            and not exists (
              select 1
              from public.lodging_cutluy_payments as refunded_payment
              where refunded_payment.cutluy_payment_id = v_existing.cutluy_payment_id
                and refunded_payment.manual_refund_completed_at is not null
                and refunded_payment.manual_settlement_status = 'external_refund_recorded'
            )
          )
        ),
        cutluy_manual_review_reason = 'event_identity_conflict',
        updated_at = pg_catalog.now()
    where reservation.id = v_attempt.reservation_id
      or reservation.id in (
        select payment.reservation_id
        from public.lodging_cutluy_payments as payment
        where payment.cutluy_payment_id = v_existing.cutluy_payment_id
      );

    return pg_catalog.jsonb_build_object(
      'kind', 'manual_review',
      'event_id', v_existing.event_id,
      'processing_status', 'manual_review'
    );
  end if;

  select reservation.*
    into v_reservation
  from public.lodge_reservations as reservation
  where reservation.id = v_attempt.reservation_id
  for update;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.id = v_attempt.id
  for update;

  v_mismatch := v_attempt.reference_id is distinct from v_reference_id
    or v_attempt.amount_cents is distinct from v_amount_cents
    or v_attempt.currency is distinct from v_currency;
  if v_mismatch then
    v_initial_status := 'manual_review';
  elsif v_event_type = 'payment.completed'
    and v_payment_status = 'paid'
    and v_attempt.manual_refund_completed_at is not null
    and v_attempt.manual_settlement_status = 'external_refund_recorded' then
    v_initial_status := 'ignored';
  end if;

  insert into public.lodging_cutluy_webhook_events (
    event_id,
    event_fingerprint,
    cutluy_payment_id,
    event_type,
    payment_status,
    amount_cents,
    currency,
    reference_id,
    event_created_at,
    processing_status,
    processed_at,
    last_error,
    payload
  ) values (
    v_event_id,
    v_fingerprint,
    v_payment_id,
    v_event_type,
    v_payment_status,
    v_amount_cents,
    v_currency,
    v_reference_id,
    v_event_created_at,
    v_initial_status,
    case when v_initial_status in ('manual_review', 'ignored') then pg_catalog.now() else null end,
    case
      when v_mismatch then 'payment_authority_mismatch'
      when v_initial_status = 'ignored' then 'external_refund_already_recorded'
      else null
    end,
    v_payload
  )
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;
  if v_inserted_count = 0 then
    raise exception using
      errcode = '40001',
      message = 'CutLuy event enqueue race; retry required';
  end if;

  if v_initial_status = 'ignored' then
    return pg_catalog.jsonb_build_object(
      'kind', 'ignored',
      'event_id', v_event_id,
      'processing_status', 'ignored',
      'external_refund_recorded', true
    );
  end if;

  if v_mismatch then
    update public.lodging_cutluy_payments
    set status = case
          when v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then 'paid'
          else status
        end,
        approved_at = case
          when v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then
            coalesce(approved_at, v_event_created_at)
          else approved_at
        end,
        retired_at = case
          when v_event_type = 'payment.completed'
            and v_payment_status = 'paid' then
            coalesce(retired_at, pg_catalog.now())
          else retired_at
        end,
        manual_refund_required = (
          manual_refund_required
          or (
            v_event_type = 'payment.completed'
            and v_payment_status = 'paid'
            and fulfilled_at is null
            and manual_refund_completed_at is null
          )
        ),
        manual_review_required = true,
        manual_review_reason = 'payment_authority_mismatch',
        updated_at = pg_catalog.now()
    where id = v_attempt.id;

    update public.lodge_reservations as reservation
    set cutluy_manual_review_required = true,
        cutluy_manual_refund_required = (
          reservation.cutluy_manual_refund_required
          or (
            v_event_type = 'payment.completed'
            and v_payment_status = 'paid'
            and v_attempt.fulfilled_at is null
            and v_attempt.manual_refund_completed_at is null
          )
        ),
        cutluy_manual_review_reason = 'payment_authority_mismatch',
        updated_at = pg_catalog.now()
    where reservation.id = v_attempt.reservation_id;

    return pg_catalog.jsonb_build_object(
      'kind', 'manual_review',
      'event_id', v_event_id,
      'processing_status', 'manual_review'
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'kind', 'enqueued',
    'event_id', v_event_id,
    'processing_status', 'queued'
  );
end
$function$;

create or replace function private._lease_lodging_cutluy_webhook(
  p_event_id uuid,
  p_lease_token text,
  p_lease_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_lease_token text := pg_catalog.btrim(coalesce(p_lease_token, ''));
  v_lease_seconds integer := least(
    greatest(coalesce(p_lease_seconds, 30), 15),
    300
  );
  v_event public.lodging_cutluy_webhook_events%rowtype;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  if p_event_id is null or v_lease_token !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception using errcode = '22023', message = 'invalid webhook lease input';
  end if;

  select event.*
    into v_event
  from public.lodging_cutluy_webhook_events as event
  where event.event_id = p_event_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('kind', 'missing', 'event_id', p_event_id);
  end if;

  if v_event.processing_status in (
    'applied',
    'ignored',
    'manual_review',
    'dead_letter'
  ) then
    return pg_catalog.jsonb_build_object(
      'kind', 'done',
      'event_id', v_event.event_id,
      'processing_status', v_event.processing_status
    );
  end if;

  if v_event.processing_status = 'processing'
    and v_event.lease_expires_at > pg_catalog.now()
    and v_event.lease_token is distinct from v_lease_token then
    return pg_catalog.jsonb_build_object(
      'kind', 'busy',
      'event_id', v_event.event_id,
      'retry_after_seconds', greatest(
        1,
        pg_catalog.ceil(
          extract(epoch from (v_event.lease_expires_at - pg_catalog.now()))
        )::integer
      )
    );
  end if;

  if v_event.processing_status = 'error'
    and v_event.next_attempt_at > pg_catalog.now() then
    return pg_catalog.jsonb_build_object(
      'kind', 'busy',
      'event_id', v_event.event_id,
      'retry_after_seconds', greatest(
        1,
        pg_catalog.ceil(
          extract(epoch from (v_event.next_attempt_at - pg_catalog.now()))
        )::integer
      )
    );
  end if;

  update public.lodging_cutluy_webhook_events
  set processing_status = 'processing',
      lease_token = v_lease_token,
      lease_expires_at = pg_catalog.now()
        + pg_catalog.make_interval(secs => v_lease_seconds),
      retry_count = retry_count + 1,
      last_error = null,
      updated_at = pg_catalog.now()
  where event_id = v_event.event_id
  returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'kind', 'leased',
    'event_id', v_event.event_id,
    'event_type', v_event.event_type,
    'event_created_at', v_event.event_created_at,
    'payment_id', v_event.cutluy_payment_id,
    'payment_status', v_event.payment_status,
    'amount_cents', v_event.amount_cents,
    'currency', v_event.currency,
    'reference_id', v_event.reference_id,
    'retry_count', v_event.retry_count
  );
end
$function$;

create or replace function private._complete_lodging_cutluy_payment_creation(
  p_idempotency_key text,
  p_lease_token text,
  p_payment jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_idempotency_key text := pg_catalog.btrim(coalesce(p_idempotency_key, ''));
  v_lease_token text := pg_catalog.btrim(coalesce(p_lease_token, ''));
  v_attempt public.lodging_cutluy_payments%rowtype;
  v_reservation public.lodge_reservations%rowtype;
  v_payment_id text;
  v_status text;
  v_amount_cents integer;
  v_currency text;
  v_reference_id text;
  v_qr_string text;
  v_checkout_url text;
  v_provider_created_at timestamptz;
  v_expires_at timestamptz;
  v_approved_at timestamptz;
  v_outstanding_cents integer;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  if v_idempotency_key !~ '^zl_[a-f0-9]{32}$'
    or v_lease_token !~ '^[A-Za-z0-9_-]{16,128}$'
    or pg_catalog.jsonb_typeof(p_payment) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'invalid creation completion input';
  end if;

  v_payment_id := pg_catalog.btrim(coalesce(p_payment ->> 'id', ''));
  v_status := pg_catalog.lower(pg_catalog.btrim(coalesce(p_payment ->> 'status', '')));
  v_currency := pg_catalog.upper(pg_catalog.btrim(coalesce(p_payment ->> 'currency', '')));
  v_reference_id := pg_catalog.lower(pg_catalog.btrim(coalesce(p_payment ->> 'reference_id', '')));
  v_qr_string := nullif(p_payment ->> 'qr_string', '');
  v_checkout_url := nullif(pg_catalog.btrim(p_payment ->> 'checkout_url'), '');

  if pg_catalog.jsonb_typeof(p_payment -> 'amount_cents') is distinct from 'number'
    or (p_payment ->> 'amount_cents') !~ '^[0-9]+$'
    or (p_payment ->> 'amount_cents')::numeric > 2147483647 then
    raise exception using errcode = '22023', message = 'invalid CutLuy amount';
  end if;
  v_amount_cents := (p_payment ->> 'amount_cents')::integer;

  if v_payment_id !~ '^[A-Za-z0-9_-]{16,128}$'
    or v_status not in ('pending', 'scanned')
    or v_currency <> 'USD'
    or v_reference_id !~ '^zivo:lodging:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or v_amount_cents < 1
    or v_qr_string is null
    or pg_catalog.length(v_qr_string) not between 12 and 1024
    or pg_catalog.left(v_qr_string, 6) <> '000201'
    or v_qr_string ~ '[^ -~]'
    or v_checkout_url is distinct from ('https://cutluy.com/pay/' || v_payment_id) then
    raise exception using errcode = '22023', message = 'invalid CutLuy payment response';
  end if;

  if nullif(p_payment ->> 'created_at', '') is not null then
    v_provider_created_at := (p_payment ->> 'created_at')::timestamptz;
  end if;
  if nullif(p_payment ->> 'expires_at', '') is not null then
    v_expires_at := (p_payment ->> 'expires_at')::timestamptz;
  end if;
  if nullif(p_payment ->> 'approved_at', '') is not null then
    v_approved_at := (p_payment ->> 'approved_at')::timestamptz;
  end if;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.idempotency_key = v_idempotency_key;

  if not found then
    raise exception using errcode = 'P0002', message = 'CutLuy payment attempt not found';
  end if;

  select reservation.*
    into v_reservation
  from public.lodge_reservations as reservation
  where reservation.id = v_attempt.reservation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'lodging reservation not found';
  end if;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.idempotency_key = v_idempotency_key
  for update;

  if v_attempt.expires_at is not null
    and v_expires_at is not null
    and v_attempt.expires_at is distinct from v_expires_at then
    raise exception using errcode = '23505', message = 'CutLuy expiry response conflict';
  end if;
  v_expires_at := coalesce(v_attempt.expires_at, v_expires_at);

  if (
      v_attempt.cutluy_payment_id is not null
      and v_attempt.cutluy_payment_id is distinct from v_payment_id
    )
    or v_attempt.amount_cents is distinct from v_amount_cents
    or v_attempt.currency is distinct from v_currency
    or v_attempt.reference_id is distinct from v_reference_id then
    raise exception using errcode = '23514', message = 'CutLuy payment response does not match reservation';
  end if;

  -- A signed completed event may win the race with the create response. Keep
  -- the paid attempt and the reservation's canonical pointers untouched, and
  -- never return a checkout surface after money has already moved.
  if v_attempt.status = 'paid' or v_attempt.fulfilled_at is not null then
    return pg_catalog.jsonb_build_object(
      'action', 'already_paid',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_attempt.reservation_id,
      'store_id', v_attempt.store_id,
      'guest_id', v_reservation.guest_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'status', v_attempt.status,
      'amount_cents', v_attempt.amount_cents,
      'currency', v_attempt.currency,
      'reference_id', v_attempt.reference_id,
      'fulfilled', v_attempt.fulfilled_at is not null
    );
  end if;

  if v_attempt.status in ('expired', 'failed')
    or v_attempt.retired_at is not null then
    return pg_catalog.jsonb_build_object(
      'action', 'unavailable',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_attempt.reservation_id,
      'store_id', v_attempt.store_id,
      'guest_id', v_reservation.guest_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'status', v_attempt.status,
      'amount_cents', v_attempt.amount_cents,
      'currency', v_attempt.currency,
      'reference_id', v_attempt.reference_id
    );
  end if;

  if v_expires_at is not null
    and v_expires_at <= pg_catalog.now() then
    update public.lodging_cutluy_payments
    set cutluy_payment_id = coalesce(cutluy_payment_id, v_payment_id),
        status = 'expired',
        creation_status = 'terminal_error',
        creation_lease_token = null,
        creation_lease_expires_at = null,
        provider_retry_after_at = null,
        qr_string = coalesce(qr_string, v_qr_string),
        checkout_url = coalesce(checkout_url, v_checkout_url),
        provider_created_at = coalesce(provider_created_at, v_provider_created_at),
        expires_at = v_expires_at,
        approved_at = coalesce(approved_at, v_approved_at),
        retired_at = coalesce(retired_at, pg_catalog.now()),
        last_error_code = 'payment_expired_before_display',
        last_error_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.lodge_reservations
    set cutluy_payment_id = v_attempt.cutluy_payment_id,
        cutluy_payment_status = 'expired',
        last_payment_error = 'payment_expired_before_display',
        updated_at = pg_catalog.now()
    where id = v_attempt.reservation_id
      and cutluy_payment_attempt_id = v_attempt.id;

    return pg_catalog.jsonb_build_object(
      'action', 'unavailable',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_attempt.reservation_id,
      'store_id', v_attempt.store_id,
      'guest_id', v_reservation.guest_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'status', v_attempt.status,
      'amount_cents', v_attempt.amount_cents,
      'currency', v_attempt.currency,
      'reference_id', v_attempt.reference_id,
      'reason', 'payment_expired_before_display'
    );
  end if;

  if v_expires_at is null
    and v_attempt.created_at + pg_catalog.make_interval(mins => 4)
      <= pg_catalog.now() then
    -- The four-minute timestamp is only a local display deadline. It is not a
    -- provider expiry and cannot authorize a replacement QR. Keep this
    -- provider identity active and fenced until a signed expired/failed event
    -- (or an authorized review) proves it is safe to mint another attempt.
    update public.lodging_cutluy_payments
    set cutluy_payment_id = coalesce(cutluy_payment_id, v_payment_id),
        status = case
          when status = 'pending' and v_status = 'scanned' then 'scanned'
          else status
        end,
        creation_status = 'terminal_error',
        creation_lease_token = null,
        creation_lease_expires_at = null,
        provider_retry_after_at = null,
        qr_string = coalesce(qr_string, v_qr_string),
        checkout_url = coalesce(checkout_url, v_checkout_url),
        provider_created_at = coalesce(provider_created_at, v_provider_created_at),
        expires_at = null,
        approved_at = coalesce(approved_at, v_approved_at),
        manual_review_required = true,
        manual_review_reason = 'provider_expiry_unknown_display_window_elapsed',
        last_error_code = 'provider_expiry_unknown_display_window_elapsed',
        last_error_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.lodge_reservations
    set cutluy_payment_id = v_attempt.cutluy_payment_id,
        cutluy_payment_status = v_attempt.status,
        cutluy_manual_review_required = true,
        cutluy_manual_review_reason = 'provider_expiry_unknown_display_window_elapsed',
        last_payment_error = 'provider_expiry_unknown_display_window_elapsed',
        updated_at = pg_catalog.now()
    where id = v_attempt.reservation_id
      and cutluy_payment_attempt_id = v_attempt.id;

    return pg_catalog.jsonb_build_object(
      'action', 'unavailable',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_attempt.reservation_id,
      'store_id', v_attempt.store_id,
      'guest_id', v_reservation.guest_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'status', v_attempt.status,
      'amount_cents', v_attempt.amount_cents,
      'currency', v_attempt.currency,
      'reference_id', v_attempt.reference_id,
      'reason', 'provider_expiry_unknown_display_window_elapsed'
    );
  end if;

  if v_attempt.creation_status <> 'ready'
    and (
      v_attempt.creation_status <> 'creating'
      or v_attempt.creation_lease_token is distinct from v_lease_token
      or v_attempt.creation_lease_expires_at <= pg_catalog.now()
    ) then
    raise exception using errcode = '40001', message = 'CutLuy payment creation lease lost';
  end if;

  v_outstanding_cents := coalesce(v_reservation.total_cents, 0)
    - coalesce(v_reservation.paid_cents, 0);

  if v_reservation.payment_provider is distinct from 'khqr'
    or v_reservation.store_id is distinct from v_attempt.store_id
    or v_reservation.status is distinct from 'hold'
    or v_reservation.payment_status not in ('pending', 'processing', 'unpaid')
    or v_outstanding_cents is distinct from v_attempt.amount_cents
    or v_reservation.cutluy_manual_review_required
    or v_reservation.cutluy_manual_refund_required then
    -- The provider call already happened, so retain its identity for a future
    -- signed completed event. Retire it from checkout display and require
    -- manual review instead of returning a stale QR against changed authority.
    update public.lodging_cutluy_payments
    set cutluy_payment_id = coalesce(cutluy_payment_id, v_payment_id),
        status = case
          when status = 'pending' and v_status = 'scanned' then 'scanned'
          else status
        end,
        creation_status = 'terminal_error',
        creation_lease_token = null,
        creation_lease_expires_at = null,
        provider_retry_after_at = null,
        qr_string = coalesce(qr_string, v_qr_string),
        checkout_url = coalesce(checkout_url, v_checkout_url),
        provider_created_at = coalesce(provider_created_at, v_provider_created_at),
        expires_at = coalesce(expires_at, v_expires_at),
        approved_at = coalesce(approved_at, v_approved_at),
        retired_at = coalesce(retired_at, pg_catalog.now()),
        manual_review_required = true,
        manual_review_reason = 'reservation_changed_after_payment_creation',
        last_error_code = 'reservation_changed_after_payment_creation',
        last_error_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = v_attempt.id
    returning * into v_attempt;

    update public.lodge_reservations
    set cutluy_payment_attempt_id = null,
        cutluy_payment_id = null,
        cutluy_payment_status = 'failed',
        cutluy_manual_review_required = true,
        cutluy_manual_review_reason = 'reservation_changed_after_payment_creation',
        last_payment_error = 'reservation_changed_after_payment_creation',
        updated_at = pg_catalog.now()
    where id = v_reservation.id
      and cutluy_payment_attempt_id = v_attempt.id
      and (
        cutluy_payment_id is null
        or cutluy_payment_id = v_attempt.cutluy_payment_id
      );

    return pg_catalog.jsonb_build_object(
      'action', 'manual_review',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_attempt.reservation_id,
      'store_id', v_attempt.store_id,
      'guest_id', v_reservation.guest_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'reason', 'reservation_changed_after_payment_creation'
    );
  end if;

  if v_attempt.creation_status = 'ready' then
    if v_attempt.cutluy_payment_id is distinct from v_payment_id
      or v_attempt.amount_cents is distinct from v_amount_cents
      or v_attempt.currency is distinct from v_currency
      or v_attempt.reference_id is distinct from v_reference_id then
      raise exception using errcode = '23505', message = 'CutLuy idempotency response conflict';
    end if;

    return pg_catalog.jsonb_build_object(
      'action', 'ready',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_attempt.reservation_id,
      'store_id', v_attempt.store_id,
      'guest_id', v_reservation.guest_id,
      'payment_id', v_attempt.cutluy_payment_id,
      'status', v_attempt.status,
      'amount_cents', v_attempt.amount_cents,
      'currency', v_attempt.currency,
      'reference_id', v_attempt.reference_id,
      'qr_string', v_attempt.qr_string,
      'checkout_url', v_attempt.checkout_url,
      'expires_at', coalesce(
        v_attempt.expires_at,
        v_attempt.created_at + pg_catalog.make_interval(mins => 4)
      )
    );
  end if;

  update public.lodging_cutluy_payments
  set cutluy_payment_id = v_payment_id,
      status = v_status,
      creation_status = 'ready',
      creation_lease_token = null,
      creation_lease_expires_at = null,
      provider_retry_after_at = null,
      qr_string = v_qr_string,
      checkout_url = v_checkout_url,
      provider_created_at = v_provider_created_at,
      expires_at = v_expires_at,
      approved_at = v_approved_at,
      ready_at = coalesce(ready_at, pg_catalog.now()),
      last_error_code = null,
      last_error_at = null,
      updated_at = pg_catalog.now()
  where id = v_attempt.id
  returning * into v_attempt;

  update public.lodge_reservations
  set cutluy_payment_attempt_id = v_attempt.id,
      cutluy_payment_id = v_attempt.cutluy_payment_id,
      cutluy_payment_status = v_attempt.status,
      last_payment_error = null,
      updated_at = pg_catalog.now()
  where id = v_attempt.reservation_id
    and payment_provider = 'khqr'
    and status = 'hold'
    and payment_status in ('pending', 'processing', 'unpaid');

  return pg_catalog.jsonb_build_object(
    'action', 'ready',
    'payment_attempt_id', v_attempt.id,
    'idempotency_key', v_attempt.idempotency_key,
    'reservation_id', v_attempt.reservation_id,
    'store_id', v_attempt.store_id,
    'guest_id', v_reservation.guest_id,
    'payment_id', v_attempt.cutluy_payment_id,
    'status', v_attempt.status,
    'amount_cents', v_attempt.amount_cents,
    'currency', v_attempt.currency,
    'reference_id', v_attempt.reference_id,
    'qr_string', v_attempt.qr_string,
    'checkout_url', v_attempt.checkout_url,
    'expires_at', coalesce(
      v_attempt.expires_at,
      v_attempt.created_at + pg_catalog.make_interval(mins => 4)
    )
  );
end
$function$;

create or replace function private._fail_lodging_cutluy_payment_creation(
  p_idempotency_key text,
  p_lease_token text,
  p_error_code text,
  p_retryable boolean,
  p_retry_after_seconds integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_idempotency_key text := pg_catalog.btrim(coalesce(p_idempotency_key, ''));
  v_lease_token text := pg_catalog.btrim(coalesce(p_lease_token, ''));
  v_error_code text := pg_catalog.left(
    coalesce(nullif(pg_catalog.btrim(p_error_code), ''), 'provider_error'),
    160
  );
  v_retry_after_seconds integer := least(
    greatest(coalesce(p_retry_after_seconds, 30), 1),
    86400
  );
  v_attempt public.lodging_cutluy_payments%rowtype;
  v_reservation public.lodge_reservations%rowtype;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.idempotency_key = v_idempotency_key;

  if not found then
    return pg_catalog.jsonb_build_object('action', 'missing');
  end if;

  select reservation.*
    into v_reservation
  from public.lodge_reservations as reservation
  where reservation.id = v_attempt.reservation_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('action', 'missing');
  end if;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.idempotency_key = v_idempotency_key
  for update;

  if v_attempt.creation_status = 'ready' then
    return pg_catalog.jsonb_build_object(
      'action', 'ready',
      'payment_attempt_id', v_attempt.id,
      'payment_id', v_attempt.cutluy_payment_id
    );
  end if;

  if v_attempt.creation_status <> 'creating'
    or v_attempt.creation_lease_token is distinct from v_lease_token then
    return pg_catalog.jsonb_build_object('action', 'lease_lost');
  end if;

  if coalesce(p_retryable, false) then
    update public.lodging_cutluy_payments
    set creation_status = 'retryable_error',
        creation_lease_token = null,
        creation_lease_expires_at = null,
        provider_retry_after_at = pg_catalog.now()
          + pg_catalog.make_interval(secs => v_retry_after_seconds),
        last_error_code = v_error_code,
        last_error_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = v_attempt.id;

    update public.lodge_reservations
    set last_payment_error = v_error_code,
        updated_at = pg_catalog.now()
    where id = v_attempt.reservation_id
      and cutluy_payment_attempt_id = v_attempt.id;

    return pg_catalog.jsonb_build_object(
      'action', 'retryable',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'retry_after_seconds', v_retry_after_seconds
    );
  end if;

  update public.lodging_cutluy_payments
  set status = 'failed',
      creation_status = 'terminal_error',
      creation_lease_token = null,
      creation_lease_expires_at = null,
      provider_retry_after_at = null,
      retired_at = coalesce(retired_at, pg_catalog.now()),
      last_error_code = v_error_code,
      last_error_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where id = v_attempt.id;

  update public.lodge_reservations
  set cutluy_payment_status = 'failed',
      last_payment_error = v_error_code,
      updated_at = pg_catalog.now()
  where id = v_attempt.reservation_id
    and cutluy_payment_attempt_id = v_attempt.id;

  return pg_catalog.jsonb_build_object(
    'action', 'failed',
    'payment_attempt_id', v_attempt.id
  );
end
$function$;

drop trigger if exists enforce_lodging_cutluy_payment_transition
  on public.lodging_cutluy_payments;
create trigger enforce_lodging_cutluy_payment_transition
  before update on public.lodging_cutluy_payments
  for each row
  execute function private.enforce_lodging_cutluy_payment_transition();

create or replace function private.enforce_lodging_cutluy_event_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.event_id is distinct from old.event_id
    or new.event_fingerprint is distinct from old.event_fingerprint
    or new.cutluy_payment_id is distinct from old.cutluy_payment_id
    or new.event_type is distinct from old.event_type
    or new.payment_status is distinct from old.payment_status
    or new.amount_cents is distinct from old.amount_cents
    or new.currency is distinct from old.currency
    or new.reference_id is distinct from old.reference_id
    or new.event_created_at is distinct from old.event_created_at
    or new.payload is distinct from old.payload then
    raise exception using errcode = '23514', message = 'immutable CutLuy webhook identity changed';
  end if;

  return new;
end
$function$;

drop trigger if exists enforce_lodging_cutluy_event_identity
  on public.lodging_cutluy_webhook_events;
create trigger enforce_lodging_cutluy_event_identity
  before update on public.lodging_cutluy_webhook_events
  for each row
  execute function private.enforce_lodging_cutluy_event_identity();

create or replace function private.enforce_lodging_cutluy_reservation_authority()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_authority_change boolean := false;
begin
  if tg_op = 'INSERT' then
    if current_user in ('postgres', 'service_role')
      or v_actor_role = 'service_role' then
      return new;
    end if;

    -- Authenticated owner/admin ALL policies must not be a second KHQR
    -- creation path. Guest checkout uses the SECURITY DEFINER booking RPC;
    -- trusted server workflows run as postgres/service_role.
    if new.payment_provider = 'khqr' then
      raise exception using
        errcode = '42501',
        message = 'KHQR reservation creation is service-only';
    end if;

    return new;
  end if;

  v_authority_change := (
    new.payment_provider is distinct from old.payment_provider
    or new.store_id is distinct from old.store_id
    or new.total_cents is distinct from old.total_cents
    or new.payment_status is distinct from old.payment_status
    or new.paid_cents is distinct from old.paid_cents
    or (
      old.payment_status is distinct from 'paid'
      and new.status in ('confirmed', 'checked_in', 'checked_out')
      and old.status is distinct from new.status
    )
    or new.cutluy_payment_attempt_id is distinct from old.cutluy_payment_attempt_id
    or new.cutluy_payment_id is distinct from old.cutluy_payment_id
    or new.cutluy_payment_status is distinct from old.cutluy_payment_status
    or new.cutluy_last_event_id is distinct from old.cutluy_last_event_id
    or new.cutluy_last_event_type is distinct from old.cutluy_last_event_type
    or new.cutluy_last_event_at is distinct from old.cutluy_last_event_at
    or new.cutluy_manual_review_required is distinct from old.cutluy_manual_review_required
    or new.cutluy_manual_refund_required is distinct from old.cutluy_manual_refund_required
    or new.cutluy_manual_review_reason is distinct from old.cutluy_manual_review_reason
    or new.last_payment_error is distinct from old.last_payment_error
  );

  -- No automated refund exists. Any later cancellation of an already-paid
  -- KHQR stay is therefore a monotonic manual-refund obligation, regardless
  -- of whether the transition came from a client or a privileged server path.
  if old.payment_provider = 'khqr'
    and old.payment_status = 'paid'
    and new.status in ('cancelled', 'canceled', 'no_show')
    and old.status is distinct from new.status then
    new.cutluy_manual_review_required := true;
    new.cutluy_manual_refund_required := true;
    new.cutluy_manual_review_reason := 'paid_khqr_reservation_cancelled';
  end if;

  if current_user in ('postgres', 'service_role')
    or v_actor_role = 'service_role' then
    return new;
  end if;

  if (old.payment_provider = 'khqr' or new.payment_provider = 'khqr')
    and v_authority_change then
    raise exception using
      errcode = '42501',
      message = 'KHQR reservation payment authority is service-only';
  end if;

  return new;
end
$function$;

drop trigger if exists enforce_lodging_cutluy_reservation_authority
  on public.lodge_reservations;
create trigger enforce_lodging_cutluy_reservation_authority
  before insert or update on public.lodge_reservations
  for each row
  execute function private.enforce_lodging_cutluy_reservation_authority();

create or replace function private._claim_lodging_cutluy_payment(
  p_reservation_id uuid,
  p_idempotency_key text,
  p_lease_token text,
  p_lease_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_scope text := pg_catalog.btrim(coalesce(p_idempotency_key, ''));
  v_lease_token text := pg_catalog.btrim(coalesce(p_lease_token, ''));
  v_lease_seconds integer := least(
    greatest(coalesce(p_lease_seconds, 30), 15),
    120
  );
  v_reservation public.lodge_reservations%rowtype;
  v_attempt public.lodging_cutluy_payments%rowtype;
  v_attempt_id uuid;
  v_generation integer;
  v_amount_cents integer;
  v_expected_reference text;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  if p_reservation_id is null then
    raise exception using errcode = '22023', message = 'reservation id required';
  end if;

  if v_scope !~ '^[A-Za-z0-9:_-]{1,160}$' then
    raise exception using errcode = '22023', message = 'invalid idempotency scope';
  end if;

  if v_lease_token !~ '^[A-Za-z0-9_-]{16,128}$' then
    raise exception using errcode = '22023', message = 'invalid lease token';
  end if;

  select reservation.*
    into v_reservation
  from public.lodge_reservations as reservation
  where reservation.id = p_reservation_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'lodging reservation not found';
  end if;

  if v_reservation.payment_provider is distinct from 'khqr'
    or v_reservation.status is distinct from 'hold'
    or v_reservation.payment_status not in ('pending', 'processing', 'unpaid') then
    raise exception using errcode = '22023', message = 'reservation is not awaiting KHQR payment';
  end if;

  v_amount_cents := coalesce(v_reservation.total_cents, 0)
    - coalesce(v_reservation.paid_cents, 0);
  if v_amount_cents < 1 then
    raise exception using errcode = '22023', message = 'reservation has no payable USD balance';
  end if;
  v_expected_reference := 'zivo:lodging:'
    || pg_catalog.lower(v_reservation.id::text);

  -- Once a setup/payment anomaly is visible on the reservation, do not mint a
  -- second provider payment behind that review state. An operator must resolve
  -- and clear the service-owned flags first; a late signed paid event remains
  -- able to reassert the monotonic refund obligation.
  if v_reservation.cutluy_manual_review_required then
    select payment.*
      into v_attempt
    from public.lodging_cutluy_payments as payment
    where payment.reservation_id = v_reservation.id
    order by payment.attempt_generation desc
    limit 1
    for update;

    if not found then
      raise exception using
        errcode = '22023',
        message = 'KHQR reservation requires manual review';
    end if;

    return pg_catalog.jsonb_build_object(
      'action', 'busy',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_reservation.id,
      'store_id', v_reservation.store_id,
      'guest_id', v_reservation.guest_id,
      'amount_cents', v_amount_cents,
      'currency', 'USD',
      'reference_id', v_expected_reference,
      'retry_after_seconds', 300,
      'reason', coalesce(
        v_reservation.cutluy_manual_review_reason,
        'manual_review_required'
      )
    );
  end if;

  select payment.*
    into v_attempt
  from public.lodging_cutluy_payments as payment
  where payment.reservation_id = v_reservation.id
    and payment.retired_at is null
    and payment.status in ('pending', 'scanned')
  order by payment.attempt_generation desc
  limit 1
  for update;

  if found then
    if v_attempt.creation_status = 'ready'
      and v_attempt.cutluy_payment_id is not null
      and v_attempt.expires_at is not null
      and v_attempt.expires_at <= pg_catalog.now() then
      update public.lodging_cutluy_payments
      set status = 'expired',
          creation_status = case
            when creation_status in ('creating', 'retryable_error') then 'terminal_error'
            else creation_status
          end,
          creation_lease_token = null,
          creation_lease_expires_at = null,
          provider_retry_after_at = null,
          retired_at = coalesce(retired_at, pg_catalog.now()),
          last_error_code = coalesce(last_error_code, 'payment_expired'),
          last_error_at = coalesce(last_error_at, pg_catalog.now()),
          updated_at = pg_catalog.now()
      where id = v_attempt.id;

      update public.lodge_reservations
      set cutluy_payment_status = 'expired',
          updated_at = pg_catalog.now()
      where id = v_reservation.id
        and cutluy_payment_attempt_id = v_attempt.id;

      v_attempt.id := null;
    end if;
  end if;

  if v_attempt.id is not null
    and v_attempt.creation_status = 'ready'
    and v_attempt.cutluy_payment_id is not null
    and v_attempt.expires_at is null
    and v_attempt.created_at + pg_catalog.make_interval(mins => 4)
      <= pg_catalog.now() then
    update public.lodging_cutluy_payments
    set creation_status = 'terminal_error',
        creation_lease_token = null,
        creation_lease_expires_at = null,
        provider_retry_after_at = null,
        manual_review_required = true,
        manual_review_reason = 'provider_expiry_unknown_display_window_elapsed',
        last_error_code = 'provider_expiry_unknown_display_window_elapsed',
        last_error_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = v_attempt.id;

    update public.lodge_reservations
    set cutluy_manual_review_required = true,
        cutluy_manual_review_reason = 'provider_expiry_unknown_display_window_elapsed',
        last_payment_error = 'provider_expiry_unknown_display_window_elapsed',
        updated_at = pg_catalog.now()
    where id = v_reservation.id;

    return pg_catalog.jsonb_build_object(
      'action', 'busy',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_reservation.id,
      'store_id', v_reservation.store_id,
      'guest_id', v_reservation.guest_id,
      'amount_cents', v_amount_cents,
      'currency', 'USD',
      'reference_id', v_expected_reference,
      'retry_after_seconds', 300,
      'reason', 'provider_expiry_unknown_display_window_elapsed'
    );
  end if;

  if v_attempt.id is not null
    and (
      v_attempt.store_id is distinct from v_reservation.store_id
      or v_attempt.amount_cents is distinct from v_amount_cents
      or v_attempt.currency is distinct from 'USD'
      or v_attempt.reference_id is distinct from v_expected_reference
      or v_attempt.idempotency_scope is distinct from v_scope
    ) then
    -- Never return or reacquire a provider payment created for superseded
    -- reservation authority. Retire this generation and require an authorized
    -- review before any later claim can create another provider payment.
    update public.lodging_cutluy_payments
    set creation_status = 'terminal_error',
        creation_lease_token = null,
        creation_lease_expires_at = null,
        provider_retry_after_at = null,
        retired_at = coalesce(retired_at, pg_catalog.now()),
        manual_review_required = true,
        manual_review_reason = 'active_payment_authority_changed',
        last_error_code = 'active_payment_authority_changed',
        last_error_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = v_attempt.id;

    update public.lodge_reservations
    set cutluy_payment_attempt_id = case
          when cutluy_payment_attempt_id = v_attempt.id then null
          else cutluy_payment_attempt_id
        end,
        cutluy_payment_id = case
          when cutluy_payment_attempt_id = v_attempt.id then null
          else cutluy_payment_id
        end,
        cutluy_payment_status = case
          when cutluy_payment_attempt_id = v_attempt.id then null
          else cutluy_payment_status
        end,
        cutluy_manual_review_required = true,
        cutluy_manual_review_reason = 'active_payment_authority_changed',
        last_payment_error = 'active_payment_authority_changed',
        updated_at = pg_catalog.now()
    where id = v_reservation.id;

    return pg_catalog.jsonb_build_object(
      'action', 'busy',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_reservation.id,
      'store_id', v_reservation.store_id,
      'guest_id', v_reservation.guest_id,
      'amount_cents', v_amount_cents,
      'currency', 'USD',
      'reference_id', v_expected_reference,
      'retry_after_seconds', 1,
      'reason', 'active_payment_authority_changed'
    );
  end if;

  if v_attempt.id is not null then
    if v_attempt.creation_status = 'ready'
      and v_attempt.cutluy_payment_id is not null then
      return pg_catalog.jsonb_build_object(
        'action', 'ready',
        'payment_attempt_id', v_attempt.id,
        'idempotency_key', v_attempt.idempotency_key,
        'reservation_id', v_reservation.id,
        'store_id', v_reservation.store_id,
        'guest_id', v_reservation.guest_id,
        'amount_cents', v_attempt.amount_cents,
        'currency', v_attempt.currency,
        'reference_id', v_attempt.reference_id,
        'status', v_attempt.status,
        'payment_id', v_attempt.cutluy_payment_id,
        'qr_string', v_attempt.qr_string,
        'checkout_url', v_attempt.checkout_url,
        'expires_at', coalesce(
          v_attempt.expires_at,
          v_attempt.created_at + pg_catalog.make_interval(mins => 4)
        )
      );
    end if;

    if v_attempt.creation_status = 'retryable_error'
      and v_attempt.provider_retry_after_at > pg_catalog.now() then
      return pg_catalog.jsonb_build_object(
        'action', 'busy',
        'payment_attempt_id', v_attempt.id,
        'idempotency_key', v_attempt.idempotency_key,
        'reservation_id', v_reservation.id,
        'store_id', v_reservation.store_id,
        'guest_id', v_reservation.guest_id,
        'amount_cents', v_attempt.amount_cents,
        'currency', v_attempt.currency,
        'reference_id', v_attempt.reference_id,
        'retry_after_seconds', greatest(
          1,
          pg_catalog.ceil(
            extract(epoch from (
              v_attempt.provider_retry_after_at - pg_catalog.now()
            ))
          )::integer
        )
      );
    end if;

    if v_attempt.creation_status = 'creating'
      and v_attempt.creation_lease_expires_at > pg_catalog.now()
      and v_attempt.creation_lease_token is distinct from v_lease_token then
      return pg_catalog.jsonb_build_object(
        'action', 'busy',
        'payment_attempt_id', v_attempt.id,
        'idempotency_key', v_attempt.idempotency_key,
        'reservation_id', v_reservation.id,
        'store_id', v_reservation.store_id,
        'guest_id', v_reservation.guest_id,
        'amount_cents', v_attempt.amount_cents,
        'currency', v_attempt.currency,
        'reference_id', v_attempt.reference_id,
        'retry_after_seconds', greatest(
          1,
          pg_catalog.ceil(
            extract(epoch from (
              v_attempt.creation_lease_expires_at - pg_catalog.now()
            ))
          )::integer
        )
      );
    end if;

    update public.lodging_cutluy_payments
    set creation_status = 'creating',
        creation_lease_token = v_lease_token,
        creation_lease_expires_at = pg_catalog.now()
          + pg_catalog.make_interval(secs => v_lease_seconds),
        provider_retry_after_at = null,
        last_error_code = null,
        last_error_at = null,
        updated_at = pg_catalog.now()
    where id = v_attempt.id
    returning * into v_attempt;

    return pg_catalog.jsonb_build_object(
      'action', 'acquired',
      'payment_attempt_id', v_attempt.id,
      'idempotency_key', v_attempt.idempotency_key,
      'reservation_id', v_reservation.id,
      'store_id', v_reservation.store_id,
      'guest_id', v_reservation.guest_id,
      'amount_cents', v_attempt.amount_cents,
      'currency', v_attempt.currency,
      'reference_id', v_attempt.reference_id
    );
  end if;

  select coalesce(pg_catalog.max(payment.attempt_generation), 0) + 1
    into v_generation
  from public.lodging_cutluy_payments as payment
  where payment.reservation_id = v_reservation.id;

  v_attempt_id := pg_catalog.gen_random_uuid();

  insert into public.lodging_cutluy_payments (
    id,
    reservation_id,
    store_id,
    attempt_generation,
    idempotency_scope,
    idempotency_key,
    reference_id,
    amount_cents,
    currency,
    status,
    creation_status,
    creation_lease_token,
    creation_lease_expires_at
  ) values (
    v_attempt_id,
    v_reservation.id,
    v_reservation.store_id,
    v_generation,
    v_scope,
    'zl_' || pg_catalog.replace(v_attempt_id::text, '-', ''),
    v_expected_reference,
    v_amount_cents,
    'USD',
    'pending',
    'creating',
    v_lease_token,
    pg_catalog.now() + pg_catalog.make_interval(secs => v_lease_seconds)
  )
  returning * into v_attempt;

  update public.lodge_reservations
  set cutluy_payment_attempt_id = v_attempt.id,
      cutluy_payment_id = null,
      cutluy_payment_status = 'pending',
      last_payment_error = null,
      updated_at = pg_catalog.now()
  where id = v_reservation.id;

  return pg_catalog.jsonb_build_object(
    'action', 'acquired',
    'payment_attempt_id', v_attempt.id,
    'idempotency_key', v_attempt.idempotency_key,
    'reservation_id', v_reservation.id,
    'store_id', v_reservation.store_id,
    'guest_id', v_reservation.guest_id,
    'amount_cents', v_attempt.amount_cents,
    'currency', v_attempt.currency,
    'reference_id', v_attempt.reference_id
  );
end
$function$;

create or replace function private._fail_lodging_cutluy_webhook(
  p_event_id uuid,
  p_lease_token text,
  p_error text,
  p_retryable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_lease_token text := pg_catalog.btrim(coalesce(p_lease_token, ''));
  v_error text := pg_catalog.left(
    coalesce(nullif(pg_catalog.btrim(p_error), ''), 'processing_error'),
    500
  );
  v_event public.lodging_cutluy_webhook_events%rowtype;
  v_delay_seconds integer;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  select event.*
    into v_event
  from public.lodging_cutluy_webhook_events as event
  where event.event_id = p_event_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object('kind', 'missing', 'event_id', p_event_id);
  end if;

  if v_event.processing_status in (
    'applied',
    'ignored',
    'manual_review',
    'dead_letter'
  ) then
    return pg_catalog.jsonb_build_object(
      'kind', 'done',
      'event_id', v_event.event_id,
      'processing_status', v_event.processing_status,
      'retry_count', v_event.retry_count
    );
  end if;

  if v_event.processing_status <> 'processing'
    or v_event.lease_token is distinct from v_lease_token then
    return pg_catalog.jsonb_build_object(
      'kind', 'missing',
      'event_id', v_event.event_id,
      'reason', 'lease_lost'
    );
  end if;

  if v_event.event_type = 'payment.completed'
    and v_event.payment_status = 'paid'
    and exists (
      select 1
      from public.lodging_cutluy_payments as payment
      where payment.cutluy_payment_id = v_event.cutluy_payment_id
        and payment.reference_id = v_event.reference_id
        and payment.amount_cents = v_event.amount_cents
        and payment.currency = v_event.currency
        and payment.manual_refund_completed_at is not null
        and payment.manual_settlement_status = 'external_refund_recorded'
    ) then
    update public.lodging_cutluy_webhook_events
    set processing_status = 'ignored',
        lease_token = null,
        lease_expires_at = null,
        last_error = 'external_refund_already_recorded',
        processed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where event_id = v_event.event_id;

    return pg_catalog.jsonb_build_object(
      'kind', 'done',
      'event_id', v_event.event_id,
      'processing_status', 'ignored',
      'external_refund_recorded', true
    );
  end if;

  if coalesce(p_retryable, false) and v_event.retry_count < 8 then
    v_delay_seconds := least(
      300,
      5 * pg_catalog.power(2, greatest(v_event.retry_count - 1, 0))::integer
    );

    update public.lodging_cutluy_webhook_events
    set processing_status = 'error',
        lease_token = null,
        lease_expires_at = null,
        next_attempt_at = pg_catalog.now()
          + pg_catalog.make_interval(secs => v_delay_seconds),
        last_error = v_error,
        updated_at = pg_catalog.now()
    where event_id = v_event.event_id;

    return pg_catalog.jsonb_build_object(
      'kind', 'queued',
      'event_id', v_event.event_id,
      'retry_count', v_event.retry_count,
      'retry_after_seconds', v_delay_seconds
    );
  end if;

  update public.lodging_cutluy_webhook_events
  set processing_status = 'dead_letter',
      lease_token = null,
      lease_expires_at = null,
      last_error = v_error,
      processed_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  where event_id = v_event.event_id;

  update public.lodging_cutluy_payments
  set status = case
        when v_event.event_type = 'payment.completed'
          and v_event.payment_status = 'paid' then 'paid'
        else status
      end,
      approved_at = case
        when v_event.event_type = 'payment.completed'
          and v_event.payment_status = 'paid' then
          coalesce(approved_at, v_event.event_created_at)
        else approved_at
      end,
      retired_at = case
        when v_event.event_type = 'payment.completed'
          and v_event.payment_status = 'paid' then
          coalesce(retired_at, pg_catalog.now())
        else retired_at
      end,
      manual_refund_required = (
        manual_refund_required
        or (
          v_event.event_type = 'payment.completed'
          and v_event.payment_status = 'paid'
          and fulfilled_at is null
          and manual_refund_completed_at is null
        )
      ),
      manual_review_required = true,
      manual_review_reason = 'webhook_processing_failed',
      updated_at = pg_catalog.now()
  where cutluy_payment_id = v_event.cutluy_payment_id;

  update public.lodge_reservations as reservation
  set cutluy_manual_review_required = true,
      cutluy_manual_refund_required = (
        reservation.cutluy_manual_refund_required
        or (
          v_event.event_type = 'payment.completed'
          and v_event.payment_status = 'paid'
          and payment.fulfilled_at is null
          and payment.manual_refund_completed_at is null
        )
      ),
      cutluy_manual_review_reason = 'webhook_processing_failed',
      updated_at = pg_catalog.now()
  from public.lodging_cutluy_payments as payment
  where payment.cutluy_payment_id = v_event.cutluy_payment_id
    and reservation.id = payment.reservation_id;

  return pg_catalog.jsonb_build_object(
    'kind', 'error',
    'event_id', v_event.event_id,
    'retry_count', v_event.retry_count
  );
end
$function$;

create or replace function private.reconcile_lodging_cutluy_webhook_events(
  p_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_limit integer := least(
    greatest(coalesce(p_limit, 25), 1),
    25
  );
  v_claim record;
  v_result jsonb;
  v_processed integer := 0;
  v_failed integer := 0;
  v_delay_seconds integer;
begin
  for v_claim in
    with candidates as (
      select event.event_id
      from public.lodging_cutluy_webhook_events as event
      where (
          event.processing_status in ('queued', 'error')
          and event.next_attempt_at <= pg_catalog.now()
        )
        or (
          event.processing_status = 'processing'
          and event.lease_expires_at <= pg_catalog.now()
      )
      order by event.next_attempt_at, event.received_at
      limit v_limit
      for update skip locked
    ), claimed as (
      update public.lodging_cutluy_webhook_events as event
      set processing_status = 'processing',
          lease_token = 'cron_' || pg_catalog.replace(
            pg_catalog.gen_random_uuid()::text,
            '-',
            ''
          ),
          lease_expires_at = pg_catalog.now()
            + pg_catalog.make_interval(secs => 50),
          retry_count = event.retry_count + 1,
          last_error = null,
          updated_at = pg_catalog.now()
      from candidates
      where event.event_id = candidates.event_id
      returning event.event_id, event.lease_token
    )
    select claimed.event_id, claimed.lease_token
    from claimed
  loop
    begin
      v_result := private._apply_lodging_cutluy_webhook_core(
        v_claim.event_id,
        v_claim.lease_token
      );
      v_processed := v_processed + 1;
    exception when others then
      select least(
        300,
        5 * pg_catalog.power(
          2,
          greatest(event.retry_count - 1, 0)
        )::integer
      )
        into v_delay_seconds
      from public.lodging_cutluy_webhook_events as event
      where event.event_id = v_claim.event_id;

      update public.lodging_cutluy_webhook_events as event
      set processing_status = case
            when event.retry_count < 8 then 'error'
            else 'dead_letter'
          end,
          lease_token = null,
          lease_expires_at = null,
          next_attempt_at = case
            when event.retry_count < 8 then pg_catalog.now()
              + pg_catalog.make_interval(secs => v_delay_seconds)
            else event.next_attempt_at
          end,
          last_error = pg_catalog.left(sqlerrm, 500),
          processed_at = case
            when event.retry_count < 8 then event.processed_at
            else pg_catalog.now()
          end,
          updated_at = pg_catalog.now()
      where event.event_id = v_claim.event_id
        and event.processing_status = 'processing'
        and event.lease_token = v_claim.lease_token;

      if exists (
        select 1
        from public.lodging_cutluy_webhook_events as event
        where event.event_id = v_claim.event_id
          and event.processing_status = 'dead_letter'
      ) then
        if exists (
          select 1
          from public.lodging_cutluy_webhook_events as event
          join public.lodging_cutluy_payments as payment
            on payment.cutluy_payment_id = event.cutluy_payment_id
          where event.event_id = v_claim.event_id
            and event.event_type = 'payment.completed'
            and event.payment_status = 'paid'
            and payment.reference_id = event.reference_id
            and payment.amount_cents = event.amount_cents
            and payment.currency = event.currency
            and payment.manual_refund_completed_at is not null
            and payment.manual_settlement_status = 'external_refund_recorded'
        ) then
          update public.lodging_cutluy_webhook_events
          set processing_status = 'ignored',
              last_error = 'external_refund_already_recorded',
              processed_at = pg_catalog.now(),
              updated_at = pg_catalog.now()
          where event_id = v_claim.event_id;
        else
          update public.lodging_cutluy_payments as payment
        set status = case
              when event.event_type = 'payment.completed'
                and event.payment_status = 'paid' then 'paid'
              else payment.status
            end,
            approved_at = case
              when event.event_type = 'payment.completed'
                and event.payment_status = 'paid' then
                coalesce(payment.approved_at, event.event_created_at)
              else payment.approved_at
            end,
            retired_at = case
              when event.event_type = 'payment.completed'
                and event.payment_status = 'paid' then
                coalesce(payment.retired_at, pg_catalog.now())
              else payment.retired_at
            end,
            manual_refund_required = (
              payment.manual_refund_required
              or (
                event.event_type = 'payment.completed'
                and event.payment_status = 'paid'
                and payment.fulfilled_at is null
                and payment.manual_refund_completed_at is null
              )
            ),
            manual_review_required = true,
            manual_review_reason = 'webhook_processing_failed',
            updated_at = pg_catalog.now()
        from public.lodging_cutluy_webhook_events as event
        where event.event_id = v_claim.event_id
          and payment.cutluy_payment_id = event.cutluy_payment_id;

          update public.lodge_reservations as reservation
        set cutluy_manual_review_required = true,
            cutluy_manual_refund_required = (
              reservation.cutluy_manual_refund_required
              or (
                event.event_type = 'payment.completed'
                and event.payment_status = 'paid'
                and payment.fulfilled_at is null
                and payment.manual_refund_completed_at is null
              )
            ),
            cutluy_manual_review_reason = 'webhook_processing_failed',
            updated_at = pg_catalog.now()
        from public.lodging_cutluy_webhook_events as event
        join public.lodging_cutluy_payments as payment
          on payment.cutluy_payment_id = event.cutluy_payment_id
          where event.event_id = v_claim.event_id
            and reservation.id = payment.reservation_id;
        end if;
      end if;

      v_failed := v_failed + 1;
    end;
  end loop;

  return pg_catalog.jsonb_build_object(
    'claimed', v_processed + v_failed,
    'processed', v_processed,
    'failed', v_failed
  );
end
$function$;

-- Manual-review runbook (service role only):
--   1. Call list_lodging_cutluy_manual_reviews() and investigate CutLuy/bank
--      evidence outside this database.
--   2. clear_terminal_nonpaid_review is permitted only when the provider
--      payment is expired/failed (or a signed orphan event says so), no active
--      attempt remains, and no completed/paid event exists for the reference.
--   3. record_external_refund_completed records an already-completed external
--      refund with a reviewer, note, and external reference. It does not call
--      CutLuy, move money, mark a payment paid, or confirm/reopen a reservation.
create or replace function private._resolve_lodging_cutluy_manual_review(
  p_payment_attempt_id uuid,
  p_event_id uuid,
  p_action text,
  p_reviewer_id uuid,
  p_note text,
  p_external_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_action text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_action, '')));
  v_note text := pg_catalog.btrim(coalesce(p_note, ''));
  v_external_reference text := nullif(
    pg_catalog.btrim(coalesce(p_external_reference, '')),
    ''
  );
  v_attempt public.lodging_cutluy_payments%rowtype;
  v_event public.lodging_cutluy_webhook_events%rowtype;
  v_reservation public.lodge_reservations%rowtype;
  v_existing_action public.lodging_cutluy_manual_actions%rowtype;
  v_reference_id text;
  v_reservation_id uuid;
  v_store_id uuid;
  v_payment_id text;
  v_has_attempt boolean := false;
  v_has_event boolean := false;
  v_has_reservation boolean := false;
  v_active_attempt_exists boolean := false;
  v_paid_attempt_exists boolean := false;
  v_paid_event_exists boolean := false;
  v_target_review_exists boolean := false;
  v_refund_obligation boolean := false;
  v_other_review_exists boolean := false;
  v_other_refund_exists boolean := false;
  v_before jsonb;
  v_after jsonb;
  v_audit_id uuid;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  if (p_payment_attempt_id is null) = (p_event_id is null) then
    raise exception using
      errcode = '22023',
      message = 'provide exactly one payment attempt id or webhook event id';
  end if;

  if v_action not in (
    'clear_terminal_nonpaid_review',
    'record_external_refund_completed'
  ) then
    raise exception using errcode = '22023', message = 'unsupported manual action';
  end if;

  if p_reviewer_id is null
    or p_reviewer_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception using errcode = '22023', message = 'reviewer id required';
  end if;

  if pg_catalog.length(v_note) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'review note must be 1 to 1000 characters';
  end if;

  if v_action = 'record_external_refund_completed' then
    if pg_catalog.length(coalesce(v_external_reference, '')) not between 4 and 200
      or v_external_reference ~ '[[:cntrl:]]' then
      raise exception using
        errcode = '22023',
        message = 'external refund reference must be 4 to 200 printable characters';
    end if;
  elsif v_external_reference is not null then
    raise exception using
      errcode = '22023',
      message = 'external reference is only valid for a completed external refund';
  end if;

  if p_payment_attempt_id is not null then
    select payment.*
      into v_attempt
    from public.lodging_cutluy_payments as payment
    where payment.id = p_payment_attempt_id;

    if not found then
      raise exception using errcode = 'P0002', message = 'CutLuy payment attempt not found';
    end if;

    v_reference_id := v_attempt.reference_id;
    v_reservation_id := v_attempt.reservation_id;
    v_payment_id := v_attempt.cutluy_payment_id;
  else
    select event.*
      into v_event
    from public.lodging_cutluy_webhook_events as event
    where event.event_id = p_event_id;

    if not found then
      raise exception using errcode = 'P0002', message = 'CutLuy webhook event not found';
    end if;

    v_reference_id := v_event.reference_id;
    v_reservation_id := pg_catalog.split_part(v_reference_id, ':', 3)::uuid;
    v_payment_id := v_event.cutluy_payment_id;
  end if;

  -- Match the webhook worker's event -> reservation -> payment lock order.
  -- The second, post-lock predicates below are the authority check; these
  -- initial reads only locate the lock scope.
  perform event.event_id
  from public.lodging_cutluy_webhook_events as event
  where event.reference_id = v_reference_id
  order by event.event_id
  for update;

  select reservation.*
    into v_reservation
  from public.lodge_reservations as reservation
  where reservation.id = v_reservation_id
  for update;
  v_has_reservation := found;

  if p_payment_attempt_id is not null and not v_has_reservation then
    raise exception using errcode = 'P0002', message = 'lodging reservation not found';
  end if;

  if v_has_reservation then
    v_store_id := v_reservation.store_id;
  end if;

  perform payment.id
  from public.lodging_cutluy_payments as payment
  where payment.reservation_id = v_reservation_id
  order by payment.attempt_generation, payment.id
  for update;

  if p_event_id is not null then
    select event.*
      into v_event
    from public.lodging_cutluy_webhook_events as event
    where event.event_id = p_event_id
      and event.reference_id = v_reference_id
    for update;
    v_has_event := found;

    if not v_has_event then
      raise exception using errcode = '40001', message = 'webhook event changed during review';
    end if;

    select payment.*
      into v_attempt
    from public.lodging_cutluy_payments as payment
    where payment.cutluy_payment_id = v_event.cutluy_payment_id
      and payment.reference_id = v_event.reference_id
    for update;
    v_has_attempt := found;
  else
    select payment.*
      into v_attempt
    from public.lodging_cutluy_payments as payment
    where payment.id = p_payment_attempt_id
      and payment.reservation_id = v_reservation_id
      and payment.reference_id = v_reference_id
    for update;
    v_has_attempt := found;

    if not v_has_attempt then
      raise exception using errcode = '40001', message = 'payment attempt changed during review';
    end if;
  end if;

  select action_row.*
    into v_existing_action
  from public.lodging_cutluy_manual_actions as action_row
  where action_row.action = v_action
    and (
      (p_payment_attempt_id is not null
        and action_row.payment_attempt_id = p_payment_attempt_id)
      or (p_event_id is not null and action_row.webhook_event_id = p_event_id)
      or (p_event_id is not null and v_has_attempt
        and action_row.payment_attempt_id = v_attempt.id)
    )
  order by action_row.created_at desc
  limit 1;

  if found then
    return pg_catalog.jsonb_build_object(
      'kind', 'already_resolved',
      'action', v_action,
      'audit_id', v_existing_action.id,
      'reservation_id', v_reservation_id
    );
  end if;

  select exists (
      select 1
      from public.lodging_cutluy_payments as payment
      where payment.reservation_id = v_reservation_id
        and payment.status in ('pending', 'scanned')
    ),
    exists (
      select 1
      from public.lodging_cutluy_payments as payment
      where payment.reservation_id = v_reservation_id
        and payment.status = 'paid'
    ),
    exists (
      select 1
      from public.lodging_cutluy_webhook_events as event
      where event.reference_id = v_reference_id
        and event.event_type = 'payment.completed'
        and event.payment_status = 'paid'
    )
    into v_active_attempt_exists, v_paid_attempt_exists, v_paid_event_exists;

  v_target_review_exists := (
    (v_has_attempt and v_attempt.manual_review_required)
    or (v_has_attempt and v_attempt.manual_refund_required)
    or (v_has_event and v_event.processing_status in ('manual_review', 'dead_letter'))
    or (
      v_has_reservation
      and v_reservation.cutluy_manual_review_required
      and (
        not v_has_attempt
        or v_reservation.cutluy_payment_attempt_id = v_attempt.id
      )
    )
  );

  if not v_target_review_exists then
    raise exception using errcode = '22023', message = 'target has no pending manual review';
  end if;

  v_before := pg_catalog.jsonb_build_object(
    'payment_attempt_id', case when v_has_attempt then v_attempt.id else null end,
    'event_id', case when v_has_event then v_event.event_id else null end,
    'reservation_id', v_reservation_id,
    'payment_id', v_payment_id,
    'payment_status', case when v_has_attempt then v_attempt.status else null end,
    'event_type', case when v_has_event then v_event.event_type else null end,
    'event_payment_status', case when v_has_event then v_event.payment_status else null end,
    'attempt_manual_review_required', case when v_has_attempt then v_attempt.manual_review_required else null end,
    'attempt_manual_refund_required', case when v_has_attempt then v_attempt.manual_refund_required else null end,
    'reservation_manual_review_required', case when v_has_reservation then v_reservation.cutluy_manual_review_required else null end,
    'reservation_manual_refund_required', case when v_has_reservation then v_reservation.cutluy_manual_refund_required else null end
  );

  if v_action = 'clear_terminal_nonpaid_review' then
    if v_has_attempt and (
      v_attempt.status not in ('expired', 'failed')
      or v_attempt.fulfilled_at is not null
      or v_attempt.manual_refund_required
      or v_attempt.manual_refund_completed_at is not null
    ) then
      raise exception using
        errcode = '22023',
        message = 'non-paid review can only clear a terminal expired/failed attempt';
    end if;

    if not v_has_attempt and not (
      v_has_event
      and v_event.event_type in ('payment.expired', 'payment.failed')
      and v_event.payment_status in ('expired', 'failed')
    ) then
      raise exception using
        errcode = '22023',
        message = 'orphan review requires a signed expired/failed event';
    end if;

    if v_active_attempt_exists or v_paid_attempt_exists or v_paid_event_exists then
      raise exception using
        errcode = '22023',
        message = 'active or paid payment evidence prevents non-paid review clearance';
    end if;

    if v_has_attempt then
      update public.lodging_cutluy_payments
      set manual_review_required = false,
          manual_review_reason = null,
          manual_reviewed_at = pg_catalog.now(),
          manual_reviewed_by = p_reviewer_id,
          updated_at = pg_catalog.now()
      where id = v_attempt.id;
    end if;

    update public.lodging_cutluy_webhook_events
    set processing_status = 'ignored',
        lease_token = null,
        lease_expires_at = null,
        last_error = 'manual_terminal_nonpaid_review_cleared',
        processed_at = coalesce(processed_at, pg_catalog.now()),
        updated_at = pg_catalog.now()
    where reference_id = v_reference_id
      and (
        (v_payment_id is not null and cutluy_payment_id = v_payment_id)
        or event_id = p_event_id
      )
      and event_type in ('payment.expired', 'payment.failed')
      and payment_status in ('expired', 'failed')
      and processing_status in ('manual_review', 'dead_letter');
  else
    v_refund_obligation := (
      (v_has_attempt and v_attempt.status = 'paid'
        and v_attempt.manual_refund_required)
      or (v_has_reservation and v_reservation.cutluy_manual_refund_required)
      or (v_has_event
        and v_event.event_type = 'payment.completed'
        and v_event.payment_status = 'paid'
        and v_event.processing_status in ('manual_review', 'dead_letter'))
    );

    if not (
      (v_has_attempt and v_attempt.status = 'paid')
      or (v_has_event
        and v_event.event_type = 'payment.completed'
        and v_event.payment_status = 'paid')
    ) or not v_refund_obligation then
      raise exception using
        errcode = '22023',
        message = 'completed external refund requires paid evidence and an existing refund obligation';
    end if;

    if v_has_attempt then
      update public.lodging_cutluy_payments
      set manual_refund_required = false,
          manual_review_required = false,
          manual_review_reason = null,
          manual_reviewed_at = pg_catalog.now(),
          manual_reviewed_by = p_reviewer_id,
          manual_refund_completed_at = pg_catalog.now(),
          manual_refund_completed_by = p_reviewer_id,
          manual_refund_reference = v_external_reference,
          manual_refund_note = v_note,
          manual_settlement_status = 'external_refund_recorded',
          manual_settlement_reviewed_at = pg_catalog.now(),
          manual_settlement_reviewed_by = p_reviewer_id,
          manual_settlement_note = v_note,
          updated_at = pg_catalog.now()
      where id = v_attempt.id;
    end if;

    update public.lodging_cutluy_webhook_events
    set processing_status = 'ignored',
        lease_token = null,
        lease_expires_at = null,
        last_error = 'external_refund_recorded',
        processed_at = coalesce(processed_at, pg_catalog.now()),
        updated_at = pg_catalog.now()
    where reference_id = v_reference_id
      and cutluy_payment_id = v_payment_id
      and event_type = 'payment.completed'
      and payment_status = 'paid'
      and processing_status in (
        'queued', 'processing', 'error', 'manual_review', 'dead_letter'
      );
  end if;

  select exists (
      select 1
      from public.lodging_cutluy_payments as payment
      where payment.reservation_id = v_reservation_id
        and (payment.manual_review_required or payment.manual_refund_required)
    ) or exists (
      select 1
      from public.lodging_cutluy_webhook_events as event
      where event.reference_id = v_reference_id
        and (
          event.processing_status in ('manual_review', 'dead_letter')
          or (
            event.event_type = 'payment.completed'
            and event.payment_status = 'paid'
            and event.processing_status in ('queued', 'processing', 'error')
          )
        )
    ),
    exists (
      select 1
      from public.lodging_cutluy_payments as payment
      where payment.reservation_id = v_reservation_id
        and payment.manual_refund_required
    ) or exists (
      select 1
      from public.lodging_cutluy_webhook_events as event
      where event.reference_id = v_reference_id
        and event.event_type = 'payment.completed'
        and event.payment_status = 'paid'
        and event.processing_status in (
          'queued', 'processing', 'error', 'manual_review', 'dead_letter'
        )
    )
    into v_other_review_exists, v_other_refund_exists;

  if v_has_reservation then
    update public.lodge_reservations
    set cutluy_manual_review_required = (
          v_other_review_exists or v_other_refund_exists
        ),
        cutluy_manual_refund_required = v_other_refund_exists,
        cutluy_manual_review_reason = case
          when v_other_review_exists or v_other_refund_exists then
            coalesce(cutluy_manual_review_reason, 'additional_manual_review_required')
          else null
        end,
        last_payment_error = case
          when not v_other_review_exists
            and not v_other_refund_exists
            and last_payment_error = cutluy_manual_review_reason then null
          else last_payment_error
        end,
        updated_at = pg_catalog.now()
    where id = v_reservation_id
    returning * into v_reservation;
  end if;

  v_after := pg_catalog.jsonb_build_object(
    'payment_attempt_id', case when v_has_attempt then v_attempt.id else null end,
    'event_id', case when v_has_event then v_event.event_id else null end,
    'reservation_id', v_reservation_id,
    'remaining_review_required', v_other_review_exists or v_other_refund_exists,
    'remaining_refund_required', v_other_refund_exists,
    'booking_status_unchanged', true,
    'payment_authority_unchanged', true
  );

  insert into public.lodging_cutluy_manual_actions (
    payment_attempt_id,
    webhook_event_id,
    reservation_id,
    store_id,
    action,
    reviewer_id,
    note,
    external_reference,
    before_state,
    after_state
  ) values (
    case when v_has_attempt then v_attempt.id else null end,
    case when v_has_event then v_event.event_id else null end,
    case when v_has_reservation then v_reservation_id else null end,
    v_store_id,
    v_action,
    p_reviewer_id,
    v_note,
    v_external_reference,
    v_before,
    v_after
  )
  returning id into v_audit_id;

  return pg_catalog.jsonb_build_object(
    'kind', 'resolved',
    'action', v_action,
    'audit_id', v_audit_id,
    'reservation_id', v_reservation_id,
    'remaining_review_required', v_other_review_exists or v_other_refund_exists,
    'remaining_refund_required', v_other_refund_exists
  );
end
$function$;

create or replace function private._list_lodging_cutluy_manual_reviews(
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_role text := coalesce((select auth.role()), '');
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_items jsonb;
begin
  if v_actor_role <> 'service_role' then
    raise exception using errcode = '42501', message = 'service role required';
  end if;

  select coalesce(pg_catalog.jsonb_agg(candidate.item order by candidate.detected_at desc), '[]'::jsonb)
    into v_items
  from (
    select payment.created_at as detected_at,
      pg_catalog.jsonb_build_object(
        'kind', 'payment_attempt',
        'payment_attempt_id', payment.id,
        'event_id', null,
        'reservation_id', payment.reservation_id,
        'store_id', payment.store_id,
        'payment_id', payment.cutluy_payment_id,
        'reference_id', payment.reference_id,
        'status', payment.status,
        'fulfilled', payment.fulfilled_at is not null,
        'manual_review_required', payment.manual_review_required,
        'manual_refund_required', payment.manual_refund_required,
        'reason', coalesce(payment.manual_review_reason, reservation.cutluy_manual_review_reason),
        'allowed_action', case
          when payment.status = 'paid'
            and (payment.manual_refund_required or reservation.cutluy_manual_refund_required)
            then 'record_external_refund_completed'
          when payment.status in ('expired', 'failed')
            and not payment.manual_refund_required
            then 'clear_terminal_nonpaid_review'
          else null
        end,
        'detected_at', payment.created_at
      ) as item
    from public.lodging_cutluy_payments as payment
    join public.lodge_reservations as reservation
      on reservation.id = payment.reservation_id
    where payment.manual_review_required
      or payment.manual_refund_required
      or (
        reservation.cutluy_payment_attempt_id = payment.id
        and (
          reservation.cutluy_manual_review_required
          or reservation.cutluy_manual_refund_required
        )
      )

    union all

    select event.received_at as detected_at,
      pg_catalog.jsonb_build_object(
        'kind', 'webhook_event',
        'payment_attempt_id', payment.id,
        'event_id', event.event_id,
        'reservation_id', pg_catalog.split_part(event.reference_id, ':', 3)::uuid,
        'store_id', payment.store_id,
        'payment_id', event.cutluy_payment_id,
        'reference_id', event.reference_id,
        'status', event.payment_status,
        'fulfilled', payment.fulfilled_at is not null,
        'manual_review_required', true,
        'manual_refund_required', (
          event.event_type = 'payment.completed' and event.payment_status = 'paid'
        ),
        'reason', event.last_error,
        'allowed_action', case
          when event.event_type = 'payment.completed' and event.payment_status = 'paid'
            then 'record_external_refund_completed'
          when event.event_type in ('payment.expired', 'payment.failed')
            and event.payment_status in ('expired', 'failed')
            then 'clear_terminal_nonpaid_review'
          else null
        end,
        'detected_at', event.received_at
      ) as item
    from public.lodging_cutluy_webhook_events as event
    left join public.lodging_cutluy_payments as payment
      on payment.cutluy_payment_id = event.cutluy_payment_id
    where event.processing_status in ('manual_review', 'dead_letter')

    order by detected_at desc
    limit v_limit
  ) as candidate;

  return pg_catalog.jsonb_build_object(
    'items', v_items,
    'count', pg_catalog.jsonb_array_length(v_items)
  );
end
$function$;

-- Public wrappers stay security-invoker and are executable only by the
-- service role. Privileged mutation logic remains in the unexposed private
-- schema with an empty search_path.
create or replace function public.claim_lodging_cutluy_payment(
  p_reservation_id uuid,
  p_idempotency_key text,
  p_lease_token text,
  p_lease_seconds integer default 30
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._claim_lodging_cutluy_payment(
    p_reservation_id,
    p_idempotency_key,
    p_lease_token,
    p_lease_seconds
  );
$function$;

create or replace function public.complete_lodging_cutluy_payment_creation(
  p_idempotency_key text,
  p_lease_token text,
  p_payment jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._complete_lodging_cutluy_payment_creation(
    p_idempotency_key,
    p_lease_token,
    p_payment
  );
$function$;

create or replace function public.fail_lodging_cutluy_payment_creation(
  p_idempotency_key text,
  p_lease_token text,
  p_error_code text,
  p_retryable boolean,
  p_retry_after_seconds integer default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._fail_lodging_cutluy_payment_creation(
    p_idempotency_key,
    p_lease_token,
    p_error_code,
    p_retryable,
    p_retry_after_seconds
  );
$function$;

create or replace function public.enqueue_lodging_cutluy_webhook(
  p_event jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._enqueue_lodging_cutluy_webhook(p_event);
$function$;

create or replace function public.lease_lodging_cutluy_webhook(
  p_event_id uuid,
  p_lease_token text,
  p_lease_seconds integer default 30
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._lease_lodging_cutluy_webhook(
    p_event_id,
    p_lease_token,
    p_lease_seconds
  );
$function$;

create or replace function public.apply_lodging_cutluy_webhook(
  p_event_id uuid,
  p_lease_token text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._apply_lodging_cutluy_webhook(
    p_event_id,
    p_lease_token
  );
$function$;

create or replace function public.fail_lodging_cutluy_webhook(
  p_event_id uuid,
  p_lease_token text,
  p_error text,
  p_retryable boolean
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._fail_lodging_cutluy_webhook(
    p_event_id,
    p_lease_token,
    p_error,
    p_retryable
  );
$function$;

create or replace function public.resolve_lodging_cutluy_manual_review(
  p_payment_attempt_id uuid,
  p_event_id uuid,
  p_action text,
  p_reviewer_id uuid,
  p_note text,
  p_external_reference text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._resolve_lodging_cutluy_manual_review(
    p_payment_attempt_id,
    p_event_id,
    p_action,
    p_reviewer_id,
    p_note,
    p_external_reference
  );
$function$;

create or replace function public.list_lodging_cutluy_manual_reviews(
  p_limit integer default 50
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private._list_lodging_cutluy_manual_reviews(p_limit);
$function$;

grant usage on schema private to service_role;

revoke all on function private.enforce_lodging_cutluy_payment_transition()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_lodging_cutluy_event_identity()
  from public, anon, authenticated, service_role;
revoke all on function private.enforce_lodging_cutluy_reservation_authority()
  from public, anon, authenticated, service_role;
revoke all on function private.reject_lodging_cutluy_manual_action_mutation()
  from public, anon, authenticated, service_role;
revoke all on function private._claim_lodging_cutluy_payment(uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function private._complete_lodging_cutluy_payment_creation(text, text, jsonb)
  from public, anon, authenticated;
revoke all on function private._fail_lodging_cutluy_payment_creation(text, text, text, boolean, integer)
  from public, anon, authenticated;
revoke all on function private._enqueue_lodging_cutluy_webhook(jsonb)
  from public, anon, authenticated;
revoke all on function private._lease_lodging_cutluy_webhook(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function private._apply_lodging_cutluy_webhook_core(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function private._apply_lodging_cutluy_webhook(uuid, text)
  from public, anon, authenticated;
revoke all on function private._fail_lodging_cutluy_webhook(uuid, text, text, boolean)
  from public, anon, authenticated;
revoke all on function private.reconcile_lodging_cutluy_webhook_events(integer)
  from public, anon, authenticated, service_role;
revoke all on function private._resolve_lodging_cutluy_manual_review(uuid, uuid, text, uuid, text, text)
  from public, anon, authenticated;
revoke all on function private._list_lodging_cutluy_manual_reviews(integer)
  from public, anon, authenticated;

grant execute on function private._claim_lodging_cutluy_payment(uuid, text, text, integer)
  to service_role;
grant execute on function private._complete_lodging_cutluy_payment_creation(text, text, jsonb)
  to service_role;
grant execute on function private._fail_lodging_cutluy_payment_creation(text, text, text, boolean, integer)
  to service_role;
grant execute on function private._enqueue_lodging_cutluy_webhook(jsonb)
  to service_role;
grant execute on function private._lease_lodging_cutluy_webhook(uuid, text, integer)
  to service_role;
grant execute on function private._apply_lodging_cutluy_webhook_core(uuid, text)
  to postgres;
grant execute on function private._apply_lodging_cutluy_webhook(uuid, text)
  to service_role;
grant execute on function private._fail_lodging_cutluy_webhook(uuid, text, text, boolean)
  to service_role;
grant execute on function private.reconcile_lodging_cutluy_webhook_events(integer)
  to postgres;
grant execute on function private._resolve_lodging_cutluy_manual_review(uuid, uuid, text, uuid, text, text)
  to service_role;
grant execute on function private._list_lodging_cutluy_manual_reviews(integer)
  to service_role;

revoke all on function public.claim_lodging_cutluy_payment(uuid, text, text, integer)
  from public, anon, authenticated;
revoke all on function public.complete_lodging_cutluy_payment_creation(text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.fail_lodging_cutluy_payment_creation(text, text, text, boolean, integer)
  from public, anon, authenticated;
revoke all on function public.enqueue_lodging_cutluy_webhook(jsonb)
  from public, anon, authenticated;
revoke all on function public.lease_lodging_cutluy_webhook(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.apply_lodging_cutluy_webhook(uuid, text)
  from public, anon, authenticated;
revoke all on function public.fail_lodging_cutluy_webhook(uuid, text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.resolve_lodging_cutluy_manual_review(uuid, uuid, text, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.list_lodging_cutluy_manual_reviews(integer)
  from public, anon, authenticated;

grant execute on function public.claim_lodging_cutluy_payment(uuid, text, text, integer)
  to service_role;
grant execute on function public.complete_lodging_cutluy_payment_creation(text, text, jsonb)
  to service_role;
grant execute on function public.fail_lodging_cutluy_payment_creation(text, text, text, boolean, integer)
  to service_role;
grant execute on function public.enqueue_lodging_cutluy_webhook(jsonb)
  to service_role;
grant execute on function public.lease_lodging_cutluy_webhook(uuid, text, integer)
  to service_role;
grant execute on function public.apply_lodging_cutluy_webhook(uuid, text)
  to service_role;
grant execute on function public.fail_lodging_cutluy_webhook(uuid, text, text, boolean)
  to service_role;
grant execute on function public.resolve_lodging_cutluy_manual_review(uuid, uuid, text, uuid, text, text)
  to service_role;
grant execute on function public.list_lodging_cutluy_manual_reviews(integer)
  to service_role;

do $cron$
declare
  v_job_exists boolean := false;
begin
  if pg_catalog.to_regnamespace('cron') is null
    or pg_catalog.to_regclass('cron.job') is null
    or pg_catalog.to_regprocedure('cron.schedule(text,text,text)') is null then
    raise notice 'Skipping lodging CutLuy reconciler schedule because pg_cron is unavailable.';
    return;
  end if;

  execute 'select exists (select 1 from cron.job where jobname = $1)'
    into v_job_exists
    using 'lodging-cutluy-webhook-reconcile-1m';

  if not v_job_exists then
    execute 'select cron.schedule($1, $2, $3)'
      using
        'lodging-cutluy-webhook-reconcile-1m',
        '* * * * *',
        'select private.reconcile_lodging_cutluy_webhook_events(25);';
  end if;
end
$cron$;

commit;

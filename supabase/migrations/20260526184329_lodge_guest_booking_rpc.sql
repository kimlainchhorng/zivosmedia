-- Server-side hotel booking workflow for guests.
--
-- The browser no longer inserts lodge_reservations directly. This RPC validates
-- dates, guests, room rules, blocks, overlapping reservations, pricing, and the
-- authenticated guest before creating the reservation in one database call.

create schema if not exists private;

create index if not exists idx_lodge_reservations_guest_created
  on public.lodge_reservations (guest_id, created_at desc)
  where guest_id is not null;

create index if not exists idx_lodge_reservations_room_active_window
  on public.lodge_reservations (room_id, check_in, check_out)
  where room_id is not null and status not in ('cancelled', 'no_show');

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

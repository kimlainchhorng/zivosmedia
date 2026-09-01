-- Make every Eats payout eligibility and economic-basis field server-owned.
--
-- Production still has a broad authenticated UPDATE policy on food_orders.
-- RLS decides which rows a caller can reach, not which columns they may forge,
-- so this trigger is the final column-level authority boundary. Legitimate
-- restaurant lifecycle changes are routed through the service-only transition
-- RPC below; payment, refund, dispatch, and rating Edge Functions already use
-- the service role or trusted database functions.

begin;

create schema if not exists private;

create or replace function private.eats_food_order_server_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin')
     or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if new.customer_id is distinct from old.customer_id
     or new.restaurant_id is distinct from old.restaurant_id
     or new.items is distinct from old.items
     or new.subtotal is distinct from old.subtotal
     or new.delivery_fee is distinct from old.delivery_fee
     or new.service_fee is distinct from old.service_fee
     or new.tip_amount is distinct from old.tip_amount
     or new.tax is distinct from old.tax
     or new.total_amount is distinct from old.total_amount
     or new.status is distinct from old.status
     or new.driver_id is distinct from old.driver_id
     or new.prepared_at is distinct from old.prepared_at
     or new.picked_up_at is distinct from old.picked_up_at
     or new.delivered_at is distinct from old.delivered_at
     or new.accepted_at is distinct from old.accepted_at
     or new.ready_at is distinct from old.ready_at
     or new.rating is distinct from old.rating
     or new.payment_status is distinct from old.payment_status
     or new.payment_type is distinct from old.payment_type
     or new.payment_provider is distinct from old.payment_provider
     or new.paid_at is distinct from old.paid_at
     or new.payment_expires_at is distinct from old.payment_expires_at
     or new.stripe_payment_id is distinct from old.stripe_payment_id
     or new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id
     or new.paypal_order_id is distinct from old.paypal_order_id
     or new.paypal_capture_id is distinct from old.paypal_capture_id
     or new.square_order_id is distinct from old.square_order_id
     or new.square_checkout_id is distinct from old.square_checkout_id
     or new.square_payment_id is distinct from old.square_payment_id
     or new.wallet_transaction_id is distinct from old.wallet_transaction_id
     or new.last_payment_error is distinct from old.last_payment_error
     or new.refund_status is distinct from old.refund_status
     or new.refunded_at is distinct from old.refunded_at
     or new.refund_amount is distinct from old.refund_amount
     or new.payout_hold is distinct from old.payout_hold
     or new.payout_hold_reason is distinct from old.payout_hold_reason
     or new.payout_eligible_at is distinct from old.payout_eligible_at
     or new.payout_status is distinct from old.payout_status
     or new.payout_transfer_id is distinct from old.payout_transfer_id
     or new.payout_idempotency_key is distinct from old.payout_idempotency_key
     or new.payout_error is distinct from old.payout_error
     or new.payout_at is distinct from old.payout_at
     or new.commission_percent is distinct from old.commission_percent
     or new.commission_amount_cents is distinct from old.commission_amount_cents
     or new.restaurant_payout_cents is distinct from old.restaurant_payout_cents
     or new.merchant_earnings_cents is distinct from old.merchant_earnings_cents
     or new.quoted_subtotal is distinct from old.quoted_subtotal
     or new.quoted_delivery_fee is distinct from old.quoted_delivery_fee
     or new.quoted_service_fee is distinct from old.quoted_service_fee
     or new.quoted_small_order_fee is distinct from old.quoted_small_order_fee
     or new.quoted_tax is distinct from old.quoted_tax
     or new.quoted_tip is distinct from old.quoted_tip
     or new.quoted_total is distinct from old.quoted_total
     or new.admin_price_override is distinct from old.admin_price_override
     or new.admin_override_reason is distinct from old.admin_override_reason
     or new.delivery_fee_cents is distinct from old.delivery_fee_cents
     or new.surge_fee_cents is distinct from old.surge_fee_cents
     or new.service_fee_cents is distinct from old.service_fee_cents
     or new.tip_cents is distinct from old.tip_cents
     or new.express_fee_cents is distinct from old.express_fee_cents
     or new.discount_amount is distinct from old.discount_amount
     or new.discount_type is distinct from old.discount_type
     or new.promo_code is distinct from old.promo_code
     or new.promotion_id is distinct from old.promotion_id
     or new.merchant_coupon_id is distinct from old.merchant_coupon_id
     or new.happy_hour_id is distinct from old.happy_hour_id
     or new.credit_applied_cents is distinct from old.credit_applied_cents
     or new.credit_used_amount is distinct from old.credit_used_amount
     or new.membership_discount_cents is distinct from old.membership_discount_cents
     or new.membership_applied is distinct from old.membership_applied
     or new.currency is distinct from old.currency
     or new.cancelled_by is distinct from old.cancelled_by
     or new.cancellation_reason is distinct from old.cancellation_reason
     or new.cancelled_at is distinct from old.cancelled_at
     or new.cancellation_fee is distinct from old.cancellation_fee then
    raise exception 'eats_food_order_server_authority_required'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.eats_food_order_server_gate()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_food_order_state_server_gate on public.food_orders;
drop trigger if exists trg_eats_food_order_server_gate on public.food_orders;
create trigger trg_eats_food_order_server_gate
before update on public.food_orders
for each row
execute function private.eats_food_order_server_gate();

comment on function private.eats_food_order_server_gate() is
  'Blocks browser mutation of Eats lifecycle, settlement, refund, payout, provider, and economic-basis fields.';

create or replace function public.advance_eats_restaurant_order(
  p_order_id uuid,
  p_restaurant_owner_id uuid,
  p_requested_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_restaurant public.restaurants%rowtype;
  v_order public.food_orders%rowtype;
  v_requested text := pg_catalog.lower(pg_catalog.btrim(p_requested_status));
  v_next public.booking_status;
begin
  if current_user <> 'service_role'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'advance_eats_restaurant_order_service_role_required'
      using errcode = '42501';
  end if;
  if p_order_id is null or p_restaurant_owner_id is null then
    raise exception 'advance_eats_restaurant_order_invalid_identity'
      using errcode = '22023';
  end if;
  if v_requested not in ('confirmed', 'preparing', 'ready') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'restaurant_transition_not_allowed'
    );
  end if;

  select food.restaurant_id
    into v_restaurant_id
    from public.food_orders as food
   where food.id = p_order_id;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_found');
  end if;

  -- Restaurant first, then order: the same lock order used by payout claims.
  select restaurant.*
    into v_restaurant
    from public.restaurants as restaurant
   where restaurant.id = v_restaurant_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'restaurant_not_found');
  end if;
  if v_restaurant.owner_id is distinct from p_restaurant_owner_id then
    raise exception 'advance_eats_restaurant_order_owner_mismatch'
      using errcode = '42501';
  end if;

  select food.*
    into v_order
    from public.food_orders as food
   where food.id = p_order_id
     and food.restaurant_id = v_restaurant.id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_found');
  end if;
  if v_order.payment_status not in ('paid', 'cash_on_delivery') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'payment_not_settled'
    );
  end if;

  if v_order.status::text in ('pending', 'placed') and v_requested = 'confirmed' then
    v_next := 'confirmed'::public.booking_status;
  elsif v_order.status::text = 'confirmed' and v_requested = 'preparing' then
    v_next := 'preparing'::public.booking_status;
  elsif v_order.status::text = 'preparing' and v_requested = 'ready' then
    v_next := 'ready'::public.booking_status;
  else
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'restaurant_transition_conflict',
      'current_status', v_order.status,
      'requested_status', v_requested
    );
  end if;

  update public.food_orders as food
     set status = v_next,
         accepted_at = case
           when v_next = 'confirmed'::public.booking_status
             then coalesce(food.accepted_at, pg_catalog.now())
           else food.accepted_at
         end,
         restaurant_confirmed_at = case
           when v_next = 'confirmed'::public.booking_status
             then coalesce(food.restaurant_confirmed_at, pg_catalog.now())
           else food.restaurant_confirmed_at
         end,
         prepared_at = case
           when v_next = 'ready'::public.booking_status
             then coalesce(food.prepared_at, pg_catalog.now())
           else food.prepared_at
         end,
         ready_at = case
           when v_next = 'ready'::public.booking_status
             then coalesce(food.ready_at, pg_catalog.now())
           else food.ready_at
         end,
         updated_at = pg_catalog.now()
   where food.id = v_order.id
   returning * into v_order;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'advanced',
    'order_id', v_order.id,
    'status', v_order.status,
    'payment_status', v_order.payment_status
  );
end;
$$;

revoke all on function public.advance_eats_restaurant_order(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.advance_eats_restaurant_order(uuid, uuid, text)
  to service_role;

comment on function public.advance_eats_restaurant_order(uuid, uuid, text) is
  'Service-only, owner-bound, paid-order restaurant transition gate.';

commit;

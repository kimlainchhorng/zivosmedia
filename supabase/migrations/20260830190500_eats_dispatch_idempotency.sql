-- Give each Eats fulfillment exactly one durable legacy job and one unified
-- service order. Application-side lookup-before-insert checks cannot prevent
-- concurrent webhooks/recovery calls from double-dispatching an order.

-- A provider can definitively reject one refund attempt while a transport
-- timeout or provider-pending response must keep the original idempotency key.
-- Bind each exact provider refund to the attempt generation that created it;
-- only a durable failed result is allowed to advance the generation.
alter table private.eats_payment_evidence
  add column if not exists refund_attempt_generation integer not null default 0;

alter table private.eats_payment_evidence
  drop constraint if exists eats_payment_evidence_refund_attempt_generation_check;
alter table private.eats_payment_evidence
  add constraint eats_payment_evidence_refund_attempt_generation_check
  check (refund_attempt_generation between 0 and 999999)
  not valid;
alter table private.eats_payment_evidence
  validate constraint eats_payment_evidence_refund_attempt_generation_check;

alter table private.eats_provider_refund_evidence
  add column if not exists attempt_generation integer not null default 0,
  add column if not exists retry_generation_advanced boolean not null default false;

alter table private.eats_provider_refund_evidence
  drop constraint if exists eats_provider_refund_attempt_generation_check;
alter table private.eats_provider_refund_evidence
  add constraint eats_provider_refund_attempt_generation_check
  check (attempt_generation between 0 and 999999)
  not valid;
alter table private.eats_provider_refund_evidence
  validate constraint eats_provider_refund_attempt_generation_check;

alter table public.jobs
  add column if not exists external_kind text,
  add column if not exists external_order_id uuid;

-- Backfill the exact legacy note format emitted by dispatch-eats-order. The
-- UUID predicate prevents malformed historical notes from being cast.
update public.jobs
   set external_kind = 'food_order',
       external_order_id = pg_catalog.substring(
         notes,
         '^Food order: ([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$'
       )::uuid
 where job_type = 'food_delivery'
   and external_kind is null
   and external_order_id is null
   and notes ~ '^Food order: [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$';

create unique index if not exists jobs_external_food_order_unique
  on public.jobs (external_kind, external_order_id)
  where external_kind = 'food_order' and external_order_id is not null;

create unique index if not exists service_orders_external_food_order_unique
  on public.service_orders (external_kind, external_order_id)
  where external_kind = 'food_order' and external_order_id is not null;

comment on index public.jobs_external_food_order_unique is
  'Prevents concurrent Eats payment callbacks from creating duplicate driver jobs.';

comment on index public.service_orders_external_food_order_unique is
  'Prevents concurrent Eats payment callbacks from creating duplicate unified delivery orders.';

-- Restaurant is an authoritative cancellation actor. The live legacy check
-- omitted it even though the Edge Function has always written this value.
alter table public.food_orders
  drop constraint if exists food_orders_cancelled_by_check;
alter table public.food_orders
  add constraint food_orders_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('customer', 'restaurant', 'driver', 'admin'))
  not valid;
alter table public.food_orders validate constraint food_orders_cancelled_by_check;

create or replace function public.finish_eats_provider_refund_with_evidence(
  p_order_id uuid,
  p_provider text,
  p_payment_id text,
  p_refund_id text,
  p_refund_amount_cents integer,
  p_refund_currency text,
  p_refund_status text,
  p_error text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_evidence private.eats_payment_evidence%rowtype;
  v_refund private.eats_provider_refund_evidence%rowtype;
  v_provider text := pg_catalog.lower(pg_catalog.btrim(p_provider));
  v_currency text := pg_catalog.upper(pg_catalog.btrim(p_refund_currency));
  v_refunded_cents integer := 0;
  v_remaining integer := 0;
  v_next_payment_status text;
  v_refund_status text := pg_catalog.lower(pg_catalog.btrim(p_refund_status));
  v_effective_succeeded boolean := false;
  v_effective_failed boolean := false;
  v_advanced_attempt boolean := false;
begin
  if v_provider is null or v_provider not in ('stripe', 'paypal', 'square')
     or p_payment_id is null or pg_catalog.btrim(p_payment_id) = ''
     or p_refund_id is null or pg_catalog.btrim(p_refund_id) = ''
     or p_refund_amount_cents is null or p_refund_amount_cents <= 0
     or v_currency is null or v_currency !~ '^[A-Z]{3}$'
     or v_refund_status is null or v_refund_status not in ('succeeded', 'pending', 'failed') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_refund_evidence');
  end if;

  select *
    into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select evidence.*
    into v_evidence
    from private.eats_payment_evidence as evidence
   where evidence.order_id = p_order_id
     and evidence.provider = v_provider
     and evidence.payment_id = p_payment_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_evidence_missing');
  end if;
  if v_currency <> v_evidence.currency then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'refund_currency_conflict');
  end if;
  v_next_payment_status := case
    when v_evidence.preserve_order_payment_state
      and (
        v_order.status::text not in ('cancelled', 'refunded', 'delivered', 'completed')
        or (
          v_order.status::text = 'cancelled'
          and v_order.payment_status = 'paid'
          and v_order.last_payment_error = 'cancelled_no_refund'
        )
      )
      then coalesce(nullif(v_evidence.prior_payment_status, 'refund_pending'), 'paid')
    else 'refund_pending'
  end;

  insert into private.eats_provider_refund_evidence (
    payment_evidence_id,
    provider,
    provider_refund_id,
    amount_cents,
    currency,
    status,
    error_message,
    attempt_generation
  )
  values (
    v_evidence.id,
    v_provider,
    p_refund_id,
    p_refund_amount_cents,
    v_currency,
    v_refund_status,
    case
      when v_refund_status = 'succeeded' then null
      else pg_catalog.left(
        coalesce(
          nullif(pg_catalog.btrim(p_error), ''),
          case when v_refund_status = 'failed' then 'provider_refund_failed' else 'provider_refund_pending' end
        ),
        300
      )
    end,
    v_evidence.refund_attempt_generation
  )
  on conflict (provider, provider_refund_id) do nothing
  returning * into v_refund;

  if v_refund.id is null then
    select refund.*
      into v_refund
      from private.eats_provider_refund_evidence as refund
     where refund.provider = v_provider
       and refund.provider_refund_id = p_refund_id
     for update;
    if v_refund.payment_evidence_id is distinct from v_evidence.id
       or v_refund.amount_cents is distinct from p_refund_amount_cents
       or v_refund.currency is distinct from v_currency then
      return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_refund_evidence_conflict');
    end if;
    update private.eats_provider_refund_evidence
       set status = case
             when status = 'succeeded' or v_refund_status = 'succeeded' then 'succeeded'
             when status = 'failed' or v_refund_status = 'failed' then 'failed'
             else 'pending'
           end,
           error_message = case
             when status = 'succeeded' or v_refund_status = 'succeeded' then null
             when status = 'failed' then error_message
             else pg_catalog.left(coalesce(p_error, error_message), 300)
           end,
           updated_at = pg_catalog.now()
     where id = v_refund.id
     returning * into v_refund;
  end if;

  -- Provider events can arrive out of order. Once an exact refund ID has
  -- succeeded, a later pending/failed delivery cannot downgrade it. A failed
  -- result likewise cannot be softened back to pending.
  v_effective_succeeded := v_refund.status = 'succeeded';
  v_effective_failed := v_refund.status = 'failed';

  select coalesce(pg_catalog.sum(refund.amount_cents), 0)::integer
    into v_refunded_cents
    from private.eats_provider_refund_evidence as refund
   where refund.payment_evidence_id = v_evidence.id
     and refund.status = 'succeeded'
     and refund.currency = v_evidence.currency;

  if v_refunded_cents > v_evidence.amount_cents then
    update private.eats_payment_evidence
       set refund_state = 'pending',
           refund_error = 'provider_over_refund_conflict',
           updated_at = pg_catalog.now()
     where id = v_evidence.id;
    update public.food_orders
       set payment_status = v_next_payment_status,
           last_payment_error = case
             when v_next_payment_status = 'paid'
               and v_order.last_payment_error = 'cancelled_no_refund'
               then 'cancelled_no_refund'
             else 'provider_over_refund_conflict'
           end,
           updated_at = pg_catalog.now()
     where id = p_order_id;
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'provider_over_refund_conflict',
      'payment_status', v_next_payment_status,
      'refunded_cents', v_refunded_cents,
      'captured_cents', v_evidence.amount_cents
    );
  end if;

  -- A definitive provider rejection creates a fresh durable attempt
  -- generation exactly once for this provider refund ID. Redelivery of the
  -- same failure remains idempotent. A later exact success (including success
  -- from another attempt) is evaluated before this branch and wins once its
  -- aggregate reaches the captured amount.
  if v_effective_failed and v_refunded_cents < v_evidence.amount_cents then
    update private.eats_provider_refund_evidence
       set retry_generation_advanced = true,
           updated_at = pg_catalog.now()
     where id = v_refund.id
       and retry_generation_advanced = false
    returning true into v_advanced_attempt;

    update private.eats_payment_evidence
       set refund_state = 'required',
           refund_attempt_generation = case
             when coalesce(v_advanced_attempt, false)
               then pg_catalog.greatest(refund_attempt_generation, v_refund.attempt_generation + 1)
             else refund_attempt_generation
           end,
           refund_error = pg_catalog.left(
             coalesce(nullif(pg_catalog.btrim(p_error), ''), 'provider_refund_failed_retryable'),
             300
           ),
           updated_at = pg_catalog.now()
     where id = v_evidence.id
    returning * into v_evidence;

    update public.food_orders
       set payment_status = v_next_payment_status,
           last_payment_error = case
             when v_next_payment_status = 'paid'
               and v_order.last_payment_error = 'cancelled_no_refund'
               then 'cancelled_no_refund'
             else 'provider_refund_failed_retryable'
           end,
           updated_at = pg_catalog.now()
     where id = p_order_id;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'provider_refund_failed_retryable',
      'payment_status', v_next_payment_status,
      'refund_complete', false,
      'refunded_cents', v_refunded_cents,
      'captured_cents', v_evidence.amount_cents,
      'provider_refund_id', v_refund.provider_refund_id,
      'next_attempt_generation', v_evidence.refund_attempt_generation
    );
  end if;

  if v_refunded_cents < v_evidence.amount_cents then
    update private.eats_payment_evidence
       set refund_state = 'pending',
           refund_error = case
             when v_effective_succeeded then 'partial_provider_refund_pending'
             else pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_error), ''), 'provider_refund_pending'), 300)
           end,
           updated_at = pg_catalog.now()
     where id = v_evidence.id;
    update public.food_orders
       set payment_status = v_next_payment_status,
           last_payment_error = case
             when v_next_payment_status = 'paid'
               and v_order.last_payment_error = 'cancelled_no_refund'
               then 'cancelled_no_refund'
             when v_effective_succeeded then 'partial_provider_refund_pending'
             else pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_error), ''), 'provider_refund_pending'), 300)
           end,
           updated_at = pg_catalog.now()
     where id = p_order_id;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'refund_pending',
      'payment_status', v_next_payment_status,
      'refund_complete', false,
      'refunded_cents', v_refunded_cents,
      'captured_cents', v_evidence.amount_cents,
      'provider_refund_id', v_refund.provider_refund_id
    );
  end if;

  update private.eats_payment_evidence
     set refund_state = 'refunded',
         refund_error = null,
         refunded_at = coalesce(refunded_at, pg_catalog.now()),
         updated_at = pg_catalog.now()
   where id = v_evidence.id;

  select pg_catalog.count(*)::integer
    into v_remaining
    from private.eats_payment_evidence as evidence
   where evidence.order_id = p_order_id
     and evidence.refund_state in ('required', 'pending');

  v_next_payment_status := case
    when v_evidence.preserve_order_payment_state
      and (
        v_order.status::text not in ('cancelled', 'refunded', 'delivered', 'completed')
        or (
          v_order.status::text = 'cancelled'
          and v_order.payment_status = 'paid'
          and v_order.last_payment_error = 'cancelled_no_refund'
        )
      )
      then coalesce(nullif(v_evidence.prior_payment_status, 'refund_pending'), 'paid')
    when v_remaining = 0 then 'refunded'
    else 'refund_pending'
  end;

  update public.food_orders
     set status = case when v_next_payment_status = 'refunded' then 'refunded' else status end,
         cancelled_at = case
           when v_next_payment_status = 'refunded' then coalesce(cancelled_at, pg_catalog.now())
           else cancelled_at
         end,
         payment_status = v_next_payment_status,
         refund_status = case
           when v_next_payment_status = 'refunded' then 'refunded'
           when v_evidence.preserve_order_payment_state and v_remaining = 0 then 'conflict_refunded'
           when v_remaining > 0 then 'partially_refunded'
           else refund_status
         end,
         refund_amount = (
           select coalesce(pg_catalog.sum(evidence.amount_cents), 0)::numeric / 100
             from private.eats_payment_evidence as evidence
            where evidence.order_id = p_order_id
              and evidence.refund_state = 'refunded'
         ),
         refunded_at = coalesce(refunded_at, pg_catalog.now()),
         last_payment_error = case
           when v_next_payment_status = 'paid'
             and v_order.last_payment_error = 'cancelled_no_refund'
             then 'cancelled_no_refund'
           when v_remaining = 0 then null
           else 'additional_provider_refund_pending'
         end,
         updated_at = pg_catalog.now()
   where id = p_order_id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case
      when v_next_payment_status = 'refunded' then 'refunded'
      when v_next_payment_status = 'paid' then 'provider_evidence_conflict_refunded'
      else 'additional_provider_refund_pending'
    end,
    'payment_status', v_next_payment_status,
    'refund_complete', v_remaining = 0,
    'remaining_refund_count', v_remaining,
    'provider_refund_id', v_refund.provider_refund_id,
    'refunded_cents', v_refunded_cents
  );
end;
$$;

-- Compatibility for callers that only know success vs non-success. False is
-- deliberately treated as uncertain/pending so it cannot rotate the provider
-- idempotency key without exact failed evidence.
create or replace function public.finish_eats_provider_refund_with_evidence(
  p_order_id uuid,
  p_provider text,
  p_payment_id text,
  p_refund_id text,
  p_refund_amount_cents integer,
  p_refund_currency text,
  p_refund_succeeded boolean,
  p_error text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select public.finish_eats_provider_refund_with_evidence(
    p_order_id,
    p_provider,
    p_payment_id,
    p_refund_id,
    p_refund_amount_cents,
    p_refund_currency,
    case when p_refund_succeeded then 'succeeded' else 'pending' end,
    p_error
  );
$$;

revoke all on function public.finish_eats_provider_refund_with_evidence(uuid, text, text, text, integer, text, text, text)
  from public, anon, authenticated;
revoke all on function public.finish_eats_provider_refund_with_evidence(uuid, text, text, text, integer, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.finish_eats_provider_refund_with_evidence(uuid, text, text, text, integer, text, text, text)
  to service_role;
grant execute on function public.finish_eats_provider_refund_with_evidence(uuid, text, text, text, integer, text, boolean, text)
  to service_role;

create or replace function public.claim_eats_restaurant_cancellation(
  p_order_id uuid,
  p_restaurant_owner_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_restaurant_name text;
  v_evidence private.eats_payment_evidence%rowtype;
  v_has_wallet_debit boolean := false;
  v_refunded_cents integer := 0;
  v_refund_cents integer := 0;
begin
  select food.*
    into v_order
    from public.food_orders as food
   where food.id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select restaurant.name
    into v_restaurant_name
    from public.restaurants as restaurant
   where restaurant.id = v_order.restaurant_id
     and restaurant.owner_id = p_restaurant_owner_id;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_order.status::text in ('delivered', 'completed') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'already_inactive',
      'current_status', v_order.status
    );
  end if;
  if v_order.status::text = 'refunded' or v_order.payment_status = 'refunded' then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'already_refunded',
      'order_id', v_order.id,
      'customer_id', v_order.customer_id,
      'restaurant_name', v_restaurant_name,
      'payment_status', 'refunded',
      'refund_required', false,
      'wallet_refund_required', false
    );
  end if;

  update public.food_orders
     set status = case when status::text = 'refunded' then status else 'cancelled' end,
         cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
         cancelled_by = coalesce(cancelled_by, 'restaurant'),
         cancellation_reason = coalesce(
           nullif(pg_catalog.left(pg_catalog.btrim(p_reason), 500), ''),
           cancellation_reason,
           'Restaurant cancelled'
         ),
         updated_at = pg_catalog.now()
   where id = v_order.id;

  if v_order.payment_type = 'wallet' or v_order.payment_provider = 'wallet' then
    select exists (
      select 1
        from public.customer_wallet_transactions as tx
       where tx.user_id = v_order.customer_id
         and (tx.reference_id = v_order.id or tx.order_id = v_order.id)
         and tx.type in ('purchase', 'payment')
         and tx.amount_cents < 0
    ) into v_has_wallet_debit;

    if not v_has_wallet_debit and v_order.payment_status not in ('paid', 'refund_pending') then
      update public.food_orders
         set payment_status = 'unpaid',
             last_payment_error = null,
             updated_at = pg_catalog.now()
       where id = v_order.id;
      return pg_catalog.jsonb_build_object(
        'ok', true,
        'code', 'cancelled_unpaid',
        'order_id', v_order.id,
        'customer_id', v_order.customer_id,
        'restaurant_name', v_restaurant_name,
        'payment_provider', 'wallet',
        'payment_status', 'unpaid',
        'wallet_refund_required', false,
        'refund_required', false
      );
    end if;
    if not v_has_wallet_debit or v_order.payment_type is distinct from 'wallet' then
      update public.food_orders
         set payment_status = 'refund_pending',
             last_payment_error = 'restaurant_wallet_evidence_missing',
             updated_at = pg_catalog.now()
       where id = v_order.id;
      return pg_catalog.jsonb_build_object(
        'ok', true,
        'code', 'wallet_evidence_missing',
        'order_id', v_order.id,
        'customer_id', v_order.customer_id,
        'restaurant_name', v_restaurant_name,
        'payment_provider', 'wallet',
        'payment_status', 'refund_pending',
        'wallet_refund_required', false,
        'refund_required', false,
        'reconciliation_required', true
      );
    end if;
    update public.food_orders
       set payment_status = case when payment_status = 'refunded' then payment_status else 'refund_pending' end,
           last_payment_error = case when payment_status = 'refunded' then null else 'restaurant_wallet_refund_pending' end
     where id = v_order.id;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'claimed',
      'order_id', v_order.id,
      'customer_id', v_order.customer_id,
      'restaurant_name', v_restaurant_name,
      'payment_provider', 'wallet',
      'payment_status', case when v_order.payment_status = 'refunded' then 'refunded' else 'refund_pending' end,
      'wallet_refund_required', v_order.payment_status <> 'refunded',
      'refund_required', false
    );
  end if;

  if v_order.payment_status not in ('paid', 'refund_pending') then
    update public.food_orders
       set payment_status = 'unpaid',
           last_payment_error = null
     where id = v_order.id;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'cancelled_unpaid',
      'order_id', v_order.id,
      'customer_id', v_order.customer_id,
      'restaurant_name', v_restaurant_name,
      'payment_status', 'unpaid',
      'refund_required', false
    );
  end if;

  update private.eats_payment_evidence
     set refund_state = case when refund_state = 'refunded' then refund_state else 'required' end,
         refund_origin = case when refund_state = 'refunded' then refund_origin else 'restaurant_cancel' end,
         preserve_order_payment_state = false,
         updated_at = pg_catalog.now()
   where order_id = v_order.id
     and refund_state <> 'refunded';

  select evidence.*
    into v_evidence
    from private.eats_payment_evidence as evidence
   where evidence.order_id = v_order.id
     and evidence.refund_state in ('required', 'pending')
   order by evidence.created_at, evidence.id
   limit 1
   for update;

  if not found then
    update public.food_orders
       set payment_status = case when payment_status = 'refunded' then payment_status else 'refund_pending' end,
           last_payment_error = case when payment_status = 'refunded' then null else 'restaurant_provider_evidence_missing' end
     where id = v_order.id;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', case when v_order.payment_status = 'refunded' then 'already_refunded' else 'provider_evidence_missing' end,
      'order_id', v_order.id,
      'customer_id', v_order.customer_id,
      'restaurant_name', v_restaurant_name,
      'payment_status', case when v_order.payment_status = 'refunded' then 'refunded' else 'refund_pending' end,
      'refund_required', false,
      'reconciliation_required', v_order.payment_status <> 'refunded'
    );
  end if;

  select coalesce(pg_catalog.sum(refund.amount_cents), 0)::integer
    into v_refunded_cents
    from private.eats_provider_refund_evidence as refund
   where refund.payment_evidence_id = v_evidence.id
     and refund.status = 'succeeded'
     and refund.currency = v_evidence.currency;
  v_refund_cents := pg_catalog.greatest(v_evidence.amount_cents - v_refunded_cents, 0);

  update public.food_orders
     set payment_status = 'refund_pending',
         last_payment_error = 'restaurant_cancellation_refund_pending'
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'order_id', v_order.id,
    'customer_id', v_order.customer_id,
    'restaurant_name', v_restaurant_name,
    'payment_status', 'refund_pending',
    'payment_provider', v_evidence.provider,
    'payment_id', v_evidence.payment_id,
    'stripe_payment_id', case when v_evidence.provider = 'stripe' then v_evidence.payment_id else null end,
    'paypal_capture_id', case when v_evidence.provider = 'paypal' then v_evidence.payment_id else null end,
    'square_payment_id', case when v_evidence.provider = 'square' then v_evidence.payment_id else null end,
    'total_cents', v_refund_cents,
    'refund_currency', v_evidence.currency,
    'refund_evidence_id', v_evidence.id,
    'refund_idempotency_key', case v_evidence.provider
      when 'stripe' then 'refund-eats-' || v_evidence.payment_id || '-' || v_refund_cents::text ||
        case when v_evidence.refund_attempt_generation > 0
          then '-r' || v_evidence.refund_attempt_generation::text else '' end
      when 'paypal' then 'eats-' || pg_catalog.right(
        v_evidence.payment_id,
        case when v_evidence.refund_attempt_generation > 0 then 14 else 20 end
      ) || '-' || v_refund_cents::text ||
        case when v_evidence.refund_attempt_generation > 0
          then '-r' || v_evidence.refund_attempt_generation::text else '' end
      when 'square' then 'eats-' || pg_catalog.right(
        v_evidence.payment_id,
        case when v_evidence.refund_attempt_generation > 0 then 20 else 24 end
      ) || '-' || v_refund_cents::text ||
        case when v_evidence.refund_attempt_generation > 0
          then '-r' || v_evidence.refund_attempt_generation::text else '' end
    end,
    'refund_attempt_generation', v_evidence.refund_attempt_generation,
    'refund_required', v_refund_cents > 0,
    'reconciliation_required', v_refund_cents <= 0,
    'wallet_refund_required', false
  );
end;
$$;

revoke all on function public.claim_eats_restaurant_cancellation(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_eats_restaurant_cancellation(uuid, uuid, text)
  to service_role;

create or replace function public.claim_eats_wallet_cancellation(
  p_order_id uuid,
  p_customer_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_has_wallet_debit boolean := false;
  v_eligible boolean := false;
begin
  select * into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_order.customer_id is distinct from p_customer_id then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_order.status::text in ('delivered', 'completed') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'already_inactive');
  end if;

  select exists (
    select 1
      from public.customer_wallet_transactions as tx
     where tx.user_id = p_customer_id
       and (tx.reference_id = p_order_id or tx.order_id = p_order_id)
       and tx.type in ('purchase', 'payment')
       and tx.amount_cents < 0
  ) into v_has_wallet_debit;
  if v_order.payment_type is distinct from 'wallet' and not v_has_wallet_debit then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_wallet_payment');
  end if;
  if not v_has_wallet_debit
     and v_order.payment_status in ('paid', 'refund_pending', 'refunded') then
    update public.food_orders
       set status = case when status::text = 'refunded' then status else 'cancelled' end,
           cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
           cancelled_by = coalesce(cancelled_by, 'customer'),
           payment_status = case when payment_status = 'refunded' then payment_status else 'refund_pending' end,
           last_payment_error = case
             when payment_status = 'refunded' then null
             else 'customer_wallet_evidence_missing'
           end,
           updated_at = pg_catalog.now()
     where id = v_order.id;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', case when v_order.payment_status = 'refunded' then 'already_refunded' else 'wallet_evidence_missing' end,
      'order_id', v_order.id,
      'eligible', false,
      'wallet_refund_required', false,
      'payment_status', case when v_order.payment_status = 'refunded' then 'refunded' else 'refund_pending' end,
      'reconciliation_required', v_order.payment_status <> 'refunded'
    );
  end if;

  v_eligible := v_order.driver_id is null
    and v_order.status::text not in (
      'in_transit', 'out_for_delivery', 'picked_up', 'refunded',
      'delivered', 'completed'
    );

  update public.food_orders
     set status = case when status::text = 'refunded' then status else 'cancelled' end,
         cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
         cancelled_by = coalesce(cancelled_by, 'customer'),
         cancellation_reason = coalesce(
           nullif(pg_catalog.left(pg_catalog.btrim(p_reason), 500), ''),
           cancellation_reason,
           'Customer cancelled'
         ),
         payment_provider = 'wallet',
         payment_status = case
           when payment_status = 'refunded' then 'refunded'
           when v_eligible and v_has_wallet_debit then 'refund_pending'
           else payment_status
         end,
         last_payment_error = case
           when payment_status = 'refunded' then null
           when v_eligible and v_has_wallet_debit then 'customer_wallet_refund_pending'
           else 'cancelled_no_refund'
         end,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case
      when v_order.payment_status = 'refunded' then 'already_refunded'
      when v_eligible and v_has_wallet_debit then 'claimed'
      else 'cancelled_no_refund'
    end,
    'order_id', v_order.id,
    'eligible', v_eligible,
    'wallet_refund_required', v_order.payment_status <> 'refunded'
      and v_eligible and v_has_wallet_debit,
    'payment_status', case
      when v_order.payment_status = 'refunded' then 'refunded'
      when v_eligible and v_has_wallet_debit then 'refund_pending'
      else v_order.payment_status
    end
  );
end;
$$;

revoke all on function public.claim_eats_wallet_cancellation(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_eats_wallet_cancellation(uuid, uuid, text)
  to service_role;

-- Lock the order and reserve its unique merchant-transfer ledger in one short
-- transaction. This closes the paid-order SELECT -> ledger INSERT window where
-- a concurrent cancellation could previously miss a transfer that was created
-- immediately after its reversal check. Both this claim and the reversal claim
-- lock food_orders first, so cancellation either prevents the payout claim or
-- observes the durable transfer reservation.
create or replace function public.claim_eats_payout_transfer(p_order_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_transfer public.eats_payout_ledger%rowtype;
  v_paid_without_refund boolean := false;
  v_payout_authorized boolean := false;
  v_settled_cents bigint;
  v_commission_percent numeric;
  v_commission_cents bigint;
  v_transfer_cents bigint;
  v_stripe_account_id text;
  v_auto_payout_enabled boolean;
begin
  select food.*
    into v_order
    from public.food_orders as food
   where food.id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  v_paid_without_refund := v_order.payment_status = 'paid'
    and v_order.status::text = 'cancelled'
    and v_order.last_payment_error = 'cancelled_no_refund';
  v_payout_authorized := v_order.payment_status = 'paid'
    and v_order.status is not null
    and (
      v_order.status::text not in ('cancelled', 'refunded')
      or v_paid_without_refund
    );
  if not v_payout_authorized then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'payout_not_authorized',
      'payout_required', false
    );
  end if;
  if v_order.payment_provider is not null
     and v_order.payment_provider <> 'stripe' then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'provider_not_stripe',
      'payout_required', false
    );
  end if;

  v_settled_cents := pg_catalog.round(v_order.total_amount * 100)::bigint;
  v_commission_percent := v_order.commission_percent;
  v_commission_cents := v_order.commission_amount_cents;
  v_transfer_cents := v_order.restaurant_payout_cents;
  if v_settled_cents <= 0
     or v_commission_percent is null
     or v_commission_percent < 0
     or v_commission_percent > 100
     or v_commission_cents is null
     or v_commission_cents < 0
     or v_transfer_cents is null
     or v_transfer_cents < 0
     or v_commission_cents > v_settled_cents
     or v_transfer_cents > v_settled_cents
     or v_commission_cents is distinct from
       pg_catalog.round(
         v_settled_cents * v_commission_percent / 100.0
       )::bigint
     or v_transfer_cents is distinct from
       v_settled_cents - v_commission_cents then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'invalid_payout_snapshot'
    );
  end if;
  if v_transfer_cents = 0 then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'zero_payout',
      'payout_required', false
    );
  end if;

  -- Restaurant state supplies Connect routing/enablement only. The monetary
  -- values above always come from the immutable order snapshot.
  select pg_catalog.btrim(restaurant.stripe_account_id),
         restaurant.auto_payout_enabled
    into v_stripe_account_id, v_auto_payout_enabled
    from public.restaurants as restaurant
   where restaurant.id = v_order.restaurant_id;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'restaurant_not_found');
  end if;
  if not coalesce(v_auto_payout_enabled, false)
     or v_stripe_account_id is null
     or v_stripe_account_id = '' then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'connect_payout_not_enabled',
      'payout_required', false
    );
  end if;

  insert into public.eats_payout_ledger (
    order_id,
    restaurant_id,
    stripe_account_id,
    direction,
    amount_cents,
    commission_cents,
    commission_rate,
    status
  ) values (
    v_order.id,
    v_order.restaurant_id,
    v_stripe_account_id,
    'transfer',
    v_transfer_cents,
    v_commission_cents,
    v_commission_percent,
    'queued'
  )
  on conflict (order_id, direction) do nothing
  returning * into v_transfer;

  if v_transfer.id is null then
    select ledger.*
      into v_transfer
      from public.eats_payout_ledger as ledger
     where ledger.order_id = v_order.id
       and ledger.direction = 'transfer'
     for update;
  end if;
  if v_transfer.id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'transfer_claim_missing');
  end if;
  if v_transfer.restaurant_id is distinct from v_order.restaurant_id
     or v_transfer.stripe_account_id is distinct from v_stripe_account_id
     or v_transfer.amount_cents is distinct from v_transfer_cents
     or v_transfer.commission_cents is distinct from v_commission_cents
     or v_transfer.commission_rate is distinct from v_commission_percent then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'transfer_snapshot_conflict');
  end if;
  if v_transfer.status not in ('queued', 'failed', 'created') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'transfer_state_conflict');
  end if;
  if (v_transfer.status = 'created') is distinct from
     (v_transfer.stripe_transfer_id is not null) then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'transfer_evidence_conflict');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case
      when v_transfer.status = 'created' then 'already_transferred'
      else 'claimed'
    end,
    'payout_required', v_transfer.status <> 'created',
    'transfer_ledger_id', v_transfer.id,
    'order_id', v_order.id,
    'restaurant_id', v_transfer.restaurant_id,
    'stripe_account_id', v_transfer.stripe_account_id,
    'amount_cents', v_transfer.amount_cents,
    'commission_cents', v_transfer.commission_cents,
    'commission_rate', v_transfer.commission_rate,
    'status', v_transfer.status,
    'stripe_transfer_id', v_transfer.stripe_transfer_id,
    'idempotency_key', 'eats-transfer-' || v_order.id::text
  );
end;
$$;

revoke all on function public.claim_eats_payout_transfer(uuid)
  from public, anon, authenticated;
grant execute on function public.claim_eats_payout_transfer(uuid)
  to service_role;

create or replace function public.claim_eats_payout_reversal(p_order_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_transfer public.eats_payout_ledger%rowtype;
  v_reversal public.eats_payout_ledger%rowtype;
begin
  select * into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_order.status::text not in ('cancelled', 'refunded') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_cancelled');
  end if;
  if v_order.payment_status::text <> 'refunded' then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'customer_refund_not_complete');
  end if;

  -- Once the customer refund is terminal, payout reversal becomes an
  -- independently retryable obligation. Keep a customer-visible durable marker
  -- on the order until the ledger proves that no reversal is needed or the
  -- exact Stripe reversal has completed.
  if v_order.payment_status::text = 'refunded' then
    update public.food_orders
       set last_payment_error = 'payout_reversal_pending',
           updated_at = pg_catalog.now()
     where id = p_order_id;
  end if;

  select * into v_transfer
    from public.eats_payout_ledger
   where order_id = p_order_id and direction = 'transfer'
   for update;
  if not found then
    update public.food_orders
       set last_payment_error = null,
           updated_at = pg_catalog.now()
     where id = p_order_id
       and last_payment_error = 'payout_reversal_pending';
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'reversal_not_required',
      'reversal_required', false
    );
  end if;
  if v_transfer.stripe_transfer_id is null then
    if v_transfer.status not in ('queued', 'failed', 'created') then
      return pg_catalog.jsonb_build_object('ok', false, 'code', 'transfer_state_conflict');
    end if;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'transfer_recovery_required',
      'transfer_recovery_required', true,
      'reversal_required', false,
      'transfer_ledger_id', v_transfer.id,
      'amount_cents', v_transfer.amount_cents,
      'restaurant_id', v_transfer.restaurant_id,
      'stripe_account_id', v_transfer.stripe_account_id,
      'commission_cents', v_transfer.commission_cents,
      'idempotency_key', 'eats-transfer-' || p_order_id::text
    );
  end if;

  insert into public.eats_payout_ledger (
    order_id,
    restaurant_id,
    stripe_account_id,
    direction,
    amount_cents,
    commission_cents,
    commission_rate,
    status
  ) values (
    p_order_id,
    v_transfer.restaurant_id,
    v_transfer.stripe_account_id,
    'reversal',
    v_transfer.amount_cents,
    0,
    0,
    'queued'
  )
  on conflict (order_id, direction) do nothing
  returning * into v_reversal;

  if v_reversal.id is null then
    select * into v_reversal
      from public.eats_payout_ledger
     where order_id = p_order_id and direction = 'reversal'
     for update;
  end if;

  if v_reversal.amount_cents is distinct from v_transfer.amount_cents then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'reversal_amount_conflict');
  end if;
  if v_reversal.status = 'created' and v_reversal.stripe_reversal_id is not null then
    update public.food_orders
       set last_payment_error = null,
           updated_at = pg_catalog.now()
     where id = p_order_id
       and last_payment_error = 'payout_reversal_pending';
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'already_reversed',
      'reversal_required', false,
      'stripe_reversal_id', v_reversal.stripe_reversal_id
    );
  end if;
  if v_reversal.status not in ('queued', 'failed', 'created') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'reversal_state_conflict');
  end if;

  update public.eats_payout_ledger
     set status = 'queued',
         error_message = null,
         updated_at = pg_catalog.now()
   where id = v_reversal.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'reversal_required', true,
    'reversal_ledger_id', v_reversal.id,
    'stripe_transfer_id', v_transfer.stripe_transfer_id,
    'amount_cents', v_transfer.amount_cents,
    'idempotency_key', 'eats-reversal-' || p_order_id::text
  );
end;
$$;

create or replace function public.bind_eats_payout_transfer(
  p_order_id uuid,
  p_transfer_ledger_id uuid,
  p_stripe_transfer_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_transfer public.eats_payout_ledger%rowtype;
begin
  if p_stripe_transfer_id is null or pg_catalog.btrim(p_stripe_transfer_id) = '' then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'missing_transfer_evidence');
  end if;
  select * into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  select * into v_transfer
    from public.eats_payout_ledger
   where id = p_transfer_ledger_id
     and order_id = p_order_id
     and direction = 'transfer'
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'transfer_claim_missing');
  end if;
  if v_transfer.stripe_transfer_id is not null
     and v_transfer.stripe_transfer_id <> p_stripe_transfer_id then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'transfer_evidence_conflict');
  end if;
  update public.eats_payout_ledger
     set status = 'created',
         stripe_transfer_id = p_stripe_transfer_id,
         error_message = null,
         updated_at = pg_catalog.now()
   where id = v_transfer.id;
  return pg_catalog.jsonb_build_object('ok', true, 'code', 'transfer_bound');
end;
$$;

create or replace function public.finish_eats_payout_reversal(
  p_order_id uuid,
  p_reversal_ledger_id uuid,
  p_stripe_reversal_id text,
  p_succeeded boolean,
  p_error text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_reversal public.eats_payout_ledger%rowtype;
begin
  select * into v_reversal
    from public.eats_payout_ledger
   where id = p_reversal_ledger_id
     and order_id = p_order_id
     and direction = 'reversal'
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'reversal_claim_missing');
  end if;
  if v_reversal.status = 'created' and v_reversal.stripe_reversal_id is not null then
    if p_stripe_reversal_id is not null
       and v_reversal.stripe_reversal_id <> p_stripe_reversal_id then
      return pg_catalog.jsonb_build_object('ok', false, 'code', 'reversal_evidence_conflict');
    end if;
    update public.food_orders
       set last_payment_error = null,
           updated_at = pg_catalog.now()
     where id = p_order_id
       and last_payment_error = 'payout_reversal_pending';
    return pg_catalog.jsonb_build_object('ok', true, 'code', 'already_reversed');
  end if;
  if p_succeeded and (p_stripe_reversal_id is null or pg_catalog.btrim(p_stripe_reversal_id) = '') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'missing_reversal_evidence');
  end if;

  update public.eats_payout_ledger
     set status = case when p_succeeded then 'created' else 'failed' end,
         stripe_reversal_id = case when p_succeeded then p_stripe_reversal_id else stripe_reversal_id end,
         error_message = case
           when p_succeeded then null
           else pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_error), ''), 'stripe_reversal_pending'), 300)
         end,
         updated_at = pg_catalog.now()
   where id = v_reversal.id;

  if p_succeeded then
    update public.food_orders
       set last_payment_error = null,
           updated_at = pg_catalog.now()
     where id = p_order_id
       and last_payment_error = 'payout_reversal_pending';
  else
    update public.food_orders
       set last_payment_error = 'payout_reversal_pending',
           updated_at = pg_catalog.now()
     where id = p_order_id
       and payment_status::text = 'refunded';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case when p_succeeded then 'reversed' else 'reversal_pending' end,
    'reversal_complete', p_succeeded
  );
end;
$$;

revoke all on function public.claim_eats_payout_reversal(uuid)
  from public, anon, authenticated;
revoke all on function public.bind_eats_payout_transfer(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.finish_eats_payout_reversal(uuid, uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.claim_eats_payout_reversal(uuid) to service_role;
grant execute on function public.bind_eats_payout_transfer(uuid, uuid, text) to service_role;
grant execute on function public.finish_eats_payout_reversal(uuid, uuid, text, boolean, text)
  to service_role;

-- Release only the exact authenticated driver assigned to the exact terminal
-- Eats job, and only after serializing on that driver's status row. A current
-- assignment to any other job, or any other live assigned job in any vertical,
-- keeps the driver busy. This supports safe recovery of historical overlap
-- while the acceptance CAS below prevents new overlap.
create or replace function public.release_eats_driver_if_idle(
  p_driver_user_id uuid,
  p_terminal_job_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_driver_status public.drivers_status%rowtype;
  v_has_other_live_job boolean := false;
begin
  if p_driver_user_id is null or p_terminal_job_id is null then
    return false;
  end if;

  select status.*
    into v_driver_status
    from public.drivers_status as status
   where status.driver_id = p_driver_user_id
   for update;
  if not found then
    return false;
  end if;

  -- Never clear a newer assignment that won the driver-row lock first.
  if v_driver_status.current_job_id is not null
     and v_driver_status.current_job_id is distinct from p_terminal_job_id then
    return false;
  end if;

  select exists (
    select 1
      from public.jobs as job
     where job.assigned_driver_id = p_driver_user_id
       and job.id <> p_terminal_job_id
       and job.status not in ('completed', 'canceled')
  ) into v_has_other_live_job;
  if v_has_other_live_job then
    return false;
  end if;

  update public.drivers_status
     set is_busy = false,
         driver_state = case when is_online then 'online_available' else 'offline' end,
         current_job_id = null,
         last_seen = pg_catalog.now(),
         updated_at = pg_catalog.now()
   where driver_id = p_driver_user_id
     and (current_job_id is null or current_job_id = p_terminal_job_id);
  return found;
end;
$$;

revoke all on function public.release_eats_driver_if_idle(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.release_eats_driver_if_idle(uuid, uuid)
  to service_role;

create or replace function public.cascade_eats_cancellation(
  p_order_id uuid,
  p_cancel_source text default 'customer'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_service_count integer := 0;
  v_job_count integer := 0;
  v_service_offer_count integer := 0;
  v_job_offer_count integer := 0;
  v_job_id uuid;
  v_driver_user_id uuid;
  v_driver_released boolean := false;
begin
  select * into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_order.status::text not in ('cancelled', 'refunded') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_cancelled');
  end if;

  select job.id, job.assigned_driver_id
    into v_job_id, v_driver_user_id
    from public.jobs as job
   where job.external_kind = 'food_order'
     and job.external_order_id = p_order_id
     and job.assigned_driver_id is not null
   order by job.id
   limit 1
   for update;

  update public.service_offers as offer
     set status = 'cancelled', responded_at = coalesce(responded_at, pg_catalog.now())
   where offer.order_id in (
     select service.id from public.service_orders as service
      where service.external_kind = 'food_order'
        and service.external_order_id = p_order_id
   )
     and offer.status = 'pending';
  get diagnostics v_service_offer_count = row_count;

  update public.service_orders as service
     set status = 'cancelled',
         cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
         cancellation_reason = coalesce(cancellation_reason, 'Eats order cancelled'),
         cancel_source = coalesce(nullif(pg_catalog.left(pg_catalog.btrim(p_cancel_source), 40), ''), 'customer'),
         updated_at = pg_catalog.now()
   where service.external_kind = 'food_order'
     and service.external_order_id = p_order_id
     and service.status not in ('cancelled', 'completed');
  get diagnostics v_service_count = row_count;

  update public.job_offers as offer
     set status = 'cancelled'
   where offer.job_id in (
     select job.id from public.jobs as job
      where job.external_kind = 'food_order'
        and job.external_order_id = p_order_id
   )
     and offer.status = 'pending';
  get diagnostics v_job_offer_count = row_count;

  update public.jobs as job
     set status = 'canceled', updated_at = pg_catalog.now()
   where job.external_kind = 'food_order'
     and job.external_order_id = p_order_id
     and job.status <> 'completed';
  get diagnostics v_job_count = row_count;

  if v_driver_user_id is not null then
    v_driver_released := public.release_eats_driver_if_idle(
      v_driver_user_id,
      v_job_id
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'cascaded',
    'service_orders_cancelled', v_service_count,
    'service_offers_cancelled', v_service_offer_count,
    'jobs_cancelled', v_job_count,
    'job_offers_cancelled', v_job_offer_count,
    'driver_released', v_driver_released
  );
end;
$$;

revoke all on function public.cascade_eats_cancellation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.cascade_eats_cancellation(uuid, text) to service_role;

create or replace function public.claim_eats_dispatch(p_order_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_job public.jobs%rowtype;
  v_service public.service_orders%rowtype;
  v_existing_job boolean := false;
  v_existing_service boolean := false;
begin
  select * into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_dispatchable', 'order_status', v_order.status);
  end if;
  if v_order.payment_status not in ('paid', 'cash_on_delivery') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'payment_not_dispatchable', 'payment_status', v_order.payment_status);
  end if;
  if v_order.needs_driver = false or v_order.ride_type = 'pickup' then
    update public.food_orders
       set last_payment_error = null,
           updated_at = pg_catalog.now()
     where id = v_order.id
       and last_payment_error in ('delivery_dispatch_pending', 'delivery_dispatch_in_progress');
    return pg_catalog.jsonb_build_object('ok', true, 'code', 'pickup_no_dispatch', 'dispatch_required', false);
  end if;

  select * into v_restaurant
    from public.restaurants
   where id = v_order.restaurant_id;
  if not found
     or v_restaurant.lat is null or v_restaurant.lng is null
     or v_restaurant.lat < -90 or v_restaurant.lat > 90
     or v_restaurant.lng < -180 or v_restaurant.lng > 180 then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'restaurant_origin_unavailable');
  end if;

  select * into v_job
    from public.jobs
   where external_kind = 'food_order'
     and external_order_id = p_order_id
   for update;
  if found then
    v_existing_job := true;
  else
    insert into public.jobs (
      customer_id,
      job_type,
      status,
      pickup_address,
      pickup_lat,
      pickup_lng,
      dropoff_address,
      dropoff_lat,
      dropoff_lng,
      notes,
      price_total,
      requested_at,
      external_kind,
      external_order_id,
      payment_status
    ) values (
      v_order.customer_id,
      'food_delivery',
      'requested',
      coalesce(nullif(v_restaurant.name, ''), 'Restaurant'),
      v_restaurant.lat,
      v_restaurant.lng,
      v_order.delivery_address,
      v_order.delivery_lat,
      v_order.delivery_lng,
      'Food order: ' || v_order.id::text,
      v_order.total_amount,
      pg_catalog.now(),
      'food_order',
      v_order.id,
      v_order.payment_status
    )
    returning * into v_job;
  end if;

  select * into v_service
    from public.service_orders
   where external_kind = 'food_order'
     and external_order_id = p_order_id
   for update;
  if found then
    v_existing_service := true;
  else
    insert into public.service_orders (
      kind,
      status,
      customer_id,
      shop_id,
      pickup_address,
      pickup_lat,
      pickup_lng,
      dropoff_address,
      dropoff_lat,
      dropoff_lng,
      items,
      special_notes,
      subtotal_cents,
      delivery_fee_cents,
      service_fee_cents,
      tip_cents,
      total_cents,
      currency,
      payment_status,
      external_order_id,
      external_kind
    ) values (
      'delivery',
      'searching',
      v_order.customer_id,
      v_order.restaurant_id,
      coalesce(nullif(v_restaurant.name, ''), 'Restaurant'),
      v_restaurant.lat,
      v_restaurant.lng,
      v_order.delivery_address,
      v_order.delivery_lat,
      v_order.delivery_lng,
      v_order.items,
      v_order.special_instructions,
      pg_catalog.round(coalesce(v_order.subtotal, 0) * 100)::integer,
      pg_catalog.round(coalesce(v_order.delivery_fee, 0) * 100)::integer,
      pg_catalog.round(coalesce(v_order.service_fee, 0) * 100)::integer,
      pg_catalog.round(coalesce(v_order.tip_amount, 0) * 100)::integer,
      pg_catalog.round(v_order.total_amount * 100)::integer,
      coalesce(nullif(pg_catalog.upper(v_order.currency), ''), 'USD'),
      v_order.payment_status,
      v_order.id,
      'food_order'
    )
    returning * into v_service;
  end if;

  update public.food_orders
     set last_payment_error = 'delivery_dispatch_in_progress',
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'dispatch_required', true,
    'job_id', v_job.id,
    'service_order_id', v_service.id,
    'customer_id', v_order.customer_id,
    'already_dispatched', v_existing_job and v_existing_service
  );
end;
$$;

create or replace function public.finish_eats_dispatch(
  p_order_id uuid,
  p_job_id uuid,
  p_succeeded boolean,
  p_error text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_job public.jobs%rowtype;
begin
  select * into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  select * into v_job
    from public.jobs
   where id = p_job_id
     and external_kind = 'food_order'
     and external_order_id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'dispatch_job_mismatch');
  end if;

  if v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_dispatchable');
  end if;

  if p_succeeded and v_job.status not in (
    'dispatched', 'assigned', 'enroute_pickup', 'arrived_pickup',
    'enroute_dropoff', 'completed'
  ) then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'dispatch_not_started');
  end if;

  update public.food_orders
     set last_payment_error = case
           when p_succeeded then null
           else pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_error), ''), 'delivery_dispatch_pending'), 300)
         end,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case when p_succeeded then 'dispatched' else 'dispatch_pending' end,
    'dispatch_complete', p_succeeded,
    'job_id', v_job.id
  );
end;
$$;

create or replace function public.claim_eats_job_offer(
  p_job_id uuid,
  p_driver_user_id uuid,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job public.jobs%rowtype;
  v_order public.food_orders%rowtype;
  v_offer public.job_offers%rowtype;
begin
  select * into v_job
    from public.jobs
   where id = p_job_id
     and external_kind = 'food_order';
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'eats_job_not_found');
  end if;

  select * into v_order
    from public.food_orders
   where id = v_job.external_order_id
   for update;
  if not found
     or v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_dispatchable');
  end if;

  select * into v_job
    from public.jobs
   where id = p_job_id
   for update;
  if v_job.assigned_driver_id is not null then
    return pg_catalog.jsonb_build_object('ok', true, 'code', 'already_assigned', 'offer_required', false);
  end if;
  if v_job.status not in ('requested', 'dispatched') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'job_not_dispatchable');
  end if;

  insert into public.job_offers (job_id, driver_id, offer_status, status, expires_at)
  values (p_job_id, p_driver_user_id, 'sent', 'pending', p_expires_at)
  on conflict (job_id, driver_id) do update
    set offer_status = 'sent',
        status = case when job_offers.status = 'accepted' then job_offers.status else 'pending' end,
        expires_at = case when job_offers.status = 'accepted' then job_offers.expires_at else excluded.expires_at end
  returning * into v_offer;

  update public.jobs
     set status = 'dispatched', updated_at = pg_catalog.now()
   where id = p_job_id
     and assigned_driver_id is null
     and status in ('requested', 'dispatched');
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'dispatch_cas_failed');
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'offered',
    'offer_required', true,
    'offer_id', v_offer.id,
    'driver_id', v_offer.driver_id
  );
end;
$$;

revoke all on function public.claim_eats_dispatch(uuid) from public, anon, authenticated;
revoke all on function public.finish_eats_dispatch(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.claim_eats_job_offer(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.claim_eats_dispatch(uuid) to service_role;
grant execute on function public.finish_eats_dispatch(uuid, uuid, boolean, text) to service_role;
grant execute on function public.claim_eats_job_offer(uuid, uuid, timestamptz) to service_role;

create or replace function public.accept_eats_job_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_driver_user_id uuid := (select auth.uid());
  v_driver_id uuid;
  v_offer public.job_offers%rowtype;
  v_job public.jobs%rowtype;
  v_order public.food_orders%rowtype;
  v_driver_status public.drivers_status%rowtype;
  v_job_id uuid;
  v_order_id uuid;
begin
  if v_driver_user_id is null then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_authenticated');
  end if;
  select driver.id into v_driver_id
    from public.drivers as driver
   where driver.user_id = v_driver_user_id;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'driver_not_found');
  end if;

  select offer.job_id, job.external_order_id
    into v_job_id, v_order_id
    from public.job_offers as offer
    join public.jobs as job on job.id = offer.job_id
   where offer.id = p_offer_id
     and offer.driver_id = v_driver_user_id
     and job.external_kind = 'food_order';
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'offer_not_found');
  end if;

  -- Every Eats authority transition locks in this order: food order, job,
  -- offer. Cancellation and dispatch use the same order to avoid deadlocks.
  select * into v_order
    from public.food_orders
   where id = v_order_id
   for update;
  if not found
     or v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_not_accepting_drivers');
  end if;

  select * into v_job
    from public.jobs
   where id = v_job_id
     and external_kind = 'food_order'
     and external_order_id = v_order.id
   for update;
  if not found or v_job.assigned_driver_id is not null
     or v_job.status not in ('requested', 'dispatched') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'job_not_available');
  end if;

  select * into v_offer
    from public.job_offers
   where id = p_offer_id
     and job_id = v_job.id
     and driver_id = v_driver_user_id
   for update;
  if not found
     or v_offer.status <> 'pending'
     or v_offer.expires_at is null
     or v_offer.expires_at <= pg_catalog.now() then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'offer_not_pending');
  end if;

  -- Serialize acceptance across every vertical on the authenticated driver's
  -- availability row. This lock/check happens before any assignment write, so
  -- two disjoint offers cannot both observe the same driver as available.
  select status.*
    into v_driver_status
    from public.drivers_status as status
   where status.driver_id = v_driver_user_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'driver_status_missing');
  end if;
  if v_driver_status.is_online is not true
     or coalesce(v_driver_status.is_busy, false)
     or v_driver_status.driver_state not in ('online_available', 'online')
     or v_driver_status.current_job_id is not null
     or (v_driver_status.paused_until is not null
         and v_driver_status.paused_until > pg_catalog.now()) then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'driver_not_available');
  end if;

  update public.drivers_status
     set is_busy = true,
         driver_state = 'online_busy',
         current_job_id = v_job.id,
         last_seen = pg_catalog.now(),
         updated_at = pg_catalog.now()
   where driver_id = v_driver_user_id
     and is_online is true
     and not coalesce(is_busy, false)
     and driver_state in ('online_available', 'online')
     and current_job_id is null
     and (paused_until is null or paused_until <= pg_catalog.now());
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'driver_availability_cas_failed');
  end if;

  update public.jobs
     set assigned_driver_id = v_driver_user_id,
         status = 'assigned',
         accepted_at = coalesce(accepted_at, pg_catalog.now()),
         updated_at = pg_catalog.now()
   where id = v_job.id
     and assigned_driver_id is null
     and status in ('requested', 'dispatched');
  if not found then
    raise exception using errcode = '40001', message = 'accept_cas_failed';
  end if;

  update public.job_offers
     set status = 'accepted', offer_status = 'accepted', accepted_at = pg_catalog.now()
   where id = v_offer.id and status = 'pending';
  if not found then
    raise exception using errcode = '40001', message = 'offer_accept_cas_failed';
  end if;
  update public.job_offers
     set status = 'cancelled'
   where job_id = v_job.id and id <> v_offer.id and status = 'pending';

  update public.food_orders
     set driver_id = v_driver_id,
         status = case when status::text = 'pending' then 'confirmed' else status end,
         assigned_at = coalesce(assigned_at, pg_catalog.now()),
         updated_at = pg_catalog.now()
   where id = v_order.id
     and driver_id is null
     and status::text not in ('cancelled', 'refunded', 'delivered', 'completed')
     and payment_status in ('paid', 'cash_on_delivery');
  if not found then
    raise exception using errcode = '40001', message = 'food_order_accept_cas_failed';
  end if;

  update public.service_orders
     set driver_id = v_driver_id,
         status = 'assigned',
         driver_assigned_at = coalesce(driver_assigned_at, pg_catalog.now()),
         updated_at = pg_catalog.now()
   where external_kind = 'food_order'
     and external_order_id = v_order.id
     and driver_id is null
     and status not in ('cancelled', 'completed');
  if not found then
    raise exception using errcode = '40001', message = 'service_order_accept_cas_failed';
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'accepted',
    'offer_id', v_offer.id,
    'job_id', v_job.id,
    'order_id', v_order.id,
    'driver_id', v_driver_id
  );
end;
$$;

revoke all on function public.accept_eats_job_offer(uuid) from public, anon;
grant execute on function public.accept_eats_job_offer(uuid) to authenticated;

create or replace function public.advance_eats_delivery_job(
  p_order_id uuid,
  p_driver_user_id uuid,
  p_job_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_job public.jobs%rowtype;
  v_driver_id uuid;
  v_requested text := pg_catalog.lower(pg_catalog.btrim(p_job_status));
  v_job_status public.job_status;
  v_order_status public.booking_status;
  v_service_status public.service_order_status;
  v_allowed boolean := false;
  v_driver_released boolean := false;
begin
  if v_requested not in ('assigned', 'en_route_pickup', 'arrived_pickup', 'en_route_dropoff', 'completed') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_driver_status');
  end if;
  select driver.id into v_driver_id
    from public.drivers as driver
   where driver.user_id = p_driver_user_id;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'driver_not_found');
  end if;

  select * into v_order
    from public.food_orders
   where id = p_order_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'order_terminal');
  end if;
  if v_order.driver_id is distinct from v_driver_id then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'driver_not_assigned');
  end if;

  select * into v_job
    from public.jobs as job
   where job.external_kind = 'food_order'
     and job.external_order_id = p_order_id
     and job.assigned_driver_id = p_driver_user_id
     and exists (
       select 1 from public.job_offers as offer
        where offer.job_id = job.id
          and offer.driver_id = p_driver_user_id
          and offer.status = 'accepted'
     )
   for update;
  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'accepted_offer_required');
  end if;

  v_job_status := case v_requested
    when 'assigned' then 'assigned'::public.job_status
    when 'en_route_pickup' then 'enroute_pickup'::public.job_status
    when 'arrived_pickup' then 'arrived_pickup'::public.job_status
    when 'en_route_dropoff' then 'enroute_dropoff'::public.job_status
    when 'completed' then 'completed'::public.job_status
  end;
  v_order_status := case v_requested
    when 'assigned' then 'confirmed'::public.booking_status
    when 'en_route_pickup' then 'preparing'::public.booking_status
    when 'arrived_pickup' then 'ready'::public.booking_status
    when 'en_route_dropoff' then 'out_for_delivery'::public.booking_status
    when 'completed' then 'delivered'::public.booking_status
  end;
  v_service_status := case v_requested
    when 'assigned' then 'assigned'::public.service_order_status
    when 'en_route_pickup' then 'driver_en_route'::public.service_order_status
    when 'arrived_pickup' then 'driver_arrived'::public.service_order_status
    when 'en_route_dropoff' then 'in_progress'::public.service_order_status
    when 'completed' then 'completed'::public.service_order_status
  end;

  v_allowed := case v_requested
    when 'assigned' then v_job.status = 'assigned'
    when 'en_route_pickup' then v_job.status in ('assigned', 'enroute_pickup')
    when 'arrived_pickup' then v_job.status in ('enroute_pickup', 'arrived_pickup')
    when 'en_route_dropoff' then v_job.status in ('arrived_pickup', 'enroute_dropoff')
    when 'completed' then v_job.status in ('enroute_dropoff', 'completed')
    else false
  end;
  if not v_allowed then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'stale_driver_transition', 'job_status', v_job.status);
  end if;

  update public.jobs
     set status = v_job_status,
         completed_at = case when v_requested = 'completed' then coalesce(completed_at, pg_catalog.now()) else completed_at end,
         updated_at = pg_catalog.now()
   where id = v_job.id and assigned_driver_id = p_driver_user_id;

  -- Advance the unified projection while the food order is still active. The
  -- terminal food-order update follows in the same transaction, so a missing
  -- or stale service row rolls every projection back instead of reporting a
  -- partially advanced delivery.
  update public.service_orders
     set status = v_service_status,
         completed_at = case when v_requested = 'completed' then coalesce(completed_at, pg_catalog.now()) else completed_at end,
         updated_at = pg_catalog.now()
   where external_kind = 'food_order'
     and external_order_id = v_order.id
     and driver_id = v_driver_id
     and status not in ('cancelled', 'completed');
  if not found then
    raise exception using errcode = '40001', message = 'service_order_transition_cas_failed';
  end if;

  update public.food_orders
     set status = v_order_status,
         delivered_at = case when v_requested = 'completed' then coalesce(delivered_at, pg_catalog.now()) else delivered_at end,
         updated_at = pg_catalog.now()
   where id = v_order.id
     and driver_id = v_driver_id
     and status::text not in ('cancelled', 'refunded', 'delivered', 'completed')
     and payment_status in ('paid', 'cash_on_delivery');
  if not found then
    raise exception using errcode = '40001', message = 'food_order_transition_cas_failed';
  end if;

  if v_requested = 'completed' then
    v_driver_released := public.release_eats_driver_if_idle(
      p_driver_user_id,
      v_job.id
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'advanced',
    'order_id', v_order.id,
    'job_id', v_job.id,
    'job_status', v_job_status,
    'order_status', v_order_status,
    'driver_released', v_driver_released
  );
end;
$$;

revoke all on function public.advance_eats_delivery_job(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.advance_eats_delivery_job(uuid, uuid, text)
  to service_role;

create or replace function public.guard_eats_job_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
begin
  if new.external_kind is distinct from 'food_order' or new.external_order_id is null then
    return new;
  end if;
  if new.status = 'canceled' then
    return new;
  end if;
  select * into v_order
    from public.food_orders
   where id = new.external_order_id
   for update;
  if not found
     or v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    raise exception using errcode = '23514', message = 'eats_order_not_fulfillable';
  end if;
  return new;
end;
$$;

create or replace function public.guard_eats_job_offer_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_order_id uuid;
begin
  if new.status not in ('pending', 'accepted') then
    return new;
  end if;
  select job.external_order_id into v_order_id
    from public.jobs as job
   where job.id = new.job_id and job.external_kind = 'food_order';
  if not found then
    return new;
  end if;
  select * into v_order
    from public.food_orders
   where id = v_order_id
   for update;
  if not found
     or v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    raise exception using errcode = '23514', message = 'eats_order_not_accepting_offers';
  end if;
  return new;
end;
$$;

create or replace function public.guard_eats_service_order_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
begin
  if new.external_kind is distinct from 'food_order' or new.external_order_id is null
     or new.status = 'cancelled' then
    return new;
  end if;
  select * into v_order
    from public.food_orders
   where id = new.external_order_id
   for update;
  if not found
     or v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    raise exception using errcode = '23514', message = 'eats_order_not_fulfillable';
  end if;
  return new;
end;
$$;

create or replace function public.guard_eats_service_offer_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_order_id uuid;
begin
  if new.status not in ('pending', 'accepted') then
    return new;
  end if;
  select service.external_order_id into v_order_id
    from public.service_orders as service
   where service.id = new.order_id and service.external_kind = 'food_order';
  if not found then
    return new;
  end if;
  select * into v_order
    from public.food_orders
   where id = v_order_id
   for update;
  if not found
     or v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status not in ('paid', 'cash_on_delivery') then
    raise exception using errcode = '23514', message = 'eats_order_not_accepting_offers';
  end if;
  return new;
end;
$$;

-- Terminal food-order authority must cancel every live fulfillment projection
-- in the same transaction. This protects provider-webhook and administrative
-- terminal updates even when their best-effort push helper never runs.
create or replace function public.cascade_eats_fulfillment_on_terminal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
  v_driver_user_id uuid;
begin
  select job.id, job.assigned_driver_id
    into v_job_id, v_driver_user_id
    from public.jobs as job
   where job.external_kind = 'food_order'
     and job.external_order_id = new.id
     and job.assigned_driver_id is not null
   order by job.id
   limit 1
   for update;

  update public.service_offers as offer
     set status = 'cancelled',
         responded_at = coalesce(responded_at, pg_catalog.now())
   where offer.order_id in (
     select service.id
       from public.service_orders as service
      where service.external_kind = 'food_order'
        and service.external_order_id = new.id
   )
     and offer.status = 'pending';

  update public.service_orders as service
     set status = 'cancelled',
         cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
         cancellation_reason = coalesce(cancellation_reason, 'Eats order cancelled'),
         cancel_source = coalesce(nullif(new.cancelled_by, ''), 'payment_authority'),
         updated_at = pg_catalog.now()
   where service.external_kind = 'food_order'
     and service.external_order_id = new.id
     and service.status not in ('cancelled', 'completed');

  update public.job_offers as offer
     set status = 'cancelled'
   where offer.job_id in (
     select job.id
       from public.jobs as job
      where job.external_kind = 'food_order'
        and job.external_order_id = new.id
   )
     and offer.status = 'pending';

  update public.jobs as job
     set status = 'canceled',
         updated_at = pg_catalog.now()
   where job.external_kind = 'food_order'
     and job.external_order_id = new.id
     and job.status <> 'completed';

  if v_driver_user_id is not null then
    perform public.release_eats_driver_if_idle(v_driver_user_id, v_job_id);
  end if;

  return new;
end;
$$;

drop trigger if exists guard_eats_job_mutation on public.jobs;
create trigger guard_eats_job_mutation
before insert or update of status, assigned_driver_id, external_kind, external_order_id
on public.jobs for each row execute function public.guard_eats_job_mutation();

drop trigger if exists guard_eats_job_offer_mutation on public.job_offers;
create trigger guard_eats_job_offer_mutation
before insert or update of status on public.job_offers
for each row execute function public.guard_eats_job_offer_mutation();

drop trigger if exists guard_eats_service_order_mutation on public.service_orders;
create trigger guard_eats_service_order_mutation
before insert or update of status, driver_id, external_kind, external_order_id
on public.service_orders for each row execute function public.guard_eats_service_order_mutation();

drop trigger if exists guard_eats_service_offer_mutation on public.service_offers;
create trigger guard_eats_service_offer_mutation
before insert or update of status on public.service_offers
for each row execute function public.guard_eats_service_offer_mutation();

drop trigger if exists cascade_eats_fulfillment_on_terminal on public.food_orders;
create trigger cascade_eats_fulfillment_on_terminal
after update of status, payment_status on public.food_orders
for each row
when (
  (
    new.status::text in ('cancelled', 'refunded')
    and old.status::text is distinct from new.status::text
  )
  or (
    new.payment_status = 'refunded'
    and old.payment_status is distinct from new.payment_status
  )
)
execute function public.cascade_eats_fulfillment_on_terminal();

revoke all on function public.guard_eats_job_mutation() from public, anon, authenticated;
revoke all on function public.guard_eats_job_offer_mutation() from public, anon, authenticated;
revoke all on function public.guard_eats_service_order_mutation() from public, anon, authenticated;
revoke all on function public.guard_eats_service_offer_mutation() from public, anon, authenticated;
revoke all on function public.cascade_eats_fulfillment_on_terminal() from public, anon, authenticated;

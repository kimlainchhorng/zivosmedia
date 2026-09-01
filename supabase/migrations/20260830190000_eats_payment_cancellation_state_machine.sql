-- Serialize Eats provider settlement and customer cancellation on the order row.
-- These RPCs are intentionally callable only with the service role. Edge Functions
-- authenticate customers/providers before invoking them.

-- Provider evidence is operational payment data, not customer-facing order data.
-- Keep it out of the exposed public schema and grant access only to the service
-- role used by the payment/cancellation Edge Functions.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.eats_payment_evidence (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.food_orders(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'paypal', 'square')),
  payment_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  evidence_kind text not null default 'canonical'
    check (evidence_kind in ('canonical', 'conflict')),
  conflict_reason text,
  refund_state text not null default 'not_required'
    check (refund_state in ('not_required', 'required', 'pending', 'refunded')),
  refund_origin text
    check (refund_origin is null or refund_origin in ('customer_cancel', 'restaurant_cancel', 'settlement_conflict')),
  preserve_order_payment_state boolean not null default false,
  prior_order_status text,
  prior_payment_status text,
  refund_error text,
  refunded_at timestamptz,
  refund_attempt_generation integer not null default 0
    check (refund_attempt_generation between 0 and 999999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, payment_id)
);

create index if not exists eats_payment_evidence_order_refund_idx
  on private.eats_payment_evidence (order_id, refund_state, created_at);

create table if not exists private.eats_provider_refund_evidence (
  id uuid primary key default gen_random_uuid(),
  payment_evidence_id uuid not null
    references private.eats_payment_evidence(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'paypal', 'square')),
  provider_refund_id text not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  error_message text,
  attempt_generation integer not null default 0
    check (attempt_generation between 0 and 999999),
  retry_generation_advanced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_refund_id)
);

-- Keep this migration restart-safe if a previous deployment created the
-- private evidence tables but stopped before the full state machine landed.
alter table private.eats_payment_evidence
  add column if not exists refund_attempt_generation integer not null default 0;
alter table private.eats_provider_refund_evidence
  add column if not exists attempt_generation integer not null default 0,
  add column if not exists retry_generation_advanced boolean not null default false;

create index if not exists eats_provider_refund_payment_idx
  on private.eats_provider_refund_evidence (payment_evidence_id, status);

revoke all on table private.eats_payment_evidence from public, anon, authenticated;
revoke all on table private.eats_provider_refund_evidence from public, anon, authenticated;
grant select, insert, update on table private.eats_payment_evidence to service_role;
grant select, insert, update on table private.eats_provider_refund_evidence to service_role;

create or replace function public.claim_eats_paypal_capture(
  p_paypal_order_id text,
  p_customer_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_evidence private.eats_payment_evidence%rowtype;
  v_expected_cents integer;
  v_refunded_cents integer := 0;
  v_refund_cents integer := 0;
begin
  select *
    into v_order
    from public.food_orders
   where paypal_order_id = p_paypal_order_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_order.customer_id is distinct from p_customer_id then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_order.payment_type <> 'paypal' then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'wrong_payment_type');
  end if;

  v_expected_cents := pg_catalog.round(v_order.total_amount * 100)::integer;
  if v_expected_cents is null or v_expected_cents <= 0 then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_order_amount');
  end if;

  if v_order.paypal_capture_id is not null then
    select evidence.*
      into v_evidence
      from private.eats_payment_evidence as evidence
     where evidence.order_id = v_order.id
       and evidence.provider = 'paypal'
       and evidence.payment_id = v_order.paypal_capture_id
     for update;

    if v_evidence.id is not null then
      select coalesce(pg_catalog.sum(refund.amount_cents), 0)::integer
        into v_refunded_cents
        from private.eats_provider_refund_evidence as refund
       where refund.payment_evidence_id = v_evidence.id
         and refund.status = 'succeeded'
         and refund.currency = v_evidence.currency;
      v_refund_cents := pg_catalog.greatest(v_evidence.amount_cents - v_refunded_cents, 0);
    end if;

    return pg_catalog.jsonb_build_object(
      'ok', v_order.payment_status = 'paid'
        and coalesce(v_evidence.refund_state, 'not_required') not in ('required', 'pending'),
      'code', case
        when v_evidence.refund_state = 'refunded' and v_order.payment_status = 'refunded'
          then 'already_refunded'
        when v_order.payment_status = 'paid'
          and coalesce(v_evidence.refund_state, 'not_required') not in ('required', 'pending')
          then 'already_captured'
        else 'capture_requires_reconciliation'
      end,
      'order_id', v_order.id,
      'capture_id', v_order.paypal_capture_id,
      'payment_status', v_order.payment_status,
      'order_status', v_order.status,
      'expected_amount_cents', v_expected_cents,
      'dispatch_pending', v_order.last_payment_error = 'delivery_dispatch_pending',
      'refund_required', v_evidence.id is not null
        and v_evidence.refund_state in ('required', 'pending')
        and v_refund_cents > 0,
      'reconciliation_required', v_evidence.id is null
        or v_evidence.refund_state in ('required', 'pending'),
      'payment_provider', case when v_evidence.id is not null then v_evidence.provider else null end,
      'payment_id', case when v_evidence.id is not null then v_evidence.payment_id else null end,
      'refund_amount_cents', case when v_evidence.id is not null then v_refund_cents else null end,
      'refund_currency', case when v_evidence.id is not null then v_evidence.currency else null end,
      'refund_evidence_id', v_evidence.id,
      'refund_idempotency_key', case
        when v_evidence.id is not null and v_refund_cents > 0
          and coalesce(v_evidence.refund_attempt_generation, 0) = 0 then
          'eats-' || pg_catalog.right(v_evidence.payment_id, 20) || '-' || v_refund_cents::text
        when v_evidence.id is not null and v_refund_cents > 0 then
          'eats-' || pg_catalog.right(v_evidence.payment_id, 14) || '-' ||
          v_refund_cents::text || '-r' || v_evidence.refund_attempt_generation::text
        else null
      end,
      'refund_attempt_generation', case
        when v_evidence.id is not null then v_evidence.refund_attempt_generation
        else null
      end
    );
  end if;

  if v_order.status::text in ('cancelled', 'refunded', 'delivered', 'completed')
     or v_order.payment_status in ('paid', 'refund_pending', 'refunded') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'inactive',
      'order_id', v_order.id,
      'payment_status', v_order.payment_status,
      'expected_amount_cents', v_expected_cents
    );
  end if;

  update public.food_orders
     set payment_status = 'processing',
         payment_provider = 'paypal',
         last_payment_error = 'paypal_capture_in_progress',
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'order_id', v_order.id,
    'expected_amount_cents', v_expected_cents
  );
end;
$$;

create or replace function public.claim_eats_order_cancellation(
  p_order_id uuid,
  p_customer_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_eligible boolean;
  v_provider text;
  v_payment_id text;
  v_evidence private.eats_payment_evidence%rowtype;
  v_refunded_cents integer := 0;
  v_refund_cents integer := 0;
begin
  select *
    into v_order
    from public.food_orders
   where id = p_order_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;
  if v_order.customer_id is distinct from p_customer_id then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'forbidden');
  end if;
  if v_order.status::text = 'refunded' or v_order.payment_status = 'refunded' then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'already_refunded',
      'order_id', v_order.id,
      'eligible', true,
      'payment_status', 'refunded',
      'total_cents', 0,
      'refund_required', false
    );
  end if;
  if v_order.payment_type = 'wallet'
     and v_order.payment_status in ('paid', 'refund_pending') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'wallet_rpc_required');
  end if;

  v_eligible := v_order.driver_id is null
    and v_order.status::text not in ('in_transit', 'out_for_delivery', 'picked_up', 'refunded', 'delivered', 'completed');

  if v_order.status::text in ('refunded', 'delivered', 'completed') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'already_inactive',
      'current_status', v_order.status
    );
  end if;

  if not v_eligible then
    update public.food_orders
       set status = 'cancelled',
           cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
           cancelled_by = coalesce(cancelled_by, 'customer'),
           payment_status = case
             when payment_status in ('paid', 'refund_pending', 'refunded') then payment_status
             else 'unpaid'
           end,
           last_payment_error = 'cancelled_no_refund',
           updated_at = pg_catalog.now()
     where id = v_order.id;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'cancelled_no_refund',
      'order_id', v_order.id,
      'eligible', false,
      'payment_status', case
        when v_order.payment_status in ('paid', 'refund_pending', 'refunded') then v_order.payment_status
        else 'unpaid'
      end,
      'total_cents', 0,
      'refund_required', false
    );
  end if;

  if v_order.payment_status not in ('paid', 'refund_pending') then
    update public.food_orders
       set status = 'cancelled',
           cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
           cancelled_by = coalesce(cancelled_by, 'customer'),
           payment_status = 'unpaid',
           last_payment_error = 'cancelled_refund_eligible_unsettled',
           updated_at = pg_catalog.now()
     where id = v_order.id;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'cancelled_refund_eligible_unsettled',
      'order_id', v_order.id,
      'eligible', true,
      'payment_status', 'unpaid',
      'total_cents', 0,
      'refund_required', false
    );
  end if;

  v_provider := case
    when v_order.payment_provider in ('stripe', 'paypal', 'square') then v_order.payment_provider
    when v_order.stripe_payment_id is not null then 'stripe'
    when v_order.paypal_capture_id is not null then 'paypal'
    when v_order.square_payment_id is not null then 'square'
    else null
  end;
  v_payment_id := case v_provider
    when 'stripe' then v_order.stripe_payment_id
    when 'paypal' then v_order.paypal_capture_id
    when 'square' then v_order.square_payment_id
    else null
  end;

  -- Cancellation owns every unresolved payment tied to the order. This is
  -- essential when a canonical charge and a duplicate/overcharge both exist:
  -- retries refund each exact evidence row and cannot mark the order refunded
  -- while another captured payment remains.
  update private.eats_payment_evidence
     set refund_state = case when refund_state = 'refunded' then refund_state else 'required' end,
         refund_origin = case when refund_state = 'refunded' then refund_origin else 'customer_cancel' end,
         preserve_order_payment_state = false,
         updated_at = pg_catalog.now()
   where order_id = v_order.id
     and refund_state <> 'refunded';

  -- Prefer the canonical payment, then any other exact unresolved settlement
  -- evidence for this order (for example a duplicate/overcharge). Never derive
  -- a provider refund from the denormalized order total.
  select evidence.*
    into v_evidence
    from private.eats_payment_evidence as evidence
   where evidence.order_id = v_order.id
     and evidence.refund_state in ('required', 'pending')
   order by
     case when evidence.provider = v_provider and evidence.payment_id = v_payment_id then 0 else 1 end,
     evidence.created_at,
     evidence.id
   limit 1
   for update;

  if not found and v_provider is not null and v_payment_id is not null then
    select evidence.*
      into v_evidence
      from private.eats_payment_evidence as evidence
     where evidence.order_id = v_order.id
       and evidence.provider = v_provider
       and evidence.payment_id = v_payment_id
     for update;

    if found and v_evidence.refund_state = 'not_required' then
      update private.eats_payment_evidence
         set refund_state = 'required',
             refund_origin = 'customer_cancel',
             preserve_order_payment_state = false,
             refund_error = null,
             updated_at = pg_catalog.now()
       where id = v_evidence.id
       returning * into v_evidence;
    end if;
  end if;

  if v_evidence.id is null then
    update public.food_orders
       set status = 'cancelled',
           cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
           cancelled_by = coalesce(cancelled_by, 'customer'),
           payment_status = 'refund_pending',
           last_payment_error = 'cancellation_provider_evidence_missing',
           updated_at = pg_catalog.now()
     where id = v_order.id;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'provider_evidence_missing',
      'order_id', v_order.id,
      'eligible', true,
      'payment_status', 'refund_pending',
      'total_cents', 0,
      'refund_required', false,
      'reconciliation_required', true
    );
  end if;

  update private.eats_payment_evidence
     set refund_state = case when refund_state = 'refunded' then refund_state else 'required' end,
         refund_origin = coalesce(refund_origin, 'customer_cancel'),
         preserve_order_payment_state = false,
         updated_at = pg_catalog.now()
   where id = v_evidence.id
   returning * into v_evidence;

  select coalesce(pg_catalog.sum(refund.amount_cents), 0)::integer
    into v_refunded_cents
    from private.eats_provider_refund_evidence as refund
   where refund.payment_evidence_id = v_evidence.id
     and refund.status = 'succeeded'
     and refund.currency = v_evidence.currency;
  v_refund_cents := pg_catalog.greatest(v_evidence.amount_cents - v_refunded_cents, 0);

  update public.food_orders
     set status = 'cancelled',
         cancelled_at = coalesce(cancelled_at, pg_catalog.now()),
         cancelled_by = coalesce(cancelled_by, 'customer'),
         payment_status = 'refund_pending',
         last_payment_error = 'cancellation_refund_pending',
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case when v_order.status::text = 'cancelled' then 'already_cancelled' else 'claimed' end,
    'order_id', v_order.id,
    'eligible', true,
    'payment_status', 'refund_pending',
    'prior_payment_status', v_order.payment_status,
    'payment_provider', v_evidence.provider,
    'payment_id', v_evidence.payment_id,
    'stripe_payment_id', case when v_evidence.provider = 'stripe' then v_evidence.payment_id else null end,
    'paypal_capture_id', case when v_evidence.provider = 'paypal' then v_evidence.payment_id else null end,
    'paypal_order_id', v_order.paypal_order_id,
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
    'reconciliation_required', v_evidence.evidence_kind = 'conflict' or v_refund_cents <= 0
  );
end;
$$;

create or replace function public.record_eats_provider_settlement(
  p_order_id uuid,
  p_provider text,
  p_payment_id text,
  p_amount_cents integer,
  p_currency text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_provider text := pg_catalog.lower(pg_catalog.btrim(p_provider));
  v_currency text := pg_catalog.upper(pg_catalog.btrim(p_currency));
  v_expected_cents integer;
  v_existing_payment_id text;
  v_type_matches boolean;
  v_evidence_matches boolean;
  v_amount_matches boolean;
  v_refund_required boolean;
  v_refund_reason text;
  v_evidence private.eats_payment_evidence%rowtype;
  v_preserve_order_payment_state boolean := false;
  v_transitioned boolean := false;
  v_dispatch_required boolean := false;
  v_refunded_cents integer := 0;
  v_refund_cents integer := 0;
begin
  if p_payment_id is null or pg_catalog.btrim(p_payment_id) = ''
     or p_amount_cents is null or p_amount_cents <= 0 then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_provider_evidence');
  end if;
  if v_provider is null or v_provider not in ('stripe', 'paypal', 'square') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_provider');
  end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_currency');
  end if;

  select *
    into v_order
    from public.food_orders
   where id = p_order_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  v_expected_cents := pg_catalog.round(v_order.total_amount * 100)::integer;
  if v_expected_cents is null or v_expected_cents <= 0 then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_order_amount');
  end if;
  v_type_matches := (v_provider = 'stripe' and v_order.payment_type = 'card')
    or (v_provider = 'paypal' and v_order.payment_type = 'paypal')
    or (v_provider = 'square' and v_order.payment_type = 'square');

  if not v_type_matches then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'wrong_payment_type',
      'expected_amount_cents', v_expected_cents
    );
  end if;

  v_existing_payment_id := case v_provider
    when 'stripe' then v_order.stripe_payment_id
    when 'paypal' then v_order.paypal_capture_id
    when 'square' then v_order.square_payment_id
    else null
  end;
  v_evidence_matches := v_existing_payment_id is null
    or v_existing_payment_id = p_payment_id;
  v_amount_matches := p_amount_cents = v_expected_cents and v_currency = 'USD';

  v_refund_required := not v_evidence_matches
    or not v_amount_matches
    or v_order.payment_status = 'refunded'
    or (
      v_order.status::text in ('cancelled', 'refunded')
      and v_order.last_payment_error is distinct from 'cancelled_no_refund'
    );
  v_refund_reason := case
    when not v_evidence_matches then 'provider_evidence_conflict_refund_pending'
    when not v_amount_matches then 'provider_amount_mismatch_refund_pending'
    when v_refund_required then 'late_payment_refund_pending'
    else null
  end;
  v_preserve_order_payment_state := not v_evidence_matches
    and v_order.payment_status = 'paid'
    and (
      v_order.status::text not in ('cancelled', 'refunded', 'delivered', 'completed')
      or (
        v_order.status::text = 'cancelled'
        and v_order.last_payment_error = 'cancelled_no_refund'
      )
    );

  select evidence.*
    into v_evidence
    from private.eats_payment_evidence as evidence
   where evidence.provider = v_provider
     and evidence.payment_id = p_payment_id
   for update;

  if found then
    if v_evidence.order_id is distinct from v_order.id then
      return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_payment_reused');
    end if;
    if v_evidence.amount_cents is distinct from p_amount_cents
       or v_evidence.currency is distinct from v_currency then
      return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_evidence_mutated');
    end if;
  else
    insert into private.eats_payment_evidence (
      order_id,
      provider,
      payment_id,
      amount_cents,
      currency,
      evidence_kind,
      conflict_reason,
      refund_state,
      refund_origin,
      preserve_order_payment_state,
      prior_order_status,
      prior_payment_status
    )
    values (
      v_order.id,
      v_provider,
      p_payment_id,
      p_amount_cents,
      v_currency,
      case when not v_evidence_matches or not v_amount_matches then 'conflict' else 'canonical' end,
      v_refund_reason,
      case when v_refund_required then 'required' else 'not_required' end,
      case when v_refund_required then 'settlement_conflict' else null end,
      v_preserve_order_payment_state,
      v_order.status::text,
      v_order.payment_status
    )
    on conflict (provider, payment_id) do nothing
    returning * into v_evidence;

    if v_evidence.id is null then
      select evidence.*
        into v_evidence
        from private.eats_payment_evidence as evidence
       where evidence.provider = v_provider
         and evidence.payment_id = p_payment_id
       for update;
      if v_evidence.order_id is distinct from v_order.id then
        return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_payment_reused');
      end if;
      if v_evidence.amount_cents is distinct from p_amount_cents
         or v_evidence.currency is distinct from v_currency then
        return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_evidence_mutated');
      end if;
    end if;
  end if;

  if v_evidence_matches then
    if v_provider = 'stripe' then
      update public.food_orders
         set stripe_payment_id = p_payment_id,
             payment_provider = 'stripe',
             updated_at = pg_catalog.now()
       where id = v_order.id;
    elsif v_provider = 'paypal' then
      update public.food_orders
         set paypal_capture_id = p_payment_id,
             payment_provider = 'paypal',
             updated_at = pg_catalog.now()
       where id = v_order.id;
    elsif v_provider = 'square' then
      update public.food_orders
         set square_payment_id = p_payment_id,
             payment_provider = 'square',
             updated_at = pg_catalog.now()
       where id = v_order.id;
    end if;
  end if;

  if v_evidence.refund_state = 'refunded' then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'already_refunded',
      'order_id', v_order.id,
      'payment_accepted', false,
      'transitioned_to_paid', false,
      'dispatch_required', false,
      'refund_required', false,
      'order_status', v_order.status::text,
      'payment_status', v_order.payment_status,
      'refund_status', v_order.refund_status,
      'expected_amount_cents', v_expected_cents,
      'provider_amount_cents', v_evidence.amount_cents,
      'provider_currency', v_evidence.currency,
      'refund_evidence_id', v_evidence.id
    );
  end if;

  if v_refund_required then
    update private.eats_payment_evidence
       set evidence_kind = case
             when not v_evidence_matches or not v_amount_matches then 'conflict'
             else evidence_kind
           end,
           conflict_reason = coalesce(v_refund_reason, conflict_reason),
           refund_state = case when refund_state = 'refunded' then refund_state else 'required' end,
           refund_origin = coalesce(refund_origin, 'settlement_conflict'),
           preserve_order_payment_state = preserve_order_payment_state or v_preserve_order_payment_state,
           prior_order_status = coalesce(prior_order_status, v_order.status::text),
           prior_payment_status = coalesce(prior_payment_status, v_order.payment_status),
           updated_at = pg_catalog.now()
     where id = v_evidence.id
     returning * into v_evidence;

    select coalesce(pg_catalog.sum(refund.amount_cents), 0)::integer
      into v_refunded_cents
      from private.eats_provider_refund_evidence as refund
     where refund.payment_evidence_id = v_evidence.id
       and refund.status = 'succeeded'
       and refund.currency = v_evidence.currency;
    v_refund_cents := pg_catalog.greatest(v_evidence.amount_cents - v_refunded_cents, 0);

    update public.food_orders
       set status = case
             when not v_amount_matches
               and not v_preserve_order_payment_state
               and status::text not in ('cancelled', 'refunded', 'delivered', 'completed')
               then 'cancelled'
             else status
           end,
           cancelled_at = case
             when not v_amount_matches and not v_preserve_order_payment_state
               then coalesce(cancelled_at, pg_catalog.now())
             else cancelled_at
           end,
           payment_status = case
             when v_preserve_order_payment_state then payment_status
             else 'refund_pending'
           end,
           last_payment_error = case
             when v_preserve_order_payment_state
               and v_order.last_payment_error = 'cancelled_no_refund'
               then 'cancelled_no_refund'
             else v_refund_reason
           end,
           updated_at = pg_catalog.now()
     where id = v_order.id;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', v_refund_reason,
      'order_id', v_order.id,
      'payment_accepted', false,
      'transitioned_to_paid', false,
      'dispatch_required', false,
      'refund_required', v_refund_cents > 0,
      'reconciliation_required', v_refund_cents <= 0,
      'refund_reason', v_refund_reason,
      'evidence_recorded', true,
      'expected_amount_cents', v_expected_cents,
      'provider_amount_cents', v_evidence.amount_cents,
      'provider_currency', v_evidence.currency,
      'provider_payment_id', v_evidence.payment_id,
      'refund_evidence_id', v_evidence.id,
      'refund_amount_cents', v_refund_cents,
      'refund_attempt_generation', v_evidence.refund_attempt_generation,
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
      end
    );
  end if;

  if v_order.status::text in ('cancelled', 'refunded') then
    update public.food_orders
       set payment_status = 'paid',
           paid_at = coalesce(paid_at, pg_catalog.now()),
           last_payment_error = 'cancelled_no_refund',
           updated_at = pg_catalog.now()
     where id = v_order.id;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'cancelled_no_refund',
      'order_id', v_order.id,
      'payment_accepted', true,
      'transitioned_to_paid', v_order.payment_status <> 'paid',
      'dispatch_required', false,
      'refund_required', false,
      'expected_amount_cents', v_expected_cents,
      'provider_amount_cents', v_evidence.amount_cents,
      'provider_currency', v_evidence.currency,
      'refund_evidence_id', v_evidence.id
    );
  end if;

  if v_order.payment_status = 'paid' then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'already_paid',
      'order_id', v_order.id,
      'payment_accepted', true,
      'transitioned_to_paid', false,
      'dispatch_required', v_order.last_payment_error = 'delivery_dispatch_pending'
        and v_order.status::text not in ('cancelled', 'refunded', 'delivered', 'completed'),
      'refund_required', false,
      'expected_amount_cents', v_expected_cents,
      'provider_amount_cents', v_evidence.amount_cents,
      'provider_currency', v_evidence.currency,
      'refund_evidence_id', v_evidence.id
    );
  end if;

  v_transitioned := true;
  v_dispatch_required := v_order.status::text not in ('cancelled', 'refunded', 'delivered', 'completed');

  update public.food_orders
     set payment_status = 'paid',
         paid_at = coalesce(paid_at, pg_catalog.now()),
         last_payment_error = case
           when v_dispatch_required then 'delivery_dispatch_pending'
           else null
         end,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case when v_transitioned then 'paid' else 'already_paid' end,
    'order_id', v_order.id,
    'payment_accepted', true,
    'transitioned_to_paid', v_transitioned,
    'dispatch_required', v_dispatch_required,
    'refund_required', false,
    'expected_amount_cents', v_expected_cents,
    'provider_amount_cents', v_evidence.amount_cents,
    'provider_currency', v_evidence.currency,
    'refund_evidence_id', v_evidence.id
  );
end;
$$;

create or replace function public.finish_eats_provider_refund(
  p_order_id uuid,
  p_provider text,
  p_payment_id text,
  p_refund_succeeded boolean,
  p_error text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_provider text := pg_catalog.lower(pg_catalog.btrim(p_provider));
  v_evidence private.eats_payment_evidence%rowtype;
  v_remaining integer := 0;
  v_next_payment_status text;
begin
  if p_payment_id is null or pg_catalog.btrim(p_payment_id) = '' then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_provider_evidence');
  end if;

  select *
    into v_order
    from public.food_orders
   where id = p_order_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  if v_provider is null or v_provider not in ('stripe', 'paypal', 'square') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_provider');
  end if;
  if not (
    (v_provider = 'stripe' and v_order.payment_type = 'card')
    or (v_provider = 'paypal' and v_order.payment_type = 'paypal')
    or (v_provider = 'square' and v_order.payment_type = 'square')
  ) then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'wrong_payment_type');
  end if;

  select evidence.*
    into v_evidence
    from private.eats_payment_evidence as evidence
   where evidence.order_id = v_order.id
     and evidence.provider = v_provider
     and evidence.payment_id = p_payment_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_evidence_missing');
  end if;

  if v_evidence.refund_state = 'refunded' then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'already_refunded',
      'payment_status', v_order.payment_status,
      'refund_evidence_id', v_evidence.id
    );
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

  if not p_refund_succeeded then
    update private.eats_payment_evidence
       set refund_state = 'pending',
           refund_error = pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_error), ''), 'provider_refund_pending'), 300),
           updated_at = pg_catalog.now()
     where id = v_evidence.id;

    update public.food_orders
       set payment_status = v_next_payment_status,
           last_payment_error = case
             when v_next_payment_status = 'paid'
               and v_order.last_payment_error = 'cancelled_no_refund'
               then 'cancelled_no_refund'
             else pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_error), ''), 'provider_refund_pending'), 300)
           end,
           updated_at = pg_catalog.now()
     where id = v_order.id;

    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'refund_pending',
      'payment_status', v_next_payment_status,
      'refund_evidence_id', v_evidence.id
    );
  end if;

  -- Compatibility path for already-deployed callers that cannot yet pass the
  -- provider refund ID. The exact payment/amount/currency row is still bound;
  -- upgraded callers use finish_eats_provider_refund_with_evidence below the
  -- dispatch migration to bind one or more actual provider refund IDs.
  update private.eats_payment_evidence
     set refund_state = 'refunded',
         refund_error = null,
         refunded_at = coalesce(refunded_at, pg_catalog.now()),
         updated_at = pg_catalog.now()
   where id = v_evidence.id;

  select pg_catalog.count(*)::integer
    into v_remaining
    from private.eats_payment_evidence as evidence
   where evidence.order_id = v_order.id
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
     set status = case
           when v_next_payment_status = 'refunded' then 'refunded'
           else status
         end,
         cancelled_at = case
           when v_next_payment_status = 'refunded' then coalesce(cancelled_at, pg_catalog.now())
           else cancelled_at
         end,
         payment_provider = v_provider,
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
            where evidence.order_id = v_order.id
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
   where id = v_order.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case
      when v_next_payment_status = 'refunded' then 'refunded'
      when v_next_payment_status = 'paid' then 'provider_evidence_conflict_refunded'
      else 'additional_provider_refund_pending'
    end,
    'payment_status', v_next_payment_status,
    'refund_evidence_id', v_evidence.id,
    'remaining_refund_count', v_remaining
  );
end;
$$;

create or replace function public.transition_eats_payment_status(
  p_order_id uuid,
  p_provider text,
  p_payment_id text,
  p_next_status text,
  p_error text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.food_orders%rowtype;
  v_provider text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_provider, '')));
  v_next text := pg_catalog.lower(pg_catalog.btrim(p_next_status));
  v_existing_payment_id text;
  v_allowed boolean := false;
begin
  if v_provider is null or v_provider not in ('stripe', 'paypal', 'square', 'wallet', 'cash') then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_provider');
  end if;

  select *
    into v_order
    from public.food_orders
   where id = p_order_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  -- A provider refund must bind exact payment/refund evidence and update both
  -- order terminals atomically. Keep this compatibility transition RPC from
  -- manufacturing a coarse refunded state that later settlement could regress.
  if v_next = 'refunded' then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'refund_evidence_rpc_required',
      'payment_status', v_order.payment_status,
      'order_status', v_order.status
    );
  end if;

  if not (
    (v_provider = 'stripe' and v_order.payment_type = 'card')
    or (v_provider = 'paypal' and v_order.payment_type = 'paypal')
    or (v_provider = 'square' and v_order.payment_type = 'square')
    or (v_provider = 'wallet' and v_order.payment_type = 'wallet')
    or (v_provider = 'cash' and v_order.payment_type = 'cash')
  ) then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'wrong_payment_type',
      'payment_status', v_order.payment_status,
      'order_status', v_order.status
    );
  end if;

  if p_payment_id is not null and pg_catalog.btrim(p_payment_id) <> '' then
    v_existing_payment_id := case v_provider
      when 'stripe' then v_order.stripe_payment_id
      when 'paypal' then v_order.paypal_capture_id
      when 'square' then v_order.square_payment_id
      else null
    end;
    if v_existing_payment_id is not null and v_existing_payment_id <> p_payment_id then
      return pg_catalog.jsonb_build_object('ok', false, 'code', 'provider_evidence_conflict');
    end if;
  end if;

  if v_order.payment_status = 'refunded' then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'stale_transition',
      'payment_status', v_order.payment_status,
      'order_status', v_order.status
    );
  end if;

  if v_order.status::text not in ('cancelled', 'refunded') then
    if v_next in ('processing', 'authorized', 'unpaid', 'failed') then
      v_allowed := v_order.payment_status in ('unpaid', 'pending', 'processing', 'authorized', 'failed');
    elsif v_next = 'refund_pending' then
      v_allowed := v_order.payment_status in ('paid', 'refund_pending');
    end if;
  elsif v_order.status::text in ('cancelled', 'refunded')
        and v_next = 'refund_pending' then
    v_allowed := v_order.payment_status in ('paid', 'refund_pending');
  end if;

  if not v_allowed then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'stale_transition',
      'payment_status', v_order.payment_status,
      'order_status', v_order.status
    );
  end if;

  update public.food_orders
     set status = case
           when v_next = 'failed'
             and v_order.status::text = 'pending'
             and v_order.driver_id is null
             and v_order.prepared_at is null
             and v_order.picked_up_at is null
             and v_order.delivered_at is null
             then 'cancelled'
           else status
         end,
         cancelled_at = case
           when v_next = 'failed'
             and v_order.status::text = 'pending'
             and v_order.driver_id is null
             and v_order.prepared_at is null
             and v_order.picked_up_at is null
             and v_order.delivered_at is null
             then coalesce(cancelled_at, pg_catalog.now())
           else cancelled_at
         end,
         stripe_payment_id = case
           when v_provider = 'stripe'
             and p_payment_id is not null
             and pg_catalog.btrim(p_payment_id) <> ''
             then coalesce(stripe_payment_id, p_payment_id)
           else stripe_payment_id
         end,
         paypal_capture_id = case
           when v_provider = 'paypal'
             and p_payment_id is not null
             and pg_catalog.btrim(p_payment_id) <> ''
             then coalesce(paypal_capture_id, p_payment_id)
           else paypal_capture_id
         end,
         square_payment_id = case
           when v_provider = 'square'
             and p_payment_id is not null
             and pg_catalog.btrim(p_payment_id) <> ''
             then coalesce(square_payment_id, p_payment_id)
           else square_payment_id
         end,
         payment_provider = case
           when v_provider in ('stripe', 'paypal', 'square')
             and p_payment_id is not null
             and pg_catalog.btrim(p_payment_id) <> ''
             then v_provider
           else payment_provider
         end,
         payment_status = v_next,
         last_payment_error = case
           when v_next in ('failed', 'refund_pending')
             then pg_catalog.left(coalesce(nullif(pg_catalog.btrim(p_error), ''), v_next), 300)
           when v_next in ('processing', 'authorized', 'unpaid', 'refunded') then null
           else last_payment_error
         end,
         updated_at = pg_catalog.now()
   where id = v_order.id;

  return pg_catalog.jsonb_build_object('ok', true, 'code', 'applied', 'payment_status', v_next);
end;
$$;

revoke all on function public.claim_eats_paypal_capture(text, uuid) from public, anon, authenticated;
revoke all on function public.claim_eats_order_cancellation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_eats_provider_settlement(uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.finish_eats_provider_refund(uuid, text, text, boolean, text) from public, anon, authenticated;
revoke all on function public.transition_eats_payment_status(uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.claim_eats_paypal_capture(text, uuid) to service_role;
grant execute on function public.claim_eats_order_cancellation(uuid, uuid) to service_role;
grant execute on function public.record_eats_provider_settlement(uuid, text, text, integer, text) to service_role;
grant execute on function public.finish_eats_provider_refund(uuid, text, text, boolean, text) to service_role;
grant execute on function public.transition_eats_payment_status(uuid, text, text, text, text) to service_role;

-- Provider redelivery must be able to reclaim a webhook invocation that died
-- after logging `received` but before recording a terminal outcome. A short,
-- row-locked lease makes that recovery atomic without processing a live event
-- concurrently.
alter table public.eats_paypal_webhook_events
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_lease_token uuid,
  add column if not exists processing_attempts integer not null default 0;

alter table public.eats_square_webhook_events
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_lease_token uuid,
  add column if not exists processing_attempts integer not null default 0;

create or replace function public.claim_eats_paypal_webhook_event(
  p_event_id text,
  p_lease_token uuid,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event public.eats_paypal_webhook_events%rowtype;
  v_lease_seconds integer := pg_catalog.greatest(30, pg_catalog.least(coalesce(p_lease_seconds, 300), 900));
begin
  if p_lease_token is null then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_lease');
  end if;
  select *
    into v_event
    from public.eats_paypal_webhook_events
   where paypal_event_id = p_event_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if v_event.processing_status in ('applied', 'skipped') then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'complete',
      'id', v_event.id,
      'processing_status', v_event.processing_status
    );
  end if;
  if v_event.processing_status = 'received'
     and v_event.processing_started_at is not null
     and v_event.processing_started_at > pg_catalog.now() - pg_catalog.make_interval(secs => v_lease_seconds) then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'busy',
      'id', v_event.id
    );
  end if;
  if v_event.processing_status not in ('received', 'error') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'invalid_status',
      'id', v_event.id
    );
  end if;

  update public.eats_paypal_webhook_events
     set processing_status = 'received',
         processing_started_at = pg_catalog.now(),
         processing_lease_token = p_lease_token,
         processing_attempts = processing_attempts + 1,
         error_message = null
   where id = v_event.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'id', v_event.id
  );
end;
$$;

create or replace function public.claim_eats_square_webhook_event(
  p_event_id text,
  p_lease_token uuid,
  p_lease_seconds integer default 300
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event public.eats_square_webhook_events%rowtype;
  v_lease_seconds integer := pg_catalog.greatest(30, pg_catalog.least(coalesce(p_lease_seconds, 300), 900));
begin
  if p_lease_token is null then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'invalid_lease');
  end if;
  select *
    into v_event
    from public.eats_square_webhook_events
   where square_event_id = p_event_id
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if v_event.processing_status in ('applied', 'skipped') then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'complete',
      'id', v_event.id,
      'processing_status', v_event.processing_status
    );
  end if;
  if v_event.processing_status = 'received'
     and v_event.processing_started_at is not null
     and v_event.processing_started_at > pg_catalog.now() - pg_catalog.make_interval(secs => v_lease_seconds) then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'busy',
      'id', v_event.id
    );
  end if;
  if v_event.processing_status not in ('received', 'error') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'invalid_status',
      'id', v_event.id
    );
  end if;

  update public.eats_square_webhook_events
     set processing_status = 'received',
         processing_started_at = pg_catalog.now(),
         processing_lease_token = p_lease_token,
         processing_attempts = processing_attempts + 1,
         error_message = null
   where id = v_event.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'claimed',
    'id', v_event.id
  );
end;
$$;

revoke all on function public.claim_eats_paypal_webhook_event(text, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.claim_eats_square_webhook_event(text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_eats_paypal_webhook_event(text, uuid, integer)
  to service_role;
grant execute on function public.claim_eats_square_webhook_event(text, uuid, integer)
  to service_role;

-- A food order is inserted before a redirect/card payment settles. The legacy
-- INSERT trigger announced those pending rows as real orders to merchants and
-- customers. Preserve only status/driver UPDATE notifications; paid confirmation
-- remains provider-authoritative in the Edge Functions above this migration.
drop trigger if exists trigger_notify_order_status on public.food_orders;
create trigger trigger_notify_order_status
after update of status, driver_id on public.food_orders
for each row
execute function public.notify_on_order_status_change();

-- Compatibility with the abandoned-checkout sweep: a 60-minute cleanup may set
-- an unsettled order to cancelled. record_eats_provider_settlement treats every
-- cancelled row except the explicit cancelled_no_refund policy marker as a late
-- settlement that must be refunded and never dispatched.

-- Make manual Eats payout requests a single authoritative database action.
--
-- The public table already exists in production, but its legacy Edge Function
-- calculated no durable balance and inserted requests directly. This phase
-- keeps restaurant owners on read-only RLS while requiring the service-only
-- Edge Function to validate and reserve a request through one short,
-- restaurant-serialized transaction.

begin;

alter table public.eats_payout_requests
  add column if not exists idempotency_key uuid,
  add column if not exists payout_destination_snapshot jsonb,
  add column if not exists processing_by uuid,
  add column if not exists processing_at timestamptz,
  add column if not exists resolved_by uuid,
  add column if not exists resolved_at timestamptz;

-- Give pre-cutover rows a stable, unique legacy key before making the new
-- request key mandatory. The row id is already a generated UUID and does not
-- pretend that a legacy request was an idempotent API replay.
update public.eats_payout_requests
   set idempotency_key = id
 where idempotency_key is null;

-- Preserve the verified destination that finance must use even if the owner
-- later edits or deletes their reusable account-level payout method.
update public.eats_payout_requests as request
   set payout_destination_snapshot = pg_catalog.jsonb_build_object(
     'snapshot_version', 1,
     'method_id', method.id,
     'user_id', method.user_id,
     'store_id', method.store_id,
     'rail', case
       when pg_catalog.lower(pg_catalog.btrim(coalesce(method.rail, method.method_type))) = 'bank_transfer'
         then 'bank_wire'
       else pg_catalog.lower(pg_catalog.btrim(coalesce(method.rail, method.method_type)))
     end,
     'method_type', method.method_type,
     'label', method.label,
     'bank_name', method.bank_name,
     'account_holder_name', method.account_holder_name,
     'account_number', method.account_number,
     'aba_account_id', method.aba_account_id,
     'country_code', method.country_code,
     'is_verified', method.is_verified,
     'verification_status', method.verification_status,
     'captured_at', coalesce(request.created_at, pg_catalog.now())
   )
  from public.customer_payout_methods as method
 where request.payout_destination_snapshot is null
   and method.id = request.payout_method_id;

-- A missing legacy destination is safe only for an explicitly non-obligating
-- request. Never let an active/unknown obligation survive the cutover without
-- finance-readable payout evidence.
do $$
begin
  if exists (
    select 1
      from public.eats_payout_requests as request
     where request.payout_destination_snapshot is null
       and coalesce(
         pg_catalog.lower(pg_catalog.btrim(request.status)),
         ''
       ) not in ('rejected', 'cancelled', 'failed')
  ) then
    raise exception 'eats_manual_payout_active_destination_snapshot_missing'
      using errcode = '23514';
  end if;
end;
$$;

update public.eats_payout_requests as request
   set payout_destination_snapshot = pg_catalog.jsonb_build_object(
     'snapshot_version', 0,
     'unavailable_legacy_destination', true,
     'method_id', request.payout_method_id
   )
 where request.payout_destination_snapshot is null;

alter table public.eats_payout_requests
  alter column idempotency_key set not null,
  alter column payout_destination_snapshot set not null;

create unique index if not exists eats_payout_requests_idempotency_key_uidx
  on public.eats_payout_requests (idempotency_key);

comment on column public.eats_payout_requests.idempotency_key is
  'Caller UUID for one logical manual payout request. Legacy rows use their immutable request id.';

comment on column public.eats_payout_requests.payout_destination_snapshot is
  'Immutable verified payout destination captured when the manual request is reserved.';

create schema if not exists private;

-- This prerequisite is repeated here intentionally because production drift
-- still has the legacy self-write policies. Owners may read their destinations,
-- but creation, verification, edits, defaults, and deletion must go through
-- the MFA-gated customer-payout-method-record service writer.
alter table public.customer_payout_methods enable row level security;

drop policy if exists "Users can insert own payout methods"
  on public.customer_payout_methods;
drop policy if exists "Users can update own payout methods"
  on public.customer_payout_methods;
drop policy if exists "Users can delete own payout methods"
  on public.customer_payout_methods;
drop policy if exists "Store owners manage their store payout methods"
  on public.customer_payout_methods;

revoke insert, update, delete, truncate
  on table public.customer_payout_methods
  from public, anon, authenticated;
grant select on table public.customer_payout_methods to authenticated;
grant all privileges on table public.customer_payout_methods to service_role;

comment on table public.customer_payout_methods is
  'Sensitive payout destinations: owner reads remain RLS-scoped; all writes require the MFA-gated service writer.';

-- Normalize before the server-gate trigger is installed. Unknown or malformed
-- legacy obligations abort the migration for deliberate reconciliation rather
-- than entering the live state machine under a misleading pending label.
update public.eats_payout_requests
   set status = pg_catalog.lower(pg_catalog.btrim(status))
 where status is distinct from pg_catalog.lower(pg_catalog.btrim(status));

do $$
begin
  if exists (
    select 1
      from public.eats_payout_requests as request
     where request.status is null
        or request.status not in (
          'pending',
          'processing',
          'paid',
          'rejected',
          'failed',
          'cancelled'
        )
        or request.amount_cents is null
        or request.amount_cents <= 0
        or pg_catalog.upper(pg_catalog.btrim(request.currency)) <> 'USD'
        or request.payout_destination_snapshot is null
  ) then
    raise exception 'eats_payout_request_legacy_state_requires_reconciliation'
      using errcode = '23514';
  end if;
end;
$$;

-- Defense in depth for accidentally restored browser grants or policies. The
-- RPC marks only its INSERT transaction; finance workers may still update the
-- server-owned processing fields with the service role.
create or replace function private.eats_payout_request_server_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'eats_payout_request_server_gate_required'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT'
     and coalesce(
       pg_catalog.current_setting('zivo.eats_manual_payout_rpc', true),
       ''
     ) <> 'on' then
    raise exception 'eats_payout_request_rpc_required'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.restaurant_id is distinct from old.restaurant_id
       or new.requested_by is distinct from old.requested_by
       or new.amount_cents is distinct from old.amount_cents
       or new.currency is distinct from old.currency
       or new.rail is distinct from old.rail
       or new.payout_method_id is distinct from old.payout_method_id
       or new.note is distinct from old.note
       or new.idempotency_key is distinct from old.idempotency_key
       or new.payout_destination_snapshot is distinct from old.payout_destination_snapshot
     ) then
    raise exception 'eats_payout_request_intent_is_immutable'
      using errcode = '22000';
  end if;

  if tg_op = 'UPDATE'
     and (
       new.status is distinct from old.status
       or new.reference is distinct from old.reference
       or new.paid_at is distinct from old.paid_at
       or new.admin_note is distinct from old.admin_note
       or new.failure_reason is distinct from old.failure_reason
       or new.processing_by is distinct from old.processing_by
       or new.processing_at is distinct from old.processing_at
       or new.resolved_by is distinct from old.resolved_by
       or new.resolved_at is distinct from old.resolved_at
     )
     and coalesce(
       pg_catalog.current_setting('zivo.eats_manual_payout_resolution_rpc', true),
       ''
     ) <> 'on' then
    raise exception 'eats_payout_request_resolution_rpc_required'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    raise exception 'eats_payout_request_history_is_immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.eats_payout_request_server_gate()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_eats_payout_request_server_gate
  on public.eats_payout_requests;
create trigger trg_eats_payout_request_server_gate
before insert or update or delete on public.eats_payout_requests
for each row
execute function private.eats_payout_request_server_gate();

alter table public.eats_payout_requests enable row level security;

revoke insert, update, delete, truncate
  on table public.eats_payout_requests
  from public, anon, authenticated;
grant select on table public.eats_payout_requests to authenticated;
grant all privileges on table public.eats_payout_requests to service_role;

comment on table public.eats_payout_requests is
  'Manual Eats payout requests. Owners have read-only RLS; request intent is inserted only by request_eats_manual_payout.';

create or replace function public.request_eats_manual_payout(
  p_restaurant_id uuid,
  p_requested_by uuid,
  p_payout_method_id uuid,
  p_amount_cents integer,
  p_rail text,
  p_idempotency_key uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_method public.customer_payout_methods%rowtype;
  v_request public.eats_payout_requests%rowtype;
  v_destination_snapshot jsonb;
  v_method_rail text;
  v_rail text := pg_catalog.lower(pg_catalog.btrim(p_rail));
  v_note text := nullif(pg_catalog.btrim(p_note), '');
  v_eligible_count bigint := 0;
  v_valid_count bigint := 0;
  v_gross_cents bigint := 0;
  v_commission_cents bigint := 0;
  v_earned_cents bigint := 0;
  v_automatic_reserved_cents bigint := 0;
  v_manual_reserved_cents bigint := 0;
  v_reserved_cents bigint := 0;
  v_available_cents bigint := 0;
  v_idempotent_replay boolean := false;
begin
  if current_user <> 'service_role' then
    raise exception 'request_eats_manual_payout_service_role_required'
      using errcode = '42501';
  end if;
  if p_restaurant_id is null
     or p_requested_by is null
     or p_payout_method_id is null
     or p_idempotency_key is null then
    raise exception 'request_eats_manual_payout_invalid_identity'
      using errcode = '22023';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'request_eats_manual_payout_invalid_amount'
      using errcode = '22023';
  end if;
  if v_rail is null
     or v_rail = ''
     or v_rail not in ('aba', 'bank_wire', 'paypal', 'square', 'mercury') then
    raise exception 'request_eats_manual_payout_invalid_rail'
      using errcode = '22023';
  end if;
  if p_note is not null and pg_catalog.char_length(p_note) > 500 then
    raise exception 'request_eats_manual_payout_note_too_long'
      using errcode = '22023';
  end if;

  -- One restaurant row serializes every legitimate manual request for that
  -- balance. Input ownership is checked against the locked row, not a JWT
  -- field supplied by the browser.
  select restaurant.*
    into v_restaurant
    from public.restaurants as restaurant
   where restaurant.id = p_restaurant_id
   for update;
  if not found then
    raise exception 'request_eats_manual_payout_restaurant_not_found'
      using errcode = 'P0002';
  end if;
  if v_restaurant.owner_id is null
     or v_restaurant.owner_id is distinct from p_requested_by then
    raise exception 'request_eats_manual_payout_owner_mismatch'
      using errcode = '42501';
  end if;

  -- Resolve an exact replay from its immutable request before touching the
  -- reusable payout-method row. The owner may legitimately delete or replace
  -- that method after the destination was snapshotted; a cache-miss retry must
  -- still return the committed reservation instead of creating uncertainty.
  select request.*
    into v_request
    from public.eats_payout_requests as request
   where request.idempotency_key = p_idempotency_key
   for update;
  if found then
    if v_request.restaurant_id is distinct from p_restaurant_id
       or v_request.requested_by is distinct from p_requested_by
       or v_request.payout_method_id is distinct from p_payout_method_id
       or v_request.amount_cents is distinct from p_amount_cents
       or pg_catalog.lower(pg_catalog.btrim(v_request.rail)) is distinct from v_rail
       or nullif(pg_catalog.btrim(v_request.note), '') is distinct from v_note then
      raise exception 'request_eats_manual_payout_idempotency_conflict'
        using errcode = '23505';
    end if;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'replayed',
      'idempotent_replay', true,
      'available_cents', null,
      'request', pg_catalog.to_jsonb(v_request)
    );
  end if;

  select method.*
    into v_method
    from public.customer_payout_methods as method
   where method.id = p_payout_method_id
  for update;
  if not found then
    raise exception 'request_eats_manual_payout_method_not_found'
      using errcode = 'P0002';
  end if;
  if v_method.user_id is distinct from p_requested_by
     or (
       v_method.store_id is not null
       and v_method.store_id is distinct from p_restaurant_id
     ) then
    raise exception 'request_eats_manual_payout_method_owner_mismatch'
      using errcode = '42501';
  end if;
  if not coalesce(v_method.is_verified, false)
     or pg_catalog.lower(pg_catalog.btrim(v_method.verification_status)) <> 'verified' then
    raise exception 'request_eats_manual_payout_method_not_verified'
      using errcode = '22023';
  end if;

  v_method_rail := pg_catalog.lower(
    pg_catalog.btrim(coalesce(v_method.rail, v_method.method_type))
  );
  if v_method_rail = 'bank_transfer' then
    v_method_rail := 'bank_wire';
  end if;
  if v_method_rail is distinct from v_rail then
    raise exception 'request_eats_manual_payout_method_rail_mismatch'
      using errcode = '22023';
  end if;

  v_destination_snapshot := pg_catalog.jsonb_build_object(
    'snapshot_version', 1,
    'method_id', v_method.id,
    'user_id', v_method.user_id,
    'store_id', v_method.store_id,
    'rail', v_rail,
    'method_type', v_method.method_type,
    'label', v_method.label,
    'bank_name', v_method.bank_name,
    'account_holder_name', v_method.account_holder_name,
    'account_number', v_method.account_number,
    'aba_account_id', v_method.aba_account_id,
    'country_code', v_method.country_code,
    'is_verified', v_method.is_verified,
    'verification_status', v_method.verification_status,
    'captured_at', pg_catalog.now()
  );

  -- Freeze all potentially earned orders while deriving this request. A
  -- concurrent refund/hold/terminal-state transition must finish before the
  -- snapshot is counted, or wait until this short request transaction ends.
  perform 1
    from public.food_orders as food
   where food.restaurant_id = p_restaurant_id
     and (
       food.status::text in ('delivered', 'completed')
       or (
         food.status::text = 'cancelled'
         and food.payment_status = 'paid'
         and food.last_payment_error = 'cancelled_no_refund'
       )
     )
     and food.payment_status in ('paid', 'cash_on_delivery')
     and pg_catalog.upper(
       pg_catalog.btrim(coalesce(food.currency, ''))
     ) = 'USD'
   order by food.id
   for update;

  with normalized_orders as (
    select
      food.id,
      food.total_amount,
      food.commission_percent,
      food.commission_amount_cents,
      food.restaurant_payout_cents,
      case
        when nullif(
          pg_catalog.lower(pg_catalog.btrim(food.payment_provider)),
          ''
        ) is not null
          then pg_catalog.lower(pg_catalog.btrim(food.payment_provider))
        when pg_catalog.lower(
          pg_catalog.btrim(coalesce(food.payment_type, ''))
        ) = 'card'
          then 'stripe'
        else pg_catalog.lower(
          pg_catalog.btrim(coalesce(food.payment_type, ''))
        )
      end as resolved_provider
    from public.food_orders as food
    where food.restaurant_id = p_restaurant_id
      and (
        food.status::text in ('delivered', 'completed')
        or (
          food.status::text = 'cancelled'
          and food.payment_status = 'paid'
          and food.last_payment_error = 'cancelled_no_refund'
        )
      )
      and food.payment_status in ('paid', 'cash_on_delivery')
      and pg_catalog.upper(
        pg_catalog.btrim(coalesce(food.currency, ''))
      ) = 'USD'
      and food.payout_hold is not true
      and pg_catalog.lower(
        pg_catalog.btrim(coalesce(food.refund_status, ''))
      ) in ('', 'none', 'not_required')
      and food.refunded_at is null
      and food.payout_eligible_at is not null
      and food.payout_eligible_at <= pg_catalog.now()
  ),
  eligible_orders as (
    select
      normalized.id,
      pg_catalog.round(normalized.total_amount * 100)::bigint as gross_cents,
      normalized.commission_percent,
      normalized.commission_amount_cents::bigint as commission_cents,
      normalized.restaurant_payout_cents::bigint as earned_cents
    from normalized_orders as normalized
    where normalized.resolved_provider in ('cash', 'wallet', 'paypal', 'square')
  ),
  checked_orders as (
    select
      eligible.*,
      eligible.gross_cents > 0
        and eligible.commission_percent is not null
        and eligible.commission_percent between 0 and 100
        and eligible.commission_cents is not null
        and eligible.commission_cents >= 0
        and eligible.earned_cents is not null
        and eligible.earned_cents >= 0
        and eligible.commission_cents = pg_catalog.round(
          eligible.gross_cents * eligible.commission_percent / 100.0
        )::bigint
        and eligible.commission_cents + eligible.earned_cents = eligible.gross_cents
        as snapshot_is_valid
    from eligible_orders as eligible
  )
  select
    pg_catalog.count(*)::bigint,
    pg_catalog.count(*) filter (where checked.snapshot_is_valid)::bigint,
    coalesce(pg_catalog.sum(checked.gross_cents), 0)::bigint,
    coalesce(pg_catalog.sum(checked.commission_cents), 0)::bigint,
    coalesce(pg_catalog.sum(checked.earned_cents), 0)::bigint
    into
      v_eligible_count,
      v_valid_count,
      v_gross_cents,
      v_commission_cents,
      v_earned_cents
    from checked_orders as checked;

  if v_valid_count <> v_eligible_count then
    raise exception 'request_eats_manual_payout_invalid_order_snapshot'
      using errcode = '22000';
  end if;

  -- A transfer remains an obligation while queued, created, or failed. Only
  -- the exact order/restaurant/amount reversal with terminal provider evidence
  -- releases it from the balance.
  if exists (
    select 1
      from public.eats_payout_ledger as ledger
      join public.food_orders as food
        on food.id = ledger.order_id
       and food.restaurant_id = p_restaurant_id
     where ledger.restaurant_id = p_restaurant_id
       and (
         food.status::text in ('delivered', 'completed')
         or (
           food.status::text = 'cancelled'
           and food.payment_status = 'paid'
           and food.last_payment_error = 'cancelled_no_refund'
         )
       )
       and food.payment_status in ('paid', 'cash_on_delivery')
       and pg_catalog.upper(
         pg_catalog.btrim(coalesce(food.currency, ''))
       ) = 'USD'
       and food.payout_hold is not true
       and pg_catalog.lower(
         pg_catalog.btrim(coalesce(food.refund_status, ''))
       ) in ('', 'none', 'not_required')
       and food.refunded_at is null
       and food.payout_eligible_at is not null
       and food.payout_eligible_at <= pg_catalog.now()
       and case
         when nullif(
           pg_catalog.lower(pg_catalog.btrim(food.payment_provider)),
           ''
         ) is not null
           then pg_catalog.lower(pg_catalog.btrim(food.payment_provider))
         when pg_catalog.lower(
           pg_catalog.btrim(coalesce(food.payment_type, ''))
         ) = 'card'
           then 'stripe'
         else pg_catalog.lower(
           pg_catalog.btrim(coalesce(food.payment_type, ''))
         )
       end in ('cash', 'wallet', 'paypal', 'square')
       and ledger.direction = 'transfer'
       and ledger.status in ('queued', 'created', 'failed')
       and (
         ledger.amount_cents < 0
         or ledger.amount_cents is distinct from food.restaurant_payout_cents::bigint
         or ledger.commission_cents is distinct from food.commission_amount_cents::bigint
         or ledger.commission_rate is distinct from food.commission_percent
       )
  ) then
    raise exception 'request_eats_manual_payout_invalid_automatic_reservation'
      using errcode = '22000';
  end if;

  with eligible_order_ids as (
    select food.id
      from public.food_orders as food
     where food.restaurant_id = p_restaurant_id
       and (
         food.status::text in ('delivered', 'completed')
         or (
           food.status::text = 'cancelled'
           and food.payment_status = 'paid'
           and food.last_payment_error = 'cancelled_no_refund'
         )
       )
       and food.payment_status in ('paid', 'cash_on_delivery')
       and pg_catalog.upper(
         pg_catalog.btrim(coalesce(food.currency, ''))
       ) = 'USD'
       and food.payout_hold is not true
       and pg_catalog.lower(
         pg_catalog.btrim(coalesce(food.refund_status, ''))
       ) in ('', 'none', 'not_required')
       and food.refunded_at is null
       and food.payout_eligible_at is not null
       and food.payout_eligible_at <= pg_catalog.now()
       and case
         when nullif(
           pg_catalog.lower(pg_catalog.btrim(food.payment_provider)),
           ''
         ) is not null
           then pg_catalog.lower(pg_catalog.btrim(food.payment_provider))
         when pg_catalog.lower(
           pg_catalog.btrim(coalesce(food.payment_type, ''))
         ) = 'card'
           then 'stripe'
         else pg_catalog.lower(
           pg_catalog.btrim(coalesce(food.payment_type, ''))
         )
       end in ('cash', 'wallet', 'paypal', 'square')
  )
  select coalesce(pg_catalog.sum(transfer.amount_cents), 0)::bigint
    into v_automatic_reserved_cents
    from eligible_order_ids as eligible
    join public.eats_payout_ledger as transfer
      on transfer.order_id = eligible.id
     and transfer.restaurant_id = p_restaurant_id
     and transfer.direction = 'transfer'
     and transfer.status in ('queued', 'created', 'failed')
   where not exists (
     select 1
       from public.eats_payout_ledger as reversal
      where reversal.order_id = transfer.order_id
        and reversal.restaurant_id = transfer.restaurant_id
        and reversal.direction = 'reversal'
        and reversal.status = 'created'
        and reversal.amount_cents = transfer.amount_cents
        and nullif(
          pg_catalog.btrim(reversal.stripe_reversal_id),
          ''
        ) is not null
   );

  if exists (
    select 1
      from public.eats_payout_requests as request
     where request.restaurant_id = p_restaurant_id
       and coalesce(
         pg_catalog.lower(pg_catalog.btrim(request.status)),
         ''
       ) not in ('rejected', 'cancelled', 'failed')
       and request.amount_cents <= 0
  ) then
    raise exception 'request_eats_manual_payout_invalid_manual_reservation'
      using errcode = '22000';
  end if;

  select coalesce(pg_catalog.sum(request.amount_cents), 0)::bigint
    into v_manual_reserved_cents
    from public.eats_payout_requests as request
   where request.restaurant_id = p_restaurant_id
     and coalesce(
       pg_catalog.lower(pg_catalog.btrim(request.status)),
       ''
     ) not in ('rejected', 'cancelled', 'failed');

  v_reserved_cents := v_automatic_reserved_cents + v_manual_reserved_cents;
  v_available_cents := pg_catalog.greatest(
    0::bigint,
    v_earned_cents - v_reserved_cents
  );

  if not v_idempotent_replay and p_amount_cents::bigint > v_available_cents then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'insufficient_available_balance',
      'idempotent_replay', false,
      'gross_cents', v_gross_cents,
      'commission_cents', v_commission_cents,
      'earned_cents', v_earned_cents,
      'automatic_reserved_cents', v_automatic_reserved_cents,
      'manual_reserved_cents', v_manual_reserved_cents,
      'reserved_cents', v_reserved_cents,
      'available_cents', v_available_cents,
      'requested_cents', p_amount_cents
    );
  end if;

  if not v_idempotent_replay then
    perform pg_catalog.set_config(
      'zivo.eats_manual_payout_rpc',
      'on',
      true
    );

    insert into public.eats_payout_requests (
      restaurant_id,
      requested_by,
      amount_cents,
      currency,
      rail,
      payout_method_id,
      status,
      note,
      idempotency_key,
      payout_destination_snapshot
    ) values (
      p_restaurant_id,
      p_requested_by,
      p_amount_cents,
      'USD',
      v_rail,
      p_payout_method_id,
      'pending',
      v_note,
      p_idempotency_key,
      v_destination_snapshot
    )
    returning * into v_request;

    v_manual_reserved_cents := v_manual_reserved_cents + p_amount_cents;
    v_reserved_cents := v_automatic_reserved_cents + v_manual_reserved_cents;
    v_available_cents := pg_catalog.greatest(
      0::bigint,
      v_earned_cents - v_reserved_cents
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', case when v_idempotent_replay then 'replayed' else 'created' end,
    'idempotent_replay', v_idempotent_replay,
    'gross_cents', v_gross_cents,
    'commission_cents', v_commission_cents,
    'earned_cents', v_earned_cents,
    'automatic_reserved_cents', v_automatic_reserved_cents,
    'manual_reserved_cents', v_manual_reserved_cents,
    'reserved_cents', v_reserved_cents,
    'available_cents', v_available_cents,
    'request', pg_catalog.to_jsonb(v_request)
  );
end;
$$;

revoke all on function public.request_eats_manual_payout(
  uuid, uuid, uuid, integer, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.request_eats_manual_payout(
  uuid, uuid, uuid, integer, text, uuid, text
) to service_role;

comment on function public.request_eats_manual_payout(
  uuid, uuid, uuid, integer, text, uuid, text
) is
  'Service-only atomic owner/method/balance/idempotency gate for manual Eats payouts.';

commit;

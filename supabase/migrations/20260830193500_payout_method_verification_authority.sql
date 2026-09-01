-- Give finance a server-owned, audited verification workflow for payout
-- destinations. Owners may create a pending destination, but cannot mark it
-- verified. Only the MFA-gated admin Edge Function may call this service-only
-- RPC after a human checks the exact account details.

begin;

create schema if not exists private;

alter table public.customer_payout_methods
  add column if not exists verified_at timestamptz;

-- Reviewer identity is finance-only audit evidence. Do not place it on the
-- owner-readable destination row, where PostgreSQL RLS cannot hide one column.
alter table public.customer_payout_methods
  drop column if exists verified_by;

comment on column public.customer_payout_methods.verified_at is
  'Time an authorized finance reviewer last verified this exact destination.';
comment on column public.customer_payout_methods.verification_note is
  'Owner-visible review status note. Never store internal evidence, reviewer identity, or secrets here.';

alter table public.eats_payout_requests
  add column if not exists processing_by uuid,
  add column if not exists processing_at timestamptz,
  add column if not exists resolved_by uuid,
  add column if not exists resolved_at timestamptz;

comment on column public.eats_payout_requests.processing_by is
  'Finance reviewer who atomically claimed the manual transfer workflow.';
comment on column public.eats_payout_requests.resolved_by is
  'Finance reviewer who recorded the terminal paid or rejected decision.';
comment on column public.eats_payout_requests.admin_note is
  'Internal finance evidence. Owner reads must use list_own_eats_payout_requests, which returns deterministic status copy instead.';
comment on column public.eats_payout_requests.failure_reason is
  'Internal finance failure evidence. Never expose this base-table field to a restaurant owner.';

alter table public.eats_payout_requests
  drop constraint if exists eats_payout_requests_status_check,
  drop constraint if exists eats_payout_requests_financial_snapshot_check;

alter table public.eats_payout_requests
  add constraint eats_payout_requests_status_check
    check (
      status in (
        'pending',
        'processing',
        'paid',
        'rejected',
        'failed',
        'cancelled'
      )
    ),
  add constraint eats_payout_requests_financial_snapshot_check
    check (
      amount_cents > 0
      and pg_catalog.upper(pg_catalog.btrim(currency)) = 'USD'
      and payout_destination_snapshot is not null
    );

-- Manual-rail earnings are unavailable until a fixed seven-day refund/dispute
-- hold has elapsed. Stamp the entitlement for both successful delivery and the
-- explicit paid-cancellation/no-refund state. NULL remains ineligible.
update public.food_orders as food
   set payout_eligible_at = case
     when (
       food.status::text in ('delivered', 'completed')
       and food.payment_status in ('paid', 'cash_on_delivery')
     )
     or (
       food.status::text = 'cancelled'
       and food.payment_status = 'paid'
       and food.last_payment_error = 'cancelled_no_refund'
     )
       then pg_catalog.now() + interval '7 days'
     else null
   end
 where food.payout_eligible_at is distinct from case
   when (
     food.status::text in ('delivered', 'completed')
     and food.payment_status in ('paid', 'cash_on_delivery')
   )
   or (
     food.status::text = 'cancelled'
     and food.payment_status = 'paid'
     and food.last_payment_error = 'cancelled_no_refund'
   )
     then pg_catalog.now() + interval '7 days'
   else null
 end;

create or replace function private.eats_payout_eligibility_window()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new_entitled boolean;
  v_old_entitled boolean := false;
begin
  v_new_entitled := (
    new.status::text in ('delivered', 'completed')
    and new.payment_status in ('paid', 'cash_on_delivery')
  ) or (
    new.status::text = 'cancelled'
    and new.payment_status = 'paid'
    and new.last_payment_error = 'cancelled_no_refund'
  );

  if tg_op = 'UPDATE' then
    v_old_entitled := (
      old.status::text in ('delivered', 'completed')
      and old.payment_status in ('paid', 'cash_on_delivery')
    ) or (
      old.status::text = 'cancelled'
      and old.payment_status = 'paid'
      and old.last_payment_error = 'cancelled_no_refund'
    );
  end if;

  if not v_new_entitled then
    new.payout_eligible_at := null;
  elsif tg_op = 'INSERT'
     or not v_old_entitled
     or new.payout_eligible_at is null then
    -- Start a fresh hold at the transition itself. Historical paid/created
    -- timestamps must never make a newly delivered or newly entitled order
    -- immediately withdrawable.
    new.payout_eligible_at := pg_catalog.now() + interval '7 days';
  end if;
  return new;
end;
$$;

revoke all on function private.eats_payout_eligibility_window()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_a_eats_payout_eligibility_window
  on public.food_orders;
create trigger trg_a_eats_payout_eligibility_window
before insert or update on public.food_orders
for each row
execute function private.eats_payout_eligibility_window();

comment on function private.eats_payout_eligibility_window() is
  'Server-stamps the seven-day manual payout hold at each merchant earning-entitlement transition. NULL is never immediate eligibility.';

-- Restaurant ownership is immutable after any financial history exists. This
-- blocks a new owner from inheriting the prior owner's unsettled earnings or
-- obligations. There is deliberately no service-role bypass; a future transfer
-- workflow must settle/migrate an explicit ownership epoch first.
create or replace function private.eats_restaurant_financial_owner_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     and (
       exists (
         select 1
           from public.food_orders as food
          where food.restaurant_id = old.id
       )
       or exists (
         select 1
           from public.eats_payout_requests as request
          where request.restaurant_id = old.id
       )
       or exists (
         select 1
           from public.eats_payout_ledger as ledger
          where ledger.restaurant_id = old.id
       )
     ) then
    raise exception 'restaurant_financial_owner_is_immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.eats_restaurant_financial_owner_gate()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_eats_restaurant_financial_owner_gate
  on public.restaurants;
create trigger trg_eats_restaurant_financial_owner_gate
before update of owner_id on public.restaurants
for each row
execute function private.eats_restaurant_financial_owner_gate();

comment on function private.eats_restaurant_financial_owner_gate() is
  'Blocks owner changes after any Eats order or payout history exists so settlement authority cannot cross owners.';

drop function if exists public.review_customer_payout_method(
  uuid,
  uuid,
  text,
  text
);

create or replace function public.review_customer_payout_method(
  p_method_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_owner_status_note text,
  p_internal_evidence text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_method public.customer_payout_methods%rowtype;
  v_decision text := pg_catalog.lower(pg_catalog.btrim(p_decision));
  v_owner_status_note text := pg_catalog.btrim(p_owner_status_note);
  v_internal_evidence text := pg_catalog.btrim(p_internal_evidence);
  v_method_type text;
  v_rail text;
  v_expected_rail text;
  v_old_is_verified boolean;
  v_old_verification_status text;
begin
  if current_user <> 'service_role'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'review_payout_method_service_role_required'
      using errcode = '42501';
  end if;
  if p_method_id is null or p_reviewer_id is null then
    raise exception 'review_payout_method_invalid_identity'
      using errcode = '22023';
  end if;
  if v_decision not in ('verified', 'rejected') then
    raise exception 'review_payout_method_invalid_decision'
      using errcode = '22023';
  end if;
  if v_owner_status_note is null
     or pg_catalog.char_length(v_owner_status_note) < 10
     or pg_catalog.char_length(v_owner_status_note) > 500 then
    raise exception 'review_payout_method_owner_status_note_required'
      using errcode = '22023';
  end if;
  if v_internal_evidence is null
     or pg_catalog.char_length(v_internal_evidence) < 10
     or pg_catalog.char_length(v_internal_evidence) > 1000 then
    raise exception 'review_payout_method_internal_evidence_required'
      using errcode = '22023';
  end if;

  select method.*
    into v_method
    from public.customer_payout_methods as method
   where method.id = p_method_id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'payout_method_not_found'
    );
  end if;

  v_old_is_verified := v_method.is_verified;
  v_old_verification_status := v_method.verification_status;

  v_method_type := pg_catalog.lower(
    pg_catalog.btrim(coalesce(v_method.method_type, ''))
  );
  v_rail := pg_catalog.lower(
    pg_catalog.btrim(coalesce(v_method.rail, v_method_type))
  );
  if v_rail = 'bank_transfer' then
    v_rail := 'bank_wire';
  end if;
  v_expected_rail := case v_method_type
    when 'aba' then 'aba'
    when 'bank_transfer' then 'bank_wire'
    when 'paypal' then 'paypal'
    else null
  end;

  if v_decision = 'verified' then
    if v_method.user_id is null
       or v_method_type not in ('aba', 'bank_transfer', 'paypal')
       or v_rail not in ('aba', 'bank_wire', 'paypal') then
      raise exception 'review_payout_method_unsupported_destination'
        using errcode = '22023';
    end if;
    if v_rail is distinct from v_expected_rail then
      raise exception 'review_payout_method_rail_mismatch'
        using errcode = '22023';
    end if;
    if v_method_type = 'aba'
       and (
         nullif(pg_catalog.btrim(v_method.account_holder_name), '') is null
         or nullif(pg_catalog.btrim(v_method.aba_account_id), '') is null
       ) then
      raise exception 'review_payout_method_incomplete_aba'
        using errcode = '22023';
    end if;
    if v_method_type = 'bank_transfer'
       and (
         nullif(pg_catalog.btrim(v_method.account_holder_name), '') is null
         or nullif(pg_catalog.btrim(v_method.bank_name), '') is null
         or nullif(pg_catalog.btrim(v_method.account_number), '') is null
       ) then
      raise exception 'review_payout_method_incomplete_bank'
        using errcode = '22023';
    end if;
    if v_method_type = 'paypal'
       and nullif(pg_catalog.btrim(v_method.account_number), '') is null then
      raise exception 'review_payout_method_incomplete_paypal'
        using errcode = '22023';
    end if;
  end if;

  if v_decision = 'rejected'
     and exists (
       select 1
         from public.eats_payout_requests as request
        where request.payout_method_id = v_method.id
          and coalesce(
            pg_catalog.lower(pg_catalog.btrim(request.status)),
            ''
          ) not in ('paid', 'rejected', 'cancelled', 'failed')
     ) then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'active_payout_requests_require_resolution'
    );
  end if;

  update public.customer_payout_methods as method
     set rail = case
           when v_decision = 'verified' then v_expected_rail
           else method.rail
         end,
         is_verified = v_decision = 'verified',
         verification_status = v_decision,
         verification_note = v_owner_status_note,
         verified_at = case
           when v_decision = 'verified' then pg_catalog.now()
           else null
         end,
         updated_at = pg_catalog.now()
   where method.id = v_method.id
   returning * into v_method;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata
  ) values (
    p_reviewer_id,
    'payout_method_' || v_decision,
    'customer_payout_method',
    v_method.id::text,
    pg_catalog.jsonb_build_object(
      'is_verified', v_old_is_verified,
      'verification_status', v_old_verification_status
    ),
    pg_catalog.jsonb_build_object(
      'is_verified', v_method.is_verified,
      'verification_status', v_method.verification_status,
      'verified_at', v_method.verified_at,
      'reviewer_id', p_reviewer_id
    ),
    pg_catalog.jsonb_build_object(
      'user_id', v_method.user_id,
      'store_id', v_method.store_id,
      'method_type', v_method_type,
      'rail', v_rail,
      'country_code', v_method.country_code,
      'destination_last4', pg_catalog.right(
        coalesce(v_method.account_number, v_method.aba_account_id, ''),
        4
      ),
      'internal_evidence', v_internal_evidence
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'payout_method_' || v_decision,
    'method_id', v_method.id,
    'user_id', v_method.user_id,
    'store_id', v_method.store_id,
    'verification_status', v_method.verification_status,
    'is_verified', v_method.is_verified,
    'verified_at', v_method.verified_at
  );
end;
$$;

revoke all on function public.review_customer_payout_method(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.review_customer_payout_method(uuid, uuid, text, text, text)
  to service_role;

comment on function public.review_customer_payout_method(uuid, uuid, text, text, text) is
  'Service-only atomic payout-destination review. Owner status copy is stored on the destination; internal verification evidence remains finance-only in the audit log.';

create or replace function private.payout_method_active_request_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_method_id uuid := case when tg_op = 'DELETE' then old.id else new.id end;
  v_is_revocation boolean := tg_op = 'DELETE'
    or (
      tg_op = 'UPDATE'
      and coalesce(old.is_verified, false)
      and (
        not coalesce(new.is_verified, false)
        or pg_catalog.lower(
          pg_catalog.btrim(coalesce(new.verification_status, ''))
        ) <> 'verified'
      )
    );
begin
  if v_is_revocation
     and exists (
       select 1
         from public.eats_payout_requests as request
        where request.payout_method_id = v_method_id
          and coalesce(
            pg_catalog.lower(pg_catalog.btrim(request.status)),
            ''
          ) not in ('paid', 'rejected', 'cancelled', 'failed')
     ) then
    raise exception 'payout_method_has_active_requests'
      using errcode = '40001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.payout_method_active_request_gate()
  from public, anon, authenticated;

drop trigger if exists trg_payout_method_active_request_gate
  on public.customer_payout_methods;
create trigger trg_payout_method_active_request_gate
before update or delete on public.customer_payout_methods
for each row
execute function private.payout_method_active_request_gate();

-- Canonicalize payout-destination reads. Legacy policies exposed complete bank
-- or ABA identifiers to an account owner (and, after a store transfer, could
-- expose the prior owner's destination to the new owner). No browser role gets
-- base-table SELECT now. Owners use a masked requester-scoped RPC; AAL2 finance
-- uses a separate full-detail RPC.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
      from pg_catalog.pg_policies
     where schemaname = 'public'
       and tablename = 'customer_payout_methods'
  loop
    execute pg_catalog.format(
      'drop policy if exists %I on public.customer_payout_methods',
      v_policy.policyname
    );
  end loop;
end;
$$;

revoke select on table public.customer_payout_methods
  from public, anon, authenticated;
grant all privileges on table public.customer_payout_methods to service_role;

create or replace function public.list_own_customer_payout_methods(
  p_scope text default 'all',
  p_store_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  store_id uuid,
  method_type text,
  rail text,
  label text,
  bank_name text,
  account_holder_name text,
  destination_last4 text,
  country_code text,
  is_default boolean,
  is_verified boolean,
  verification_status text,
  verification_note text,
  verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_scope text := pg_catalog.lower(pg_catalog.btrim(p_scope));
begin
  if v_user_id is null then
    raise exception 'payout_method_authentication_required'
      using errcode = '42501';
  end if;
  if v_scope not in ('all', 'account', 'store', 'store_or_account')
     or (
       v_scope in ('store', 'store_or_account')
       and p_store_id is null
     ) then
    raise exception 'payout_method_invalid_scope'
      using errcode = '22023';
  end if;

  return query
  select
    method.id,
    method.user_id,
    method.store_id,
    method.method_type,
    method.rail,
    method.label,
    method.bank_name,
    method.account_holder_name,
    nullif(
      pg_catalog.right(
        coalesce(method.account_number, method.aba_account_id, ''),
        4
      ),
      ''
    ) as destination_last4,
    method.country_code,
    method.is_default,
    method.is_verified,
    method.verification_status,
    method.verification_note,
    method.verified_at,
    method.created_at,
    method.updated_at
  from public.customer_payout_methods as method
  where method.user_id = v_user_id
    and case v_scope
      when 'all' then true
      when 'account' then method.store_id is null
      when 'store' then method.store_id = p_store_id
      when 'store_or_account' then
        method.store_id = p_store_id or method.store_id is null
      else false
    end
  order by method.is_default desc, method.created_at desc, method.id desc;
end;
$$;

revoke all on function public.list_own_customer_payout_methods(text, uuid)
  from public, anon;
grant execute on function public.list_own_customer_payout_methods(text, uuid)
  to authenticated;

comment on function public.list_own_customer_payout_methods(text, uuid) is
  'Requester-only masked payout destinations. Never returns a complete bank account, ABA identifier, or finance evidence.';

create or replace function public.list_finance_customer_payout_methods(
  p_offset integer default 0,
  p_limit integer default 100
)
returns table (
  id uuid,
  user_id uuid,
  store_id uuid,
  method_type text,
  rail text,
  label text,
  bank_name text,
  account_holder_name text,
  account_number text,
  aba_account_id text,
  country_code text,
  is_default boolean,
  is_verified boolean,
  verification_status text,
  verification_note text,
  verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
     or (auth.jwt() ->> 'aal') not in ('aal2', 'aal3')
     or not (
       public.has_role(v_user_id, 'admin')
       or public.has_role(v_user_id, 'super_admin')
       or public.has_role(v_user_id, 'finance')
     ) then
    raise exception 'finance_payout_method_access_denied'
      using errcode = '42501';
  end if;
  if p_offset < 0
     or p_offset > 20000
     or p_limit < 1
     or p_limit > 250 then
    raise exception 'finance_payout_method_invalid_window'
      using errcode = '22023';
  end if;

  return query
  select
    method.id,
    method.user_id,
    method.store_id,
    method.method_type,
    method.rail,
    method.label,
    method.bank_name,
    method.account_holder_name,
    method.account_number,
    method.aba_account_id,
    method.country_code,
    method.is_default,
    method.is_verified,
    method.verification_status,
    method.verification_note,
    method.verified_at,
    method.created_at,
    method.updated_at
  from public.customer_payout_methods as method
  order by method.created_at desc, method.id desc
  offset p_offset
  limit p_limit;
end;
$$;

revoke all on function public.list_finance_customer_payout_methods(integer, integer)
  from public, anon;
grant execute on function public.list_finance_customer_payout_methods(integer, integer)
  to authenticated;

comment on function public.list_finance_customer_payout_methods(integer, integer) is
  'AAL2 finance-only full payout destinations for manual settlement operations.';

drop policy if exists "Finance can view Eats payout requests"
  on public.eats_payout_requests;
drop policy if exists "restaurant owner reads own eats payout requests"
  on public.eats_payout_requests;
drop policy if exists "Requesters read own Eats payout requests"
  on public.eats_payout_requests;
create policy "Finance can view Eats payout requests"
  on public.eats_payout_requests
  for select
  to authenticated
  using (
    (auth.jwt() ->> 'aal') in ('aal2', 'aal3')
    and (
      public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'super_admin')
      or public.has_role(auth.uid(), 'finance')
    )
  );

-- A requester keeps this deliberately narrow history even if restaurant
-- ownership later changes. A new owner never inherits prior-owner rows because
-- requested_by, not current restaurant ownership, is the authority boundary.
create or replace function public.list_own_eats_payout_requests(
  p_restaurant_id uuid default null,
  p_offset integer default 0,
  p_limit integer default 100
)
returns table (
  id uuid,
  restaurant_id uuid,
  amount_cents integer,
  currency text,
  rail text,
  status text,
  owner_status_note text,
  reference text,
  paid_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'payout_history_authentication_required'
      using errcode = '42501';
  end if;
  if p_offset < 0
     or p_offset > 20000
     or p_limit < 1
     or p_limit > 100 then
    raise exception 'payout_history_invalid_window'
      using errcode = '22023';
  end if;
  return query
  select
    request.id,
    request.restaurant_id,
    request.amount_cents,
    request.currency::text,
    request.rail::text,
    request.status::text,
    case
      when pg_catalog.lower(pg_catalog.btrim(request.status::text)) = 'paid'
        then 'Transfer completed. Keep the settlement reference for support.'
      when pg_catalog.lower(pg_catalog.btrim(request.status::text)) = 'rejected'
        then 'Finance could not approve this request. Review your payout account or contact support.'
      when pg_catalog.lower(pg_catalog.btrim(request.status::text)) = 'failed'
        then 'The transfer could not be completed. Contact support before submitting another request.'
      when pg_catalog.lower(pg_catalog.btrim(request.status::text)) = 'cancelled'
        then 'This payout request was cancelled.'
      else null
    end as owner_status_note,
    request.reference,
    request.paid_at,
    request.created_at,
    request.updated_at
  from public.eats_payout_requests as request
  where request.requested_by = v_user_id
    and (
      p_restaurant_id is null
      or request.restaurant_id = p_restaurant_id
    )
  order by request.created_at desc, request.id desc
  offset p_offset
  limit p_limit;
end;
$$;

revoke all on function public.list_own_eats_payout_requests(uuid, integer, integer)
  from public, anon;
grant execute on function public.list_own_eats_payout_requests(uuid, integer, integer)
  to authenticated;

comment on function public.list_own_eats_payout_requests(uuid, integer, integer) is
  'Requester-safe paginated Eats payout history, including after ownership transfer, without destination snapshots, finance reviewer identities, or internal audit evidence.';

create or replace function private.current_eats_manual_payout_balance(
  p_restaurant_id uuid,
  p_exclude_request_id uuid default null
)
returns table (
  earned_cents bigint,
  automatic_reserved_cents bigint,
  manual_reserved_cents bigint,
  available_cents bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_eligible_count bigint := 0;
  v_valid_count bigint := 0;
  v_earned_cents bigint := 0;
  v_automatic_reserved_cents bigint := 0;
  v_manual_reserved_cents bigint := 0;
begin
  if current_user <> 'service_role'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'current_eats_payout_balance_service_role_required'
      using errcode = '42501';
  end if;
  if p_restaurant_id is null then
    raise exception 'current_eats_payout_balance_invalid_restaurant'
      using errcode = '22023';
  end if;

  -- The caller holds the restaurant row. Freeze every currently eligible
  -- order before checking the payout request so refunds/holds cannot race a
  -- finance decision.
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
    coalesce(pg_catalog.sum(checked.earned_cents), 0)::bigint
    into v_eligible_count, v_valid_count, v_earned_cents
    from checked_orders as checked;

  if v_valid_count <> v_eligible_count then
    raise exception 'current_eats_payout_balance_invalid_order_snapshot'
      using errcode = '22000';
  end if;

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
    raise exception 'current_eats_payout_balance_invalid_auto_reservation'
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
        and nullif(pg_catalog.btrim(reversal.stripe_reversal_id), '') is not null
   );

  if exists (
    select 1
      from public.eats_payout_requests as request
     where request.restaurant_id = p_restaurant_id
       and request.id is distinct from p_exclude_request_id
       and coalesce(
         pg_catalog.lower(pg_catalog.btrim(request.status)),
         ''
       ) not in ('rejected', 'cancelled', 'failed')
       and request.amount_cents <= 0
  ) then
    raise exception 'current_eats_payout_balance_invalid_manual_reservation'
      using errcode = '22000';
  end if;

  select coalesce(pg_catalog.sum(request.amount_cents), 0)::bigint
    into v_manual_reserved_cents
    from public.eats_payout_requests as request
   where request.restaurant_id = p_restaurant_id
     and request.id is distinct from p_exclude_request_id
     and coalesce(
       pg_catalog.lower(pg_catalog.btrim(request.status)),
       ''
     ) not in ('rejected', 'cancelled', 'failed');

  return query
  select
    v_earned_cents,
    v_automatic_reserved_cents,
    v_manual_reserved_cents,
    pg_catalog.greatest(
      0::bigint,
      v_earned_cents - v_automatic_reserved_cents - v_manual_reserved_cents
    );
end;
$$;

revoke all on function private.current_eats_manual_payout_balance(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.current_eats_manual_payout_balance(uuid, uuid)
  to service_role;

create or replace function public.resolve_eats_manual_payout(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_reference text,
  p_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_restaurant_id uuid;
  v_restaurant public.restaurants%rowtype;
  v_request public.eats_payout_requests%rowtype;
  v_decision text := pg_catalog.lower(pg_catalog.btrim(p_decision));
  v_reference text := nullif(pg_catalog.btrim(p_reference), '');
  v_note text := pg_catalog.btrim(p_note);
  v_old_status text;
  v_earned_cents bigint := 0;
  v_automatic_reserved_cents bigint := 0;
  v_manual_reserved_cents bigint := 0;
  v_available_cents bigint := 0;
  v_reviewer_can_stale_release boolean := false;
  v_next_status text;
  v_current_method public.customer_payout_methods%rowtype;
begin
  if current_user <> 'service_role'
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'resolve_eats_payout_service_role_required'
      using errcode = '42501';
  end if;
  if p_request_id is null or p_reviewer_id is null then
    raise exception 'resolve_eats_payout_invalid_identity'
      using errcode = '22023';
  end if;
  if v_decision not in ('processing', 'paid', 'rejected', 'released') then
    raise exception 'resolve_eats_payout_invalid_decision'
      using errcode = '22023';
  end if;
  if v_note is null
     or pg_catalog.char_length(v_note) < 10
     or pg_catalog.char_length(v_note) > 1000 then
    raise exception 'resolve_eats_payout_note_required'
      using errcode = '22023';
  end if;
  if v_decision = 'paid'
     and (
       v_reference is null
       or pg_catalog.char_length(v_reference) < 4
       or pg_catalog.char_length(v_reference) > 160
     ) then
    raise exception 'resolve_eats_payout_reference_required'
      using errcode = '22023';
  end if;

  select request.restaurant_id
    into v_restaurant_id
    from public.eats_payout_requests as request
   where request.id = p_request_id;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'payout_request_not_found'
    );
  end if;

  -- Match request creation's lock order so a payout cannot be resolved while a
  -- concurrent request is deriving the same restaurant balance.
  select restaurant.*
    into v_restaurant
    from public.restaurants as restaurant
   where restaurant.id = v_restaurant_id
   for update;
  if not found then
    raise exception 'resolve_eats_payout_restaurant_not_found'
      using errcode = 'P0002';
  end if;

  select request.*
    into v_request
    from public.eats_payout_requests as request
   where request.id = p_request_id
     and request.restaurant_id = v_restaurant.id
   for update;
  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'payout_request_not_found'
    );
  end if;

  v_old_status := pg_catalog.lower(pg_catalog.btrim(v_request.status));
  if v_request.amount_cents <= 0
     or pg_catalog.upper(pg_catalog.btrim(v_request.currency)) <> 'USD'
     or v_request.payout_destination_snapshot is null then
    raise exception 'resolve_eats_payout_invalid_request_snapshot'
      using errcode = '22000';
  end if;

  if v_old_status = v_decision
     and (
       v_decision <> 'paid'
       or pg_catalog.btrim(coalesce(v_request.reference, '')) = v_reference
     ) then
    if v_decision = 'processing'
       and v_request.processing_by is distinct from p_reviewer_id then
      raise exception 'resolve_eats_payout_claimed_by_another_reviewer'
        using errcode = '40001';
    end if;
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'code', 'already_' || v_decision,
      'idempotent_replay', true,
      'request_id', v_request.id,
      'status', v_request.status,
      'reference', v_request.reference,
      'paid_at', v_request.paid_at
    );
  end if;

  if v_decision = 'processing' and v_old_status <> 'pending' then
    raise exception 'resolve_eats_payout_processing_conflict'
      using errcode = '40001';
  end if;
  if v_decision = 'paid'
     and (
       v_old_status <> 'processing'
       or v_request.processing_by is distinct from p_reviewer_id
     ) then
    raise exception 'resolve_eats_payout_paid_requires_exact_claim'
      using errcode = '40001';
  end if;
  if v_decision = 'rejected'
     and (
       v_old_status not in ('pending', 'processing')
       or (
         v_old_status = 'processing'
         and v_request.processing_by is distinct from p_reviewer_id
       )
     ) then
    raise exception 'resolve_eats_payout_terminal_conflict'
      using errcode = '40001';
  end if;

  if v_decision = 'released' then
    if v_old_status <> 'processing' then
      raise exception 'resolve_eats_payout_release_conflict'
        using errcode = '40001';
    end if;
    select exists (
      select 1
        from public.user_roles as reviewer_role
       where reviewer_role.user_id = p_reviewer_id
         and reviewer_role.role::text in ('admin', 'super_admin')
    ) into v_reviewer_can_stale_release;
    if v_request.processing_by is distinct from p_reviewer_id
       and (
         not v_reviewer_can_stale_release
         or v_request.processing_at is null
         or v_request.processing_at > pg_catalog.now() - interval '30 minutes'
       ) then
      raise exception 'resolve_eats_payout_release_requires_owner_or_stale_admin'
        using errcode = '42501';
    end if;
  end if;

  -- Processing is the final serialized authorization before finance sends the
  -- external transfer. Recheck all current refunds/holds here. Once finance
  -- sends money, the later paid action must always be able to record that real
  -- evidence; any post-authorization refund becomes a recovery balance, not
  -- an excuse to erase an outbound transfer.
  if v_decision = 'processing' then
    select method.*
      into v_current_method
      from public.customer_payout_methods as method
     where method.id = v_request.payout_method_id
     for update;
    if not found
       or not coalesce(v_current_method.is_verified, false)
       or pg_catalog.lower(
         pg_catalog.btrim(coalesce(v_current_method.verification_status, ''))
       ) <> 'verified'
       or v_current_method.user_id is distinct from v_request.requested_by then
      return pg_catalog.jsonb_build_object(
        'ok', false,
        'code', 'payout_destination_revoked',
        'request_id', v_request.id
      );
    end if;

    select
      balance.earned_cents,
      balance.automatic_reserved_cents,
      balance.manual_reserved_cents,
      balance.available_cents
      into
        v_earned_cents,
        v_automatic_reserved_cents,
        v_manual_reserved_cents,
        v_available_cents
      from private.current_eats_manual_payout_balance(
        v_request.restaurant_id,
        v_request.id
      ) as balance;

    if v_request.amount_cents::bigint > v_available_cents then
      return pg_catalog.jsonb_build_object(
        'ok', false,
        'code', 'payout_balance_changed',
        'request_id', v_request.id,
        'requested_cents', v_request.amount_cents,
        'earned_cents', v_earned_cents,
        'automatic_reserved_cents', v_automatic_reserved_cents,
        'other_manual_reserved_cents', v_manual_reserved_cents,
        'available_cents', v_available_cents
      );
    end if;
  end if;

  perform pg_catalog.set_config(
    'zivo.eats_manual_payout_resolution_rpc',
    'on',
    true
  );

  v_next_status := case
    when v_decision = 'released' then 'pending'
    else v_decision
  end;

  update public.eats_payout_requests as request
     set status = v_next_status,
         reference = case
           when v_decision = 'paid' then v_reference
           else request.reference
         end,
         paid_at = case
           when v_decision = 'paid' then pg_catalog.now()
           else null
         end,
         admin_note = v_note,
         failure_reason = case
           when v_decision = 'rejected' then v_note
           else null
         end,
         processing_by = case
           when v_decision = 'processing' then p_reviewer_id
           when v_decision = 'released' then null
           else request.processing_by
         end,
         processing_at = case
           when v_decision = 'processing' then pg_catalog.now()
           when v_decision = 'released' then null
           else request.processing_at
         end,
         resolved_by = case
           when v_decision in ('paid', 'rejected') then p_reviewer_id
           else null
         end,
         resolved_at = case
           when v_decision in ('paid', 'rejected') then pg_catalog.now()
           else null
         end,
         updated_at = pg_catalog.now()
   where request.id = v_request.id
   returning * into v_request;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata
  ) values (
    p_reviewer_id,
    'eats_payout_' || v_decision,
    'eats_payout_request',
    v_request.id::text,
    pg_catalog.jsonb_build_object('status', v_old_status),
    pg_catalog.jsonb_build_object(
      'status', v_request.status,
      'reference', v_request.reference,
      'paid_at', v_request.paid_at,
      'processing_by', v_request.processing_by,
      'processing_at', v_request.processing_at,
      'resolved_by', v_request.resolved_by,
      'resolved_at', v_request.resolved_at
    ),
    pg_catalog.jsonb_build_object(
      'restaurant_id', v_request.restaurant_id,
      'requested_by', v_request.requested_by,
      'amount_cents', v_request.amount_cents,
      'currency', v_request.currency,
      'rail', v_request.rail,
      'review_note', v_note
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'code', 'payout_' || v_decision,
    'idempotent_replay', false,
    'request_id', v_request.id,
    'status', v_request.status,
    'reference', v_request.reference,
    'paid_at', v_request.paid_at,
    'processing_by', v_request.processing_by,
    'processing_at', v_request.processing_at,
    'resolved_by', v_request.resolved_by,
    'resolved_at', v_request.resolved_at
  );
end;
$$;

revoke all on function public.resolve_eats_manual_payout(
  uuid, uuid, text, text, text
) from public, anon, authenticated;
grant execute on function public.resolve_eats_manual_payout(
  uuid, uuid, text, text, text
) to service_role;

comment on function public.resolve_eats_manual_payout(uuid, uuid, text, text, text) is
  'Service-only restaurant-serialized manual Eats payout processing with immutable destination evidence and admin audit.';

commit;

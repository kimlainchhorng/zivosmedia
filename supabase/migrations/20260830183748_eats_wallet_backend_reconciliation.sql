-- Authoritative Eats wallet debit/refund reconciliation.
--
-- Live drift note (2026-08-30): the main project did not yet have the debit
-- RPC, still allowed authenticated wallet-row updates, and its transaction
-- type constraint accepted `purchase`/`refund` but not `payment`. Use the
-- existing `purchase` ledger type so this migration is safe on that schema.

create or replace function public.process_customer_wallet_payment(
  p_user_id uuid,
  p_amount_cents integer,
  p_description text,
  p_reference_id uuid default null
)
returns table(transaction_id uuid, new_balance_cents integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order_customer_id uuid;
  v_order_payment_type text;
  v_order_payment_status text;
  v_order_status text;
  v_order_total_cents numeric;
  v_current_balance integer;
  v_new_balance integer;
  v_existing_transaction_id uuid;
  v_existing_amount_cents integer;
  v_transaction_id uuid;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'missing_user';
  end if;

  if p_reference_id is null then
    raise exception using errcode = '22023', message = 'missing_reference_id';
  end if;

  if p_amount_cents is null
     or p_amount_cents <= 0
     or p_amount_cents > 5000000 then
    raise exception using errcode = '22023', message = 'invalid_amount';
  end if;

  -- Treat the referenced Eats order as the source of truth even though this
  -- function is service-role-only. Lock it before the wallet so cancellation
  -- and refund take the same order -> wallet lock order and cannot race a debit.
  select
    food.customer_id,
    food.payment_type,
    food.payment_status,
    food.status::text,
    pg_catalog.round(food.total_amount * 100)
    into
      v_order_customer_id,
      v_order_payment_type,
      v_order_payment_status,
      v_order_status,
      v_order_total_cents
    from public.food_orders as food
   where food.id = p_reference_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'order_not_found';
  end if;

  if p_user_id is distinct from v_order_customer_id then
    raise exception using errcode = '42501', message = 'wallet_payment_user_mismatch';
  end if;

  if v_order_payment_type is distinct from 'wallet' then
    raise exception using errcode = '22023', message = 'order_is_not_wallet_payment';
  end if;

  if pg_catalog.lower(coalesce(v_order_status, '')) = 'cancelled'
     or pg_catalog.lower(coalesce(v_order_payment_status, '')) in ('refunded', 'refund_pending') then
    raise exception using errcode = 'P0001', message = 'order_can_no_longer_be_charged';
  end if;

  if v_order_total_cents is null
     or v_order_total_cents <= 0
     or v_order_total_cents <> p_amount_cents then
    raise exception using errcode = '22023', message = 'wallet_payment_order_amount_mismatch';
  end if;

  select coalesce(wallet.balance_cents, 0)
    into v_current_balance
    from public.customer_wallets as wallet
   where wallet.user_id = p_user_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'wallet_not_found';
  end if;

  -- The wallet-row lock serializes same-user charges. Recheck the reference
  -- only after taking that lock so concurrent retries cannot both debit.
  select tx.id, tx.amount_cents
    into v_existing_transaction_id, v_existing_amount_cents
    from public.customer_wallet_transactions as tx
   where tx.user_id = p_user_id
     and (tx.reference_id = p_reference_id or tx.order_id = p_reference_id)
     and tx.type in ('purchase', 'payment')
     and tx.amount_cents < 0
   order by tx.created_at asc nulls last, tx.id asc
   limit 1;

  if found then
    if v_existing_amount_cents <> -p_amount_cents then
      raise exception using
        errcode = '22023',
        message = 'wallet_payment_reference_amount_mismatch';
    end if;

    -- A durable debit and the order payment state are one transition. This
    -- also heals an earlier invocation that committed the debit but crashed
    -- before the Edge Function could request dispatch.
    update public.food_orders as food
       set payment_status = 'paid',
           payment_provider = 'wallet',
           last_payment_error = 'delivery_dispatch_pending',
           updated_at = pg_catalog.now()
     where food.id = p_reference_id;

    return query
    select v_existing_transaction_id, v_current_balance;
    return;
  end if;

  if v_current_balance < p_amount_cents then
    raise exception using errcode = 'P0001', message = 'insufficient_funds';
  end if;

  v_new_balance := v_current_balance - p_amount_cents;

  update public.customer_wallets as wallet
     set balance_cents = v_new_balance,
         updated_at = pg_catalog.now()
   where wallet.user_id = p_user_id;

  insert into public.customer_wallet_transactions (
    user_id,
    amount_cents,
    balance_after_cents,
    type,
    description,
    reference_id,
    order_id
  )
  values (
    p_user_id,
    -p_amount_cents,
    v_new_balance,
    'purchase',
    coalesce(
      nullif(pg_catalog.left(pg_catalog.btrim(p_description), 180), ''),
      'Wallet payment'
    ),
    p_reference_id,
    p_reference_id
  )
  returning id into v_transaction_id;

  -- Commit the charge evidence and its dispatch-recovery marker in the same
  -- transaction as the wallet balance and ledger mutation. Cancellation takes
  -- the same order lock and cannot strand a debit as an unpaid order.
  update public.food_orders as food
     set payment_status = 'paid',
         payment_provider = 'wallet',
         last_payment_error = 'delivery_dispatch_pending',
         updated_at = pg_catalog.now()
   where food.id = p_reference_id;

  return query
  select v_transaction_id, v_new_balance;
end;
$function$;

revoke all on function public.process_customer_wallet_payment(uuid, integer, text, uuid)
  from public, anon, authenticated;
grant execute on function public.process_customer_wallet_payment(uuid, integer, text, uuid)
  to service_role;

comment on function public.process_customer_wallet_payment(uuid, integer, text, uuid) is
  'Idempotently debits a customer wallet for one referenced Eats order under a wallet-row lock; service-role only.';

create or replace function public.process_eats_wallet_refund(
  p_user_id uuid,
  p_order_id uuid,
  p_description text default null
)
returns table(
  transaction_id uuid,
  refund_cents integer,
  new_balance_cents integer,
  already_refunded boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order_customer_id uuid;
  v_order_payment_type text;
  v_debit_amount_cents integer;
  v_refund_cents integer;
  v_current_balance integer;
  v_new_balance integer;
  v_existing_refund_id uuid;
  v_existing_refund_cents integer;
  v_refund_transaction_id uuid;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'missing_user';
  end if;

  if p_order_id is null then
    raise exception using errcode = '22023', message = 'missing_order_id';
  end if;

  -- Lock the order as well as the wallet so cancellation/refund state becomes
  -- authoritative in the same transaction as the balance mutation.
  select food.customer_id, food.payment_type
    into v_order_customer_id, v_order_payment_type
    from public.food_orders as food
   where food.id = p_order_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'order_not_found';
  end if;

  if v_order_customer_id is distinct from p_user_id then
    raise exception using errcode = '42501', message = 'wallet_refund_user_mismatch';
  end if;

  if v_order_payment_type is distinct from 'wallet' then
    raise exception using errcode = '22023', message = 'order_is_not_wallet_payment';
  end if;

  -- Derive the refund amount from the original debit. Never trust a caller-
  -- supplied amount for a money-return operation.
  select tx.amount_cents
    into v_debit_amount_cents
    from public.customer_wallet_transactions as tx
   where tx.user_id = p_user_id
     and (tx.reference_id = p_order_id or tx.order_id = p_order_id)
     and tx.type in ('purchase', 'payment')
     and tx.amount_cents < 0
   order by tx.created_at asc nulls last, tx.id asc
   limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'original_wallet_debit_not_found';
  end if;

  v_refund_cents := -v_debit_amount_cents;
  if v_refund_cents <= 0 then
    raise exception using errcode = 'P0001', message = 'invalid_original_wallet_debit';
  end if;

  select coalesce(wallet.balance_cents, 0)
    into v_current_balance
    from public.customer_wallets as wallet
   where wallet.user_id = p_user_id
   for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'wallet_not_found';
  end if;

  -- Recheck idempotency after the wallet lock. Concurrent refund attempts for
  -- this customer now serialize, and only the first can insert the credit.
  select tx.id, tx.amount_cents
    into v_existing_refund_id, v_existing_refund_cents
    from public.customer_wallet_transactions as tx
   where tx.user_id = p_user_id
     and (tx.reference_id = p_order_id or tx.order_id = p_order_id)
     and tx.type = 'refund'
     and tx.amount_cents > 0
   order by tx.created_at asc nulls last, tx.id asc
   limit 1;

  if found then
    if v_existing_refund_cents <> v_refund_cents then
      raise exception using
        errcode = '22023',
        message = 'wallet_refund_amount_mismatch';
    end if;

    update public.food_orders as food
       set status = 'cancelled',
           payment_status = 'refunded',
           payment_provider = 'wallet',
           last_payment_error = null,
           updated_at = pg_catalog.now()
     where food.id = p_order_id;

    return query
    select
      v_existing_refund_id,
      v_existing_refund_cents,
      v_current_balance,
      true;
    return;
  end if;

  v_new_balance := v_current_balance + v_refund_cents;

  update public.customer_wallets as wallet
     set balance_cents = v_new_balance,
         updated_at = pg_catalog.now()
   where wallet.user_id = p_user_id;

  insert into public.customer_wallet_transactions (
    user_id,
    amount_cents,
    balance_after_cents,
    type,
    description,
    reference_id,
    order_id
  )
  values (
    p_user_id,
    v_refund_cents,
    v_new_balance,
    'refund',
    coalesce(
      nullif(pg_catalog.left(pg_catalog.btrim(p_description), 180), ''),
      'Eats wallet cancellation refund'
    ),
    p_order_id,
    p_order_id
  )
  returning id into v_refund_transaction_id;

  update public.food_orders as food
     set status = 'cancelled',
         payment_status = 'refunded',
         payment_provider = 'wallet',
         last_payment_error = null,
         updated_at = pg_catalog.now()
   where food.id = p_order_id;

  return query
  select v_refund_transaction_id, v_refund_cents, v_new_balance, false;
end;
$function$;

revoke all on function public.process_eats_wallet_refund(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.process_eats_wallet_refund(uuid, uuid, text)
  to service_role;

comment on function public.process_eats_wallet_refund(uuid, uuid, text) is
  'Atomically refunds an original Eats wallet debit once, writes the resulting balance, and cancels the order; service-role only.';

-- Preserve owner reads while making every browser-side balance or ledger write
-- fail closed. Trusted Edge Functions use service_role and bypass these policies.
alter table public.customer_wallets enable row level security;
alter table public.customer_wallet_transactions enable row level security;

drop policy if exists "cw_update_own" on public.customer_wallets;
drop policy if exists "customer_wallets_block_direct_insert" on public.customer_wallets;
drop policy if exists "customer_wallets_block_direct_update" on public.customer_wallets;
drop policy if exists "customer_wallets_block_direct_delete" on public.customer_wallets;

create policy "customer_wallets_block_direct_insert"
on public.customer_wallets
as restrictive
for insert
to authenticated
with check (false);

create policy "customer_wallets_block_direct_update"
on public.customer_wallets
as restrictive
for update
to authenticated
using (false)
with check (false);

create policy "customer_wallets_block_direct_delete"
on public.customer_wallets
as restrictive
for delete
to authenticated
using (false);

drop policy if exists "customer_wallet_transactions_block_direct_insert"
  on public.customer_wallet_transactions;
drop policy if exists "customer_wallet_transactions_block_direct_update"
  on public.customer_wallet_transactions;
drop policy if exists "customer_wallet_transactions_block_direct_delete"
  on public.customer_wallet_transactions;

create policy "customer_wallet_transactions_block_direct_insert"
on public.customer_wallet_transactions
as restrictive
for insert
to authenticated
with check (false);

create policy "customer_wallet_transactions_block_direct_update"
on public.customer_wallet_transactions
as restrictive
for update
to authenticated
using (false)
with check (false);

create policy "customer_wallet_transactions_block_direct_delete"
on public.customer_wallet_transactions
as restrictive
for delete
to authenticated
using (false);

revoke insert, update, delete on table public.customer_wallets
  from public, anon, authenticated;
revoke insert, update, delete on table public.customer_wallet_transactions
  from public, anon, authenticated;

comment on table public.customer_wallets is
  'Customer wallet balances are mutated only by service-role payment, refund, and credit operations.';

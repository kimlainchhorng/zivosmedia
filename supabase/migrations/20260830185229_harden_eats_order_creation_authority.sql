-- Compatibility phase for the authenticated create-eats-order boundary.
--
-- This migration deliberately widens only the payment-type constraint. The
-- Edge Function, atomic RPC, and native/web clients must be deployed before
-- the later eats_order_creation_authority_hard_cutover migration removes
-- direct browser INSERT authority. Keeping those phases separate prevents an
-- old cached/native client from losing order creation during rollout.

begin;

-- The live constraint still allows only card/cash, while current Eats flows
-- and the authoritative wallet reconciliation require the exact selected
-- rail. Preserve the existing application contract and the already-present
-- payment_provider allowlist.
alter table public.food_orders
  drop constraint if exists food_orders_payment_type_check;

alter table public.food_orders
  add constraint food_orders_payment_type_check
  check (
    payment_type is null
    or payment_type = any (
      array['card', 'cash', 'wallet', 'paypal', 'square']::text[]
    )
  );

comment on constraint food_orders_payment_type_check on public.food_orders is
  'Selected Eats payment rail. Canonical provider settlement remains in payment_provider.';

commit;

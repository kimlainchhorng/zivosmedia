-- FINAL HARD CUTOVER — APPLY ONLY AFTER ALL PREREQUISITES ARE LIVE.
--
-- Required deployment order:
--   1. Apply 20260830185229_harden_eats_order_creation_authority.sql.
--   2. Apply 20260830191000_eats_inventory_promo_atomic_order.sql.
--   3. Deploy create-eats-order with UUID idempotency and verify web/native
--      minimum versions no longer insert public.food_orders directly.
--   4. Only then apply this migration to revoke browser INSERT authority.
--
-- Keeping this revocation out of the compatibility migration makes the
-- rollout intentionally phaseable for cached PWAs and installed native apps.

begin;

alter table public.food_orders enable row level security;

drop policy if exists zivo_fo_insert on public.food_orders;
drop policy if exists food_orders_block_customer_direct_insert
  on public.food_orders;

create policy food_orders_block_customer_direct_insert
on public.food_orders
as restrictive
for insert
to anon, authenticated
with check (false);

revoke insert on table public.food_orders
  from public, anon, authenticated;
grant insert on table public.food_orders to service_role;

comment on table public.food_orders is
  'Customer Eats orders are inserted only by the authenticated server-pricing boundary; browser roles retain policy-scoped reads.';

commit;

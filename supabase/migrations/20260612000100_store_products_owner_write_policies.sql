-- Store owners can already SELECT (public, in-stock) and DELETE their own
-- products, and can UPDATE their store_profiles directly. This adds the missing
-- symmetric INSERT/UPDATE so owners can manage their own products without the
-- store-product-manage edge function (ownership-checked via store_profiles.owner_id).
-- Admins keep their existing admin-only policies (RLS policies are OR-combined).
--
-- Already applied to the linked project via the Supabase MCP apply_migration;
-- committed here so the repo migration history stays in sync with prod.

drop policy if exists "Store owners can insert their products" on public.store_products;
create policy "Store owners can insert their products"
on public.store_products
for insert
to authenticated
with check (
  exists (
    select 1 from public.store_profiles s
    where s.id = store_products.store_id
      and s.owner_id = (select auth.uid())
  )
);

drop policy if exists "Store owners can update their products" on public.store_products;
create policy "Store owners can update their products"
on public.store_products
for update
to authenticated
using (
  exists (
    select 1 from public.store_profiles s
    where s.id = store_products.store_id
      and s.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.store_profiles s
    where s.id = store_products.store_id
      and s.owner_id = (select auth.uid())
  )
);

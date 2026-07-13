-- Shoppable feed: tag store_products onto user_posts / store_posts.
-- One post can tag many products, ordered.

create table if not exists public.post_products (
  id                uuid primary key default gen_random_uuid(),
  post_id           uuid not null,
  post_source       text not null check (post_source in ('store', 'user')),
  store_product_id  uuid not null references public.store_products(id) on delete cascade,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (post_id, store_product_id)
);

create index if not exists idx_post_products_post
  on public.post_products (post_id, sort_order);

create index if not exists idx_post_products_product
  on public.post_products (store_product_id);

alter table public.post_products enable row level security;

grant select on table public.post_products to anon, authenticated;
grant insert, update, delete on table public.post_products to authenticated;
grant all on table public.post_products to service_role;

-- Anyone can read product tags (feed renders them publicly).
drop policy if exists "post_products_select_all" on public.post_products;
create policy "post_products_select_all"
  on public.post_products for select
  to anon, authenticated
  using (true);

-- Insert / update / delete: only the post author may tag products.
-- user_posts.user_id matches auth.uid; store_posts owner = store.owner_id.
drop policy if exists "post_products_write_own" on public.post_products;
create policy "post_products_write_own"
  on public.post_products for insert
  to authenticated
  with check (
    (post_source = 'user' and exists (
      select 1 from public.user_posts up
      where up.id = post_products.post_id and up.user_id = auth.uid()
    ))
    or
    (post_source = 'store' and exists (
      select 1 from public.store_posts sp
      join public.store_profiles s on s.id = sp.store_id
      where sp.id = post_products.post_id and s.owner_id = auth.uid()
    ))
  );

drop policy if exists "post_products_update_own" on public.post_products;
create policy "post_products_update_own"
  on public.post_products for update
  to authenticated
  using (
    (post_source = 'user' and exists (
      select 1 from public.user_posts up
      where up.id = post_products.post_id and up.user_id = auth.uid()
    ))
    or
    (post_source = 'store' and exists (
      select 1 from public.store_posts sp
      join public.store_profiles s on s.id = sp.store_id
      where sp.id = post_products.post_id and s.owner_id = auth.uid()
    ))
  );

drop policy if exists "post_products_delete_own" on public.post_products;
create policy "post_products_delete_own"
  on public.post_products for delete
  to authenticated
  using (
    (post_source = 'user' and exists (
      select 1 from public.user_posts up
      where up.id = post_products.post_id and up.user_id = auth.uid()
    ))
    or
    (post_source = 'store' and exists (
      select 1 from public.store_posts sp
      join public.store_profiles s on s.id = sp.store_id
      where sp.id = post_products.post_id and s.owner_id = auth.uid()
    ))
  );

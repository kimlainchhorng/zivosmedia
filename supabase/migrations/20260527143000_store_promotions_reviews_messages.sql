-- Generic store-facing tables that the Auto Repair admin UI (and likely other
-- store types) expects to exist. None of these tables were ever created in
-- prior migrations, so AutoRepair Promos / Reviews / Inbox sections were
-- silently returning empty results forever:
--
--   * store_promotions  — admin-created promo codes / discounts
--   * store_reviews     — public reviews of the store, shop can reply
--   * store_messages    — inbound customer messages, shop replies via JSONB
--
-- For v1 RLS is shop-owner + admin only on writes. Customer-facing reads /
-- inserts can be added in a follow-up migration when there's a public surface.

-- ─── store_promotions ──────────────────────────────────────────────────────
create table if not exists public.store_promotions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null,
  promo_code text,
  discount_type text not null default 'percent',  -- percent | amount
  discount_value numeric,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_promotions_store_id_idx
  on public.store_promotions (store_id);
create index if not exists store_promotions_active_idx
  on public.store_promotions (store_id, is_active)
  where is_active = true;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'store_promotions_set_updated_at') then
    create trigger store_promotions_set_updated_at
      before update on public.store_promotions
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.store_promotions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'store_promotions'
      and policyname = 'merged_all_authenticated'
  ) then
    create policy "merged_all_authenticated"
      on public.store_promotions for all
      using (
        has_role((select auth.uid()), 'admin')
        or exists (select 1 from public.restaurants r where r.id = store_promotions.store_id and r.owner_id = (select auth.uid()))
      )
      with check (
        has_role((select auth.uid()), 'admin')
        or exists (select 1 from public.restaurants r where r.id = store_promotions.store_id and r.owner_id = (select auth.uid()))
      );
  end if;
end $$;

-- ─── store_reviews ─────────────────────────────────────────────────────────
create table if not exists public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.restaurants(id) on delete cascade,
  author_name text,
  rating integer not null check (rating between 1 and 5),
  comment text,
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_reviews_store_id_idx
  on public.store_reviews (store_id, created_at desc);

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'store_reviews_set_updated_at') then
    create trigger store_reviews_set_updated_at
      before update on public.store_reviews
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.store_reviews enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'store_reviews'
      and policyname = 'merged_all_authenticated'
  ) then
    create policy "merged_all_authenticated"
      on public.store_reviews for all
      using (
        has_role((select auth.uid()), 'admin')
        or exists (select 1 from public.restaurants r where r.id = store_reviews.store_id and r.owner_id = (select auth.uid()))
      )
      with check (
        has_role((select auth.uid()), 'admin')
        or exists (select 1 from public.restaurants r where r.id = store_reviews.store_id and r.owner_id = (select auth.uid()))
      );
  end if;
end $$;

-- ─── store_messages ────────────────────────────────────────────────────────
create table if not exists public.store_messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.restaurants(id) on delete cascade,
  customer_name text,
  customer_phone text,
  customer_email text,
  message text not null,
  is_read boolean not null default false,
  replies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_messages_store_id_idx
  on public.store_messages (store_id, created_at desc);
create index if not exists store_messages_unread_idx
  on public.store_messages (store_id)
  where is_read = false;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'store_messages_set_updated_at') then
    create trigger store_messages_set_updated_at
      before update on public.store_messages
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.store_messages enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'store_messages'
      and policyname = 'merged_all_authenticated'
  ) then
    create policy "merged_all_authenticated"
      on public.store_messages for all
      using (
        has_role((select auth.uid()), 'admin')
        or exists (select 1 from public.restaurants r where r.id = store_messages.store_id and r.owner_id = (select auth.uid()))
      )
      with check (
        has_role((select auth.uid()), 'admin')
        or exists (select 1 from public.restaurants r where r.id = store_messages.store_id and r.owner_id = (select auth.uid()))
      );
  end if;
end $$;

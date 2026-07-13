-- Instagram-style Saved Collections for post_bookmarks.
-- Idempotent: an empty public.saved_collections already existed (is_private,
-- item_count); this adds color + sort_order, a (user_id, name) unique, a touch
-- trigger, and the saved_collection_posts join table with full RLS.

alter table public.saved_collections
  add column if not exists color text,
  add column if not exists sort_order integer not null default 0;

create index if not exists idx_saved_collections_user
  on public.saved_collections (user_id, sort_order, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_collections_user_id_name_key'
      and conrelid = 'public.saved_collections'::regclass
  ) then
    alter table public.saved_collections
      add constraint saved_collections_user_id_name_key unique (user_id, name);
  end if;
end$$;

create or replace function public.touch_saved_collections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_saved_collections_touch on public.saved_collections;
create trigger trg_saved_collections_touch
  before update on public.saved_collections
  for each row execute function public.touch_saved_collections_updated_at();

create table if not exists public.saved_collection_posts (
  id                uuid primary key default gen_random_uuid(),
  collection_id     uuid not null references public.saved_collections(id) on delete cascade,
  post_bookmark_id  uuid not null references public.post_bookmarks(id) on delete cascade,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  unique (collection_id, post_bookmark_id)
);

create index if not exists idx_saved_collection_posts_collection
  on public.saved_collection_posts (collection_id, sort_order, created_at desc);

create index if not exists idx_saved_collection_posts_bookmark
  on public.saved_collection_posts (post_bookmark_id);

alter table public.saved_collection_posts enable row level security;

grant select, insert, delete on table public.saved_collection_posts to authenticated;
grant all on table public.saved_collection_posts to service_role;

drop policy if exists "saved_collection_posts_select_own" on public.saved_collection_posts;
create policy "saved_collection_posts_select_own"
  on public.saved_collection_posts for select
  to authenticated
  using (
    exists (
      select 1 from public.saved_collections c
      where c.id = saved_collection_posts.collection_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "saved_collection_posts_insert_own" on public.saved_collection_posts;
create policy "saved_collection_posts_insert_own"
  on public.saved_collection_posts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.saved_collections c
      where c.id = saved_collection_posts.collection_id
        and c.user_id = auth.uid()
    )
    and exists (
      select 1 from public.post_bookmarks b
      where b.id = saved_collection_posts.post_bookmark_id
        and b.user_id = auth.uid()
    )
  );

drop policy if exists "saved_collection_posts_delete_own" on public.saved_collection_posts;
create policy "saved_collection_posts_delete_own"
  on public.saved_collection_posts for delete
  to authenticated
  using (
    exists (
      select 1 from public.saved_collections c
      where c.id = saved_collection_posts.collection_id
        and c.user_id = auth.uid()
    )
  );

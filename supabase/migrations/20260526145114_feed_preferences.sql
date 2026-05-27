-- Server-backed feed preferences. These tables mirror the client-side
-- personalization controls so a signed-in user's choices follow them across
-- devices while remaining private to that user.

create table if not exists public.feed_hidden_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null,
  post_source text not null check (post_source in ('store', 'user')),
  created_at timestamptz not null default now(),
  unique (user_id, post_id, post_source)
);

create index if not exists idx_feed_hidden_posts_user_created
  on public.feed_hidden_posts (user_id, created_at desc);

create index if not exists idx_feed_hidden_posts_user_post
  on public.feed_hidden_posts (user_id, post_source, post_id);

alter table public.feed_hidden_posts enable row level security;

drop policy if exists "feed_hidden_posts_select_own" on public.feed_hidden_posts;
create policy "feed_hidden_posts_select_own"
  on public.feed_hidden_posts
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "feed_hidden_posts_insert_own" on public.feed_hidden_posts;
create policy "feed_hidden_posts_insert_own"
  on public.feed_hidden_posts
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "feed_hidden_posts_delete_own" on public.feed_hidden_posts;
create policy "feed_hidden_posts_delete_own"
  on public.feed_hidden_posts
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.feed_hidden_posts to authenticated;

create table if not exists public.feed_snoozed_authors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null,
  author_source text not null check (author_source in ('store', 'user')),
  snoozed_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, author_id, author_source)
);

create index if not exists idx_feed_snoozed_authors_user_until
  on public.feed_snoozed_authors (user_id, snoozed_until desc);

create index if not exists idx_feed_snoozed_authors_user_author
  on public.feed_snoozed_authors (user_id, author_source, author_id);

alter table public.feed_snoozed_authors enable row level security;

drop policy if exists "feed_snoozed_authors_select_own" on public.feed_snoozed_authors;
create policy "feed_snoozed_authors_select_own"
  on public.feed_snoozed_authors
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "feed_snoozed_authors_insert_own" on public.feed_snoozed_authors;
create policy "feed_snoozed_authors_insert_own"
  on public.feed_snoozed_authors
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "feed_snoozed_authors_update_own" on public.feed_snoozed_authors;
create policy "feed_snoozed_authors_update_own"
  on public.feed_snoozed_authors
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "feed_snoozed_authors_delete_own" on public.feed_snoozed_authors;
create policy "feed_snoozed_authors_delete_own"
  on public.feed_snoozed_authors
  for delete
  to authenticated
  using (user_id = auth.uid());

drop trigger if exists update_feed_snoozed_authors_updated_at on public.feed_snoozed_authors;
create trigger update_feed_snoozed_authors_updated_at
  before update on public.feed_snoozed_authors
  for each row execute function public.update_updated_at_column();

grant select, insert, update, delete on table public.feed_snoozed_authors to authenticated;

create table if not exists public.feed_post_notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null,
  post_source text not null check (post_source in ('store', 'user')),
  created_at timestamptz not null default now(),
  unique (user_id, post_id, post_source)
);

create index if not exists idx_feed_post_notification_subs_user_created
  on public.feed_post_notification_subscriptions (user_id, created_at desc);

create index if not exists idx_feed_post_notification_subs_post
  on public.feed_post_notification_subscriptions (post_source, post_id);

alter table public.feed_post_notification_subscriptions enable row level security;

drop policy if exists "feed_post_notification_subs_select_own" on public.feed_post_notification_subscriptions;
create policy "feed_post_notification_subs_select_own"
  on public.feed_post_notification_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "feed_post_notification_subs_insert_own" on public.feed_post_notification_subscriptions;
create policy "feed_post_notification_subs_insert_own"
  on public.feed_post_notification_subscriptions
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "feed_post_notification_subs_delete_own" on public.feed_post_notification_subscriptions;
create policy "feed_post_notification_subs_delete_own"
  on public.feed_post_notification_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on table public.feed_post_notification_subscriptions to authenticated;

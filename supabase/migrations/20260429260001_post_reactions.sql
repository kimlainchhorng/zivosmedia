-- =============================================================================
-- Feed: multi-emoji post reactions (Facebook-style)
-- =============================================================================
--
-- One reaction per (user, post). Emoji is constrained to the six supported
-- values so the UI doesn't have to defend against arbitrary strings.
-- The "store" / "user" source dimension lets us reuse the table for both
-- store_posts and user_posts without a polymorphic FK.
-- =============================================================================

create table if not exists public.post_reactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  post_id     uuid not null,
  source      text not null check (source in ('store', 'user')),
  emoji       text not null check (emoji in ('❤️','😂','😮','😢','😡','🔥')),
  created_at  timestamptz not null default now(),
  unique (user_id, post_id, source)
);

create index if not exists idx_post_reactions_post
  on public.post_reactions (post_id, source);

create index if not exists idx_post_reactions_user
  on public.post_reactions (user_id, created_at desc);

alter table public.post_reactions enable row level security;

drop policy if exists "post_reactions_select_all"  on public.post_reactions;
create policy "post_reactions_select_all"
  on public.post_reactions for select
  to authenticated
  using (true);

drop policy if exists "post_reactions_insert_own" on public.post_reactions;
create policy "post_reactions_insert_own"
  on public.post_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "post_reactions_update_own" on public.post_reactions;
create policy "post_reactions_update_own"
  on public.post_reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "post_reactions_delete_own" on public.post_reactions;
create policy "post_reactions_delete_own"
  on public.post_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- Feed: bookmarks, safety actions, and post reports
-- =============================================================================

-- ── 1. post_bookmarks ─────────────────────────────────────────────────────────
create table if not exists public.post_bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  post_id     uuid not null,
  source      text not null check (source in ('store', 'user')),
  created_at  timestamptz not null default now(),
  unique (user_id, post_id, source)
);

create index if not exists idx_post_bookmarks_user
  on public.post_bookmarks (user_id, created_at desc);

alter table public.post_bookmarks enable row level security;

drop policy if exists "post_bookmarks_select_own" on public.post_bookmarks;
create policy "post_bookmarks_select_own"
  on public.post_bookmarks for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "post_bookmarks_insert_own" on public.post_bookmarks;
create policy "post_bookmarks_insert_own"
  on public.post_bookmarks for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "post_bookmarks_delete_own" on public.post_bookmarks;
create policy "post_bookmarks_delete_own"
  on public.post_bookmarks for delete
  to authenticated
  using (user_id = auth.uid());

-- ── 2. user_safety_actions (mute / block) ─────────────────────────────────────
create table if not exists public.user_safety_actions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  target_user_id  uuid not null references auth.users(id) on delete cascade,
  action          text not null check (action in ('mute', 'block')),
  created_at      timestamptz not null default now(),
  unique (user_id, target_user_id, action)
);

create index if not exists idx_user_safety_actions_user
  on public.user_safety_actions (user_id, action);

create index if not exists idx_user_safety_actions_target
  on public.user_safety_actions (target_user_id, action);

alter table public.user_safety_actions enable row level security;

drop policy if exists "safety_select_own"  on public.user_safety_actions;
create policy "safety_select_own"
  on public.user_safety_actions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "safety_insert_own"  on public.user_safety_actions;
create policy "safety_insert_own"
  on public.user_safety_actions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "safety_delete_own"  on public.user_safety_actions;
create policy "safety_delete_own"
  on public.user_safety_actions for delete
  to authenticated
  using (user_id = auth.uid());

-- ── 3. post_reports ───────────────────────────────────────────────────────────
create table if not exists public.post_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references auth.users(id) on delete cascade,
  post_id      uuid not null,
  post_source  text not null check (post_source in ('store', 'user')),
  reason       text not null check (length(reason) <= 200),
  status       text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_post_reports_status_created
  on public.post_reports (status, created_at desc);

create index if not exists idx_post_reports_post
  on public.post_reports (post_id, post_source);

alter table public.post_reports enable row level security;

-- Reporters can insert their own reports and read them back
drop policy if exists "post_reports_insert_own" on public.post_reports;
create policy "post_reports_insert_own"
  on public.post_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "post_reports_select_own" on public.post_reports;
create policy "post_reports_select_own"
  on public.post_reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- Admins read and update via the existing admin RPC pattern (handled at the
-- application layer; admin client uses service-role key).

-- Track lightweight account-hub opens for product analytics and support diagnostics.
-- RLS keeps each user limited to their own activity rows.

create table if not exists public.account_hub_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'more',
  path text not null default '/more',
  region_code text,
  device_kind text,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_hub_activity_user_created
  on public.account_hub_activity (user_id, created_at desc);

alter table public.account_hub_activity enable row level security;

drop policy if exists "Users can read their account hub activity" on public.account_hub_activity;
create policy "Users can read their account hub activity"
  on public.account_hub_activity
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their account hub activity" on public.account_hub_activity;
create policy "Users can insert their account hub activity"
  on public.account_hub_activity
  for insert
  to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.account_hub_activity to authenticated;

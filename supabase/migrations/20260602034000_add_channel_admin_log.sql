-- Recent Actions (admin audit log) for channels.
-- Records management events (role changes, removals/unbans, settings changes,
-- info edits, scheduled-post cancels) plus member joins/leaves. Reads are
-- manager-only; each actor records their own actions.
create table if not exists public.channel_admin_log (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  actor_id uuid not null,
  action text not null,
  target_user_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_channel_admin_log_channel
  on public.channel_admin_log(channel_id, created_at desc);

alter table public.channel_admin_log enable row level security;

drop policy if exists "channel managers can read admin log" on public.channel_admin_log;
create policy "channel managers can read admin log"
  on public.channel_admin_log for select
  using (public.is_channel_manager(channel_id, auth.uid()));

-- The acting user records their own actions (managers for management events,
-- members for their own join/leave). Reads stay manager-only above.
drop policy if exists "actor can insert admin log" on public.channel_admin_log;
create policy "actor can insert admin log"
  on public.channel_admin_log for insert
  with check (actor_id = auth.uid());

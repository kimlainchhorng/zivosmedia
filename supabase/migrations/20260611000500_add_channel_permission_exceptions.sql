create table if not exists public.channel_permission_exceptions (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null,
  permissions jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

alter table public.channel_permission_exceptions enable row level security;

drop policy if exists channel_permission_exceptions_managers_select on public.channel_permission_exceptions;
create policy channel_permission_exceptions_managers_select
on public.channel_permission_exceptions
for select
to authenticated
using (public.is_channel_manager(channel_id, auth.uid()));

drop policy if exists channel_permission_exceptions_managers_write on public.channel_permission_exceptions;
create policy channel_permission_exceptions_managers_write
on public.channel_permission_exceptions
for all
to authenticated
using (public.is_channel_manager(channel_id, auth.uid()))
with check (public.is_channel_manager(channel_id, auth.uid()));

comment on table public.channel_permission_exceptions is
  'Per-user subscriber permission exceptions for channel settings.';

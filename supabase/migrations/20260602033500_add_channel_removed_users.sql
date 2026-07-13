create table if not exists public.channel_removed_users (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null,
  removed_by uuid not null,
  removed_at timestamptz not null default now(),
  reason text,
  primary key (channel_id, user_id)
);

create index if not exists idx_channel_removed_users_user
  on public.channel_removed_users(user_id);

alter table public.channel_removed_users enable row level security;

drop policy if exists "channel managers can read removed users" on public.channel_removed_users;
create policy "channel managers can read removed users"
  on public.channel_removed_users for select
  using (public.is_channel_manager(channel_id, auth.uid()));

drop policy if exists "channel managers can add removed users" on public.channel_removed_users;
create policy "channel managers can add removed users"
  on public.channel_removed_users for insert
  with check (public.is_channel_manager(channel_id, auth.uid()) and removed_by = auth.uid());

drop policy if exists "channel managers can delete removed users" on public.channel_removed_users;
create policy "channel managers can delete removed users"
  on public.channel_removed_users for delete
  using (public.is_channel_manager(channel_id, auth.uid()));

drop policy if exists "user can subscribe self" on public.channel_subscribers;
create policy "user can subscribe self"
  on public.channel_subscribers for insert
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from public.channel_removed_users r
      where r.channel_id = channel_id and r.user_id = auth.uid()
    )
    and (
      role::text = 'sub'
      and not exists (
        select 1 from public.channels c
        where c.id = channel_id and c.channel_join_approval_required = true
      )
      or role::text = 'pending'
      and exists (
        select 1 from public.channels c
        where c.id = channel_id and c.channel_join_approval_required = true
      )
    )
  );

drop policy if exists "channel managers can update subscriber rows" on public.channel_subscribers;
create policy "channel managers can update subscriber rows"
  on public.channel_subscribers for update
  using (public.is_channel_manager(channel_id, auth.uid()))
  with check (public.is_channel_manager(channel_id, auth.uid()));

create or replace function public.prevent_channel_self_role_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.user_id = auth.uid()
    and old.role is distinct from new.role
    and not public.is_channel_manager(old.channel_id, auth.uid()) then
    raise exception 'channel role changes require admin approval';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_channel_self_role_change on public.channel_subscribers;
create trigger trg_prevent_channel_self_role_change
  before update of role on public.channel_subscribers
  for each row execute function public.prevent_channel_self_role_change();

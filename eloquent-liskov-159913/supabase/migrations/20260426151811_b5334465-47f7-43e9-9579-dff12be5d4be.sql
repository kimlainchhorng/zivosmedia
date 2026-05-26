-- ============================================================
-- Phase 4 Track C: Group Chat Upgrades  (chat_partner_id is TEXT)
-- ============================================================

do $$ begin
  if not exists (select 1 from pg_type where typname = 'group_member_role') then
    create type public.group_member_role as enum ('owner', 'admin', 'member');
  end if;
end $$;

alter table public.chat_group_members
  add column if not exists role public.group_member_role not null default 'member',
  add column if not exists nickname text,
  add column if not exists muted_until timestamptz;

update public.chat_group_members m
set role = 'owner'
from public.chat_groups g
where m.group_id = g.id
  and m.user_id = g.created_by
  and m.role = 'member';

create or replace function public.is_group_member(_uid uuid, _group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_group_members where user_id = _uid and group_id = _group_id)
$$;

create or replace function public.is_group_admin(_uid uuid, _group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_group_members where user_id = _uid and group_id = _group_id and role in ('owner','admin'))
$$;

create or replace function public.is_group_owner(_uid uuid, _group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chat_group_members where user_id = _uid and group_id = _group_id and role = 'owner')
$$;

alter table public.chat_groups enable row level security;

drop policy if exists "Members can view their groups" on public.chat_groups;
create policy "Members can view their groups" on public.chat_groups for select to authenticated
using (public.is_group_member(auth.uid(), id));

drop policy if exists "Authenticated can create groups" on public.chat_groups;
create policy "Authenticated can create groups" on public.chat_groups for insert to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Admins can update group meta" on public.chat_groups;
create policy "Admins can update group meta" on public.chat_groups for update to authenticated
using (public.is_group_admin(auth.uid(), id))
with check (public.is_group_admin(auth.uid(), id));

drop policy if exists "Owners can delete group" on public.chat_groups;
create policy "Owners can delete group" on public.chat_groups for delete to authenticated
using (public.is_group_owner(auth.uid(), id));

alter table public.chat_group_members enable row level security;

drop policy if exists "Members view fellow members" on public.chat_group_members;
create policy "Members view fellow members" on public.chat_group_members for select to authenticated
using (public.is_group_member(auth.uid(), group_id));

drop policy if exists "Self can join group" on public.chat_group_members;
create policy "Self can join group" on public.chat_group_members for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Admins can add members" on public.chat_group_members;
create policy "Admins can add members" on public.chat_group_members for insert to authenticated
with check (public.is_group_admin(auth.uid(), group_id));

drop policy if exists "Admins can update members" on public.chat_group_members;
create policy "Admins can update members" on public.chat_group_members for update to authenticated
using (public.is_group_admin(auth.uid(), group_id) or user_id = auth.uid())
with check (public.is_group_admin(auth.uid(), group_id) or user_id = auth.uid());

drop policy if exists "Members can leave or admins can kick" on public.chat_group_members;
create policy "Members can leave or admins can kick" on public.chat_group_members for delete to authenticated
using (
  user_id = auth.uid()
  or (public.is_group_admin(auth.uid(), group_id) and role <> 'owner')
);

create or replace function public.enforce_role_change_authority()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = old.role then return new; end if;
  if new.role = 'owner' or old.role = 'owner' then
    if not public.is_group_owner(auth.uid(), new.group_id) then
      raise exception 'Only the group owner can transfer ownership';
    end if;
  end if;
  if new.role = 'admin' and not public.is_group_admin(auth.uid(), new.group_id) then
    raise exception 'Only admins can promote members';
  end if;
  return new;
end $$;

drop trigger if exists trg_enforce_role_change on public.chat_group_members;
create trigger trg_enforce_role_change
before update of role on public.chat_group_members
for each row execute function public.enforce_role_change_authority();

create table if not exists public.chat_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  code text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  revoked_at timestamptz
);

create index if not exists idx_chat_group_invites_group on public.chat_group_invites(group_id);
create index if not exists idx_chat_group_invites_code on public.chat_group_invites(code);

alter table public.chat_group_invites enable row level security;

drop policy if exists "Members view group invites" on public.chat_group_invites;
create policy "Members view group invites" on public.chat_group_invites for select to authenticated
using (public.is_group_member(auth.uid(), group_id));

drop policy if exists "Anyone authenticated can lookup by code" on public.chat_group_invites;
create policy "Anyone authenticated can lookup by code" on public.chat_group_invites for select to authenticated
using (true);

drop policy if exists "Admins create invites" on public.chat_group_invites;
create policy "Admins create invites" on public.chat_group_invites for insert to authenticated
with check (created_by = auth.uid() and public.is_group_admin(auth.uid(), group_id));

drop policy if exists "Admins revoke invites" on public.chat_group_invites;
create policy "Admins revoke invites" on public.chat_group_invites for update to authenticated
using (public.is_group_admin(auth.uid(), group_id))
with check (public.is_group_admin(auth.uid(), group_id));

drop policy if exists "Admins delete invites" on public.chat_group_invites;
create policy "Admins delete invites" on public.chat_group_invites for delete to authenticated
using (public.is_group_admin(auth.uid(), group_id));

create or replace function public.redeem_group_invite(_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv public.chat_group_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into inv from public.chat_group_invites where code = _code for update;
  if not found then raise exception 'Invite not found'; end if;
  if inv.revoked_at is not null then raise exception 'Invite revoked'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then raise exception 'Invite expired'; end if;
  if inv.max_uses is not null and inv.use_count >= inv.max_uses then raise exception 'Invite usage limit reached'; end if;
  if public.is_group_member(auth.uid(), inv.group_id) then return inv.group_id; end if;
  insert into public.chat_group_members (group_id, user_id, role)
    values (inv.group_id, auth.uid(), 'member');
  update public.chat_group_invites set use_count = use_count + 1 where id = inv.id;
  return inv.group_id;
end $$;

-- chat_polls: chat_partner_id is TEXT (not uuid). Cast auth.uid() to text in comparisons.
alter table public.chat_polls
  add column if not exists group_id uuid references public.chat_groups(id) on delete cascade;

alter table public.chat_polls alter column chat_partner_id drop not null;

create index if not exists idx_chat_polls_group on public.chat_polls(group_id);

alter table public.chat_polls enable row level security;

drop policy if exists "Group members view group polls" on public.chat_polls;
create policy "Group members view group polls" on public.chat_polls for select to authenticated
using (
  (group_id is not null and public.is_group_member(auth.uid(), group_id))
  or (chat_partner_id is not null and (creator_id = auth.uid() or chat_partner_id = auth.uid()::text))
);

drop policy if exists "Members create polls" on public.chat_polls;
create policy "Members create polls" on public.chat_polls for insert to authenticated
with check (
  creator_id = auth.uid()
  and (
    (group_id is not null and public.is_group_member(auth.uid(), group_id))
    or (chat_partner_id is not null)
  )
);

drop policy if exists "Voters update polls" on public.chat_polls;
create policy "Voters update polls" on public.chat_polls for update to authenticated
using (
  (group_id is not null and public.is_group_member(auth.uid(), group_id))
  or (chat_partner_id is not null and (creator_id = auth.uid() or chat_partner_id = auth.uid()::text))
)
with check (
  (group_id is not null and public.is_group_member(auth.uid(), group_id))
  or (chat_partner_id is not null and (creator_id = auth.uid() or chat_partner_id = auth.uid()::text))
);

drop policy if exists "Creators delete polls" on public.chat_polls;
create policy "Creators delete polls" on public.chat_polls for delete to authenticated
using (creator_id = auth.uid());

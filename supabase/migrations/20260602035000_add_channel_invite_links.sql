-- Additional invite links for a channel (beyond the public @handle link).
-- Managers create/revoke; anyone may read a non-revoked link by code (to resolve
-- an invite at join time). Enforcement of expiry/max_uses happens at join time.
create table if not exists public.channel_invite_links (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  code text not null unique,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  revoked boolean not null default false
);

create index if not exists idx_channel_invite_links_channel
  on public.channel_invite_links(channel_id, created_at desc);

alter table public.channel_invite_links enable row level security;

drop policy if exists "channel managers read invite links" on public.channel_invite_links;
create policy "channel managers read invite links"
  on public.channel_invite_links for select
  using (public.is_channel_manager(channel_id, auth.uid()));

drop policy if exists "channel managers create invite links" on public.channel_invite_links;
create policy "channel managers create invite links"
  on public.channel_invite_links for insert
  with check (public.is_channel_manager(channel_id, auth.uid()) and created_by = auth.uid());

drop policy if exists "channel managers update invite links" on public.channel_invite_links;
create policy "channel managers update invite links"
  on public.channel_invite_links for update
  using (public.is_channel_manager(channel_id, auth.uid()))
  with check (public.is_channel_manager(channel_id, auth.uid()));

drop policy if exists "channel managers delete invite links" on public.channel_invite_links;
create policy "channel managers delete invite links"
  on public.channel_invite_links for delete
  using (public.is_channel_manager(channel_id, auth.uid()));

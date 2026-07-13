-- Multi-device QR linking infrastructure
create table if not exists public.device_link_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  issuer_user_id uuid not null references auth.users(id) on delete cascade,
  issuer_device_label text,
  claimed_at timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_by_device_label text,
  expires_at timestamptz not null default (now() + interval '2 minutes'),
  created_at timestamptz not null default now()
);

create index if not exists device_link_tokens_token_idx on public.device_link_tokens(token);
create index if not exists device_link_tokens_issuer_idx on public.device_link_tokens(issuer_user_id);

alter table public.device_link_tokens enable row level security;

create policy "Issuer can view own link tokens"
  on public.device_link_tokens for select
  using (auth.uid() = issuer_user_id);

create policy "Issuer can delete own link tokens"
  on public.device_link_tokens for delete
  using (auth.uid() = issuer_user_id);

-- Devices registered per user
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_fingerprint text,
  device_label text,
  user_agent text,
  platform text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_fingerprint)
);

create index if not exists user_devices_user_idx on public.user_devices(user_id);

alter table public.user_devices enable row level security;

create policy "User can view own devices"
  on public.user_devices for select
  using (auth.uid() = user_id);

create policy "User can delete own devices"
  on public.user_devices for delete
  using (auth.uid() = user_id);

-- Auto-cleanup helper: server can purge expired tokens (called by edge fn)
create or replace function public.cleanup_expired_device_link_tokens()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.device_link_tokens where expires_at < now() - interval '10 minutes';
$$;
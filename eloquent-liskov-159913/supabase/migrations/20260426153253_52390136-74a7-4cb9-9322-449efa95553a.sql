-- Rename the new device-linking storage to a dedicated, non-colliding table.
create table if not exists public.linked_devices (
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

create index if not exists linked_devices_user_idx on public.linked_devices(user_id);

alter table public.linked_devices enable row level security;

create policy "User can view own linked devices"
  on public.linked_devices for select
  using (auth.uid() = user_id);

create policy "User can delete own linked devices"
  on public.linked_devices for delete
  using (auth.uid() = user_id);
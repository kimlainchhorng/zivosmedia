create table if not exists public.device_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_fingerprint text not null,
  public_key_jwk jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, device_fingerprint)
);
create index if not exists device_keys_user_idx on public.device_keys(user_id);
alter table public.device_keys enable row level security;
create policy "Authenticated can read device keys" on public.device_keys for select to authenticated using (true);
create policy "Owner can insert own device key" on public.device_keys for insert to authenticated with check (auth.uid() = user_id);
create policy "Owner can update own device key" on public.device_keys for update to authenticated using (auth.uid() = user_id);
create policy "Owner can delete own device key" on public.device_keys for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.secret_chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  ttl_seconds integer,
  created_at timestamptz not null default now(),
  constraint secret_chats_distinct check (user_a <> user_b),
  constraint secret_chats_ordered check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists secret_chats_user_a_idx on public.secret_chats(user_a);
create index if not exists secret_chats_user_b_idx on public.secret_chats(user_b);
alter table public.secret_chats enable row level security;
create policy "Participants can view secret chat" on public.secret_chats for select to authenticated using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Participants can create secret chat" on public.secret_chats for insert to authenticated with check (auth.uid() = created_by and (auth.uid() = user_a or auth.uid() = user_b));
create policy "Participants can delete own secret chat" on public.secret_chats for delete to authenticated using (auth.uid() = user_a or auth.uid() = user_b);

create table if not exists public.secret_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.secret_chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_public_key_jwk jsonb not null,
  iv text not null,
  ciphertext text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists secret_messages_chat_idx on public.secret_messages(chat_id, created_at);
alter table public.secret_messages enable row level security;

create or replace function public.is_secret_chat_participant(_chat_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.secret_chats where id = _chat_id and (user_a = _user_id or user_b = _user_id));
$$;

create policy "Participants can read encrypted messages" on public.secret_messages for select to authenticated using (public.is_secret_chat_participant(chat_id, auth.uid()));
create policy "Participants can send encrypted messages" on public.secret_messages for insert to authenticated with check (auth.uid() = sender_id and public.is_secret_chat_participant(chat_id, auth.uid()));
create policy "Sender can delete own encrypted message" on public.secret_messages for delete to authenticated using (auth.uid() = sender_id);

do $$ begin
  begin
    execute 'alter publication supabase_realtime add table public.secret_messages';
  exception when others then null;
  end;
end $$;
-- BotFather-style bot system for chat.
--
-- Any user can create bots with their own webhook. Each bot has a UUID
-- (`bot_user_id`) used as sender/receiver in `direct_messages`, plus a
-- corresponding `profiles` row so existing chat UI renders it.
-- A token is returned ONCE on creation; only its sha256 hash is stored.
-- A trigger calls the `bot-dispatch` edge function on every DM whose
-- receiver is a bot, which forwards the message to `webhook_url`.
-- Bots reply via `bot-send-message` authenticated by token.

create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_bot') then
    alter table public.profiles add column is_bot boolean not null default false;
  end if;
end $$;

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  bot_user_id uuid not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  description text,
  avatar_url text,
  webhook_url text,
  token_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bots_username_format check (username ~ '^[a-z0-9_]{4,29}_bot$')
);

create index if not exists bots_owner_idx on public.bots(owner_id);
create index if not exists bots_token_hash_idx on public.bots(token_hash);

alter table public.bots enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='bots' and policyname='Anyone can view active bots') then
    create policy "Anyone can view active bots" on public.bots for select to authenticated using (is_active = true or owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='bots' and policyname='Owner can update own bots') then
    create policy "Owner can update own bots" on public.bots for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename='bots' and policyname='Owner can delete own bots') then
    create policy "Owner can delete own bots" on public.bots for delete to authenticated using (owner_id = auth.uid());
  end if;
end $$;

create table if not exists public.bot_commands (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  command text not null,
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint bot_commands_format check (command ~ '^[a-z0-9_]{1,32}$'),
  unique (bot_id, command)
);

alter table public.bot_commands enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='bot_commands' and policyname='Anyone can view bot commands') then
    create policy "Anyone can view bot commands" on public.bot_commands for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='bot_commands' and policyname='Owner can manage bot commands') then
    create policy "Owner can manage bot commands" on public.bot_commands for all to authenticated
      using (exists (select 1 from public.bots b where b.id = bot_id and b.owner_id = auth.uid()))
      with check (exists (select 1 from public.bots b where b.id = bot_id and b.owner_id = auth.uid()));
  end if;
end $$;

create or replace function public.create_bot(p_username text, p_display_name text, p_description text default null)
returns table (bot_id uuid, bot_user_id uuid, token text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_owner uuid := auth.uid();
  v_bot_id uuid := gen_random_uuid();
  v_bot_user_id uuid := gen_random_uuid();
  v_token text;
  v_token_hash text;
  v_username text := lower(p_username);
begin
  if v_owner is null then raise exception 'Not authenticated'; end if;
  if v_username !~ '^[a-z0-9_]{4,29}_bot$' then
    raise exception 'Bot username must be 5-32 chars, lowercase letters/digits/underscore, ending in _bot';
  end if;
  if exists (select 1 from public.bots where username = v_username) then raise exception 'Username taken'; end if;
  if exists (select 1 from public.usernames where lower(username::text) = v_username) then raise exception 'Username taken'; end if;

  v_token := replace(v_bot_id::text, '-', '') || ':' || encode(extensions.gen_random_bytes(24), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into public.bots (id, bot_user_id, owner_id, username, display_name, description, token_hash)
  values (v_bot_id, v_bot_user_id, v_owner, v_username, p_display_name, p_description, v_token_hash);

  insert into public.profiles (user_id, full_name, username, is_bot)
  values (v_bot_user_id, p_display_name, v_username, true)
  on conflict (user_id) do update set full_name = excluded.full_name, username = excluded.username, is_bot = true;

  return query select v_bot_id, v_bot_user_id, v_token;
end $$;

revoke all on function public.create_bot(text, text, text) from public;
grant execute on function public.create_bot(text, text, text) to authenticated;

create or replace function public.regenerate_bot_token(p_bot_id uuid)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_owner uuid := auth.uid(); v_token text; v_token_hash text;
begin
  if not exists (select 1 from public.bots where id = p_bot_id and owner_id = v_owner) then
    raise exception 'Bot not found or not owned';
  end if;
  v_token := replace(p_bot_id::text, '-', '') || ':' || encode(extensions.gen_random_bytes(24), 'hex');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  update public.bots set token_hash = v_token_hash, updated_at = now() where id = p_bot_id;
  return v_token;
end $$;

grant execute on function public.regenerate_bot_token(uuid) to authenticated;

create or replace function public.verify_bot_token(p_token text)
returns table (bot_id uuid, bot_user_id uuid, owner_id uuid, is_active boolean)
language sql security definer set search_path = public, extensions as $$
  select b.id, b.bot_user_id, b.owner_id, b.is_active from public.bots b
  where b.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') limit 1;
$$;

revoke all on function public.verify_bot_token(text) from public;

create or replace function public.notify_bot_on_dm()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare v_bot record;
begin
  select b.id, b.webhook_url, b.is_active into v_bot from public.bots b where b.bot_user_id = new.receiver_id;
  if v_bot.id is null then return new; end if;
  if v_bot.is_active is not true or v_bot.webhook_url is null or v_bot.webhook_url = '' then return new; end if;
  if new.sender_id = new.receiver_id then return new; end if;
  perform net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/bot-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI'),
    body := jsonb_build_object('message_id', new.id, 'bot_id', v_bot.id)
  );
  return new;
end $$;

drop trigger if exists trg_notify_bot_on_dm on public.direct_messages;
create trigger trg_notify_bot_on_dm after insert on public.direct_messages
  for each row execute function public.notify_bot_on_dm();

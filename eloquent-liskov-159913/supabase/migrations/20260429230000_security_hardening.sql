-- =============================================================================
-- Security hardening — 2026-04-29
--   1. Make chat-media-files bucket private + add owner/recipient RLS policies
--   2. Add cross-isolate rate limiter (rate_limit_buckets + check_rate_limit RPC)
--   3. Add brute-force lockout state table for auth attempts
-- =============================================================================

-- ── 1. Private chat media bucket ────────────────────────────────────────────
update storage.buckets
   set public = false
 where id in ('chat-media-files', 'chat_uploads');

-- Drop any pre-existing policies on objects for these buckets so we can replace them
drop policy if exists "chat_media_select_owner_or_recipient"  on storage.objects;
drop policy if exists "chat_media_insert_authenticated"       on storage.objects;
drop policy if exists "chat_media_delete_owner"               on storage.objects;
drop policy if exists "chat_media_update_owner"               on storage.objects;

-- Owners (path prefix = uid) can read their own media
create policy "chat_media_select_owner_or_recipient"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('chat-media-files', 'chat_uploads')
    and (
      -- owner: object path is "<uid>/..."
      auth.uid()::text = split_part(name, '/', 1)
      -- OR a recipient: there is a direct_message / group_message / chat_media row
      -- referencing this storage path that the caller is authorized to read
      or exists (
        select 1 from public.direct_messages dm
         where (dm.image_url = name or dm.video_url = name or dm.voice_url = name)
           and (dm.sender_id = auth.uid() or dm.receiver_id = auth.uid())
      )
      or exists (
        select 1
          from public.group_messages gm
          join public.group_members  gmem on gmem.group_id = gm.group_id
         where (gm.image_url = name or gm.video_url = name or gm.voice_url = name)
           and gmem.user_id = auth.uid()
      )
    )
  );

create policy "chat_media_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('chat-media-files', 'chat_uploads')
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "chat_media_delete_owner"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('chat-media-files', 'chat_uploads')
    and auth.uid()::text = split_part(name, '/', 1)
  );

create policy "chat_media_update_owner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('chat-media-files', 'chat_uploads')
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- ── 2. Cross-isolate rate limiter (DB-backed) ───────────────────────────────
create table if not exists public.rate_limit_buckets (
  bucket_key   text        primary key,
  category     text        not null,
  identifier   text        not null,
  count        integer     not null default 0,
  window_start timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_rate_limit_window_start
  on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;

-- Only service-role writes; no client access
create policy "rate_limit_service_only"
  on public.rate_limit_buckets for all
  to service_role
  using (true) with check (true);

-- Atomic increment + check function. Returns true if allowed.
create or replace function public.rate_limit_check(
  _category   text,
  _identifier text,
  _max        integer,
  _window_sec integer
) returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key      text := _category || ':' || _identifier;
  v_now      timestamptz := now();
  v_window   interval := make_interval(secs => _window_sec);
  v_row      public.rate_limit_buckets%rowtype;
begin
  -- Insert or fetch the bucket row
  insert into public.rate_limit_buckets (bucket_key, category, identifier, count, window_start, updated_at)
       values (v_key, _category, _identifier, 0, v_now, v_now)
  on conflict (bucket_key) do nothing;

  -- Lock the row for atomic update
  select * into v_row
    from public.rate_limit_buckets
   where bucket_key = v_key
   for update;

  -- Reset window if it has elapsed
  if v_row.window_start + v_window <= v_now then
    update public.rate_limit_buckets
       set count = 1,
           window_start = v_now,
           updated_at = v_now
     where bucket_key = v_key;
    return query select true, _max - 1, v_now + v_window;
    return;
  end if;

  -- Check if over limit
  if v_row.count >= _max then
    return query select false, 0, v_row.window_start + v_window;
    return;
  end if;

  -- Increment
  update public.rate_limit_buckets
     set count = count + 1,
         updated_at = v_now
   where bucket_key = v_key;

  return query select true, _max - (v_row.count + 1), v_row.window_start + v_window;
end;
$$;

revoke all on function public.rate_limit_check(text, text, integer, integer) from public;
grant execute on function public.rate_limit_check(text, text, integer, integer) to service_role;

-- Periodic cleanup: drop buckets older than 1 day to keep the table small
create or replace function public.rate_limit_gc() returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limit_buckets
   where updated_at < now() - interval '1 day';
$$;

revoke all on function public.rate_limit_gc() from public;
grant execute on function public.rate_limit_gc() to service_role;

-- ── 3. Brute-force lockout state ────────────────────────────────────────────
create table if not exists public.auth_lockout_state (
  lockout_key   text        primary key,
  scope         text        not null check (scope in ('ip', 'account')),
  identifier    text        not null,
  fail_count    integer     not null default 0,
  window_start  timestamptz not null default now(),
  locked_until  timestamptz,
  last_failure  timestamptz not null default now()
);

create index if not exists idx_auth_lockout_locked_until
  on public.auth_lockout_state (locked_until)
 where locked_until is not null;

alter table public.auth_lockout_state enable row level security;

create policy "auth_lockout_service_only"
  on public.auth_lockout_state for all
  to service_role
  using (true) with check (true);

-- Helper: check if currently locked
create or replace function public.auth_lockout_check(
  _scope      text,
  _identifier text
) returns table(locked boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := _scope || ':' || _identifier;
  v_locked_until timestamptz;
begin
  select locked_until into v_locked_until
    from public.auth_lockout_state
   where lockout_key = v_key;

  if v_locked_until is not null and v_locked_until > now() then
    return query select true, ceil(extract(epoch from (v_locked_until - now())))::int;
    return;
  end if;

  return query select false, 0;
end;
$$;

revoke all on function public.auth_lockout_check(text, text) from public;
grant execute on function public.auth_lockout_check(text, text) to service_role;
grant execute on function public.auth_lockout_check(text, text) to authenticated;

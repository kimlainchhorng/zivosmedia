-- =============================================================================
-- Feed: view-count and share-count helpers
-- =============================================================================
--
-- Both RPCs are SECURITY DEFINER so anonymous users can be counted (we still
-- defend against abusive callers via a 1.5s dwell on the client). Counts are
-- monotonically increasing — no decrement path needed.
-- =============================================================================

-- ── 1. Increment view count for a store_post ────────────────────────────────
create or replace function public.increment_store_post_views(_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.store_posts
     set view_count = coalesce(view_count, 0) + 1
   where id = _post_id;
$$;

revoke all on function public.increment_store_post_views(uuid) from public;
grant execute on function public.increment_store_post_views(uuid) to anon, authenticated;

-- ── 2. Increment view count for a user_post ─────────────────────────────────
create or replace function public.increment_user_post_views(_post_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.user_posts
     set views_count = coalesce(views_count, 0) + 1
   where id = _post_id;
$$;

revoke all on function public.increment_user_post_views(uuid) from public;
grant execute on function public.increment_user_post_views(uuid) to anon, authenticated;

-- ── 3. Share log + per-share increment ──────────────────────────────────────
create table if not exists public.post_shares (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,  -- null for anonymous shares
  post_id      uuid not null,
  source       text not null check (source in ('store', 'user')),
  channel      text not null check (channel in ('copy_link','native','email','sms','whatsapp','telegram','facebook','x','other')),
  created_at   timestamptz not null default now()
);

create index if not exists idx_post_shares_post
  on public.post_shares (post_id, source);

create index if not exists idx_post_shares_user
  on public.post_shares (user_id, created_at desc);

alter table public.post_shares enable row level security;

-- Anyone can record a share (the column FK + check constraint guard the data)
drop policy if exists "post_shares_insert_any" on public.post_shares;
create policy "post_shares_insert_any"
  on public.post_shares for insert
  to authenticated, anon
  with check (true);

-- Reads are admin/service-role only (counts are consumed via the post tables)
drop policy if exists "post_shares_select_service" on public.post_shares;
create policy "post_shares_select_service"
  on public.post_shares for select
  to service_role
  using (true);

-- Convenience RPC: log + bump shares_count on the post in one transaction
create or replace function public.record_post_share(
  _post_id  uuid,
  _source   text,
  _channel  text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if _source not in ('store','user') then
    raise exception 'invalid source';
  end if;

  insert into public.post_shares (user_id, post_id, source, channel)
       values (auth.uid(), _post_id, _source, _channel);

  if _source = 'store' then
    update public.store_posts
       set shares_count = coalesce(shares_count, 0) + 1
     where id = _post_id;
  else
    update public.user_posts
       set shares_count = coalesce(shares_count, 0) + 1
     where id = _post_id;
  end if;
end;
$$;

revoke all on function public.record_post_share(uuid, text, text) from public;
grant execute on function public.record_post_share(uuid, text, text) to anon, authenticated;

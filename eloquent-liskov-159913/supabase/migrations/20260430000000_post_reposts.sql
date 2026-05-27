-- =============================================================================
-- Feed: reposts (with optional quote text)
-- =============================================================================
--
-- A repost is a lightweight pointer from one user to an existing post, with
-- an optional quote/comment of their own. Distinct from "share" (which only
-- generates an external URL) — a repost surfaces the original post on the
-- reposter's profile and in their followers' feeds.
-- =============================================================================

create table if not exists public.post_reposts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  post_id         uuid not null,
  source          text not null check (source in ('store', 'user')),
  quote_text      text check (quote_text is null or length(quote_text) <= 500),
  created_at      timestamptz not null default now(),
  unique (user_id, post_id, source)
);

create index if not exists idx_post_reposts_user
  on public.post_reposts (user_id, created_at desc);

create index if not exists idx_post_reposts_post
  on public.post_reposts (post_id, source, created_at desc);

alter table public.post_reposts enable row level security;

drop policy if exists "post_reposts_select_all" on public.post_reposts;
create policy "post_reposts_select_all"
  on public.post_reposts for select
  to authenticated
  using (true);

drop policy if exists "post_reposts_insert_own" on public.post_reposts;
create policy "post_reposts_insert_own"
  on public.post_reposts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "post_reposts_delete_own" on public.post_reposts;
create policy "post_reposts_delete_own"
  on public.post_reposts for delete
  to authenticated
  using (user_id = auth.uid());

-- ── Atomic toggle helper ──────────────────────────────────────────────────────
create or replace function public.toggle_post_repost(
  _post_id     uuid,
  _source      text,
  _quote_text  text default null
) returns table(reposted boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if _source not in ('store','user') then
    raise exception 'invalid source';
  end if;

  select id into v_existing
    from public.post_reposts
   where user_id = v_uid and post_id = _post_id and source = _source;

  if v_existing is not null then
    delete from public.post_reposts where id = v_existing;
    if _source = 'store' then
      update public.store_posts
         set reposts_count = greatest(coalesce(reposts_count, 0) - 1, 0)
       where id = _post_id;
    else
      update public.user_posts
         set reposts_count = greatest(coalesce(reposts_count, 0) - 1, 0)
       where id = _post_id;
    end if;
    return query select false;
    return;
  end if;

  insert into public.post_reposts (user_id, post_id, source, quote_text)
       values (v_uid, _post_id, _source, _quote_text);

  if _source = 'store' then
    update public.store_posts
       set reposts_count = coalesce(reposts_count, 0) + 1
     where id = _post_id;
  else
    update public.user_posts
       set reposts_count = coalesce(reposts_count, 0) + 1
     where id = _post_id;
  end if;

  return query select true;
end;
$$;

revoke all on function public.toggle_post_repost(uuid, text, text) from public;
grant execute on function public.toggle_post_repost(uuid, text, text) to authenticated;

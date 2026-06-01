-- =============================================================================
-- Add `is_pinned` to the unified `post_comments` table used by /feed's
-- CommentsSheet, mirroring the pin support added on the per-source
-- store_post_comments / user_post_comments tables in 20260430040000.
--
-- One pin per post (post_id, post_source) — enforced via partial unique index.
-- Authorization to pin: caller must own the post (user_post or store_post).
-- =============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'post_comments'
  ) then
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'post_comments'
         and column_name = 'is_pinned'
    ) then
      alter table public.post_comments
        add column is_pinned boolean not null default false;
      create unique index if not exists idx_post_comments_one_pin_per_post
        on public.post_comments (post_id, post_source) where is_pinned;
    end if;
  end if;
end$$;

-- ── RPC: toggle a pin on the unified post_comments table ─────────────────────
create or replace function public.toggle_unified_comment_pin(
  _comment_id uuid
) returns table(pinned boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_post_id   uuid;
  v_source    text;
  v_was       boolean;
  v_authorized boolean := false;
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select post_id, post_source, is_pinned
    into v_post_id, v_source, v_was
    from public.post_comments
   where id = _comment_id;

  if v_post_id is null then raise exception 'comment not found'; end if;

  if v_source = 'user' then
    select exists (
      select 1 from public.user_posts up
       where up.id = v_post_id and up.user_id = v_uid
    ) into v_authorized;
  else
    select exists (
      select 1
        from public.store_posts sp
        join public.store_profiles sp_prof on sp_prof.id = sp.store_id
       where sp.id = v_post_id and sp_prof.owner_id = v_uid
    ) into v_authorized;
  end if;

  if not v_authorized then
    raise exception 'only the post author can pin comments';
  end if;

  -- Clear any existing pin on the same post, then set this one if it wasn't pinned
  update public.post_comments
     set is_pinned = false
   where post_id = v_post_id
     and post_source = v_source
     and is_pinned;

  if not v_was then
    update public.post_comments set is_pinned = true where id = _comment_id;
    return query select true;
  else
    return query select false;
  end if;
end;
$$;

revoke all on function public.toggle_unified_comment_pin(uuid) from public;
grant execute on function public.toggle_unified_comment_pin(uuid) to authenticated;

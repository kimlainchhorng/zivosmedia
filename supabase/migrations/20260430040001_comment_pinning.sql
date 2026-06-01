-- =============================================================================
-- Comment pinning: post authors can pin one comment per post to the top.
-- Stored as `is_pinned` on each comments table; a partial unique index ensures
-- at most one pinned comment per post.
-- =============================================================================

-- ── store_post_comments ────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'store_post_comments'
  ) then
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'store_post_comments'
         and column_name = 'is_pinned'
    ) then
      alter table public.store_post_comments
        add column is_pinned boolean not null default false;
      create unique index if not exists idx_store_post_comments_one_pin_per_post
        on public.store_post_comments (post_id) where is_pinned;
    end if;
  end if;
end$$;

-- ── user_post_comments ─────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'user_post_comments'
  ) then
    if not exists (
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'user_post_comments'
         and column_name = 'is_pinned'
    ) then
      alter table public.user_post_comments
        add column is_pinned boolean not null default false;
      create unique index if not exists idx_user_post_comments_one_pin_per_post
        on public.user_post_comments (post_id) where is_pinned;
    end if;
  end if;
end$$;

-- ── RPC: toggle pin (post author only) ─────────────────────────────────────
-- Verifies the caller owns the post, then atomically clears any existing pin
-- and sets/clears this one. Returns the new pin state.
create or replace function public.toggle_comment_pin(
  _comment_id    uuid,
  _target_table  text
) returns table(pinned boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_post_id   uuid;
  v_user_id   uuid;
  v_was       boolean;
  v_authorized boolean := false;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if _target_table not in ('store_post_comments','user_post_comments') then
    raise exception 'invalid target_table';
  end if;

  -- Resolve the post + the comment author
  if _target_table = 'user_post_comments' then
    execute format('select c.post_id, c.user_id, c.is_pinned
                      from public.%I c
                     where c.id = $1', _target_table)
      into v_post_id, v_user_id, v_was using _comment_id;
    -- Authorization: caller must own the parent user_post
    select exists (
      select 1 from public.user_posts up
       where up.id = v_post_id and up.user_id = v_uid
    ) into v_authorized;
  else
    execute format('select c.post_id, c.user_id, c.is_pinned
                      from public.%I c
                     where c.id = $1', _target_table)
      into v_post_id, v_user_id, v_was using _comment_id;
    -- Authorization: caller must own the store backing the store_post
    select exists (
      select 1
        from public.store_posts sp
        join public.store_profiles sp_prof on sp_prof.id = sp.store_id
       where sp.id = v_post_id and sp_prof.owner_id = v_uid
    ) into v_authorized;
  end if;

  if v_post_id is null then
    raise exception 'comment not found';
  end if;
  if not v_authorized then
    raise exception 'only the post author can pin comments';
  end if;

  -- Toggle: clear any pin on the same post, then set this one if it wasn't already
  execute format('update public.%I set is_pinned = false where post_id = $1 and is_pinned', _target_table)
    using v_post_id;

  if not v_was then
    execute format('update public.%I set is_pinned = true where id = $1', _target_table)
      using _comment_id;
    return query select true;
  else
    return query select false;
  end if;
end;
$$;

revoke all on function public.toggle_comment_pin(uuid, text) from public;
grant execute on function public.toggle_comment_pin(uuid, text) to authenticated;

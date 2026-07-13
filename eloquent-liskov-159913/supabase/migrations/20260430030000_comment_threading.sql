-- =============================================================================
-- Comment threading: add `parent_id` self-FK on both comment tables so replies
-- can hang off a top-level comment. Indexed for the "fetch replies" query
-- pattern. Existing rows have parent_id = NULL (i.e. top-level).
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
         and column_name = 'parent_id'
    ) then
      alter table public.store_post_comments
        add column parent_id uuid references public.store_post_comments(id) on delete cascade;
      create index if not exists idx_store_post_comments_parent
        on public.store_post_comments (parent_id);
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
         and column_name = 'parent_id'
    ) then
      alter table public.user_post_comments
        add column parent_id uuid references public.user_post_comments(id) on delete cascade;
      create index if not exists idx_user_post_comments_parent
        on public.user_post_comments (parent_id);
    end if;
  end if;
end$$;

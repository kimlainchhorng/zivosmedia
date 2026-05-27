-- =============================================================================
-- Social notifications: triggers when someone reacts, reposts, or mentions you
-- + Comment hearts (single-tap reaction on individual comments)
-- =============================================================================
--
-- Why triggers vs edge functions: notifications must arrive even when the
-- writer's client doesn't go through an edge function (direct DB writes via
-- supabase-js). Triggers run inside the same transaction as the insert so the
-- notification can never be lost.
-- =============================================================================

-- ── Helper: insert a social notification (no-op if recipient = sender) ───────
create or replace function public._notify_social(
  _recipient   uuid,
  _sender      uuid,
  _template    text,
  _title       text,
  _body        text,
  _action_url  text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Don't notify your own actions
  if _recipient is null or _recipient = _sender then return; end if;

  -- Suppress when recipient muted/blocked the sender (no spam loophole)
  if exists (
    select 1 from public.user_safety_actions
     where user_id = _recipient and target_user_id = _sender
  ) then
    return;
  end if;

  insert into public.notifications (
    user_id, channel, category, template, title, body, action_url, status, is_read
  ) values (
    _recipient,
    'in_app',
    'transactional',
    _template,
    _title,
    _body,
    _action_url,
    'queued',
    false
  );
end;
$$;

-- ── 1. Notify on reaction ────────────────────────────────────────────────────
create or replace function public._on_post_reaction_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_action_url text;
begin
  -- Look up the post author
  if NEW.source = 'user' then
    select user_id into v_author_id from public.user_posts where id = NEW.post_id;
    v_action_url := '/feed?post=u-' || NEW.post_id::text;
  else
    -- store_posts: notify the store owner
    select sp.owner_id into v_author_id
      from public.store_posts sp
     where sp.id = NEW.post_id;
    v_action_url := '/feed?post=' || NEW.post_id::text;
  end if;

  perform public._notify_social(
    v_author_id,
    NEW.user_id,
    'social_reaction',
    'New reaction ' || NEW.emoji,
    'Someone reacted ' || NEW.emoji || ' to your post',
    v_action_url
  );
  return NEW;
end;
$$;

drop trigger if exists trg_post_reaction_notify on public.post_reactions;
create trigger trg_post_reaction_notify
  after insert on public.post_reactions
  for each row execute function public._on_post_reaction_insert();

-- ── 2. Notify on repost ──────────────────────────────────────────────────────
create or replace function public._on_post_repost_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_action_url text;
  v_title text;
begin
  if NEW.source = 'user' then
    select user_id into v_author_id from public.user_posts where id = NEW.post_id;
    v_action_url := '/feed?post=u-' || NEW.post_id::text;
  else
    select sp.owner_id into v_author_id from public.store_posts sp where sp.id = NEW.post_id;
    v_action_url := '/feed?post=' || NEW.post_id::text;
  end if;

  v_title := case when NEW.quote_text is null then 'Someone reposted your post'
                  else 'Someone quoted your post' end;

  perform public._notify_social(
    v_author_id,
    NEW.user_id,
    'social_repost',
    v_title,
    coalesce(left(NEW.quote_text, 80), 'Tap to see who'),
    v_action_url
  );
  return NEW;
end;
$$;

drop trigger if exists trg_post_repost_notify on public.post_reposts;
create trigger trg_post_repost_notify
  after insert on public.post_reposts
  for each row execute function public._on_post_repost_insert();

-- ── 3. Notify mentioned users in a new comment ───────────────────────────────
create or replace function public._on_comment_insert_user_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id   uuid;
  v_text        text;
  v_action_url  text;
  v_handle      text;
  v_mention_id  uuid;
begin
  -- Resolve the comment's text column (varies)
  v_text := coalesce(
    NEW.comment, NEW.content, NEW.text, NEW.body
  );

  -- Notify the post author
  select user_id into v_author_id from public.user_posts where id = NEW.post_id;
  v_action_url := '/feed?post=u-' || NEW.post_id::text;
  perform public._notify_social(
    v_author_id,
    NEW.user_id,
    'social_comment',
    'New comment on your post',
    coalesce(left(v_text, 80), 'Tap to see'),
    v_action_url
  );

  -- Extract @-mentions from the comment text and notify each
  if v_text is not null then
    for v_handle in
      select substring(m[1] from 2)
        from regexp_matches(v_text, '@([A-Za-z0-9_]{2,30})', 'g') as m
    loop
      select id into v_mention_id
        from public.profiles
       where lower(username) = lower(v_handle)
       limit 1;

      if v_mention_id is not null and v_mention_id <> NEW.user_id then
        perform public._notify_social(
          v_mention_id,
          NEW.user_id,
          'social_mention',
          'You were mentioned',
          coalesce(left(v_text, 80), '@mention'),
          v_action_url
        );
      end if;
    end loop;
  end if;

  return NEW;
end;
$$;

-- Wire the comment trigger only if the table exists with the expected shape
do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'user_post_comments'
  ) then
    execute 'drop trigger if exists trg_user_post_comment_notify on public.user_post_comments';
    execute 'create trigger trg_user_post_comment_notify
              after insert on public.user_post_comments
              for each row execute function public._on_comment_insert_user_post()';
  end if;
end$$;

-- ── 4. Comment hearts ────────────────────────────────────────────────────────
-- Single-tap heart on individual comments. Polymorphic across user_post_comments
-- and store_post_comments via a `target_table` column.
create table if not exists public.comment_likes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  comment_id    uuid not null,
  target_table  text not null check (target_table in ('store_post_comments','user_post_comments')),
  created_at    timestamptz not null default now(),
  unique (user_id, comment_id, target_table)
);

create index if not exists idx_comment_likes_comment
  on public.comment_likes (comment_id, target_table);

create index if not exists idx_comment_likes_user
  on public.comment_likes (user_id, created_at desc);

alter table public.comment_likes enable row level security;

drop policy if exists "comment_likes_select_all" on public.comment_likes;
create policy "comment_likes_select_all"
  on public.comment_likes for select
  to authenticated
  using (true);

drop policy if exists "comment_likes_insert_own" on public.comment_likes;
create policy "comment_likes_insert_own"
  on public.comment_likes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "comment_likes_delete_own" on public.comment_likes;
create policy "comment_likes_delete_own"
  on public.comment_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- Atomic toggle helper
create or replace function public.toggle_comment_like(
  _comment_id    uuid,
  _target_table  text
) returns table(liked boolean, total int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_id    uuid;
  v_total int;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if _target_table not in ('store_post_comments','user_post_comments') then
    raise exception 'invalid target_table';
  end if;

  select id into v_id
    from public.comment_likes
   where user_id = v_uid and comment_id = _comment_id and target_table = _target_table;

  if v_id is null then
    insert into public.comment_likes (user_id, comment_id, target_table)
         values (v_uid, _comment_id, _target_table);
  else
    delete from public.comment_likes where id = v_id;
  end if;

  select count(*) into v_total
    from public.comment_likes
   where comment_id = _comment_id and target_table = _target_table;

  return query select (v_id is null), v_total;
end;
$$;

revoke all on function public.toggle_comment_like(uuid, text) from public;
grant execute on function public.toggle_comment_like(uuid, text) to authenticated;

-- =============================================================================
-- Fix the social notification triggers shipped in
-- 20260430010000_social_notifications_and_comment_hearts.sql
--
-- Bug 1: `store_posts` has no `owner_id` column — must resolve the recipient
--        by joining through `store_profiles.owner_id`.
-- Bug 2: The comment trigger referenced NEW.comment / NEW.content / NEW.text /
--        NEW.body via coalesce. PostgreSQL fires the trigger fine even when
--        those columns are missing, but an unconditional reference would error
--        once any of them is dropped. Switch to `to_jsonb(NEW)` so we read
--        whichever column exists without ever erroring.
-- =============================================================================

-- ── 1. Reaction trigger (fixed) ──────────────────────────────────────────────
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
  if NEW.source = 'user' then
    select user_id into v_author_id from public.user_posts where id = NEW.post_id;
    v_action_url := '/feed?post=u-' || NEW.post_id::text;
  else
    -- store_posts → store_profiles.owner_id
    select sp_prof.owner_id
      into v_author_id
      from public.store_posts sp
      join public.store_profiles sp_prof on sp_prof.id = sp.store_id
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

-- ── 2. Repost trigger (fixed) ────────────────────────────────────────────────
create or replace function public._on_post_repost_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id  uuid;
  v_action_url text;
  v_title      text;
begin
  if NEW.source = 'user' then
    select user_id into v_author_id from public.user_posts where id = NEW.post_id;
    v_action_url := '/feed?post=u-' || NEW.post_id::text;
  else
    select sp_prof.owner_id
      into v_author_id
      from public.store_posts sp
      join public.store_profiles sp_prof on sp_prof.id = sp.store_id
     where sp.id = NEW.post_id;
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

-- ── 3. Comment trigger (fixed: column-safe via to_jsonb) ─────────────────────
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
  v_row         jsonb;
begin
  -- Read the comment text from whichever column exists, without ever
  -- referencing a non-existent NEW.<col>.
  v_row := to_jsonb(NEW);
  v_text := coalesce(
    v_row ->> 'comment',
    v_row ->> 'content',
    v_row ->> 'text',
    v_row ->> 'body'
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

  -- @-mention notifications
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

-- Add a parallel trigger for store_post_comments, with the same column-safe
-- reading and the same mention-extraction logic.
create or replace function public._on_comment_insert_store_post()
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
  v_row         jsonb;
begin
  v_row := to_jsonb(NEW);
  v_text := coalesce(
    v_row ->> 'comment',
    v_row ->> 'content',
    v_row ->> 'text',
    v_row ->> 'body'
  );

  -- Notify the store owner
  select sp_prof.owner_id
    into v_author_id
    from public.store_posts sp
    join public.store_profiles sp_prof on sp_prof.id = sp.store_id
   where sp.id = NEW.post_id;

  v_action_url := '/feed?post=' || NEW.post_id::text;

  perform public._notify_social(
    v_author_id,
    NEW.user_id,
    'social_comment',
    'New comment on your post',
    coalesce(left(v_text, 80), 'Tap to see'),
    v_action_url
  );

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

do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'store_post_comments'
  ) then
    execute 'drop trigger if exists trg_store_post_comment_notify on public.store_post_comments';
    execute 'create trigger trg_store_post_comment_notify
              after insert on public.store_post_comments
              for each row execute function public._on_comment_insert_store_post()';
  end if;
end$$;

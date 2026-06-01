-- =============================================================================
-- Add the same author + @-mention notification logic to the unified
-- `post_comments` table that /feed's CommentsSheet writes to. Without this,
-- comments left via /feed silently never generate notifications, while the
-- exact same comments left via /reels' inline sheet do.
--
-- Logic mirrors `_on_comment_insert_user_post` and `_on_comment_insert_store_post`
-- from the earlier triggers — author lookup branches on `post_source`, mention
-- regex extraction is identical.
-- =============================================================================

create or replace function public._on_post_comments_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id   uuid;
  v_action_url  text;
  v_handle      text;
  v_mention_id  uuid;
  v_text        text := NEW.content;
begin
  -- Resolve the post author + the deep-link target
  if NEW.post_source = 'user' then
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

  -- Notify the post author (replies notify the parent author too — wire up
  -- if the product wants that; for now we keep it parent-author + mentions only)
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

do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'post_comments'
  ) then
    execute 'drop trigger if exists trg_post_comments_notify on public.post_comments';
    execute 'create trigger trg_post_comments_notify
              after insert on public.post_comments
              for each row execute function public._on_post_comments_insert()';
  end if;
end$$;

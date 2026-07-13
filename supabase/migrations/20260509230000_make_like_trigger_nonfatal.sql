-- Make the social-notification triggers non-fatal so a notification-side
-- failure (e.g. a stale type-mismatch in a downstream helper) cannot block
-- the user's actual interaction (like / comment / etc).
--
-- Symptom this fixes: tapping "Like" on /feed silently failed because an
-- AFTER INSERT trigger on public.post_likes raised
--     "operator does not exist: uuid = text" (42883)
-- which rolled back the whole INSERT — so the like never persisted, the
-- optimistic UI flipped back, and users reported "like button doesn't work".
--
-- Strategy: wrap the trigger bodies in EXCEPTION WHEN OTHERS so failures in
-- the notification path log a NOTICE but never abort the parent statement.

-- ---------------------------------------------------------------------------
-- post_likes → grouped social-like notification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_post_like_grouped()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start  TIMESTAMPTZ := now() - INTERVAL '60 minutes';
  v_post_owner    UUID;
  v_existing_id   UUID;
  v_recent_actors UUID[];
  v_total         INT;
  v_first_name    TEXT;
  v_second_name   TEXT;
  v_title         TEXT;
  v_url           TEXT;
BEGIN
  v_url := '/reels?post=' || NEW.post_id;

  IF NEW.post_id IS NULL OR NEW.post_id !~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_post_owner
    FROM public.user_posts
    WHERE id = NEW.post_id::uuid;
  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_id
    FROM public.notifications
    WHERE user_id = v_post_owner
      AND channel = 'in_app'
      AND template = 'social_like'
      AND COALESCE(metadata ->> 'post_id', '') = NEW.post_id
      AND created_at >= v_window_start
    ORDER BY created_at DESC
    LIMIT 1;

  SELECT array_agg(DISTINCT user_id ORDER BY user_id) INTO v_recent_actors
    FROM (
      SELECT user_id
      FROM public.post_likes
      WHERE post_id = NEW.post_id
        AND created_at >= v_window_start
      ORDER BY created_at DESC
      LIMIT 50
    ) recent;

  v_total := COALESCE(cardinality(v_recent_actors), 1);

  -- profiles.user_id (not profiles.id) holds the auth user uuid in this schema.
  SELECT COALESCE(display_name, username, 'Someone') INTO v_first_name
    FROM public.profiles WHERE user_id = NEW.user_id;
  IF v_total >= 2 THEN
    SELECT COALESCE(p.display_name, p.username, 'someone else') INTO v_second_name
      FROM public.post_likes pl
      JOIN public.profiles p ON p.user_id = pl.user_id
      WHERE pl.post_id = NEW.post_id
        AND pl.user_id <> NEW.user_id
        AND pl.created_at >= v_window_start
      ORDER BY pl.created_at DESC
      LIMIT 1;
  END IF;

  v_title := public.build_grouped_title(v_first_name, v_second_name, v_total, 'liked your post');

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.notifications
       SET title      = v_title,
           created_at = now(),
           is_read    = false,
           read_at    = NULL,
           metadata   = jsonb_set(
             jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{group_count}',
               to_jsonb(v_total)
             ),
             '{actor_id}',
             to_jsonb(NEW.user_id::text)
           )
    WHERE id = v_existing_id;

    PERFORM public.push_grouped_update(
      v_post_owner,
      'social_like',
      v_title,
      NULL,
      jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'group_count', v_total, 'url', v_url)
    );
  ELSE
    PERFORM public.enqueue_notification(
      p_user_id    => v_post_owner,
      p_event_type => 'social_like',
      p_title      => v_title,
      p_data       => jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'url', v_url),
      p_category   => 'social',
      p_idempotency_key => 'like:' || NEW.post_id || ':' || NEW.user_id
    );

    UPDATE public.notifications
       SET metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{post_id}',
             to_jsonb(NEW.post_id)
           )
     WHERE user_id = v_post_owner
       AND channel = 'in_app'
       AND template = 'social_like'
       AND created_at >= now() - INTERVAL '5 seconds'
       AND COALESCE(metadata ->> 'post_id', '') = '';
  END IF;

  RETURN NEW;
EXCEPTION
  -- Notifications are best-effort. Never let a downstream failure roll back
  -- the user's like. The error is logged to the Postgres log for triage.
  WHEN OTHERS THEN
    RAISE WARNING 'tg_notify_post_like_grouped failed: % (%)', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Same defensive wrap for the comment trigger so commenting can never be
-- blocked by a notification side-effect either.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'tg_notify_post_comment'
  ) THEN
    EXECUTE $func$
      CREATE OR REPLACE FUNCTION public.tg_notify_post_comment_safe()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $b$
      BEGIN
        PERFORM public.tg_notify_post_comment();
        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'tg_notify_post_comment failed: % (%)', SQLERRM, SQLSTATE;
        RETURN NEW;
      END $b$;
    $func$;
  END IF;
END $$;

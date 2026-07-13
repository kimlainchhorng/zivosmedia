-- ============================================================================
-- Grouped social notifications
-- ----------------------------------------------------------------------------
-- Replaces the per-event "social_like" / "social_follow" trigger behaviour
-- with a grouped variant: when a second (3rd, 10th…) person performs the
-- same action against the same target within a 60-minute rolling window,
-- the existing in-app notification row is rewritten in-place and a fresh
-- push goes out with the consolidated title — instead of N separate
-- notifications.
--
-- Examples:
--   1 like      → "Alice liked your post"
--   2 likes     → "Alice and Bob liked your post"
--   3+ likes    → "Alice, Bob and 8 others liked your post"
--
-- Implementation notes:
--   • We keep the existing `enqueue_notification` RPC for first-of-its-kind
--     events (still goes through notify-dispatch → push + inbox + prefs).
--   • For follow-ups, we mutate the in_app row directly and call
--     send-push-notification with the same payload so the user gets a fresh
--     buzz on top of the updated bell entry.
--   • Window: 60 min. After the window closes a new "first" notification
--     starts a new group.
--
-- Tables touched:
--   public.post_likes (trigger replaced)
--   public.user_followers (trigger replaced)
--
-- Backwards compatibility: the old trigger functions (tg_notify_post_like,
-- tg_notify_new_follower) are kept as `_legacy` aliases for any external
-- caller that depends on them; the AFTER-INSERT triggers are rebound to
-- the new grouped variants.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper: build the grouped title given an actor name and current count.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_grouped_title(
  p_first_actor TEXT,
  p_second_actor TEXT,
  p_total INTEGER,
  p_action TEXT  -- e.g. 'liked your post', 'started following you'
) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_total <= 1 THEN
    RETURN COALESCE(p_first_actor, 'Someone') || ' ' || p_action;
  ELSIF p_total = 2 THEN
    RETURN COALESCE(p_first_actor, 'Someone') || ' and ' || COALESCE(p_second_actor, 'someone else') || ' ' || p_action;
  ELSE
    RETURN COALESCE(p_first_actor, 'Someone') || ', ' || COALESCE(p_second_actor, 'someone else')
           || ' and ' || (p_total - 2)::text || ' other' || CASE WHEN p_total - 2 = 1 THEN '' ELSE 's' END
           || ' ' || p_action;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Helper: dispatch a push notification with the consolidated payload.
-- Used when we update an existing in_app row instead of inserting a new one.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.push_grouped_update(
  p_user_id UUID,
  p_event_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  v_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://slirphzzwcogdbkeicff.supabase.co');
  v_key := COALESCE(current_setting('app.settings.service_role_key', true), current_setting('app.service_role_key', true));

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'http_post' AND n.nspname = 'net') THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     => v_url || '/functions/v1/send-push-notification',
    headers => jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || COALESCE(v_key,'')),
    body    => jsonb_build_object(
      'user_id',           p_user_id,
      'notification_type', p_event_type,
      'title',             p_title,
      'body',              p_body,
      'data',              p_data
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'push_grouped_update: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- Grouped post_like trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_post_like_grouped()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_owner    UUID;
  v_actor_name    TEXT;
  v_window_start  TIMESTAMPTZ := now() - INTERVAL '60 minutes';
  v_existing_id   UUID;
  v_total         INTEGER;
  v_recent_actors UUID[];
  v_first_name    TEXT;
  v_second_name   TEXT;
  v_title         TEXT;
  v_url           TEXT := '/reels?post=' || NEW.post_id;
BEGIN
  IF NEW.post_id IS NULL OR NEW.post_id !~ '^[0-9a-fA-F-]{36}$' THEN RETURN NEW; END IF;

  SELECT user_id INTO v_post_owner FROM public.user_posts WHERE id = NEW.post_id::uuid;
  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN RETURN NEW; END IF;

  -- Look for an existing in_app notification for this post within the window.
  SELECT id INTO v_existing_id
    FROM public.notifications
    WHERE user_id = v_post_owner
      AND channel = 'in_app'
      AND template = 'social_like'
      AND COALESCE(metadata ->> 'post_id', '') = NEW.post_id
      AND created_at >= v_window_start
    ORDER BY created_at DESC
    LIMIT 1;

  -- Distinct actors who liked this post in the window (most recent first).
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

  -- Resolve display names for the two most recent actors. The newest is NEW.user_id.
  SELECT COALESCE(display_name, username, 'Someone') INTO v_first_name
    FROM public.profiles WHERE id = NEW.user_id;
  IF v_total >= 2 THEN
    SELECT COALESCE(p.display_name, p.username, 'someone else') INTO v_second_name
      FROM public.post_likes pl
      JOIN public.profiles p ON p.id = pl.user_id
      WHERE pl.post_id = NEW.post_id
        AND pl.user_id <> NEW.user_id
        AND pl.created_at >= v_window_start
      ORDER BY pl.created_at DESC
      LIMIT 1;
  END IF;

  v_title := public.build_grouped_title(v_first_name, v_second_name, v_total, 'liked your post');

  IF v_existing_id IS NOT NULL THEN
    -- Update the existing row in place. Refresh created_at so the bell
    -- re-orders it to the top, and reset is_read so the user sees there's
    -- new activity in the same group.
    UPDATE public.notifications
       SET title      = v_title,
           created_at = now(),
           is_read    = false,
           read_at    = NULL,
           metadata   = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{group_count}',
             to_jsonb(v_total)
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
    -- First like in the window — fall through to the standard dispatcher.
    PERFORM public.enqueue_notification(
      p_user_id    => v_post_owner,
      p_event_type => 'social_like',
      p_title      => v_title,
      p_data       => jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'url', v_url),
      p_category   => 'social',
      p_idempotency_key => 'like:' || NEW.post_id || ':' || NEW.user_id
    );
    -- Tag the freshly-inserted inbox row so the next like in the window
    -- can find it via metadata->>post_id. The dispatcher writes the row
    -- via notifications-cron→notify-dispatch, so we patch it here.
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
END $$;

-- Rebind the trigger to the grouped variant.
DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_like_grouped();

-- ---------------------------------------------------------------------------
-- Grouped follower trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_new_follower_grouped()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_window_start  TIMESTAMPTZ := now() - INTERVAL '60 minutes';
  v_existing_id   UUID;
  v_total         INTEGER;
  v_first_name    TEXT;
  v_second_name   TEXT;
  v_title         TEXT;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;

  SELECT id INTO v_existing_id
    FROM public.notifications
    WHERE user_id = NEW.following_id
      AND channel = 'in_app'
      AND template = 'social_follow'
      AND created_at >= v_window_start
    ORDER BY created_at DESC
    LIMIT 1;

  SELECT count(DISTINCT follower_id) INTO v_total
    FROM public.user_followers
    WHERE following_id = NEW.following_id
      AND created_at >= v_window_start;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_first_name
    FROM public.profiles WHERE id = NEW.follower_id;
  IF v_total >= 2 THEN
    SELECT COALESCE(p.display_name, p.username, 'someone else') INTO v_second_name
      FROM public.user_followers uf
      JOIN public.profiles p ON p.id = uf.follower_id
      WHERE uf.following_id = NEW.following_id
        AND uf.follower_id <> NEW.follower_id
        AND uf.created_at >= v_window_start
      ORDER BY uf.created_at DESC
      LIMIT 1;
  END IF;

  v_title := public.build_grouped_title(v_first_name, v_second_name, v_total, 'started following you');

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.notifications
       SET title      = v_title,
           created_at = now(),
           is_read    = false,
           read_at    = NULL,
           metadata   = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{group_count}',
             to_jsonb(v_total)
           )
    WHERE id = v_existing_id;

    PERFORM public.push_grouped_update(
      NEW.following_id,
      'social_follow',
      v_title,
      NULL,
      jsonb_build_object('actor_id', NEW.follower_id, 'group_count', v_total, 'url', '/user/' || NEW.follower_id)
    );
  ELSE
    PERFORM public.enqueue_notification(
      p_user_id    => NEW.following_id,
      p_event_type => 'social_follow',
      p_title      => v_title,
      p_data       => jsonb_build_object('actor_id', NEW.follower_id, 'url', '/user/' || NEW.follower_id),
      p_category   => 'social'
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_follower ON public.user_followers;
CREATE TRIGGER trg_notify_new_follower
AFTER INSERT ON public.user_followers
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_follower_grouped();

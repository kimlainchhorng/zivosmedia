-- ============================================================================
-- Notification follow-ups
-- ----------------------------------------------------------------------------
--   1. Auto-seed `notification_preferences` row whenever a new auth user is
--      created, so push/email work on first launch without UI interaction.
--   2. Fan-out push for `group_messages` to every group member except the
--      sender. Uses a single batch HTTP call to send-push-notification (which
--      already accepts user_ids[]) — so a 50-member group is one round-trip.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Default notification_preferences for new users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_seed_notification_preferences()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_seed_notification_preferences: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_notification_preferences ON auth.users;
CREATE TRIGGER trg_seed_notification_preferences
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_notification_preferences();

-- Backfill for existing users who don't yet have a row.
INSERT INTO public.notification_preferences (user_id)
SELECT u.id FROM auth.users u
LEFT JOIN public.notification_preferences p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Group messages — batch push to all members except sender
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_group_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url          TEXT;
  v_key          TEXT;
  v_sender_name  TEXT;
  v_group_name   TEXT;
  v_recipients   UUID[];
  v_preview      TEXT;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.group_id IS NULL THEN RETURN NEW; END IF;

  SELECT array_agg(user_id) INTO v_recipients
    FROM public.chat_group_members
    WHERE group_id = NEW.group_id AND user_id <> NEW.sender_id;

  IF v_recipients IS NULL OR cardinality(v_recipients) = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT name INTO v_group_name FROM public.chat_groups WHERE id = NEW.group_id;

  v_preview := CASE
    WHEN COALESCE(NEW.message, '') <> '' THEN LEFT(NEW.message, 140)
    WHEN NEW.image_url IS NOT NULL THEN '📷 Photo'
    WHEN NEW.voice_url IS NOT NULL THEN '🎙 Voice message'
    ELSE 'New message'
  END;

  -- Inbox rows (one per recipient).
  INSERT INTO public.notifications (user_id, channel, category, template, title, body, action_url, status)
  SELECT
    uid,
    'in_app',
    'chat',
    'group_message',
    COALESCE(v_group_name, 'Group') || ' · ' || COALESCE(v_sender_name, 'Someone'),
    v_preview,
    '/chat?group=' || NEW.group_id,
    'sent'
  FROM unnest(v_recipients) AS uid;

  -- Batch push.
  v_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://slirphzzwcogdbkeicff.supabase.co');
  v_key := COALESCE(current_setting('app.settings.service_role_key', true), current_setting('app.service_role_key', true));

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'http_post' AND n.nspname = 'net') THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     => v_url || '/functions/v1/send-push-notification',
    headers => jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || COALESCE(v_key, '')),
    body    => jsonb_build_object(
      'user_ids',          to_jsonb(v_recipients),
      'notification_type', 'group_message',
      'title',             COALESCE(v_group_name, 'Group') || ' · ' || COALESCE(v_sender_name, 'Someone'),
      'body',              v_preview,
      'data',              jsonb_build_object('group_id', NEW.group_id, 'sender_id', NEW.sender_id, 'message_id', NEW.id, 'url', '/chat?group=' || NEW.group_id)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_notify_group_message: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_group_message ON public.group_messages;
CREATE TRIGGER trg_notify_group_message
AFTER INSERT ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_group_message();

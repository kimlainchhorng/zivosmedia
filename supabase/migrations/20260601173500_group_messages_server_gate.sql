-- Force group-message sends through group-message-send so membership checks,
-- sender ownership, and notification fanout are trusted server-side.

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_messages_block_direct_insert ON public.group_messages;

CREATE POLICY group_messages_block_direct_insert
ON public.group_messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON POLICY group_messages_block_direct_insert ON public.group_messages
IS 'Blocks direct authenticated group-message inserts; use group-message-send for trusted server-side ingestion.';

CREATE OR REPLACE FUNCTION public.tg_notify_group_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url          TEXT;
  v_key          TEXT;
  v_sender_name  TEXT;
  v_group_name   TEXT;
  v_recipients   UUID[];
  v_preview      TEXT;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.group_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(user_id)
    INTO v_recipients
    FROM public.chat_group_members
   WHERE group_id = NEW.group_id
     AND user_id <> NEW.sender_id;

  IF v_recipients IS NULL OR cardinality(v_recipients) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Someone')
    INTO v_sender_name
    FROM public.profiles
   WHERE user_id = NEW.sender_id OR id = NEW.sender_id
   ORDER BY (user_id = NEW.sender_id) DESC
   LIMIT 1;

  SELECT name
    INTO v_group_name
    FROM public.chat_groups
   WHERE id = NEW.group_id;

  v_preview := CASE
    WHEN NEW.message_type = 'locked_text' THEN 'Locked message'
    WHEN NEW.message_type IN ('locked_image', 'locked_video', 'locked_album') THEN 'Locked media'
    WHEN NEW.message_type = 'media_album' THEN 'Media album'
    WHEN NEW.message_type IN ('image', 'gif') OR NEW.image_url IS NOT NULL THEN 'Photo'
    WHEN NEW.message_type = 'video' OR NEW.video_url IS NOT NULL THEN 'Video'
    WHEN NEW.message_type IN ('voice', 'voice_note') OR NEW.voice_url IS NOT NULL THEN 'Voice message'
    WHEN COALESCE(NEW.message, '') <> '' THEN LEFT(NEW.message, 140)
    ELSE 'New message'
  END;

  INSERT INTO public.notifications (user_id, channel, category, template, title, body, action_url, status)
  SELECT
    uid,
    'in_app',
    'chat',
    'group_message',
    COALESCE(v_group_name, 'Group') || ' - ' || COALESCE(v_sender_name, 'Someone'),
    v_preview,
    '/chat?group=' || NEW.group_id,
    'sent'
  FROM unnest(v_recipients) AS uid;

  v_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://slirphzzwcogdbkeicff.supabase.co');
  v_key := COALESCE(current_setting('app.settings.service_role_key', true), current_setting('app.service_role_key', true));

  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE p.proname = 'http_post'
       AND n.nspname = 'net'
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     => v_url || '/functions/v1/send-push-notification',
    headers => jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || COALESCE(v_key, '')),
    body    => jsonb_build_object(
      'user_ids',          to_jsonb(v_recipients),
      'notification_type', 'group_message',
      'title',             COALESCE(v_group_name, 'Group') || ' - ' || COALESCE(v_sender_name, 'Someone'),
      'body',              v_preview,
      'data',              jsonb_build_object('group_id', NEW.group_id, 'sender_id', NEW.sender_id, 'message_id', NEW.id, 'url', '/chat?group=' || NEW.group_id)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_notify_group_message: %', SQLERRM;
  RETURN NEW;
END $$;

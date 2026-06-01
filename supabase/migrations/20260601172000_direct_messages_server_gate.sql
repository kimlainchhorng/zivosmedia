-- Force direct-message sends through chat-message-send so sender ownership,
-- locked-text payload writes, and notification fanout are trusted server-side.

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_locked_payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS direct_messages_block_direct_insert ON public.direct_messages;
DROP POLICY IF EXISTS direct_message_locked_payloads_block_direct_insert ON public.direct_message_locked_payloads;

CREATE POLICY direct_messages_block_direct_insert
ON public.direct_messages
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY direct_message_locked_payloads_block_direct_insert
ON public.direct_message_locked_payloads
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

COMMENT ON POLICY direct_messages_block_direct_insert ON public.direct_messages
IS 'Blocks direct authenticated DM inserts; use chat-message-send for trusted server-side ingestion.';

COMMENT ON POLICY direct_message_locked_payloads_block_direct_insert ON public.direct_message_locked_payloads
IS 'Blocks direct locked-text payload inserts; chat-message-send writes payloads with service-role ownership checks.';

CREATE OR REPLACE FUNCTION public.tg_notify_direct_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name TEXT;
  v_preview     TEXT;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.receiver_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.sender_id = NEW.receiver_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username, 'Someone')
    INTO v_sender_name
    FROM public.profiles
   WHERE user_id = NEW.sender_id OR id = NEW.sender_id
   ORDER BY (user_id = NEW.sender_id) DESC
   LIMIT 1;

  v_preview := CASE
    WHEN NEW.message_type = 'locked_text' THEN 'Locked message'
    WHEN NEW.message_type IN ('locked_image', 'locked_video', 'locked_album') THEN 'Locked media'
    WHEN NEW.message_type IN ('image', 'gif') OR NEW.image_url IS NOT NULL THEN 'Photo'
    WHEN NEW.message_type = 'video' OR NEW.video_url IS NOT NULL THEN 'Video'
    WHEN NEW.message_type IN ('voice', 'voice_note') OR NEW.voice_url IS NOT NULL THEN 'Voice message'
    WHEN COALESCE(NEW.message, '') <> '' THEN LEFT(NEW.message, 140)
    ELSE 'New message'
  END;

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.receiver_id,
    p_event_type => 'chat_message',
    p_title      => COALESCE(v_sender_name, 'Someone'),
    p_body       => v_preview,
    p_data       => jsonb_build_object('sender_id', NEW.sender_id, 'message_id', NEW.id, 'url', '/chat?with=' || NEW.sender_id),
    p_channels   => ARRAY['inbox','push']::text[],
    p_category   => 'chat',
    p_idempotency_key => 'dm:' || NEW.id
  );
  RETURN NEW;
END $$;

-- Notify creators when their PPV or Paid DM content gets unlocked.
-- Uses the same enqueue_notification() helper as creator-tip notifications.

-- ── Defensive stub ───────────────────────────────────────────────────────────
-- The real enqueue_notification(...) lives in the unified_notifications
-- migration (20260509120000), which calls notify-dispatch via pg_net. That
-- migration hasn't been applied to every environment yet, so if the function
-- is missing here we register a no-op with the exact same signature. The real
-- migration's CREATE OR REPLACE will overwrite this stub when it eventually
-- lands. Without this, every unlock trigger would throw and roll back the
-- parent INSERT — i.e. unlocks would silently fail.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'enqueue_notification' AND n.nspname = 'public'
  ) THEN
    CREATE FUNCTION public.enqueue_notification(
      p_user_id          UUID,
      p_event_type       TEXT,
      p_title            TEXT,
      p_body             TEXT DEFAULT NULL,
      p_data             JSONB DEFAULT '{}'::jsonb,
      p_channels         TEXT[] DEFAULT ARRAY['inbox','push']::text[],
      p_idempotency_key  TEXT DEFAULT NULL,
      p_category         TEXT DEFAULT 'transactional'
    ) RETURNS VOID
    LANGUAGE plpgsql
    AS $stub$
    BEGIN
      -- no-op stub; replaced by the real dispatcher in unified_notifications
      RETURN;
    END;
    $stub$;
    GRANT EXECUTE ON FUNCTION public.enqueue_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT, TEXT) TO authenticated, service_role;
  END IF;
END $$;

-- ── PPV unlocks ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_ppv_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocker_name TEXT;
  v_post_title    TEXT;
  v_amount        NUMERIC;
BEGIN
  IF NEW.creator_id IS NULL OR NEW.creator_id = NEW.unlocker_id THEN
    RETURN NEW;
  END IF;

  v_amount := COALESCE(NEW.amount_cents_paid, 0) / 100.0;

  SELECT COALESCE(display_name, username, full_name, 'Someone')
    INTO v_unlocker_name
    FROM public.profiles
   WHERE user_id = NEW.unlocker_id OR id = NEW.unlocker_id
   LIMIT 1;

  SELECT title INTO v_post_title
    FROM public.ppv_posts
   WHERE id = NEW.ppv_id;

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.creator_id,
    p_event_type => 'ppv_unlocked',
    p_title      => COALESCE(v_unlocker_name, 'Someone') || ' unlocked your PPV',
    p_body       => COALESCE(v_post_title, 'Locked post')
                    || ' · $' || to_char(v_amount, 'FM999G990D00'),
    p_data       => jsonb_build_object(
      'ppv_id',       NEW.ppv_id,
      'unlocker_id',  NEW.unlocker_id,
      'amount_cents', NEW.amount_cents_paid,
      'url',          '/ppv?post=' || NEW.ppv_id::text
    ),
    p_channels   => ARRAY['inbox','push']::text[],
    p_idempotency_key => 'ppv-unlock:' || NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ppv_unlock ON public.ppv_unlocks;
CREATE TRIGGER trg_notify_ppv_unlock
  AFTER INSERT ON public.ppv_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_ppv_unlock();

-- ── Paid DM unlocks ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_dm_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocker_name TEXT;
  v_amount        NUMERIC;
BEGIN
  IF NEW.creator_id IS NULL OR NEW.creator_id = NEW.unlocker_id THEN
    RETURN NEW;
  END IF;

  v_amount := COALESCE(NEW.amount_cents_paid, 0) / 100.0;

  SELECT COALESCE(display_name, username, full_name, 'Someone')
    INTO v_unlocker_name
    FROM public.profiles
   WHERE user_id = NEW.unlocker_id OR id = NEW.unlocker_id
   LIMIT 1;

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.creator_id,
    p_event_type => 'dm_unlocked',
    p_title      => COALESCE(v_unlocker_name, 'Someone') || ' unlocked your paid DM',
    p_body       => '$' || to_char(v_amount, 'FM999G990D00') || ' received',
    p_data       => jsonb_build_object(
      'message_id',   NEW.message_id,
      'unlocker_id',  NEW.unlocker_id,
      'amount_cents', NEW.amount_cents_paid,
      'url',          '/chat?with=' || NEW.unlocker_id::text
    ),
    p_channels   => ARRAY['inbox','push']::text[],
    p_idempotency_key => 'dm-unlock:' || NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dm_unlock ON public.direct_message_unlocks;
CREATE TRIGGER trg_notify_dm_unlock
  AFTER INSERT ON public.direct_message_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_dm_unlock();

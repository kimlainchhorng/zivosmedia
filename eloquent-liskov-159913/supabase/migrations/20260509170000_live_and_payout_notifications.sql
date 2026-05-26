-- ============================================================================
-- Live streams + payouts notifications
-- ----------------------------------------------------------------------------
--   • Live streams — fan out to every follower when someone goes live (one
--     batch push per stream, not per follower).
--   • Payouts — driver/restaurant gets notified when their payout transitions
--     to processing / completed / failed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Live stream — fan out to followers on creation / status flip to live
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_live_stream_started()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url        TEXT;
  v_key        TEXT;
  v_followers  UUID[];
  v_streamer   TEXT;
  v_title      TEXT;
BEGIN
  -- Only fire when a row first appears as live, OR when status flips into 'live'.
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'live') OR
    (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'live')
  ) THEN
    RETURN NEW;
  END IF;

  SELECT array_agg(follower_id) INTO v_followers
    FROM public.user_followers
    WHERE following_id = NEW.user_id;

  IF v_followers IS NULL OR cardinality(v_followers) = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_streamer
    FROM public.profiles WHERE id = NEW.user_id;

  v_title := COALESCE(v_streamer, 'Someone') || ' is live now';

  -- Inbox rows (one per follower). Keep volume reasonable; filtered by user
  -- prefs at render time.
  INSERT INTO public.notifications (user_id, channel, category, template, title, body, action_url, status)
  SELECT
    uid,
    'in_app',
    'social',
    'live_stream_started',
    v_title,
    NULLIF(NEW.title, ''),
    '/live/' || NEW.id,
    'sent'
  FROM unnest(v_followers) AS uid;

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
      'user_ids',          to_jsonb(v_followers),
      'notification_type', 'live_stream_started',
      'title',             v_title,
      'body',              NULLIF(NEW.title, ''),
      'data',              jsonb_build_object('stream_id', NEW.id, 'streamer_id', NEW.user_id, 'url', '/live/' || NEW.id)
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_notify_live_stream_started: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_live_stream_started ON public.live_streams;
CREATE TRIGGER trg_notify_live_stream_started
AFTER INSERT OR UPDATE OF status ON public.live_streams
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_live_stream_started();

-- ---------------------------------------------------------------------------
-- 2. Payouts — notify the recipient (driver or restaurant owner)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_payout_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id  UUID;
  v_event    TEXT;
  v_title    TEXT;
  v_body     TEXT;
  v_amount   TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Resolve recipient: drivers.user_id or restaurants.owner_id.
  IF NEW.driver_id IS NOT NULL THEN
    SELECT user_id INTO v_user_id FROM public.drivers WHERE id = NEW.driver_id;
  ELSIF NEW.restaurant_id IS NOT NULL THEN
    SELECT owner_id INTO v_user_id FROM public.restaurants WHERE id = NEW.restaurant_id;
  END IF;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  v_amount := to_char(NEW.amount, 'FM999G990D00') || ' ' || COALESCE(NEW.currency, 'USD');

  CASE NEW.status
    WHEN 'processing' THEN
      v_event := 'payout_processing';
      v_title := 'Payout processing';
      v_body  := 'Your payout of ' || v_amount || ' is on the way.';
    WHEN 'completed' THEN
      v_event := 'payout_completed';
      v_title := 'Payout completed';
      v_body  := v_amount || ' has been deposited.';
    WHEN 'failed' THEN
      v_event := 'payout_failed';
      v_title := 'Payout failed';
      v_body  := 'There was an issue with your ' || v_amount || ' payout. Please check your account.';
    ELSE
      RETURN NEW;
  END CASE;

  PERFORM public.enqueue_notification(
    p_user_id    => v_user_id,
    p_event_type => v_event,
    p_title      => v_title,
    p_body       => v_body,
    p_data       => jsonb_build_object('payout_id', NEW.id, 'amount', NEW.amount, 'currency', NEW.currency, 'url', '/wallet/payouts/' || NEW.id),
    p_channels   => ARRAY['inbox','push','email']::text[],
    p_idempotency_key => 'payout:' || NEW.id || ':' || NEW.status
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_payout_status ON public.payouts;
CREATE TRIGGER trg_notify_payout_status
AFTER INSERT OR UPDATE OF status ON public.payouts
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_payout_status();

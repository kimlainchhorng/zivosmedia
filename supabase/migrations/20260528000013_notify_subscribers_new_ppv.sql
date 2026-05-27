-- New-PPV fan-out: when an OF creator publishes a PPV, every active subscriber
-- of theirs gets an in-app notification + push.
--
-- Skips:
--   - scheduled-future posts (they're not visible yet — notify when they go
--     live via a future cron, not at insert time)
--   - unpublished posts
--   - the creator themselves
--
-- One enqueue_notification per subscriber. Idempotency key includes the
-- subscriber id so re-runs / duplicate triggers don't dupe.

CREATE OR REPLACE FUNCTION public.tg_notify_ppv_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name TEXT;
  v_price        NUMERIC;
  v_sub          RECORD;
BEGIN
  -- Only fan-out when the post is actually visible to fans right now
  IF NEW.is_published IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF NEW.scheduled_for IS NOT NULL AND NEW.scheduled_for > now() THEN
    RETURN NEW;
  END IF;

  v_price := COALESCE(NEW.price_cents, 0) / 100.0;

  SELECT COALESCE(display_name, username, full_name, 'A creator')
    INTO v_creator_name
    FROM public.profiles
   WHERE user_id = NEW.creator_id OR id = NEW.creator_id
   LIMIT 1;

  FOR v_sub IN
    SELECT subscriber_id
      FROM public.creator_subscriptions
     WHERE creator_id = NEW.creator_id
       AND COALESCE(status, '') = 'active'
       AND (expires_at IS NULL OR expires_at > now())
       AND subscriber_id <> NEW.creator_id
  LOOP
    PERFORM public.enqueue_notification(
      p_user_id    => v_sub.subscriber_id,
      p_event_type => 'ppv_new_drop',
      p_title      => COALESCE(v_creator_name, 'A creator') || ' dropped a new PPV',
      p_body       => COALESCE(NEW.title, 'New locked post')
                      || CASE WHEN NEW.free_for_subscribers
                              THEN ' · free for subscribers'
                              ELSE ' · $' || to_char(v_price, 'FM999G990D00')
                         END,
      p_data       => jsonb_build_object(
        'ppv_id',       NEW.id,
        'creator_id',   NEW.creator_id,
        'price_cents',  NEW.price_cents,
        'url',          '/ppv?post=' || NEW.id::text
      ),
      p_channels   => ARRAY['inbox','push']::text[],
      p_idempotency_key => 'ppv-new:' || NEW.id::text || ':' || v_sub.subscriber_id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ppv_published ON public.ppv_posts;
CREATE TRIGGER trg_notify_ppv_published
  AFTER INSERT ON public.ppv_posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_ppv_published();

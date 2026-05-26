-- ============================================================================
-- Unified notifications dispatch
-- ----------------------------------------------------------------------------
-- Adds an `enqueue_notification(...)` SQL helper plus a small set of triggers
-- on the highest-volume event tables. Each trigger calls the `notify-dispatch`
-- edge function via pg_net, which fans out to push (FCM/APNs/VAPID), email
-- (Resend), SMS (Twilio), and the in-app inbox according to user preferences.
--
-- Coverage in this migration:
--   • social    — user_followers (new follower), post_likes, post_comments
--   • channels  — channel_posts (broadcast to subscribers handled by edge fn)
--   • eats      — food_orders status transitions
--   • rides     — ride_requests status transitions / driver assignment
--   • lodging   — lodge_reservations status / payment changes
--   • flights   — flight_bookings status / payment changes
--   • wallet    — p2p_transfers (incoming transfer)
--   • sms-log   — sms_send_log table (used by send-sms edge function)
--
-- Other event sources (chat_messages, bot replies, marketplace orders,
-- channel-broadcast fanout) are dispatched directly from edge functions —
-- those callers should invoke notify-dispatch over HTTP. See README.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- ----- SMS send log ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sms_send_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type          TEXT,
  destination_masked  TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  provider            TEXT NOT NULL DEFAULT 'twilio',
  provider_message_id TEXT,
  error_message       TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_user ON public.sms_send_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_status ON public.sms_send_log(status, created_at DESC);
ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_send_log_self_read" ON public.sms_send_log;
CREATE POLICY "sms_send_log_self_read" ON public.sms_send_log
  FOR SELECT USING (auth.uid() = user_id);

-- ----- Core dispatch helper -------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_notification(
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url        TEXT;
  v_key        TEXT;
  v_body       JSONB;
BEGIN
  IF p_user_id IS NULL OR p_event_type IS NULL OR p_title IS NULL THEN
    RETURN;
  END IF;

  v_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    'https://slirphzzwcogdbkeicff.supabase.co'
  );
  v_key := COALESCE(
    current_setting('app.settings.service_role_key', true),
    current_setting('app.service_role_key', true)
  );

  -- pg_net is required; if the extension isn't loaded yet, do nothing rather than fail the host transaction.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'http_post' AND n.nspname = 'net'
  ) THEN
    RETURN;
  END IF;

  v_body := jsonb_build_object(
    'user_id',         p_user_id,
    'event_type',      p_event_type,
    'title',           p_title,
    'body',            COALESCE(p_body, ''),
    'data',            COALESCE(p_data, '{}'::jsonb),
    'channels',        to_jsonb(p_channels),
    'category',        p_category,
    'idempotency_key', p_idempotency_key
  );

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/notify-dispatch',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_key, '')
    ),
    body    := v_body
  );
EXCEPTION WHEN OTHERS THEN
  -- Notifications are fire-and-forget — never block the originating txn.
  RAISE WARNING 'enqueue_notification failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT, TEXT) TO authenticated, service_role;

-- ============================================================================
-- SOCIAL TRIGGERS
-- ============================================================================

-- New follower
CREATE OR REPLACE FUNCTION public.tg_notify_new_follower()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_name TEXT;
BEGIN
  IF NEW.follower_id = NEW.following_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone')
    INTO v_actor_name
    FROM public.profiles WHERE id = NEW.follower_id;

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.following_id,
    p_event_type => 'social_follow',
    p_title      => COALESCE(v_actor_name, 'Someone') || ' started following you',
    p_body       => NULL,
    p_data       => jsonb_build_object('actor_id', NEW.follower_id, 'url', '/user/' || NEW.follower_id),
    p_category   => 'social'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_follower ON public.user_followers;
CREATE TRIGGER trg_notify_new_follower
AFTER INSERT ON public.user_followers
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_follower();

-- Post like
CREATE OR REPLACE FUNCTION public.tg_notify_post_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_owner UUID;
  v_actor_name TEXT;
BEGIN
  -- post_likes.post_id is TEXT in this schema; only handle UUID-shaped IDs.
  IF NEW.post_id IS NULL OR NEW.post_id !~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_post_owner FROM public.user_posts WHERE id = NEW.post_id::uuid;
  IF v_post_owner IS NULL OR v_post_owner = NEW.user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone')
    INTO v_actor_name
    FROM public.profiles WHERE id = NEW.user_id;

  PERFORM public.enqueue_notification(
    p_user_id    => v_post_owner,
    p_event_type => 'social_like',
    p_title      => COALESCE(v_actor_name, 'Someone') || ' liked your post',
    p_data       => jsonb_build_object('post_id', NEW.post_id, 'actor_id', NEW.user_id, 'url', '/reels?post=' || NEW.post_id),
    p_category   => 'social',
    p_idempotency_key => 'like:' || NEW.post_id || ':' || NEW.user_id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_like();

-- Post comment
CREATE OR REPLACE FUNCTION public.tg_notify_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_owner UUID;
  v_actor_name TEXT;
  v_post_id    TEXT := (to_jsonb(NEW) ->> 'post_id');
  v_user_id    UUID := (to_jsonb(NEW) ->> 'user_id')::uuid;
BEGIN
  IF v_post_id IS NULL OR v_post_id !~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_post_owner FROM public.user_posts WHERE id = v_post_id::uuid;
  IF v_post_owner IS NULL OR v_post_owner = v_user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone')
    INTO v_actor_name
    FROM public.profiles WHERE id = v_user_id;

  PERFORM public.enqueue_notification(
    p_user_id    => v_post_owner,
    p_event_type => 'social_comment',
    p_title      => COALESCE(v_actor_name, 'Someone') || ' commented on your post',
    p_body       => LEFT(COALESCE(to_jsonb(NEW) ->> 'content', to_jsonb(NEW) ->> 'comment_text', ''), 140),
    p_data       => jsonb_build_object('post_id', v_post_id, 'actor_id', v_user_id, 'url', '/reels?post=' || v_post_id),
    p_category   => 'social'
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_comment();

-- ============================================================================
-- CHANNELS — fan-out is handled inside `channel-broadcast` and
-- `channel-publish-scheduled` edge functions (which already enumerate
-- subscribers and now also call send-push-notification in batch). No DB
-- trigger needed; doing it from the edge fn avoids re-entrant HTTP calls.
-- ============================================================================
-- EATS — food_orders status transitions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_food_order_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title TEXT;
  v_body  TEXT;
  v_event TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  v_event := 'eats_order_' || NEW.status::text;
  CASE NEW.status::text
    WHEN 'confirmed'  THEN v_title := 'Order confirmed';                   v_body := 'Your order is being prepared.';
    WHEN 'preparing'  THEN v_title := 'Restaurant is preparing your order'; v_body := NULL;
    WHEN 'ready'      THEN v_title := 'Your order is ready';                v_body := 'Awaiting pickup by the driver.';
    WHEN 'picked_up'  THEN v_title := 'Driver picked up your order';        v_body := 'On the way to you now.';
    WHEN 'delivered'  THEN v_title := 'Order delivered';                    v_body := 'Enjoy your meal!';
    WHEN 'cancelled'  THEN v_title := 'Order cancelled';                    v_body := NULL;
    ELSE RETURN NEW;
  END CASE;

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.customer_id,
    p_event_type => v_event,
    p_title      => v_title,
    p_body       => v_body,
    p_data       => jsonb_build_object('order_id', NEW.id, 'url', '/eats?order_id=' || NEW.id),
    p_channels   => ARRAY['inbox','push','sms']::text[],
    p_idempotency_key => 'eats:' || NEW.id || ':' || NEW.status::text
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_food_order_status ON public.food_orders;
CREATE TRIGGER trg_notify_food_order_status
AFTER UPDATE OF status ON public.food_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_food_order_status();

-- ============================================================================
-- RIDES — ride_requests status / driver assignment
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_ride_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := NULLIF(to_jsonb(NEW) ->> 'user_id', '')::uuid;
  v_title   TEXT;
  v_body    TEXT;
  v_event   TEXT;
BEGIN
  IF v_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.assigned_driver_id IS NOT DISTINCT FROM OLD.assigned_driver_id THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id
     AND NEW.assigned_driver_id IS NOT NULL THEN
    v_event := 'ride_driver_assigned';
    v_title := 'Driver assigned';
    v_body  := 'Your driver is on the way.';
  ELSE
    v_event := 'ride_' || NEW.status;
    CASE NEW.status
      WHEN 'driver_arrived' THEN v_title := 'Your driver has arrived'; v_body := NULL;
      WHEN 'in_progress'    THEN v_title := 'Trip started';            v_body := NULL;
      WHEN 'completed'      THEN v_title := 'Trip completed';          v_body := 'Thanks for riding with Zivo!';
      WHEN 'cancelled'      THEN v_title := 'Trip cancelled';          v_body := NULL;
      ELSE RETURN NEW;
    END CASE;
  END IF;

  PERFORM public.enqueue_notification(
    p_user_id    => v_user_id,
    p_event_type => v_event,
    p_title      => v_title,
    p_body       => v_body,
    p_data       => jsonb_build_object('ride_id', NEW.id, 'url', '/rides/tracking?trip_id=' || NEW.id),
    p_channels   => ARRAY['inbox','push','sms']::text[],
    p_idempotency_key => 'ride:' || NEW.id || ':' || v_event
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_ride_status ON public.ride_requests;
CREATE TRIGGER trg_notify_ride_status
AFTER UPDATE OF status, assigned_driver_id ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_ride_status();

-- ============================================================================
-- LODGING — lodge_reservations status / payment
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_lodge_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID := NULLIF(to_jsonb(NEW) ->> 'guest_id', '')::uuid;
  v_event   TEXT;
  v_title   TEXT;
  v_body    TEXT;
BEGIN
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF (TG_OP = 'INSERT') OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    v_event := 'lodge_booking_' || NEW.status;
    CASE NEW.status
      WHEN 'confirmed' THEN v_title := 'Booking confirmed';      v_body := 'Your stay is booked.';
      WHEN 'checked_in' THEN v_title := 'Welcome — checked in';  v_body := NULL;
      WHEN 'checked_out' THEN v_title := 'Thanks for staying';   v_body := 'Hope to see you again.';
      WHEN 'cancelled' THEN v_title := 'Booking cancelled';      v_body := NULL;
      ELSE RETURN NEW;
    END CASE;

    PERFORM public.enqueue_notification(
      p_user_id    => v_user_id,
      p_event_type => v_event,
      p_title      => v_title,
      p_body       => v_body,
      p_data       => jsonb_build_object('reservation_id', NEW.id, 'url', '/bookings?booking_id=' || NEW.id),
      p_channels   => ARRAY['inbox','push','email']::text[],
      p_idempotency_key => 'lodge:' || NEW.id || ':' || NEW.status
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_lodge_reservation ON public.lodge_reservations;
CREATE TRIGGER trg_notify_lodge_reservation
AFTER INSERT OR UPDATE OF status ON public.lodge_reservations
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_lodge_reservation();

-- ============================================================================
-- FLIGHTS — flight_bookings status / payment
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_flight_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event TEXT;
  v_title TEXT;
  v_body  TEXT;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    IF NEW.payment_status = 'paid' AND (OLD IS NULL OR OLD.payment_status IS DISTINCT FROM 'paid') THEN
      v_event := 'flight_booking_confirmed';
      v_title := 'Flight booking confirmed';
      v_body  := 'Booking ref: ' || NEW.booking_reference;
    ELSIF NEW.status::text = 'cancelled' THEN
      v_event := 'flight_booking_cancelled';
      v_title := 'Flight booking cancelled';
      v_body  := NULL;
    ELSE
      RETURN NEW;
    END IF;

    PERFORM public.enqueue_notification(
      p_user_id    => NEW.customer_id,
      p_event_type => v_event,
      p_title      => v_title,
      p_body       => v_body,
      p_data       => jsonb_build_object('booking_id', NEW.id, 'reference', NEW.booking_reference, 'url', '/bookings?booking_id=' || NEW.id),
      p_channels   => ARRAY['inbox','push','email']::text[],
      p_idempotency_key => 'flight:' || NEW.id || ':' || v_event
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_flight_booking ON public.flight_bookings;
CREATE TRIGGER trg_notify_flight_booking
AFTER INSERT OR UPDATE OF status, payment_status ON public.flight_bookings
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_flight_booking();

-- ============================================================================
-- WALLET — p2p_transfers (incoming)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_p2p_transfer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name TEXT;
  v_amount      TEXT;
BEGIN
  IF NEW.receiver_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  v_amount := COALESCE(to_jsonb(NEW) ->> 'amount', to_jsonb(NEW) ->> 'amount_cents', '');

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.receiver_id,
    p_event_type => 'wallet_received',
    p_title      => COALESCE(v_sender_name, 'Someone') || ' sent you money',
    p_body       => CASE WHEN v_amount = '' THEN NULL ELSE 'Amount: ' || v_amount END,
    p_data       => jsonb_build_object('transfer_id', NEW.id, 'sender_id', NEW.sender_id, 'url', '/wallet'),
    p_channels   => ARRAY['inbox','push']::text[],
    p_idempotency_key => 'p2p:' || NEW.id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_p2p_transfer ON public.p2p_transfers;
CREATE TRIGGER trg_notify_p2p_transfer
AFTER INSERT ON public.p2p_transfers
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_p2p_transfer();

-- ============================================================================
-- CHAT — direct_messages
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_direct_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender_name TEXT;
  v_preview     TEXT;
BEGIN
  IF NEW.sender_id IS NULL OR NEW.receiver_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.sender_id = NEW.receiver_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  v_preview := CASE
    WHEN COALESCE(NEW.message, '') <> '' THEN LEFT(NEW.message, 140)
    WHEN NEW.image_url IS NOT NULL THEN '📷 Photo'
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

DROP TRIGGER IF EXISTS trg_notify_direct_message ON public.direct_messages;
CREATE TRIGGER trg_notify_direct_message
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_direct_message();

-- ============================================================================
-- MARKETPLACE — orders (buyer + seller)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_marketplace_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_buyer_title  TEXT;
  v_buyer_body   TEXT;
  v_seller_title TEXT;
  v_seller_body  TEXT;
  v_event        TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'marketplace_order_placed';
    v_buyer_title  := 'Order placed';
    v_buyer_body   := 'Your order is awaiting seller confirmation.';
    v_seller_title := 'New order received';
    v_seller_body  := 'A buyer just placed an order — please review.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := 'marketplace_order_' || NEW.status;
    CASE NEW.status
      WHEN 'paid', 'confirmed' THEN
        v_buyer_title := 'Order confirmed';     v_buyer_body := 'The seller is preparing your order.';
        v_seller_title := 'Payment received';   v_seller_body := 'Order is paid and ready to ship.';
      WHEN 'shipped' THEN
        v_buyer_title := 'Order shipped';       v_buyer_body := 'Your package is on its way.';
        v_seller_title := NULL;                 v_seller_body := NULL;
      WHEN 'delivered', 'completed' THEN
        v_buyer_title := 'Order delivered';     v_buyer_body := 'Thanks for shopping with Zivo.';
        v_seller_title := 'Order completed';    v_seller_body := 'Payout will follow per schedule.';
      WHEN 'cancelled' THEN
        v_buyer_title := 'Order cancelled';     v_buyer_body := NULL;
        v_seller_title := 'Order cancelled';    v_seller_body := NULL;
      ELSE RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  IF v_buyer_title IS NOT NULL THEN
    PERFORM public.enqueue_notification(
      p_user_id    => NEW.buyer_id,
      p_event_type => v_event,
      p_title      => v_buyer_title,
      p_body       => v_buyer_body,
      p_data       => jsonb_build_object('order_id', NEW.id, 'role', 'buyer', 'url', '/marketplace?order_id=' || NEW.id),
      p_channels   => ARRAY['inbox','push','email']::text[],
      p_idempotency_key => 'mp:b:' || NEW.id || ':' || v_event
    );
  END IF;

  IF v_seller_title IS NOT NULL THEN
    PERFORM public.enqueue_notification(
      p_user_id    => NEW.seller_id,
      p_event_type => v_event,
      p_title      => v_seller_title,
      p_body       => v_seller_body,
      p_data       => jsonb_build_object('order_id', NEW.id, 'role', 'seller', 'url', '/marketplace?order_id=' || NEW.id),
      p_channels   => ARRAY['inbox','push']::text[],
      p_idempotency_key => 'mp:s:' || NEW.id || ':' || v_event
    );
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_marketplace_order ON public.marketplace_orders;
CREATE TRIGGER trg_notify_marketplace_order
AFTER INSERT OR UPDATE OF status ON public.marketplace_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_marketplace_order();

-- ============================================================================
-- CREATOR ECONOMY — tips + subscriptions (OnlyFans-style)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_creator_tip()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tipper_name TEXT;
  v_amount      NUMERIC;
  v_label       TEXT;
BEGIN
  IF NEW.creator_id IS NULL THEN RETURN NEW; END IF;

  v_amount := COALESCE(NEW.amount_cents, 0) / 100.0;
  IF NEW.is_anonymous THEN
    v_label := 'Someone';
  ELSE
    SELECT COALESCE(display_name, username, 'Someone') INTO v_tipper_name
      FROM public.profiles WHERE id = NEW.tipper_id;
    v_label := COALESCE(v_tipper_name, 'Someone');
  END IF;

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.creator_id,
    p_event_type => 'creator_tip_received',
    p_title      => v_label || ' sent you a tip',
    p_body       => to_char(v_amount, 'FM999G990D00') || ' ' || COALESCE(NEW.currency, 'USD')
                    || CASE WHEN COALESCE(NEW.message,'') = '' THEN '' ELSE ' — ' || LEFT(NEW.message, 100) END,
    p_data       => jsonb_build_object('tip_id', NEW.id, 'tipper_id', NEW.tipper_id, 'amount_cents', NEW.amount_cents, 'url', '/wallet'),
    p_channels   => ARRAY['inbox','push']::text[],
    p_idempotency_key => 'tip:' || NEW.id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_creator_tip ON public.creator_tips;
CREATE TRIGGER trg_notify_creator_tip
AFTER INSERT ON public.creator_tips
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_creator_tip();

CREATE OR REPLACE FUNCTION public.tg_notify_creator_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sub_name TEXT;
BEGIN
  IF NEW.creator_id IS NULL OR NEW.subscriber_id IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Someone') INTO v_sub_name
    FROM public.profiles WHERE id = NEW.subscriber_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_notification(
      p_user_id    => NEW.creator_id,
      p_event_type => 'creator_new_subscriber',
      p_title      => 'New subscriber',
      p_body       => COALESCE(v_sub_name, 'Someone') || ' just subscribed to you.',
      p_data       => jsonb_build_object('subscription_id', NEW.id, 'subscriber_id', NEW.subscriber_id, 'url', '/creator/dashboard'),
      p_channels   => ARRAY['inbox','push','email']::text[],
      p_idempotency_key => 'sub:new:' || NEW.id
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'cancelled' THEN
    PERFORM public.enqueue_notification(
      p_user_id    => NEW.creator_id,
      p_event_type => 'creator_subscriber_cancelled',
      p_title      => 'Subscription cancelled',
      p_body       => COALESCE(v_sub_name, 'A subscriber') || ' cancelled their subscription.',
      p_data       => jsonb_build_object('subscription_id', NEW.id, 'subscriber_id', NEW.subscriber_id, 'url', '/creator/dashboard'),
      p_channels   => ARRAY['inbox','push']::text[],
      p_idempotency_key => 'sub:cancel:' || NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_creator_subscription ON public.creator_subscriptions;
CREATE TRIGGER trg_notify_creator_subscription
AFTER INSERT OR UPDATE OF status ON public.creator_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_creator_subscription();

-- ============================================================================
-- MENTIONS — post_mentions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.tg_notify_post_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_owner UUID;
  v_actor_id   UUID;
  v_actor_name TEXT;
BEGIN
  IF NEW.mentioned_user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.post_id IS NULL OR NEW.post_id !~ '^[0-9a-fA-F-]{36}$' THEN RETURN NEW; END IF;

  SELECT user_id INTO v_post_owner FROM public.user_posts WHERE id = NEW.post_id::uuid;
  v_actor_id := COALESCE(v_post_owner, auth.uid());
  IF v_actor_id IS NULL OR v_actor_id = NEW.mentioned_user_id THEN RETURN NEW; END IF;

  SELECT COALESCE(display_name, username, 'Someone') INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;

  PERFORM public.enqueue_notification(
    p_user_id    => NEW.mentioned_user_id,
    p_event_type => 'social_mention',
    p_title      => COALESCE(v_actor_name, 'Someone') || ' mentioned you',
    p_body       => NULL,
    p_data       => jsonb_build_object('post_id', NEW.post_id, 'actor_id', v_actor_id, 'url', '/reels?post=' || NEW.post_id),
    p_channels   => ARRAY['inbox','push']::text[],
    p_category   => 'social',
    p_idempotency_key => 'mention:' || NEW.post_id || ':' || NEW.mentioned_user_id
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_post_mention ON public.post_mentions;
CREATE TRIGGER trg_notify_post_mention
AFTER INSERT ON public.post_mentions
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_post_mention();

-- ============================================================================
-- DONE
-- ============================================================================
COMMENT ON FUNCTION public.enqueue_notification(UUID, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT, TEXT) IS
  'Fire-and-forget dispatch to notify-dispatch edge fn. Channels: inbox|push|email|sms.';

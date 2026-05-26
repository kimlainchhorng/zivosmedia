-- ============================================================================
-- Provider-side notifications
-- ----------------------------------------------------------------------------
-- The earlier migrations cover the *customer* side (rider, eater, guest,
-- buyer). This file adds the *provider* side:
--
--   • Restaurant owner gets pinged when a food order is placed and when its
--     status changes to a state that needs their action.
--   • Driver pool gets pinged when a new ride_request is created and when
--     a specific driver is assigned (assigned driver only).
--   • Marketplace seller already covered by trg_notify_marketplace_order in
--     the earlier migration — no change needed here.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Restaurant owner — new order, cancellation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_restaurant_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner_id   UUID;
  v_rest_name  TEXT;
  v_event      TEXT;
  v_title      TEXT;
  v_body       TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_rest_name
    FROM public.restaurants WHERE id = NEW.restaurant_id;
  IF v_owner_id IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    v_event := 'restaurant_new_order';
    v_title := 'New order';
    v_body  := 'A new order just came in — please confirm.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status::text
      WHEN 'cancelled' THEN
        v_event := 'restaurant_order_cancelled';
        v_title := 'Order cancelled';
        v_body  := 'A customer cancelled their order.';
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_notification(
    p_user_id    => v_owner_id,
    p_event_type => v_event,
    p_title      => v_title,
    p_body       => v_body,
    p_data       => jsonb_build_object('order_id', NEW.id, 'restaurant_id', NEW.restaurant_id, 'role', 'merchant', 'url', '/merchant/orders/' || NEW.id),
    p_channels   => ARRAY['inbox','push']::text[],
    p_idempotency_key => 'rest:' || NEW.id || ':' || v_event
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_restaurant_order ON public.food_orders;
CREATE TRIGGER trg_notify_restaurant_order
AFTER INSERT OR UPDATE OF status ON public.food_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_restaurant_order();

-- ---------------------------------------------------------------------------
-- 2. Driver pool — new ride_request goes out to all currently-online drivers
--                  (status='new' and no assigned_driver_id yet).
--                  Once a specific driver is assigned, only that driver
--                  is pinged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_notify_drivers_new_ride()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_url        TEXT;
  v_key        TEXT;
  v_driver_ids UUID[];
  v_assigned   UUID;
BEGIN
  -- Only fire on initial creation OR on a fresh assignment.
  IF TG_OP = 'UPDATE' AND NEW.assigned_driver_id IS NOT DISTINCT FROM OLD.assigned_driver_id THEN
    RETURN NEW;
  END IF;

  -- Case A: a specific driver just got assigned → ping that driver only.
  IF NEW.assigned_driver_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.assigned_driver_id IS DISTINCT FROM NEW.assigned_driver_id) THEN
    SELECT user_id INTO v_assigned FROM public.drivers WHERE id = NEW.assigned_driver_id;
    IF v_assigned IS NOT NULL THEN
      PERFORM public.enqueue_notification(
        p_user_id    => v_assigned,
        p_event_type => 'driver_ride_assigned',
        p_title      => 'You have a new trip',
        p_body       => COALESCE('Pickup: ' || NEW.pickup_address, 'New ride request assigned'),
        p_data       => jsonb_build_object('ride_id', NEW.id, 'role', 'driver', 'url', '/driver/trips/' || NEW.id),
        p_channels   => ARRAY['inbox','push','sms']::text[],
        p_idempotency_key => 'driver:assigned:' || NEW.id
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Case B: brand-new ride with no assignment yet → fan out to online drivers.
  IF TG_OP = 'INSERT' AND NEW.assigned_driver_id IS NULL THEN
    -- Online-driver definition: drivers table with `is_online = true`. If the
    -- column doesn't exist (different schema variant), fall back to "all
    -- drivers updated in the last 10 minutes".
    BEGIN
      SELECT array_agg(user_id) INTO v_driver_ids
        FROM public.drivers
        WHERE is_online = true;
    EXCEPTION WHEN undefined_column THEN
      SELECT array_agg(user_id) INTO v_driver_ids
        FROM public.drivers
        WHERE updated_at > now() - INTERVAL '10 minutes';
    END;

    IF v_driver_ids IS NULL OR cardinality(v_driver_ids) = 0 THEN RETURN NEW; END IF;

    v_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://slirphzzwcogdbkeicff.supabase.co');
    v_key := COALESCE(current_setting('app.settings.service_role_key', true), current_setting('app.service_role_key', true));

    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.proname='http_post' AND n.nspname='net') THEN
      RETURN NEW;
    END IF;

    -- Inbox rows (per driver)
    INSERT INTO public.notifications (user_id, channel, category, template, title, body, action_url, status)
    SELECT uid, 'in_app', 'transactional', 'driver_new_ride_available',
           'New ride available',
           COALESCE('Pickup: ' || NEW.pickup_address, 'New ride request'),
           '/driver/available?ride_id=' || NEW.id, 'sent'
    FROM unnest(v_driver_ids) AS uid;

    -- Single batch push to the whole pool
    PERFORM net.http_post(
      url     => v_url || '/functions/v1/send-push-notification',
      headers => jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || COALESCE(v_key,'')),
      body    => jsonb_build_object(
        'user_ids',          to_jsonb(v_driver_ids),
        'notification_type', 'driver_new_ride_available',
        'title',             'New ride available',
        'body',              COALESCE('Pickup: ' || NEW.pickup_address, 'New ride request'),
        'data',              jsonb_build_object('ride_id', NEW.id, 'url', '/driver/available?ride_id=' || NEW.id)
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tg_notify_drivers_new_ride: %', SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_drivers_new_ride ON public.ride_requests;
CREATE TRIGGER trg_notify_drivers_new_ride
AFTER INSERT OR UPDATE OF assigned_driver_id ON public.ride_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_drivers_new_ride();

-- ====================================
-- Notifications System Migration
-- ====================================

-- 1. Add tracking_code to food_orders
ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- Create unique index for tracking_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_food_orders_tracking_code
  ON public.food_orders (tracking_code)
  WHERE tracking_code IS NOT NULL;

-- Generate tracking codes for new orders
CREATE OR REPLACE FUNCTION generate_order_tracking_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := 'ZV' || UPPER(SUBSTRING(md5(NEW.id::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_tracking_code ON public.food_orders;
CREATE TRIGGER set_order_tracking_code
  BEFORE INSERT ON public.food_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_tracking_code();

-- 2. Add event_type and to_value columns to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS to_value TEXT;

-- Unique constraint to prevent duplicate notifications
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotent
  ON public.notifications (order_id, event_type, channel, COALESCE(user_id::text, ''), COALESCE(to_value, ''))
  WHERE order_id IS NOT NULL AND event_type IS NOT NULL;

-- 3. Create order status notification trigger
CREATE OR REPLACE FUNCTION notify_on_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_merchant_user_id UUID;
  v_driver_user_id UUID;
  v_customer_user_id UUID;
  v_customer_phone TEXT;
  v_customer_email TEXT;
  v_tracking_code TEXT;
  v_base_url TEXT := 'https://hizovo.com';
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Determine event type
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'order_created';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if driver assigned
    IF OLD.driver_id IS NULL AND NEW.driver_id IS NOT NULL THEN
      v_event_type := 'order_assigned';
    -- Check status changes
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      CASE NEW.status
        WHEN 'in_progress' THEN v_event_type := 'order_picked_up';
        WHEN 'completed' THEN v_event_type := 'order_delivered';
        WHEN 'cancelled' THEN v_event_type := 'order_cancelled';
        ELSE v_event_type := NULL;
      END CASE;
    END IF;
  END IF;

  -- Exit if no event
  IF v_event_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Gather recipient info
  SELECT owner_id INTO v_merchant_user_id FROM restaurants WHERE id = NEW.restaurant_id;
  SELECT user_id INTO v_driver_user_id FROM drivers WHERE id = NEW.driver_id;
  v_customer_user_id := NEW.customer_id;
  v_customer_phone := NEW.customer_phone;
  v_customer_email := NEW.customer_email;
  v_tracking_code := NEW.tracking_code;

  -- Set message content per event
  CASE v_event_type
    WHEN 'order_created' THEN
      v_title := 'New Order Received';
      v_body := 'A new order has been placed. Order #' || LEFT(NEW.id::text, 8);
    WHEN 'order_assigned' THEN
      v_title := 'Driver Assigned';
      v_body := 'A driver has been assigned to your order. Track: ' || v_base_url || '/track/' || v_tracking_code;
    WHEN 'order_picked_up' THEN
      v_title := 'Order Picked Up';
      v_body := 'Your order is on the way! Track: ' || v_base_url || '/track/' || v_tracking_code;
    WHEN 'order_delivered' THEN
      v_title := 'Order Delivered';
      v_body := 'Your order has been delivered. Thanks for using ZIVO!';
    WHEN 'order_cancelled' THEN
      v_title := 'Order Cancelled';
      v_body := 'Order #' || LEFT(NEW.id::text, 8) || ' has been cancelled.';
  END CASE;

  -- Insert merchant notification (in_app)
  IF v_merchant_user_id IS NOT NULL AND v_event_type IN ('order_created', 'order_cancelled') THEN
    INSERT INTO notifications (user_id, order_id, channel, category, template, title, body, action_url, event_type, status)
    VALUES (v_merchant_user_id, NEW.id, 'in_app', 'operational', 'order_status', v_title, v_body, 
            '/restaurant?tab=orders', v_event_type, 'sent')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert driver notification (in_app)
  IF v_driver_user_id IS NOT NULL AND v_event_type IN ('order_assigned', 'order_cancelled') THEN
    INSERT INTO notifications (user_id, order_id, channel, category, template, title, body, action_url, event_type, status)
    VALUES (v_driver_user_id, NEW.id, 'in_app', 'operational', 'order_status', v_title, v_body,
            '/driver/trips', v_event_type, 'sent')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert customer in_app notification
  IF v_customer_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, order_id, channel, category, template, title, body, action_url, event_type, status)
    VALUES (v_customer_user_id, NEW.id, 'in_app', 'transactional', 'order_status', v_title, v_body,
            '/track/' || v_tracking_code, v_event_type, 'sent')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert customer SMS (queued for edge function processing)
  IF v_customer_phone IS NOT NULL AND v_customer_phone != '' THEN
    INSERT INTO notifications (user_id, order_id, channel, category, template, title, body, to_value, event_type, status)
    VALUES (v_customer_user_id, NEW.id, 'sms', 'transactional', 'order_status', v_title, v_body,
            v_customer_phone, v_event_type, 'queued')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Insert customer email (queued for edge function processing)
  IF v_customer_email IS NOT NULL AND v_customer_email != '' THEN
    INSERT INTO notifications (user_id, order_id, channel, category, template, title, body, to_value, action_url, event_type, status)
    VALUES (v_customer_user_id, NEW.id, 'email', 'transactional', 'order_status', v_title, v_body,
            v_customer_email, '/track/' || v_tracking_code, v_event_type, 'queued')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_order_status ON public.food_orders;
CREATE TRIGGER trigger_notify_order_status
  AFTER INSERT OR UPDATE ON public.food_orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_order_status_change();

-- 4. Backfill tracking codes for existing orders
UPDATE public.food_orders
SET tracking_code = 'ZV' || UPPER(SUBSTRING(md5(id::text) FROM 1 FOR 8))
WHERE tracking_code IS NULL;
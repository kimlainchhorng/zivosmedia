-- 1. Extend push_subscriptions for all users
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE push_subscriptions 
ALTER COLUMN driver_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
ON push_subscriptions(user_id);

-- 2. Drop existing RLS policy if exists and create new one
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can manage own push subscriptions"
ON push_subscriptions FOR ALL
USING (
  user_id = auth.uid() 
  OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
)
WITH CHECK (
  user_id = auth.uid() 
  OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
);

-- 3. Trigger: Order status notifications
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO notifications (user_id, channel, title, body, data)
    VALUES (
      NEW.customer_id,
      'push',
      CASE NEW.status
        WHEN 'confirmed' THEN 'Order Confirmed! 🎉'
        WHEN 'preparing' THEN 'Your order is being prepared 👨‍🍳'
        WHEN 'ready_for_pickup' THEN 'Order ready for pickup! 📦'
        WHEN 'out_for_delivery' THEN 'Your order is on the way! 🚗'
        WHEN 'delivered' THEN 'Order delivered! ✅'
        ELSE 'Order Update'
      END,
      'Order #' || NEW.order_number,
      jsonb_build_object('type', 'order_status', 'order_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_order_status ON food_orders;
CREATE TRIGGER trg_notify_order_status
AFTER UPDATE ON food_orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_status_change();

-- 4. Trigger: Support reply notifications  
CREATE OR REPLACE FUNCTION notify_ticket_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO v_ticket FROM support_tickets WHERE id = NEW.ticket_id;
  
  IF NEW.is_admin AND v_ticket.user_id IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO notifications (user_id, channel, title, body, data)
    VALUES (
      v_ticket.user_id,
      'push',
      'Support Reply 💬',
      LEFT(NEW.message, 100),
      jsonb_build_object('type', 'chat_message', 'ticket_id', NEW.ticket_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_ticket_reply ON ticket_replies;
CREATE TRIGGER trg_notify_ticket_reply
AFTER INSERT ON ticket_replies
FOR EACH ROW
EXECUTE FUNCTION notify_ticket_reply();
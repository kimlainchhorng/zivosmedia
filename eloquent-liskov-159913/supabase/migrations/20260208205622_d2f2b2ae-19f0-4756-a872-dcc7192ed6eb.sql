-- Function to create notification on order status change
CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  action_link TEXT;
BEGIN
  -- Only notify on specific status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    action_link := '/eats/orders/' || NEW.id;
    
    CASE NEW.status
      WHEN 'confirmed' THEN
        notification_title := 'Order Confirmed';
        notification_body := 'Your order has been accepted and is being prepared';
      WHEN 'preparing' THEN
        notification_title := 'Preparing Your Order';
        notification_body := 'The restaurant is now preparing your food';
      WHEN 'ready_for_pickup' THEN
        notification_title := 'Order Ready';
        notification_body := 'Your order is ready and waiting for pickup';
      WHEN 'out_for_delivery' THEN
        notification_title := 'Driver On The Way';
        notification_body := 'Your order is on its way to you!';
      WHEN 'delivered' THEN
        notification_title := 'Order Delivered';
        notification_body := 'Enjoy your meal! Rate your experience';
        action_link := '/eats/orders/' || NEW.id || '?rate=true';
      ELSE
        RETURN NEW;
    END CASE;
    
    -- Insert in-app notification
    INSERT INTO notifications (
      user_id, order_id, channel, category, template,
      title, body, action_url, status, metadata
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      'in_app',
      'transactional',
      'order_status_update',
      notification_title,
      notification_body,
      action_link,
      'sent',
      jsonb_build_object('status', NEW.status, 'type', 'eats')
    );
  END IF;
  
  -- Notify when driver is assigned (separate from status change)
  IF OLD.driver_id IS NULL AND NEW.driver_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, order_id, channel, category, template,
      title, body, action_url, status, metadata
    ) VALUES (
      NEW.customer_id,
      NEW.id,
      'in_app',
      'transactional',
      'driver_assigned',
      'Driver Assigned',
      'A driver has been assigned to your order',
      '/eats/orders/' || NEW.id,
      'sent',
      jsonb_build_object('driver_id', NEW.driver_id, 'type', 'eats')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_food_order_status_change ON food_orders;
CREATE TRIGGER on_food_order_status_change
  AFTER UPDATE ON food_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_order_status();
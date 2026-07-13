-- Add missing enum values to booking_status
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'placed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'preparing';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'delivered';

-- Add actor_role column to order_events table
ALTER TABLE order_events 
ADD COLUMN IF NOT EXISTS actor_role TEXT DEFAULT 'system';

-- Create index for faster queries on order_events
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_actor_role ON order_events(actor_role);

-- Create function to automatically log order status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_events (order_id, type, actor_role, data)
    VALUES (
      NEW.id,
      'status_' || NEW.status,
      COALESCE(current_setting('app.actor_role', true), 'system'),
      jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', now()
      )
    );
  END IF;
  
  -- Log driver assignment
  IF OLD.driver_id IS NULL AND NEW.driver_id IS NOT NULL THEN
    INSERT INTO order_events (order_id, type, actor_role, data)
    VALUES (
      NEW.id,
      'driver_assigned',
      COALESCE(current_setting('app.actor_role', true), 'system'),
      jsonb_build_object(
        'driver_id', NEW.driver_id,
        'assigned_at', now()
      )
    );
  END IF;
  
  -- Log driver unassignment
  IF OLD.driver_id IS NOT NULL AND NEW.driver_id IS NULL THEN
    INSERT INTO order_events (order_id, type, actor_role, data)
    VALUES (
      NEW.id,
      'driver_unassigned',
      COALESCE(current_setting('app.actor_role', true), 'system'),
      jsonb_build_object(
        'previous_driver_id', OLD.driver_id,
        'unassigned_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_food_order_change ON food_orders;
CREATE TRIGGER on_food_order_change
  AFTER UPDATE ON food_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();
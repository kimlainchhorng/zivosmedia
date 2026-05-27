-- Function to generate 4-digit delivery PIN when order status changes to out_for_delivery
CREATE OR REPLACE FUNCTION generate_delivery_pin()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate PIN when status changes to out_for_delivery (or in_progress for delivery)
  IF NEW.status IN ('out_for_delivery', 'in_progress') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('out_for_delivery', 'in_progress'))
     AND NEW.delivery_pin IS NULL THEN
    -- Generate 4-digit random PIN (1000-9999)
    NEW.delivery_pin := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    NEW.delivery_pin_verified := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_generate_delivery_pin ON food_orders;

-- Create trigger for PIN generation
CREATE TRIGGER trg_generate_delivery_pin
BEFORE UPDATE ON food_orders
FOR EACH ROW
EXECUTE FUNCTION generate_delivery_pin();

-- Function to log wrong PIN attempts and create risk event on 3rd failure
CREATE OR REPLACE FUNCTION log_wrong_pin_attempt(p_order_id uuid, p_driver_id uuid)
RETURNS TABLE(attempts int, is_locked boolean) AS $$
DECLARE
  v_attempts int;
  v_customer_id uuid;
BEGIN
  -- Increment attempt counter
  UPDATE food_orders 
  SET pin_attempts = COALESCE(pin_attempts, 0) + 1,
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING pin_attempts, customer_id INTO v_attempts, v_customer_id;
  
  -- Log order event for wrong PIN
  INSERT INTO order_events (order_id, type, data)
  VALUES (p_order_id, 'wrong_pin_attempt', jsonb_build_object(
    'driver_id', p_driver_id,
    'attempt_number', v_attempts
  ));
  
  -- Log risk event on 3rd failure
  IF v_attempts >= 3 THEN
    INSERT INTO risk_events (event_type, severity, score, user_id, details)
    VALUES (
      'wrong_pin_limit', 
      4, 
      30, 
      p_driver_id, 
      jsonb_build_object(
        'order_id', p_order_id,
        'attempts', v_attempts,
        'customer_id', v_customer_id
      )
    );
  END IF;
  
  RETURN QUERY SELECT v_attempts, (v_attempts >= 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify delivery PIN
CREATE OR REPLACE FUNCTION verify_delivery_pin(p_order_id uuid, p_driver_id uuid, p_pin text)
RETURNS TABLE(success boolean, error_message text, attempts_remaining int) AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Get order details
  SELECT delivery_pin, pin_attempts, status, driver_id 
  INTO v_order
  FROM food_orders 
  WHERE id = p_order_id;
  
  -- Check if order exists
  IF v_order IS NULL THEN
    RETURN QUERY SELECT false, 'Order not found'::text, 0;
    RETURN;
  END IF;
  
  -- Check if driver is assigned to this order
  IF v_order.driver_id != p_driver_id THEN
    RETURN QUERY SELECT false, 'Not authorized for this order'::text, 0;
    RETURN;
  END IF;
  
  -- Check if already locked out
  IF COALESCE(v_order.pin_attempts, 0) >= 3 THEN
    RETURN QUERY SELECT false, 'Too many attempts. Contact support.'::text, 0;
    RETURN;
  END IF;
  
  -- Check if PIN matches
  IF v_order.delivery_pin = p_pin THEN
    -- Success: Update order as delivered
    UPDATE food_orders 
    SET status = 'delivered',
        delivery_pin_verified = TRUE,
        delivered_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Log success event
    INSERT INTO order_events (order_id, type, data)
    VALUES (p_order_id, 'delivered', jsonb_build_object(
      'driver_id', p_driver_id,
      'pin_verified', true
    ));
    
    RETURN QUERY SELECT true, NULL::text, 3;
  ELSE
    -- Wrong PIN: Log attempt
    PERFORM log_wrong_pin_attempt(p_order_id, p_driver_id);
    
    RETURN QUERY SELECT 
      false, 
      'Incorrect PIN. Please try again.'::text, 
      GREATEST(0, 3 - COALESCE(v_order.pin_attempts, 0) - 1);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add pin_attempts column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'food_orders' 
    AND column_name = 'pin_attempts'
  ) THEN
    ALTER TABLE food_orders ADD COLUMN pin_attempts integer DEFAULT 0;
  END IF;
END $$;

-- RLS policies for incident_reports
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reports" ON incident_reports;
DROP POLICY IF EXISTS "Users can create reports" ON incident_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON incident_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON incident_reports;

-- Users can view their own reports
CREATE POLICY "Users can view their own reports" ON incident_reports
  FOR SELECT USING (reporter_user_id = auth.uid());

-- Users can create reports
CREATE POLICY "Users can create reports" ON incident_reports
  FOR INSERT WITH CHECK (reporter_user_id = auth.uid());

-- Admins can view all reports
CREATE POLICY "Admins can view all reports" ON incident_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'support', 'operations')
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports" ON incident_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'support')
    )
  );

-- RLS policies for user_blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can create blocks" ON user_blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON user_blocks;
DROP POLICY IF EXISTS "Admins can view all blocks" ON user_blocks;

-- Users can view their own blocks
CREATE POLICY "Users can view their own blocks" ON user_blocks
  FOR SELECT USING (blocker_user_id = auth.uid());

-- Users can create blocks
CREATE POLICY "Users can create blocks" ON user_blocks
  FOR INSERT WITH CHECK (blocker_user_id = auth.uid());

-- Users can delete their own blocks
CREATE POLICY "Users can delete their own blocks" ON user_blocks
  FOR DELETE USING (blocker_user_id = auth.uid());

-- Admins can view all blocks
CREATE POLICY "Admins can view all blocks" ON user_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'support')
    )
  );
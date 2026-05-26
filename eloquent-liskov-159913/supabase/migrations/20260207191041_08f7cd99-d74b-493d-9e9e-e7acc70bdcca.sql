-- =============================================
-- Order Ratings & Feedback System
-- =============================================

-- 1) Create order_ratings table
CREATE TABLE public.order_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id UUID UNIQUE NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id),
  driver_id UUID REFERENCES drivers(id),
  restaurant_id UUID REFERENCES restaurants(id),
  driver_rating INT CHECK (driver_rating BETWEEN 1 AND 5),
  merchant_rating INT CHECK (merchant_rating BETWEEN 1 AND 5),
  comment TEXT,
  tags TEXT[],
  contact_back BOOLEAN DEFAULT false
);

-- 2) Indexes for performance
CREATE INDEX idx_order_ratings_driver ON order_ratings(driver_id);
CREATE INDEX idx_order_ratings_restaurant ON order_ratings(restaurant_id);
CREATE INDEX idx_order_ratings_created ON order_ratings(created_at DESC);
CREATE INDEX idx_order_ratings_driver_rating ON order_ratings(driver_rating) WHERE driver_rating IS NOT NULL;
CREATE INDEX idx_order_ratings_merchant_rating ON order_ratings(merchant_rating) WHERE merchant_rating IS NOT NULL;

-- 3) Add rating_count to drivers table if not exists
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0;

-- 4) Enable RLS
ALTER TABLE order_ratings ENABLE ROW LEVEL SECURITY;

-- 5) RLS Policies
-- Admin can read all ratings
CREATE POLICY "Admin can read all ratings"
  ON order_ratings FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Drivers can read their own ratings
CREATE POLICY "Drivers can read own ratings"
  ON order_ratings FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Restaurant owners can read their ratings
CREATE POLICY "Restaurant owners can read own ratings"
  ON order_ratings FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
  );

-- 6) Trigger to update driver and restaurant ratings
CREATE OR REPLACE FUNCTION update_ratings_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Update driver rating
  IF NEW.driver_id IS NOT NULL AND NEW.driver_rating IS NOT NULL THEN
    UPDATE drivers
    SET 
      rating = (
        SELECT ROUND(AVG(driver_rating)::numeric, 2)
        FROM order_ratings
        WHERE driver_id = NEW.driver_id AND driver_rating IS NOT NULL
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM order_ratings
        WHERE driver_id = NEW.driver_id AND driver_rating IS NOT NULL
      )
    WHERE id = NEW.driver_id;
  END IF;
  
  -- Update restaurant rating
  IF NEW.restaurant_id IS NOT NULL AND NEW.merchant_rating IS NOT NULL THEN
    UPDATE restaurants
    SET 
      rating = (
        SELECT ROUND(AVG(merchant_rating)::numeric, 2)
        FROM order_ratings
        WHERE restaurant_id = NEW.restaurant_id AND merchant_rating IS NOT NULL
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM order_ratings
        WHERE restaurant_id = NEW.restaurant_id AND merchant_rating IS NOT NULL
      )
    WHERE id = NEW.restaurant_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER trigger_update_ratings
  AFTER INSERT ON order_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_ratings_on_insert();

-- 7) RPC: Get delivered order for rating (public, no auth required)
CREATE OR REPLACE FUNCTION get_delivered_order_for_rating(p_tracking_code TEXT)
RETURNS TABLE(
  order_id UUID,
  restaurant_name TEXT,
  driver_name TEXT,
  driver_id UUID,
  restaurant_id UUID,
  delivered_at TIMESTAMPTZ,
  already_rated BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fo.id,
    r.name,
    d.full_name,
    fo.driver_id,
    fo.restaurant_id,
    fo.delivered_at,
    EXISTS(SELECT 1 FROM order_ratings WHERE order_ratings.order_id = fo.id) as already_rated
  FROM food_orders fo
  LEFT JOIN restaurants r ON r.id = fo.restaurant_id
  LEFT JOIN drivers d ON d.id = fo.driver_id
  WHERE fo.tracking_code = p_tracking_code
    AND fo.status = 'completed'
    AND fo.delivered_at IS NOT NULL;
END;
$$;

-- 8) RPC: Submit rating (public, no auth required)
CREATE OR REPLACE FUNCTION submit_order_rating(
  p_tracking_code TEXT,
  p_driver_rating INT,
  p_merchant_rating INT,
  p_comment TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_contact_back BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Validate order
  SELECT id, customer_id, driver_id, restaurant_id, delivered_at
  INTO v_order
  FROM food_orders
  WHERE tracking_code = p_tracking_code
    AND status = 'completed'
    AND delivered_at IS NOT NULL;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found or not delivered');
  END IF;
  
  -- Check if already rated
  IF EXISTS(SELECT 1 FROM order_ratings WHERE order_id = v_order.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already rated');
  END IF;
  
  -- Insert rating
  INSERT INTO order_ratings (
    order_id, customer_id, driver_id, restaurant_id,
    driver_rating, merchant_rating, comment, tags, contact_back
  ) VALUES (
    v_order.id, v_order.customer_id, v_order.driver_id, v_order.restaurant_id,
    p_driver_rating, p_merchant_rating, p_comment, p_tags, p_contact_back
  );
  
  -- Create support ticket if contact_back requested
  IF p_contact_back = true THEN
    INSERT INTO support_tickets (
      user_id, order_id, driver_id, restaurant_id,
      subject, description, priority, status, category
    ) VALUES (
      v_order.customer_id, v_order.id, v_order.driver_id, v_order.restaurant_id,
      'Customer requested callback after rating',
      COALESCE(p_comment, 'Customer requested to be contacted after delivery'),
      'medium', 'open', 'feedback'
    );
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;
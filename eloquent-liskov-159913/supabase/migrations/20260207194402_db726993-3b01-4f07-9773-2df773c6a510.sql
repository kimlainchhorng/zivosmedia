-- ============================================
-- Multi-Zone Dispatch + Surge + Driver Priority Queue (Complete)
-- ============================================

-- 1. Add geographic coordinates to regions table
ALTER TABLE regions
  ADD COLUMN IF NOT EXISTS center_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS center_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS polygon JSONB,
  ADD COLUMN IF NOT EXISTS bbox JSONB;

-- 2. Add region_id to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id);

CREATE INDEX IF NOT EXISTS idx_restaurants_region ON restaurants(region_id);

-- 3. Add surge columns to food_orders
ALTER TABLE food_orders
  ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS surged_subtotal NUMERIC DEFAULT 0;

-- 4. Add surge columns to trips
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS surged_fare NUMERIC DEFAULT 0;

-- 5. Create surge_rules table
CREATE TABLE IF NOT EXISTS public.surge_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Surge Rule',
  is_active BOOLEAN DEFAULT true,
  min_pending_orders INT DEFAULT 5,
  max_online_drivers INT DEFAULT 3,
  surge_multiplier NUMERIC DEFAULT 1.25,
  max_multiplier NUMERIC DEFAULT 2.0,
  starts_at TIME,
  ends_at TIME,
  day_of_week INT[],
  priority INT DEFAULT 0,
  CONSTRAINT valid_surge_multiplier CHECK (surge_multiplier >= 1.0 AND surge_multiplier <= 5.0)
);

CREATE INDEX IF NOT EXISTS idx_surge_rules_region ON surge_rules(region_id, is_active);

-- 6. Create surge_overrides table
CREATE TABLE IF NOT EXISTS public.surge_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  forced_multiplier NUMERIC NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_surge_overrides_region ON surge_overrides(region_id, is_active);

-- 7. Create driver_queue table
CREATE TABLE IF NOT EXISTS public.driver_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  score NUMERIC DEFAULT 0,
  last_assigned_at TIMESTAMPTZ,
  total_assigned_today INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT unique_driver_queue_entry UNIQUE (region_id, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_queue_region ON driver_queue(region_id, is_active, score DESC);
CREATE INDEX IF NOT EXISTS idx_driver_queue_driver ON driver_queue(driver_id);

-- 8. RLS Policies
ALTER TABLE surge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE surge_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read surge rules" ON surge_rules;
DROP POLICY IF EXISTS "Admin can insert surge rules" ON surge_rules;
DROP POLICY IF EXISTS "Admin can update surge rules" ON surge_rules;
DROP POLICY IF EXISTS "Admin can delete surge rules" ON surge_rules;

CREATE POLICY "Anyone can read surge rules" ON surge_rules FOR SELECT USING (true);
CREATE POLICY "Admin can insert surge rules" ON surge_rules FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin can update surge rules" ON surge_rules FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin can delete surge rules" ON surge_rules FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can read surge overrides" ON surge_overrides;
DROP POLICY IF EXISTS "Admin can insert surge overrides" ON surge_overrides;
DROP POLICY IF EXISTS "Admin can update surge overrides" ON surge_overrides;
DROP POLICY IF EXISTS "Admin can delete surge overrides" ON surge_overrides;

CREATE POLICY "Anyone can read surge overrides" ON surge_overrides FOR SELECT USING (true);
CREATE POLICY "Admin can insert surge overrides" ON surge_overrides FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admin can update surge overrides" ON surge_overrides FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admin can delete surge overrides" ON surge_overrides FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can manage driver queue" ON driver_queue;
DROP POLICY IF EXISTS "Drivers can read own queue entry" ON driver_queue;

CREATE POLICY "Admin can manage driver queue" ON driver_queue FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Drivers can read own queue entry" ON driver_queue FOR SELECT TO authenticated USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- 9. RPC Functions

-- get_zone_surge_multiplier
CREATE OR REPLACE FUNCTION get_zone_surge_multiplier(p_region_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_override NUMERIC;
  v_pending_orders INT;
  v_online_drivers INT;
  v_rule RECORD;
  v_multiplier NUMERIC := 1.0;
  v_current_time TIME := CURRENT_TIME;
  v_current_dow INT := EXTRACT(DOW FROM CURRENT_DATE)::INT;
BEGIN
  SELECT forced_multiplier INTO v_override
  FROM surge_overrides
  WHERE region_id = p_region_id AND is_active = true AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
    
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;
  
  SELECT COUNT(*) INTO v_pending_orders
  FROM food_orders
  WHERE region_id = p_region_id AND status IN ('pending', 'confirmed', 'ready_for_pickup') AND created_at > now() - INTERVAL '30 minutes';
  
  SELECT COUNT(*) INTO v_online_drivers
  FROM drivers
  WHERE region_id = p_region_id AND is_online = true AND last_active_at > now() - INTERVAL '2 minutes';
  
  FOR v_rule IN
    SELECT * FROM surge_rules
    WHERE region_id = p_region_id AND is_active = true
      AND (starts_at IS NULL OR v_current_time >= starts_at)
      AND (ends_at IS NULL OR v_current_time <= ends_at)
      AND (day_of_week IS NULL OR v_current_dow = ANY(day_of_week))
    ORDER BY priority DESC
  LOOP
    IF v_pending_orders >= v_rule.min_pending_orders AND v_online_drivers <= v_rule.max_online_drivers THEN
      v_multiplier := GREATEST(v_multiplier, v_rule.surge_multiplier);
    END IF;
  END LOOP;
  
  RETURN v_multiplier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- score_driver_for_assignment
CREATE OR REPLACE FUNCTION score_driver_for_assignment(p_driver_id UUID, p_pickup_lat NUMERIC, p_pickup_lng NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_driver RECORD;
  v_queue RECORD;
  v_distance_km NUMERIC;
  v_distance_score NUMERIC;
  v_rating_score NUMERIC;
  v_fairness_score NUMERIC;
  v_freshness_score NUMERIC;
BEGIN
  SELECT * INTO v_driver FROM drivers WHERE id = p_driver_id;
  SELECT * INTO v_queue FROM driver_queue WHERE driver_id = p_driver_id;
  
  IF v_driver.current_lat IS NULL OR p_pickup_lat IS NULL THEN
    v_distance_score := 20;
  ELSE
    v_distance_km := haversine_miles(p_pickup_lat, p_pickup_lng, v_driver.current_lat, v_driver.current_lng) * 1.60934;
    v_distance_score := GREATEST(0, 40 - (v_distance_km * 4));
  END IF;
  
  v_rating_score := COALESCE(v_driver.rating, 4.0) * 5;
  
  IF v_queue IS NULL OR v_queue.last_assigned_at IS NULL THEN
    v_fairness_score := 25;
  ELSE
    v_fairness_score := LEAST(25, EXTRACT(EPOCH FROM (now() - v_queue.last_assigned_at)) / 144);
  END IF;
  
  v_freshness_score := CASE
    WHEN v_driver.last_active_at > now() - INTERVAL '30 seconds' THEN 10
    WHEN v_driver.last_active_at > now() - INTERVAL '1 minute' THEN 7
    WHEN v_driver.last_active_at > now() - INTERVAL '2 minutes' THEN 4
    ELSE 0
  END;
  
  RETURN ROUND(v_distance_score + v_rating_score + v_fairness_score + v_freshness_score, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- auto_assign_order_v2
CREATE OR REPLACE FUNCTION auto_assign_order_v2(p_order_id UUID, p_service_type TEXT DEFAULT 'eats')
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_driver RECORD;
  v_best_driver_id UUID;
  v_best_score NUMERIC := -1;
  v_pickup_lat NUMERIC;
  v_pickup_lng NUMERIC;
  v_region_id UUID;
  v_score NUMERIC;
BEGIN
  IF p_service_type = 'eats' THEN
    SELECT fo.*, r.lat AS restaurant_lat, r.lng AS restaurant_lng INTO v_order
    FROM food_orders fo LEFT JOIN restaurants r ON r.id = fo.restaurant_id WHERE fo.id = p_order_id;
    v_pickup_lat := v_order.restaurant_lat;
    v_pickup_lng := v_order.restaurant_lng;
    v_region_id := v_order.region_id;
  ELSE
    SELECT * INTO v_order FROM trips WHERE id = p_order_id;
    v_pickup_lat := v_order.pickup_lat;
    v_pickup_lng := v_order.pickup_lng;
    v_region_id := v_order.region_id;
  END IF;
  
  IF v_order IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF p_service_type = 'eats' AND v_order.driver_id IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Order already assigned'); END IF;
  IF p_service_type = 'rides' AND v_order.driver_id IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Trip already assigned'); END IF;
  
  FOR v_driver IN
    SELECT d.* FROM drivers d
    WHERE d.is_online = true AND d.status = 'verified' AND d.last_active_at > now() - INTERVAL '2 minutes'
      AND (v_region_id IS NULL OR d.region_id = v_region_id)
      AND CASE WHEN p_service_type = 'eats' THEN d.eats_enabled = true ELSE d.rides_enabled = true END
  LOOP
    v_score := score_driver_for_assignment(v_driver.id, v_pickup_lat, v_pickup_lng);
    IF v_score > v_best_score THEN v_best_score := v_score; v_best_driver_id := v_driver.id; END IF;
  END LOOP;
  
  IF v_best_driver_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No eligible drivers available'); END IF;
  
  IF p_service_type = 'eats' THEN
    UPDATE food_orders SET driver_id = v_best_driver_id, assigned_at = now(), status = 'confirmed', updated_at = now() WHERE id = p_order_id AND driver_id IS NULL;
  ELSE
    UPDATE trips SET driver_id = v_best_driver_id, status = 'accepted', updated_at = now() WHERE id = p_order_id AND driver_id IS NULL;
  END IF;
  
  INSERT INTO driver_queue (region_id, driver_id, last_assigned_at, total_assigned_today, is_active)
  VALUES (v_region_id, v_best_driver_id, now(), 1, true)
  ON CONFLICT (region_id, driver_id) DO UPDATE SET last_assigned_at = now(), total_assigned_today = driver_queue.total_assigned_today + 1, updated_at = now();
  
  SELECT full_name INTO v_driver FROM drivers WHERE id = v_best_driver_id;
  
  RETURN jsonb_build_object('success', true, 'driver_id', v_best_driver_id, 'driver_name', v_driver.full_name, 'score', v_best_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- get_zone_stats
CREATE OR REPLACE FUNCTION get_zone_stats(p_region_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_online_drivers INT;
  v_pending_orders INT;
  v_surge_multiplier NUMERIC;
  v_avg_wait_minutes INT;
BEGIN
  SELECT COUNT(*) INTO v_online_drivers FROM drivers WHERE region_id = p_region_id AND is_online = true AND last_active_at > now() - INTERVAL '2 minutes';
  SELECT COUNT(*) INTO v_pending_orders FROM food_orders WHERE region_id = p_region_id AND status IN ('pending', 'confirmed', 'ready_for_pickup');
  v_surge_multiplier := get_zone_surge_multiplier(p_region_id);
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (assigned_at - created_at)) / 60), 0)::INT INTO v_avg_wait_minutes
  FROM food_orders WHERE region_id = p_region_id AND assigned_at IS NOT NULL AND created_at > now() - INTERVAL '1 hour';
  
  RETURN jsonb_build_object('online_drivers', v_online_drivers, 'pending_orders', v_pending_orders, 'surge_multiplier', v_surge_multiplier, 'avg_wait_minutes', v_avg_wait_minutes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Trigger for daily reset
CREATE OR REPLACE FUNCTION reset_daily_queue_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at::DATE > OLD.updated_at::DATE THEN NEW.total_assigned_today := 0; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_daily_queue ON driver_queue;
CREATE TRIGGER trigger_reset_daily_queue BEFORE UPDATE ON driver_queue FOR EACH ROW EXECUTE FUNCTION reset_daily_queue_counts();
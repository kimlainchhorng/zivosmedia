-- ============================================
-- Scheduled Orders + Batching + Route Optimization
-- ============================================

-- 1. Add scheduling fields to food_orders
ALTER TABLE food_orders
  ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_window_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deliver_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES delivery_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stop_sequence INT,
  ADD COLUMN IF NOT EXISTS eta_pickup TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS eta_dropoff TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_food_orders_batch ON food_orders(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_food_orders_scheduled ON food_orders(is_scheduled, deliver_by) WHERE is_scheduled = true;

-- 2. Enhance delivery_batches table
ALTER TABLE delivery_batches
  ADD COLUMN IF NOT EXISTS planned_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS planned_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_duration_minutes NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS total_stops INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS optimization_source TEXT DEFAULT 'manual';

-- 3. Enhance batch_stops table
ALTER TABLE batch_stops
  ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'dropoff',
  ADD COLUMN IF NOT EXISTS eta TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Add constraint for kind (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_stop_kind'
  ) THEN
    ALTER TABLE batch_stops ADD CONSTRAINT valid_stop_kind 
      CHECK (kind IN ('pickup', 'dropoff'));
  END IF;
END $$;

-- Unique constraint per order and kind in a batch
CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_stops_unique 
  ON batch_stops(batch_id, food_order_id, kind) 
  WHERE food_order_id IS NOT NULL;

-- 4. RLS Policies for delivery_batches
ALTER TABLE delivery_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage batches" ON delivery_batches;
CREATE POLICY "Admin can manage batches" ON delivery_batches
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Drivers can read assigned batches" ON delivery_batches;
CREATE POLICY "Drivers can read assigned batches" ON delivery_batches
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers can update assigned batches" ON delivery_batches;
CREATE POLICY "Drivers can update assigned batches" ON delivery_batches
  FOR UPDATE TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- 5. RLS Policies for batch_stops
ALTER TABLE batch_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage batch stops" ON batch_stops;
CREATE POLICY "Admin can manage batch stops" ON batch_stops
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Drivers can read assigned batch stops" ON batch_stops;
CREATE POLICY "Drivers can read assigned batch stops" ON batch_stops
  FOR SELECT TO authenticated
  USING (batch_id IN (
    SELECT id FROM delivery_batches 
    WHERE driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Drivers can update assigned batch stops" ON batch_stops;
CREATE POLICY "Drivers can update assigned batch stops" ON batch_stops
  FOR UPDATE TO authenticated
  USING (batch_id IN (
    SELECT id FROM delivery_batches 
    WHERE driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  ));

-- 6. Create batch from orders RPC
CREATE OR REPLACE FUNCTION create_batch_from_orders(
  p_order_ids UUID[],
  p_region_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_order RECORD;
  v_sequence INT := 1;
BEGIN
  -- Create the batch
  INSERT INTO delivery_batches (region_id, status, notes)
  VALUES (p_region_id, 'draft', p_notes)
  RETURNING id INTO v_batch_id;

  -- Add stops for each order
  FOR v_order IN
    SELECT fo.*, r.name as restaurant_name, r.address as restaurant_address, 
           r.lat as restaurant_lat, r.lng as restaurant_lng
    FROM food_orders fo
    LEFT JOIN restaurants r ON r.id = fo.restaurant_id
    WHERE fo.id = ANY(p_order_ids)
    ORDER BY fo.deliver_by NULLS LAST, fo.created_at
  LOOP
    -- Pickup stop
    INSERT INTO batch_stops (batch_id, food_order_id, stop_order, stop_type, kind, 
                             address, lat, lng, status)
    VALUES (v_batch_id, v_order.id, v_sequence, 'pickup', 'pickup',
            COALESCE(v_order.restaurant_address, 'Restaurant'), 
            v_order.pickup_lat, v_order.pickup_lng, 'pending');
    v_sequence := v_sequence + 1;

    -- Dropoff stop
    INSERT INTO batch_stops (batch_id, food_order_id, stop_order, stop_type, kind,
                             address, lat, lng, status, customer_name, customer_phone)
    VALUES (v_batch_id, v_order.id, v_sequence, 'dropoff', 'dropoff',
            v_order.delivery_address, v_order.delivery_lat, v_order.delivery_lng, 'pending',
            v_order.customer_name, v_order.customer_phone);
    v_sequence := v_sequence + 1;

    -- Update order with batch reference
    UPDATE food_orders SET batch_id = v_batch_id, updated_at = now() WHERE id = v_order.id;
  END LOOP;

  -- Update batch stop count
  UPDATE delivery_batches SET total_stops = v_sequence - 1 WHERE id = v_batch_id;

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 7. Optimize batch route RPC (nearest-neighbor heuristic)
CREATE OR REPLACE FUNCTION optimize_batch_route(
  p_batch_id UUID,
  p_start_lat NUMERIC DEFAULT NULL,
  p_start_lng NUMERIC DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_lat NUMERIC;
  v_current_lng NUMERIC;
  v_optimized_sequence INT := 1;
  v_total_distance NUMERIC := 0;
  v_closest_id UUID;
  v_closest_dist NUMERIC;
  v_dist NUMERIC;
  v_stop RECORD;
  v_processed UUID[] := ARRAY[]::UUID[];
  v_stop_count INT;
BEGIN
  -- Get driver location if not provided
  IF p_start_lat IS NULL THEN
    SELECT d.current_lat, d.current_lng INTO p_start_lat, p_start_lng
    FROM delivery_batches b
    LEFT JOIN drivers d ON d.id = b.driver_id
    WHERE b.id = p_batch_id;
  END IF;

  v_current_lat := COALESCE(p_start_lat, 29.7604); -- Default Houston
  v_current_lng := COALESCE(p_start_lng, -95.3698);

  -- Get stop count
  SELECT COUNT(*) INTO v_stop_count FROM batch_stops WHERE batch_id = p_batch_id AND status = 'pending';

  -- Nearest neighbor algorithm
  WHILE v_optimized_sequence <= v_stop_count LOOP
    v_closest_id := NULL;
    v_closest_dist := 99999;

    -- Find closest unprocessed stop
    FOR v_stop IN
      SELECT id, lat, lng FROM batch_stops 
      WHERE batch_id = p_batch_id 
        AND status = 'pending'
        AND NOT (id = ANY(v_processed))
        AND lat IS NOT NULL AND lng IS NOT NULL
    LOOP
      v_dist := haversine_miles(v_current_lat, v_current_lng, v_stop.lat, v_stop.lng);
      IF v_dist < v_closest_dist THEN
        v_closest_dist := v_dist;
        v_closest_id := v_stop.id;
      END IF;
    END LOOP;

    IF v_closest_id IS NULL THEN
      EXIT;
    END IF;

    v_total_distance := v_total_distance + v_closest_dist;

    -- Update stop sequence
    UPDATE batch_stops SET stop_order = v_optimized_sequence WHERE id = v_closest_id;

    -- Get new location
    SELECT lat, lng INTO v_current_lat, v_current_lng FROM batch_stops WHERE id = v_closest_id;

    v_processed := array_append(v_processed, v_closest_id);
    v_optimized_sequence := v_optimized_sequence + 1;
  END LOOP;

  -- Update batch totals (estimate 2 min per mile + 5 min per stop)
  UPDATE delivery_batches SET
    total_distance_km = v_total_distance * 1.60934,
    total_duration_minutes = (v_total_distance * 2) + (v_stop_count * 5),
    optimization_source = 'haversine'
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'total_distance_miles', ROUND(v_total_distance::numeric, 2),
    'estimated_duration_minutes', ROUND(((v_total_distance * 2) + (v_stop_count * 5))::numeric, 0),
    'stops_optimized', v_stop_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 8. Assign batch to driver RPC
CREATE OR REPLACE FUNCTION assign_batch_to_driver(
  p_batch_id UUID,
  p_driver_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_batch RECORD;
  v_order_count INT;
BEGIN
  -- Validate batch is in draft status
  SELECT * INTO v_batch FROM delivery_batches WHERE id = p_batch_id;
  IF v_batch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;
  IF v_batch.status NOT IN ('draft', 'assigned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch cannot be assigned in current status');
  END IF;

  -- Assign driver to batch
  UPDATE delivery_batches SET
    driver_id = p_driver_id,
    status = 'assigned',
    started_at = COALESCE(started_at, now())
  WHERE id = p_batch_id;

  -- Update all orders in batch
  UPDATE food_orders SET
    driver_id = p_driver_id,
    status = 'confirmed',
    assigned_at = COALESCE(assigned_at, now()),
    updated_at = now()
  WHERE batch_id = p_batch_id;

  -- Get order count
  SELECT COUNT(DISTINCT food_order_id) INTO v_order_count
  FROM batch_stops WHERE batch_id = p_batch_id AND food_order_id IS NOT NULL;

  -- Log events
  INSERT INTO order_events (order_id, type, data)
  SELECT id, 'status_change', jsonb_build_object('status', 'confirmed', 'reason', 'batch_assigned', 'batch_id', p_batch_id)
  FROM food_orders WHERE batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'driver_id', p_driver_id,
    'order_count', v_order_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 9. Update batch stop status RPC (for drivers)
CREATE OR REPLACE FUNCTION update_batch_stop_status(
  p_stop_id UUID,
  p_status TEXT,
  p_driver_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_stop RECORD;
  v_order_status TEXT;
  v_all_complete BOOLEAN;
BEGIN
  -- Validate stop and driver assignment
  SELECT bs.*, db.driver_id as batch_driver_id
  INTO v_stop
  FROM batch_stops bs
  JOIN delivery_batches db ON db.id = bs.batch_id
  WHERE bs.id = p_stop_id;

  IF v_stop IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Stop not found');
  END IF;
  IF v_stop.batch_driver_id != p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Update stop
  UPDATE batch_stops SET
    status = p_status,
    arrived_at = CASE WHEN p_status = 'arrived' THEN now() ELSE arrived_at END,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END,
    actual_time = CASE WHEN p_status = 'completed' THEN now() ELSE actual_time END
  WHERE id = p_stop_id;

  -- Update order status based on stop type
  IF v_stop.food_order_id IS NOT NULL THEN
    IF v_stop.kind = 'pickup' AND p_status = 'completed' THEN
      v_order_status := 'in_progress';
      UPDATE food_orders SET
        status = v_order_status,
        picked_up_at = now(),
        updated_at = now()
      WHERE id = v_stop.food_order_id;
    ELSIF v_stop.kind = 'dropoff' AND p_status = 'completed' THEN
      v_order_status := 'completed';
      UPDATE food_orders SET
        status = v_order_status,
        delivered_at = now(),
        updated_at = now()
      WHERE id = v_stop.food_order_id;
    END IF;

    IF v_order_status IS NOT NULL THEN
      INSERT INTO order_events (order_id, type, data)
      VALUES (v_stop.food_order_id, 'status_change', 
              jsonb_build_object('status', v_order_status, 'reason', 'batch_stop_' || p_status));
    END IF;
  END IF;

  -- Check if all stops complete -> complete batch
  SELECT NOT EXISTS (
    SELECT 1 FROM batch_stops WHERE batch_id = v_stop.batch_id AND status != 'completed'
  ) INTO v_all_complete;

  IF v_all_complete THEN
    UPDATE delivery_batches SET status = 'completed', completed_at = now()
    WHERE id = v_stop.batch_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'stop_id', p_stop_id,
    'status', p_status,
    'batch_completed', v_all_complete
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 10. Start batch RPC (driver starts working on batch)
CREATE OR REPLACE FUNCTION start_batch(p_batch_id UUID, p_driver_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_batch RECORD;
BEGIN
  SELECT * INTO v_batch FROM delivery_batches WHERE id = p_batch_id;
  
  IF v_batch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;
  IF v_batch.driver_id != p_driver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF v_batch.status NOT IN ('assigned', 'draft') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch cannot be started');
  END IF;

  UPDATE delivery_batches SET
    status = 'in_progress',
    started_at = COALESCE(started_at, now())
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 11. Cancel batch RPC
CREATE OR REPLACE FUNCTION cancel_batch(p_batch_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Remove batch reference from orders
  UPDATE food_orders SET 
    batch_id = NULL, 
    stop_sequence = NULL,
    updated_at = now()
  WHERE batch_id = p_batch_id;

  -- Delete stops
  DELETE FROM batch_stops WHERE batch_id = p_batch_id;

  -- Update batch status
  UPDATE delivery_batches SET status = 'cancelled' WHERE id = p_batch_id;

  RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 12. Get batch with stops RPC
CREATE OR REPLACE FUNCTION get_batch_details(p_batch_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_batch RECORD;
  v_stops JSONB;
  v_orders JSONB;
BEGIN
  SELECT b.*, d.full_name as driver_name, d.phone as driver_phone, r.name as region_name
  INTO v_batch
  FROM delivery_batches b
  LEFT JOIN drivers d ON d.id = b.driver_id
  LEFT JOIN regions r ON r.id = b.region_id
  WHERE b.id = p_batch_id;

  IF v_batch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', bs.id,
      'stop_order', bs.stop_order,
      'kind', bs.kind,
      'stop_type', bs.stop_type,
      'address', bs.address,
      'lat', bs.lat,
      'lng', bs.lng,
      'status', bs.status,
      'food_order_id', bs.food_order_id,
      'customer_name', bs.customer_name,
      'customer_phone', bs.customer_phone,
      'arrived_at', bs.arrived_at,
      'completed_at', bs.completed_at,
      'eta', bs.eta
    ) ORDER BY bs.stop_order
  ) INTO v_stops
  FROM batch_stops bs WHERE bs.batch_id = p_batch_id;

  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'id', fo.id,
    'status', fo.status,
    'delivery_address', fo.delivery_address,
    'total_amount_cents', fo.total_amount_cents,
    'customer_name', fo.customer_name,
    'restaurant_name', rest.name
  )) INTO v_orders
  FROM food_orders fo
  LEFT JOIN restaurants rest ON rest.id = fo.restaurant_id
  WHERE fo.batch_id = p_batch_id;

  RETURN jsonb_build_object(
    'success', true,
    'batch', jsonb_build_object(
      'id', v_batch.id,
      'status', v_batch.status,
      'driver_id', v_batch.driver_id,
      'driver_name', v_batch.driver_name,
      'driver_phone', v_batch.driver_phone,
      'region_id', v_batch.region_id,
      'region_name', v_batch.region_name,
      'total_distance_km', v_batch.total_distance_km,
      'total_duration_minutes', v_batch.total_duration_minutes,
      'total_stops', v_batch.total_stops,
      'notes', v_batch.notes,
      'planned_start', v_batch.planned_start,
      'planned_end', v_batch.planned_end,
      'started_at', v_batch.started_at,
      'completed_at', v_batch.completed_at,
      'created_at', v_batch.created_at
    ),
    'stops', COALESCE(v_stops, '[]'::jsonb),
    'orders', COALESCE(v_orders, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';
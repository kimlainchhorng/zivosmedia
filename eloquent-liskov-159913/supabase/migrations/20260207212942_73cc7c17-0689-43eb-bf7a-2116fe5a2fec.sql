-- =====================================================
-- AI Dispatch Optimization + Demand Prediction
-- Tables, RPCs, RLS for demand forecasting and driver positioning
-- =====================================================

-- 1) demand_snapshots table - Historical demand data collected every 15 minutes
CREATE TABLE IF NOT EXISTS public.demand_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  zone_code TEXT NOT NULL,
  hour_of_day INT NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  snapshot_time TIMESTAMPTZ NOT NULL,
  orders_count INT DEFAULT 0,
  drivers_online INT DEFAULT 0,
  avg_delivery_minutes NUMERIC,
  avg_assign_seconds NUMERIC,
  avg_wait_minutes NUMERIC,
  surge_multiplier NUMERIC DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_demand_snapshots_lookup ON demand_snapshots(
  tenant_id, zone_code, hour_of_day, day_of_week
);
CREATE INDEX IF NOT EXISTS idx_demand_snapshots_time ON demand_snapshots(tenant_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_demand_snapshots_zone ON demand_snapshots(zone_code, created_at DESC);

-- 2) demand_forecasts table - Predicted demand for upcoming hours
CREATE TABLE IF NOT EXISTS public.demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  zone_code TEXT NOT NULL,
  forecast_for TIMESTAMPTZ NOT NULL,
  predicted_orders INT NOT NULL,
  predicted_drivers_needed INT NOT NULL,
  current_drivers_online INT DEFAULT 0,
  confidence NUMERIC DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  forecast_type TEXT DEFAULT 'heuristic',
  surge_predicted BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT unique_forecast UNIQUE (tenant_id, zone_code, forecast_for)
);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_lookup ON demand_forecasts(tenant_id, zone_code, forecast_for);
-- Use regular index instead of partial with now()
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_time ON demand_forecasts(forecast_for DESC);

-- 3) driver_reposition_recommendations table
CREATE TABLE IF NOT EXISTS public.driver_reposition_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  current_zone_code TEXT,
  suggested_zone_code TEXT NOT NULL,
  reason TEXT NOT NULL,
  priority INT DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  accepted BOOLEAN,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_reposition_driver ON driver_reposition_recommendations(driver_id, expires_at DESC);
-- Use regular index instead of partial with now()
CREATE INDEX IF NOT EXISTS idx_reposition_tenant ON driver_reposition_recommendations(tenant_id, expires_at DESC);

-- 4) Add driver performance fields
ALTER TABLE drivers 
  ADD COLUMN IF NOT EXISTS acceptance_rate NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS completion_rate NUMERIC DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS avg_delay_minutes NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS performance_score NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_performance_calc TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_drivers_perf_score ON drivers(performance_score DESC);

-- 5) Add demand.view permission
INSERT INTO permissions (key, description, category) VALUES
  ('demand.view', 'View demand forecasts and driver positioning', 'analytics')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- RPC Functions
-- =====================================================

-- aggregate_demand_snapshot - Collect current demand data
CREATE OR REPLACE FUNCTION public.aggregate_demand_snapshot()
RETURNS INT AS $$
DECLARE
  v_zone RECORD;
  v_snapshot_count INT := 0;
  v_now TIMESTAMPTZ := now();
  v_hour INT := EXTRACT(HOUR FROM v_now)::INT;
  v_dow INT := EXTRACT(DOW FROM v_now)::INT;
  v_window_start TIMESTAMPTZ := v_now - INTERVAL '15 minutes';
  v_orders_count INT;
  v_drivers_online INT;
  v_avg_delivery NUMERIC;
  v_avg_assign NUMERIC;
BEGIN
  -- Get current drivers online count (used for all zones)
  SELECT COUNT(*) INTO v_drivers_online
  FROM drivers d 
  WHERE d.is_online = true AND d.status = 'verified' 
  AND d.updated_at > v_now - INTERVAL '5 minutes';

  -- For each active zone
  FOR v_zone IN 
    SELECT DISTINCT zone_code, tenant_id FROM eats_zones WHERE is_active = true
  LOOP
    -- Get zone-specific order stats
    SELECT 
      COUNT(DISTINCT fo.id),
      AVG(EXTRACT(EPOCH FROM (fo.delivered_at - fo.created_at)) / 60),
      AVG(EXTRACT(EPOCH FROM (fo.assigned_at - fo.created_at)))
    INTO v_orders_count, v_avg_delivery, v_avg_assign
    FROM food_orders fo
    WHERE fo.zone_code = v_zone.zone_code
      AND fo.created_at BETWEEN v_window_start AND v_now;

    INSERT INTO demand_snapshots (
      tenant_id, zone_code, hour_of_day, day_of_week, snapshot_time,
      orders_count, drivers_online, avg_delivery_minutes, avg_assign_seconds
    ) VALUES (
      v_zone.tenant_id,
      v_zone.zone_code,
      v_hour,
      v_dow,
      v_now,
      COALESCE(v_orders_count, 0),
      v_drivers_online,
      v_avg_delivery,
      v_avg_assign
    );

    v_snapshot_count := v_snapshot_count + 1;
  END LOOP;

  RETURN v_snapshot_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- generate_zone_forecast - Predict demand for a zone
CREATE OR REPLACE FUNCTION public.generate_zone_forecast(
  p_zone_code TEXT,
  p_tenant_id UUID DEFAULT NULL,
  p_hours_ahead INT DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_target_time TIMESTAMPTZ;
  v_target_hour INT;
  v_target_dow INT;
  v_predicted_orders INT;
  v_predicted_drivers INT;
  v_sample_count INT;
  v_confidence NUMERIC;
  v_driver_per_order NUMERIC := 0.5;
  v_current_drivers INT;
BEGIN
  v_target_time := now() + (p_hours_ahead || ' hours')::INTERVAL;
  v_target_hour := EXTRACT(HOUR FROM v_target_time)::INT;
  v_target_dow := EXTRACT(DOW FROM v_target_time)::INT;

  -- Get average from last 4 weeks for same day/hour
  SELECT 
    AVG(orders_count)::INT,
    COUNT(*)
  INTO v_predicted_orders, v_sample_count
  FROM demand_snapshots
  WHERE zone_code = p_zone_code
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    AND hour_of_day = v_target_hour
    AND day_of_week = v_target_dow
    AND created_at > now() - INTERVAL '4 weeks';

  v_predicted_orders := COALESCE(v_predicted_orders, 5);
  v_predicted_drivers := GREATEST(1, CEIL(v_predicted_orders * v_driver_per_order));
  
  -- Confidence based on sample size
  v_confidence := LEAST(1.0, v_sample_count::NUMERIC / 8);

  -- Get current drivers online
  SELECT COUNT(*) INTO v_current_drivers
  FROM drivers 
  WHERE is_online = true AND status = 'verified' 
  AND updated_at > now() - INTERVAL '5 minutes';

  -- Upsert forecast
  INSERT INTO demand_forecasts (
    tenant_id, zone_code, forecast_for, predicted_orders, 
    predicted_drivers_needed, current_drivers_online, confidence,
    surge_predicted
  ) VALUES (
    p_tenant_id, p_zone_code, date_trunc('hour', v_target_time),
    v_predicted_orders, v_predicted_drivers, v_current_drivers, v_confidence,
    v_predicted_drivers > v_current_drivers * 1.3
  )
  ON CONFLICT (tenant_id, zone_code, forecast_for) DO UPDATE SET
    predicted_orders = EXCLUDED.predicted_orders,
    predicted_drivers_needed = EXCLUDED.predicted_drivers_needed,
    current_drivers_online = EXCLUDED.current_drivers_online,
    confidence = EXCLUDED.confidence,
    surge_predicted = EXCLUDED.surge_predicted,
    created_at = now();

  RETURN jsonb_build_object(
    'zone_code', p_zone_code,
    'forecast_for', v_target_time,
    'predicted_orders', v_predicted_orders,
    'predicted_drivers_needed', v_predicted_drivers,
    'current_drivers', v_current_drivers,
    'confidence', v_confidence,
    'surge_predicted', v_predicted_drivers > v_current_drivers * 1.3
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- generate_all_forecasts - Generate forecasts for all zones
CREATE OR REPLACE FUNCTION public.generate_all_forecasts()
RETURNS INT AS $$
DECLARE
  v_zone RECORD;
  v_count INT := 0;
BEGIN
  FOR v_zone IN 
    SELECT DISTINCT zone_code, tenant_id FROM eats_zones WHERE is_active = true
  LOOP
    PERFORM generate_zone_forecast(v_zone.zone_code, v_zone.tenant_id, 1);
    PERFORM generate_zone_forecast(v_zone.zone_code, v_zone.tenant_id, 2);
    PERFORM generate_zone_forecast(v_zone.zone_code, v_zone.tenant_id, 3);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- recommend_driver_positions - Generate reposition recommendations
CREATE OR REPLACE FUNCTION public.recommend_driver_positions(p_tenant_id UUID DEFAULT NULL)
RETURNS INT AS $$
DECLARE
  v_shortage RECORD;
  v_driver RECORD;
  v_count INT := 0;
BEGIN
  -- Find zones with predicted shortage
  FOR v_shortage IN
    SELECT 
      zone_code,
      tenant_id,
      predicted_orders,
      predicted_drivers_needed,
      current_drivers_online,
      (predicted_drivers_needed - current_drivers_online) as shortage
    FROM demand_forecasts
    WHERE forecast_for BETWEEN now() AND now() + INTERVAL '1 hour'
      AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
      AND predicted_drivers_needed > current_drivers_online * 1.2
    ORDER BY (predicted_drivers_needed - current_drivers_online) DESC
    LIMIT 5
  LOOP
    -- Find available drivers
    FOR v_driver IN
      SELECT 
        d.id as driver_id,
        d.home_city as current_zone
      FROM drivers d
      WHERE d.is_online = true 
        AND d.status = 'verified'
        AND d.updated_at > now() - INTERVAL '5 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM driver_reposition_recommendations r
          WHERE r.driver_id = d.id 
            AND r.expires_at > now() 
            AND r.acknowledged_at IS NULL
        )
      LIMIT v_shortage.shortage
    LOOP
      INSERT INTO driver_reposition_recommendations (
        tenant_id, driver_id, current_zone_code, suggested_zone_code,
        reason, priority, expires_at
      ) VALUES (
        v_shortage.tenant_id,
        v_driver.driver_id,
        v_driver.current_zone,
        v_shortage.zone_code,
        format('High demand expected: %s orders predicted in next hour', v_shortage.predicted_orders),
        CASE WHEN v_shortage.shortage > 5 THEN 1 ELSE 2 END,
        now() + INTERVAL '30 minutes'
      );
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- update_driver_performance_stats - Calculate driver performance
CREATE OR REPLACE FUNCTION public.update_driver_performance_stats(p_driver_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_acceptance_rate NUMERIC;
  v_completion_rate NUMERIC;
  v_avg_delay NUMERIC;
  v_performance_score NUMERIC;
BEGIN
  SELECT 
    CASE WHEN (d.acceptance_count + d.decline_count) > 0 
      THEN d.acceptance_count::NUMERIC / (d.acceptance_count + d.decline_count)
      ELSE 1.0 END,
    CASE WHEN d.acceptance_count > 0
      THEN (d.acceptance_count - COALESCE(d.cancel_count, 0))::NUMERIC / d.acceptance_count
      ELSE 1.0 END
  INTO v_acceptance_rate, v_completion_rate
  FROM drivers d
  WHERE d.id = p_driver_id;

  SELECT COALESCE(AVG(
    CASE WHEN late_by_seconds > 0 THEN late_by_seconds / 60.0 ELSE 0 END
  ), 0)
  INTO v_avg_delay
  FROM sla_metrics
  WHERE driver_id = p_driver_id
    AND created_at > now() - INTERVAL '30 days';

  v_performance_score := (
    (COALESCE(v_acceptance_rate, 1.0) * 40) +
    (COALESCE(v_completion_rate, 1.0) * 40) +
    (GREATEST(0, 20 - COALESCE(v_avg_delay, 0)))
  );

  UPDATE drivers SET
    acceptance_rate = COALESCE(v_acceptance_rate, 1.0),
    completion_rate = COALESCE(v_completion_rate, 1.0),
    avg_delay_minutes = COALESCE(v_avg_delay, 0),
    performance_score = v_performance_score,
    last_performance_calc = now()
  WHERE id = p_driver_id;

  RETURN jsonb_build_object(
    'driver_id', p_driver_id,
    'acceptance_rate', v_acceptance_rate,
    'completion_rate', v_completion_rate,
    'avg_delay_minutes', v_avg_delay,
    'performance_score', v_performance_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- update_all_driver_performance - Batch update all active drivers
CREATE OR REPLACE FUNCTION public.update_all_driver_performance()
RETURNS INT AS $$
DECLARE
  v_driver RECORD;
  v_count INT := 0;
BEGIN
  FOR v_driver IN 
    SELECT id FROM drivers 
    WHERE status = 'verified'
    AND (last_performance_calc IS NULL OR last_performance_calc < now() - INTERVAL '1 hour')
  LOOP
    PERFORM update_driver_performance_stats(v_driver.id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- acknowledge_reposition - Driver acknowledges recommendation
CREATE OR REPLACE FUNCTION public.acknowledge_reposition(
  p_recommendation_id UUID,
  p_accepted BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
  v_rec RECORD;
BEGIN
  SELECT * INTO v_rec FROM driver_reposition_recommendations WHERE id = p_recommendation_id;
  IF v_rec IS NULL THEN
    RETURN jsonb_build_object('error', 'Recommendation not found');
  END IF;

  -- Check if driver owns this recommendation
  IF NOT EXISTS (
    SELECT 1 FROM drivers WHERE id = v_rec.driver_id AND user_id = auth.uid()
  ) AND NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  UPDATE driver_reposition_recommendations SET
    acknowledged_at = now(),
    accepted = p_accepted
  WHERE id = p_recommendation_id;

  RETURN jsonb_build_object(
    'success', true,
    'recommendation_id', p_recommendation_id,
    'accepted', p_accepted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- =====================================================
-- RLS Policies
-- =====================================================

-- demand_snapshots
ALTER TABLE demand_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read demand snapshots" ON demand_snapshots
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'demand.view'))
    OR (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'analytics.view'))
  );

CREATE POLICY "System can insert snapshots" ON demand_snapshots
  FOR INSERT TO authenticated WITH CHECK (true);

-- demand_forecasts
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read forecasts" ON demand_forecasts
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'demand.view'))
    OR (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'analytics.view'))
  );

CREATE POLICY "System can manage forecasts" ON demand_forecasts
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- driver_reposition_recommendations
ALTER TABLE driver_reposition_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own recommendations" ON driver_reposition_recommendations
  FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage recommendations" ON driver_reposition_recommendations
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'demand.view'))
  );
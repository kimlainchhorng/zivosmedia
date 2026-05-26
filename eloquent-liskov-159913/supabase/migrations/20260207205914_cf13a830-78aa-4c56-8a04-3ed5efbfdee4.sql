-- =====================================================
-- SLA & Performance Monitoring Schema
-- =====================================================

-- 1. Add SLA status fields to food_orders
ALTER TABLE food_orders
  ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'on_time' 
    CHECK (sla_status IN ('on_time', 'at_risk', 'breached')),
  ADD COLUMN IF NOT EXISTS sla_at_risk_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS at_risk_reason TEXT,
  ADD COLUMN IF NOT EXISTS breached_reason TEXT,
  ADD COLUMN IF NOT EXISTS sla_prep_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_pickup_by TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_deliver_by TIMESTAMPTZ;

-- Index for SLA monitoring queries
CREATE INDEX IF NOT EXISTS idx_food_orders_sla_status ON food_orders(sla_status) 
  WHERE status NOT IN ('completed', 'cancelled', 'refunded');
CREATE INDEX IF NOT EXISTS idx_food_orders_sla_deliver_by ON food_orders(sla_deliver_by)
  WHERE status NOT IN ('completed', 'cancelled', 'refunded');

-- 2. Add SLA config to zones
ALTER TABLE eats_zones
  ADD COLUMN IF NOT EXISTS sla_prep_minutes INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS sla_pickup_buffer_minutes INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS sla_delivery_buffer_minutes INT DEFAULT 15,
  ADD COLUMN IF NOT EXISTS at_risk_threshold_minutes INT DEFAULT 5;

-- 3. Create sla_metrics table (historical analytics)
CREATE TABLE IF NOT EXISTS public.sla_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  zone_code TEXT,
  order_id UUID REFERENCES food_orders(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  -- Time metrics (in seconds)
  assign_seconds INT,
  prep_seconds INT,
  pickup_seconds INT,
  delivery_seconds INT,
  total_seconds INT,
  -- SLA result
  sla_result TEXT NOT NULL CHECK (sla_result IN ('on_time', 'late')),
  late_by_seconds INT DEFAULT 0,
  late_stage TEXT CHECK (late_stage IN ('prep', 'pickup', 'delivery') OR late_stage IS NULL),
  -- Context
  distance_miles NUMERIC,
  notes TEXT,
  CONSTRAINT unique_sla_metric_order UNIQUE (order_id)
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_sla_metrics_tenant_date ON sla_metrics(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_merchant ON sla_metrics(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_driver ON sla_metrics(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_zone ON sla_metrics(zone_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_metrics_result ON sla_metrics(tenant_id, sla_result);

-- 4. Create performance_adjustments table (bonus/penalty)
CREATE TABLE IF NOT EXISTS public.performance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES food_orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'penalty')),
  amount_cents INT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id)
);

CREATE INDEX IF NOT EXISTS idx_perf_adj_tenant ON performance_adjustments(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_adj_driver ON performance_adjustments(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_perf_adj_pending ON performance_adjustments(tenant_id) WHERE status = 'pending';

-- 5. RLS for sla_metrics
ALTER TABLE sla_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read SLA metrics" ON sla_metrics
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'analytics.view'))
  );

CREATE POLICY "System can insert SLA metrics" ON sla_metrics
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update SLA metrics" ON sla_metrics
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. RLS for performance_adjustments
ALTER TABLE performance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage adjustments" ON performance_adjustments
  FOR ALL TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.has_tenant_permission(tenant_id, 'payouts.manage'))
  );

CREATE POLICY "Drivers can view own adjustments" ON performance_adjustments
  FOR SELECT TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- 7. RPC: set_order_sla_targets - Sets SLA target timestamps
CREATE OR REPLACE FUNCTION public.set_order_sla_targets(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_zone RECORD;
  v_prep_minutes INT;
  v_pickup_buffer INT;
  v_delivery_buffer INT;
  v_sla_prep_by TIMESTAMPTZ;
  v_sla_pickup_by TIMESTAMPTZ;
  v_sla_deliver_by TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Get zone config (or use defaults)
  SELECT sla_prep_minutes, sla_pickup_buffer_minutes, sla_delivery_buffer_minutes
  INTO v_prep_minutes, v_pickup_buffer, v_delivery_buffer
  FROM eats_zones WHERE zone_code = v_order.zone_code
  LIMIT 1;

  v_prep_minutes := COALESCE(v_prep_minutes, COALESCE(v_order.estimated_prep_time, 15));
  v_pickup_buffer := COALESCE(v_pickup_buffer, 10);
  v_delivery_buffer := COALESCE(v_delivery_buffer, 15);

  v_sla_prep_by := v_order.created_at + (v_prep_minutes || ' minutes')::INTERVAL;
  v_sla_pickup_by := v_order.created_at + ((v_prep_minutes + v_pickup_buffer) || ' minutes')::INTERVAL;
  v_sla_deliver_by := v_order.created_at + 
    ((v_prep_minutes + v_pickup_buffer + COALESCE(v_order.duration_minutes, 20) + v_delivery_buffer) || ' minutes')::INTERVAL;

  UPDATE food_orders SET
    sla_prep_by = v_sla_prep_by,
    sla_pickup_by = v_sla_pickup_by,
    sla_deliver_by = v_sla_deliver_by
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true, 
    'sla_prep_by', v_sla_prep_by,
    'sla_pickup_by', v_sla_pickup_by,
    'sla_deliver_by', v_sla_deliver_by
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 8. RPC: evaluate_sla_status - Scheduled evaluator for SLA monitoring
CREATE OR REPLACE FUNCTION public.evaluate_sla_status()
RETURNS TABLE(order_id UUID, new_status TEXT, reason TEXT) AS $$
DECLARE
  v_order RECORD;
  v_at_risk_threshold INTERVAL;
  v_new_status TEXT;
  v_reason TEXT;
BEGIN
  FOR v_order IN 
    SELECT fo.*, ez.at_risk_threshold_minutes
    FROM food_orders fo
    LEFT JOIN eats_zones ez ON ez.zone_code = fo.zone_code
    WHERE fo.status IN ('pending', 'confirmed', 'ready_for_pickup', 'in_progress')
      AND fo.sla_deliver_by IS NOT NULL
      AND fo.sla_status != 'breached'
  LOOP
    v_at_risk_threshold := (COALESCE(v_order.at_risk_threshold_minutes, 5) || ' minutes')::INTERVAL;
    v_new_status := v_order.sla_status;
    v_reason := NULL;

    -- Check for breach conditions
    IF v_order.status = 'pending' AND v_order.driver_id IS NULL AND now() > v_order.sla_pickup_by THEN
      v_new_status := 'breached';
      v_reason := 'no_driver_assigned';
    ELSIF v_order.status IN ('pending', 'confirmed') AND v_order.prepared_at IS NULL 
          AND v_order.sla_prep_by IS NOT NULL AND now() > v_order.sla_prep_by THEN
      v_new_status := 'breached';
      v_reason := 'merchant_prep_delay';
    ELSIF v_order.status IN ('confirmed', 'ready_for_pickup') AND now() > v_order.sla_pickup_by THEN
      v_new_status := 'breached';
      v_reason := 'pickup_delay';
    ELSIF v_order.status = 'in_progress' AND now() > v_order.sla_deliver_by THEN
      v_new_status := 'breached';
      v_reason := 'delivery_delay';
    -- Check for at-risk conditions
    ELSIF v_order.sla_status = 'on_time' THEN
      IF v_order.status = 'pending' AND v_order.driver_id IS NULL 
         AND now() > (v_order.sla_pickup_by - v_at_risk_threshold) THEN
        v_new_status := 'at_risk';
        v_reason := 'no_driver_approaching_deadline';
      ELSIF v_order.status IN ('confirmed', 'ready_for_pickup') 
            AND now() > (v_order.sla_pickup_by - v_at_risk_threshold) THEN
        v_new_status := 'at_risk';
        v_reason := 'pickup_approaching_deadline';
      ELSIF v_order.status = 'in_progress' 
            AND now() > (v_order.sla_deliver_by - v_at_risk_threshold) THEN
        v_new_status := 'at_risk';
        v_reason := 'delivery_approaching_deadline';
      END IF;
    END IF;

    -- Update if status changed
    IF v_new_status IS DISTINCT FROM v_order.sla_status THEN
      UPDATE food_orders SET 
        sla_status = v_new_status,
        at_risk_reason = CASE WHEN v_new_status = 'at_risk' THEN v_reason ELSE at_risk_reason END,
        breached_reason = CASE WHEN v_new_status = 'breached' THEN v_reason ELSE breached_reason END,
        sla_at_risk_at = CASE WHEN v_new_status = 'at_risk' AND sla_at_risk_at IS NULL THEN now() ELSE sla_at_risk_at END,
        sla_breached_at = CASE WHEN v_new_status = 'breached' THEN now() ELSE sla_breached_at END
      WHERE id = v_order.id;

      order_id := v_order.id;
      new_status := v_new_status;
      reason := v_reason;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 9. RPC: record_sla_metrics - Called on order completion
CREATE OR REPLACE FUNCTION public.record_sla_metrics(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_order RECORD;
  v_metric_id UUID;
  v_sla_result TEXT;
  v_late_seconds INT := 0;
  v_late_stage TEXT;
BEGIN
  SELECT * INTO v_order FROM food_orders WHERE id = p_order_id AND status = 'completed';
  IF v_order IS NULL THEN RETURN NULL; END IF;

  -- Determine SLA result
  IF v_order.sla_deliver_by IS NULL OR v_order.delivered_at <= v_order.sla_deliver_by THEN
    v_sla_result := 'on_time';
  ELSE
    v_sla_result := 'late';
    v_late_seconds := EXTRACT(EPOCH FROM (v_order.delivered_at - v_order.sla_deliver_by))::INT;
    -- Determine which stage caused lateness
    IF v_order.sla_prep_by IS NOT NULL AND v_order.prepared_at IS NOT NULL AND v_order.prepared_at > v_order.sla_prep_by THEN
      v_late_stage := 'prep';
    ELSIF v_order.sla_pickup_by IS NOT NULL AND v_order.picked_up_at IS NOT NULL AND v_order.picked_up_at > v_order.sla_pickup_by THEN
      v_late_stage := 'pickup';
    ELSE
      v_late_stage := 'delivery';
    END IF;
  END IF;

  INSERT INTO sla_metrics (
    tenant_id, zone_code, order_id, merchant_id, driver_id,
    assign_seconds, prep_seconds, pickup_seconds, delivery_seconds, total_seconds,
    sla_result, late_by_seconds, late_stage, distance_miles
  ) VALUES (
    v_order.tenant_id,
    v_order.zone_code,
    v_order.id,
    v_order.restaurant_id,
    v_order.driver_id,
    CASE WHEN v_order.assigned_at IS NOT NULL THEN EXTRACT(EPOCH FROM (v_order.assigned_at - v_order.created_at))::INT END,
    CASE WHEN COALESCE(v_order.prepared_at, v_order.ready_at) IS NOT NULL THEN EXTRACT(EPOCH FROM (COALESCE(v_order.prepared_at, v_order.ready_at) - v_order.created_at))::INT END,
    CASE WHEN v_order.picked_up_at IS NOT NULL AND v_order.assigned_at IS NOT NULL THEN EXTRACT(EPOCH FROM (v_order.picked_up_at - v_order.assigned_at))::INT END,
    CASE WHEN v_order.delivered_at IS NOT NULL AND v_order.picked_up_at IS NOT NULL THEN EXTRACT(EPOCH FROM (v_order.delivered_at - v_order.picked_up_at))::INT END,
    CASE WHEN v_order.delivered_at IS NOT NULL THEN EXTRACT(EPOCH FROM (v_order.delivered_at - v_order.created_at))::INT END,
    v_sla_result,
    v_late_seconds,
    v_late_stage,
    v_order.distance_miles
  )
  ON CONFLICT (order_id) DO UPDATE SET
    sla_result = EXCLUDED.sla_result,
    late_by_seconds = EXCLUDED.late_by_seconds,
    late_stage = EXCLUDED.late_stage,
    total_seconds = EXCLUDED.total_seconds
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 10. RPC: get_sla_kpis - Get aggregated SLA KPIs
CREATE OR REPLACE FUNCTION public.get_sla_kpis(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT now() - interval '7 days',
  p_date_to TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_on_time_count INT;
  v_late_count INT;
  v_total INT;
  v_avg_assign INT;
  v_avg_prep INT;
  v_avg_pickup INT;
  v_avg_delivery INT;
  v_at_risk_count INT;
  v_breached_count INT;
BEGIN
  -- Get metrics from completed orders
  SELECT 
    COUNT(*) FILTER (WHERE sla_result = 'on_time'),
    COUNT(*) FILTER (WHERE sla_result = 'late'),
    COUNT(*),
    COALESCE(AVG(assign_seconds) FILTER (WHERE assign_seconds IS NOT NULL), 0)::INT,
    COALESCE(AVG(prep_seconds) FILTER (WHERE prep_seconds IS NOT NULL), 0)::INT,
    COALESCE(AVG(pickup_seconds) FILTER (WHERE pickup_seconds IS NOT NULL), 0)::INT,
    COALESCE(AVG(delivery_seconds) FILTER (WHERE delivery_seconds IS NOT NULL), 0)::INT
  INTO v_on_time_count, v_late_count, v_total, v_avg_assign, v_avg_prep, v_avg_pickup, v_avg_delivery
  FROM sla_metrics
  WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    AND created_at BETWEEN p_date_from AND p_date_to;

  -- Get current at-risk and breached counts
  SELECT 
    COUNT(*) FILTER (WHERE sla_status = 'at_risk'),
    COUNT(*) FILTER (WHERE sla_status = 'breached')
  INTO v_at_risk_count, v_breached_count
  FROM food_orders
  WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    AND status NOT IN ('completed', 'cancelled', 'refunded');

  RETURN jsonb_build_object(
    'on_time_rate', CASE WHEN v_total > 0 THEN ROUND((v_on_time_count::NUMERIC / v_total) * 100, 1) ELSE 100 END,
    'on_time_count', v_on_time_count,
    'late_count', v_late_count,
    'total_delivered', v_total,
    'avg_assign_seconds', v_avg_assign,
    'avg_prep_seconds', v_avg_prep,
    'avg_pickup_seconds', v_avg_pickup,
    'avg_delivery_seconds', v_avg_delivery,
    'at_risk_count', COALESCE(v_at_risk_count, 0),
    'breached_count', COALESCE(v_breached_count, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 11. RPC: get_sla_by_zone - Zone breakdown
CREATE OR REPLACE FUNCTION public.get_sla_by_zone(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT now() - interval '7 days',
  p_date_to TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  zone_code TEXT,
  total_orders BIGINT,
  on_time_count BIGINT,
  late_count BIGINT,
  on_time_rate NUMERIC,
  avg_total_seconds BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.zone_code,
    COUNT(*)::BIGINT as total_orders,
    COUNT(*) FILTER (WHERE sla_result = 'on_time')::BIGINT as on_time_count,
    COUNT(*) FILTER (WHERE sla_result = 'late')::BIGINT as late_count,
    ROUND((COUNT(*) FILTER (WHERE sla_result = 'on_time')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as on_time_rate,
    COALESCE(AVG(total_seconds), 0)::BIGINT as avg_total_seconds
  FROM sla_metrics sm
  WHERE (p_tenant_id IS NULL OR sm.tenant_id = p_tenant_id)
    AND sm.created_at BETWEEN p_date_from AND p_date_to
    AND sm.zone_code IS NOT NULL
  GROUP BY sm.zone_code
  ORDER BY total_orders DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 12. RPC: get_sla_by_merchant - Merchant performance
CREATE OR REPLACE FUNCTION public.get_sla_by_merchant(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT now() - interval '7 days',
  p_date_to TIMESTAMPTZ DEFAULT now(),
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  merchant_id UUID,
  merchant_name TEXT,
  total_orders BIGINT,
  on_time_count BIGINT,
  late_count BIGINT,
  on_time_rate NUMERIC,
  avg_prep_seconds BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.merchant_id,
    r.name as merchant_name,
    COUNT(*)::BIGINT as total_orders,
    COUNT(*) FILTER (WHERE sla_result = 'on_time')::BIGINT as on_time_count,
    COUNT(*) FILTER (WHERE sla_result = 'late')::BIGINT as late_count,
    ROUND((COUNT(*) FILTER (WHERE sla_result = 'on_time')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as on_time_rate,
    COALESCE(AVG(prep_seconds), 0)::BIGINT as avg_prep_seconds
  FROM sla_metrics sm
  LEFT JOIN restaurants r ON r.id = sm.merchant_id
  WHERE (p_tenant_id IS NULL OR sm.tenant_id = p_tenant_id)
    AND sm.created_at BETWEEN p_date_from AND p_date_to
    AND sm.merchant_id IS NOT NULL
  GROUP BY sm.merchant_id, r.name
  ORDER BY avg_prep_seconds DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 13. RPC: get_sla_by_driver - Driver performance
CREATE OR REPLACE FUNCTION public.get_sla_by_driver(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT now() - interval '7 days',
  p_date_to TIMESTAMPTZ DEFAULT now(),
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  driver_id UUID,
  driver_name TEXT,
  total_orders BIGINT,
  on_time_count BIGINT,
  late_count BIGINT,
  on_time_rate NUMERIC,
  avg_delivery_seconds BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.driver_id,
    d.full_name as driver_name,
    COUNT(*)::BIGINT as total_orders,
    COUNT(*) FILTER (WHERE sla_result = 'on_time')::BIGINT as on_time_count,
    COUNT(*) FILTER (WHERE sla_result = 'late')::BIGINT as late_count,
    ROUND((COUNT(*) FILTER (WHERE sla_result = 'on_time')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1) as on_time_rate,
    COALESCE(AVG(delivery_seconds), 0)::BIGINT as avg_delivery_seconds
  FROM sla_metrics sm
  LEFT JOIN drivers d ON d.id = sm.driver_id
  WHERE (p_tenant_id IS NULL OR sm.tenant_id = p_tenant_id)
    AND sm.created_at BETWEEN p_date_from AND p_date_to
    AND sm.driver_id IS NOT NULL
  GROUP BY sm.driver_id, d.full_name
  HAVING COUNT(*) >= 5 -- Minimum orders for meaningful ranking
  ORDER BY on_time_rate ASC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 14. RPC: approve_performance_adjustment - Approve and apply bonus/penalty
CREATE OR REPLACE FUNCTION public.approve_performance_adjustment(
  p_adjustment_id UUID,
  p_approve BOOLEAN,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_adj RECORD;
  v_tx_id UUID;
BEGIN
  SELECT * INTO v_adj FROM performance_adjustments WHERE id = p_adjustment_id;
  IF v_adj IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment not found');
  END IF;
  
  IF v_adj.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adjustment already processed');
  END IF;

  IF p_approve THEN
    -- Create wallet transaction
    INSERT INTO wallet_transactions (
      driver_id,
      amount_cents,
      type,
      description,
      reference_id,
      reference_type
    ) VALUES (
      v_adj.driver_id,
      CASE WHEN v_adj.type = 'bonus' THEN v_adj.amount_cents ELSE -v_adj.amount_cents END,
      v_adj.type,
      v_adj.reason,
      v_adj.id,
      'performance_adjustment'
    )
    RETURNING id INTO v_tx_id;

    -- Update driver wallet balance
    UPDATE driver_wallets
    SET balance_cents = balance_cents + CASE WHEN v_adj.type = 'bonus' THEN v_adj.amount_cents ELSE -v_adj.amount_cents END,
        updated_at = now()
    WHERE driver_id = v_adj.driver_id;

    UPDATE performance_adjustments SET
      status = 'applied',
      approved_by = auth.uid(),
      approved_at = now(),
      applied_at = now(),
      wallet_transaction_id = v_tx_id
    WHERE id = p_adjustment_id;
  ELSE
    UPDATE performance_adjustments SET
      status = 'rejected',
      approved_by = auth.uid(),
      approved_at = now()
    WHERE id = p_adjustment_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', CASE WHEN p_approve THEN 'applied' ELSE 'rejected' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- 15. Trigger to set SLA targets on order creation
CREATE OR REPLACE FUNCTION public.trigger_set_sla_targets()
RETURNS TRIGGER AS $$
BEGIN
  -- Set SLA targets for new orders
  IF TG_OP = 'INSERT' THEN
    PERFORM set_order_sla_targets(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trg_set_sla_targets ON food_orders;
CREATE TRIGGER trg_set_sla_targets
  AFTER INSERT ON food_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_sla_targets();

-- 16. Trigger to record SLA metrics on order completion
CREATE OR REPLACE FUNCTION public.trigger_record_sla_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM record_sla_metrics(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trg_record_sla_metrics ON food_orders;
CREATE TRIGGER trg_record_sla_metrics
  AFTER UPDATE ON food_orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_record_sla_metrics();
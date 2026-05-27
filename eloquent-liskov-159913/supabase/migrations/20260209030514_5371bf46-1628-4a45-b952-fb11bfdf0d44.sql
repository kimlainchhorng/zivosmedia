-- Create function to get restaurant's learned average prep time
CREATE OR REPLACE FUNCTION get_restaurant_avg_prep_time(p_restaurant_id UUID)
RETURNS TABLE (
  avg_prep_minutes NUMERIC,
  sample_size INT,
  source TEXT
) AS $$
BEGIN
  -- Try sla_metrics first (most accurate)
  RETURN QUERY
  SELECT 
    ROUND(AVG(sm.prep_seconds) / 60.0, 1) as avg_prep_minutes,
    COUNT(*)::INT as sample_size,
    'sla_metrics'::TEXT as source
  FROM sla_metrics sm
  WHERE sm.merchant_id = p_restaurant_id 
    AND sm.prep_seconds IS NOT NULL 
    AND sm.prep_seconds > 0
  HAVING COUNT(*) >= 3;
  
  IF FOUND THEN RETURN; END IF;
  
  -- Fallback to order timestamps
  RETURN QUERY
  SELECT 
    ROUND(AVG(EXTRACT(EPOCH FROM (fo.ready_at - fo.accepted_at)) / 60.0), 1),
    COUNT(*)::INT,
    'order_timestamps'::TEXT
  FROM food_orders fo
  WHERE fo.restaurant_id = p_restaurant_id
    AND fo.ready_at IS NOT NULL 
    AND fo.accepted_at IS NOT NULL
    AND fo.status = 'delivered'
  HAVING COUNT(*) >= 3;
  
  IF FOUND THEN RETURN; END IF;
  
  -- Ultimate fallback: restaurant default
  RETURN QUERY
  SELECT 
    COALESCE(r.avg_prep_time, 25)::NUMERIC,
    0,
    'restaurant_default'::TEXT
  FROM restaurants r
  WHERE r.id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Mobile App Readiness Layer Migration
-- Creates RPC functions, app_settings table, indexes, and RLS policies

-- ============================================
-- A) Mobile-Friendly API Endpoints (RPC Functions)
-- ============================================

-- get_active_driver_state: Returns driver home screen data
CREATE OR REPLACE FUNCTION public.get_active_driver_state(p_driver_id UUID)
RETURNS TABLE (
  is_online BOOLEAN,
  current_lat NUMERIC,
  current_lng NUMERIC,
  active_trip_id UUID,
  active_trip_status TEXT,
  active_order_id UUID,
  active_order_status TEXT,
  earnings_today NUMERIC,
  trips_today INT,
  orders_today INT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.is_online,
    d.current_lat,
    d.current_lng,
    (SELECT t.id FROM trips t WHERE t.driver_id = d.id AND t.status IN ('accepted', 'arriving', 'in_progress') ORDER BY t.created_at DESC LIMIT 1),
    (SELECT t.status FROM trips t WHERE t.driver_id = d.id AND t.status IN ('accepted', 'arriving', 'in_progress') ORDER BY t.created_at DESC LIMIT 1),
    (SELECT fo.id FROM food_orders fo WHERE fo.driver_id = d.id AND fo.status IN ('assigned', 'picked_up') ORDER BY fo.created_at DESC LIMIT 1),
    (SELECT fo.status FROM food_orders fo WHERE fo.driver_id = d.id AND fo.status IN ('assigned', 'picked_up') ORDER BY fo.created_at DESC LIMIT 1),
    COALESCE((SELECT SUM(t.fare_amount) FROM trips t WHERE t.driver_id = d.id AND t.status = 'completed' AND t.completed_at >= CURRENT_DATE), 0),
    COALESCE((SELECT COUNT(*)::INT FROM trips t WHERE t.driver_id = d.id AND t.status = 'completed' AND t.completed_at >= CURRENT_DATE), 0),
    COALESCE((SELECT COUNT(*)::INT FROM food_orders fo WHERE fo.driver_id = d.id AND fo.status = 'delivered' AND fo.delivered_at >= CURRENT_DATE), 0),
    d.updated_at
  FROM drivers d
  WHERE d.id = p_driver_id;
END;
$$;

-- get_driver_orders: Paginated trip/order history
CREATE OR REPLACE FUNCTION public.get_driver_orders(
  p_driver_id UUID, 
  p_limit INT DEFAULT 20, 
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_type TEXT,
  status TEXT,
  pickup_address TEXT,
  dropoff_address TEXT,
  fare_amount NUMERIC,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  (
    -- Trips
    SELECT 
      t.id,
      'ride'::TEXT as order_type,
      t.status,
      t.pickup_address,
      t.dropoff_address,
      t.fare_amount,
      t.completed_at,
      t.updated_at
    FROM trips t
    WHERE t.driver_id = p_driver_id
    
    UNION ALL
    
    -- Food orders
    SELECT 
      fo.id,
      'eats'::TEXT as order_type,
      fo.status,
      r.address as pickup_address,
      fo.delivery_address as dropoff_address,
      fo.delivery_fee as fare_amount,
      fo.delivered_at as completed_at,
      fo.updated_at
    FROM food_orders fo
    LEFT JOIN restaurants r ON r.id = fo.restaurant_id
    WHERE fo.driver_id = p_driver_id
  )
  ORDER BY COALESCE(completed_at, updated_at) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- get_merchant_orders: Restaurant order queue
CREATE OR REPLACE FUNCTION public.get_merchant_orders(
  p_restaurant_id UUID, 
  p_status TEXT DEFAULT NULL, 
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  customer_name TEXT,
  items_count INT,
  total_amount NUMERIC,
  delivery_address TEXT,
  special_instructions TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fo.id,
    fo.status,
    COALESCE(p.full_name, 'Guest') as customer_name,
    COALESCE((SELECT COUNT(*)::INT FROM food_order_items foi WHERE foi.order_id = fo.id), 0) as items_count,
    fo.total_amount,
    fo.delivery_address,
    fo.special_instructions,
    fo.created_at,
    fo.updated_at
  FROM food_orders fo
  LEFT JOIN profiles p ON p.id = fo.user_id
  WHERE fo.restaurant_id = p_restaurant_id
    AND (p_status IS NULL OR fo.status = p_status)
  ORDER BY 
    CASE fo.status 
      WHEN 'pending' THEN 1 
      WHEN 'confirmed' THEN 2 
      WHEN 'preparing' THEN 3 
      WHEN 'ready' THEN 4
      ELSE 5 
    END,
    fo.created_at DESC
  LIMIT p_limit;
END;
$$;

-- get_order_tracking_public: Public tracking by code (no auth required)
CREATE OR REPLACE FUNCTION public.get_order_tracking_public(p_tracking_code TEXT)
RETURNS TABLE (
  order_id UUID,
  order_type TEXT,
  status TEXT,
  restaurant_name TEXT,
  driver_name TEXT,
  driver_lat NUMERIC,
  driver_lng NUMERIC,
  pickup_address TEXT,
  dropoff_address TEXT,
  eta_minutes INT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fo.id as order_id,
    'eats'::TEXT as order_type,
    fo.status,
    r.name as restaurant_name,
    d.full_name as driver_name,
    d.current_lat as driver_lat,
    d.current_lng as driver_lng,
    r.address as pickup_address,
    fo.delivery_address as dropoff_address,
    CASE 
      WHEN fo.estimated_delivery_time IS NOT NULL 
      THEN GREATEST(EXTRACT(EPOCH FROM (fo.estimated_delivery_time - NOW())) / 60, 0)::INT
      ELSE NULL
    END as eta_minutes,
    fo.updated_at
  FROM food_orders fo
  LEFT JOIN restaurants r ON r.id = fo.restaurant_id
  LEFT JOIN drivers d ON d.id = fo.driver_id
  WHERE fo.tracking_code = p_tracking_code;
END;
$$;

-- ============================================
-- B) Push Notification Infrastructure
-- ============================================

-- Add tenant_id to device_tokens if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'device_tokens' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.device_tokens ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
  END IF;
END $$;

-- Add device_name and app_version columns if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'device_tokens' 
    AND column_name = 'device_name'
  ) THEN
    ALTER TABLE public.device_tokens ADD COLUMN device_name TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'device_tokens' 
    AND column_name = 'app_version'
  ) THEN
    ALTER TABLE public.device_tokens ADD COLUMN app_version TEXT;
  END IF;
END $$;

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_device_tokens_tenant ON public.device_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active ON public.device_tokens(user_id, is_active) WHERE is_active = true;

-- ============================================
-- C) Background Location Indexes
-- ============================================

-- Index for recent driver location history
CREATE INDEX IF NOT EXISTS idx_driver_location_recent 
ON public.driver_location_history(driver_id, recorded_at DESC);

-- Index for online drivers
CREATE INDEX IF NOT EXISTS idx_drivers_online_location 
ON public.drivers(is_online, current_lat, current_lng) WHERE is_online = true;

-- ============================================
-- D) Offline-Safe Updates - Idempotent Status Functions
-- ============================================

-- Idempotent food order status update
CREATE OR REPLACE FUNCTION public.update_order_status_idempotent(
  p_order_id UUID,
  p_new_status TEXT,
  p_client_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  success BOOLEAN,
  current_status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  -- Get current state
  SELECT fo.status, fo.updated_at INTO v_current_status, v_updated_at
  FROM food_orders fo WHERE fo.id = p_order_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Order not found'::TEXT;
    RETURN;
  END IF;
  
  -- Already in target state
  IF v_current_status = p_new_status THEN
    RETURN QUERY SELECT true, v_current_status, 'Already in target state'::TEXT;
    RETURN;
  END IF;
  
  -- Check if client timestamp is newer (idempotency check)
  IF v_updated_at > p_client_timestamp THEN
    RETURN QUERY SELECT false, v_current_status, 'Server has newer update'::TEXT;
    RETURN;
  END IF;
  
  -- Perform update
  UPDATE food_orders 
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN QUERY SELECT true, p_new_status, 'Status updated'::TEXT;
END;
$$;

-- Idempotent trip status update
CREATE OR REPLACE FUNCTION public.update_trip_status_idempotent(
  p_trip_id UUID,
  p_new_status TEXT,
  p_client_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  success BOOLEAN,
  current_status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  -- Get current state
  SELECT t.status, t.updated_at INTO v_current_status, v_updated_at
  FROM trips t WHERE t.id = p_trip_id;
  
  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Trip not found'::TEXT;
    RETURN;
  END IF;
  
  -- Already in target state
  IF v_current_status = p_new_status THEN
    RETURN QUERY SELECT true, v_current_status, 'Already in target state'::TEXT;
    RETURN;
  END IF;
  
  -- Check if client timestamp is newer (idempotency check)
  IF v_updated_at > p_client_timestamp THEN
    RETURN QUERY SELECT false, v_current_status, 'Server has newer update'::TEXT;
    RETURN;
  END IF;
  
  -- Perform update
  UPDATE trips 
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_trip_id;
  
  RETURN QUERY SELECT true, p_new_status, 'Status updated'::TEXT;
END;
$$;

-- ============================================
-- G) App Settings Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Default settings (global, tenant_id = NULL)
INSERT INTO public.app_settings (tenant_id, key, value, description) VALUES
(NULL, 'location_update_interval', '"15000"', 'Driver location update interval in milliseconds'),
(NULL, 'push_enabled', '"true"', 'Enable push notifications'),
(NULL, 'offline_mode_enabled', '"true"', 'Enable offline action queue'),
(NULL, 'min_location_distance', '"20"', 'Minimum distance in meters before location update'),
(NULL, 'min_location_time', '"10"', 'Minimum time in seconds between location updates')
ON CONFLICT (tenant_id, key) DO NOTHING;

-- ============================================
-- I) Security (RLS Policies)
-- ============================================

-- App Settings RLS - Use user_roles table for admin check
CREATE POLICY "Admins can manage app_settings"
ON public.app_settings FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read app_settings"
ON public.app_settings FOR SELECT TO authenticated 
USING (true);

-- Device Tokens RLS (drop existing if any, then recreate)
DROP POLICY IF EXISTS "Users can manage own device_tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Admins can read tenant device_tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Admins can read all device_tokens" ON public.device_tokens;

CREATE POLICY "Users can manage own device_tokens"
ON public.device_tokens FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all device_tokens"
ON public.device_tokens FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
  )
);

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.get_active_driver_state(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_orders(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_merchant_orders(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_tracking_public(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status_idempotent(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_trip_status_idempotent(UUID, TEXT, TIMESTAMPTZ) TO authenticated;
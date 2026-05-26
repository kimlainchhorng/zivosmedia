-- Add missing columns to food_orders for pickup location and route data
ALTER TABLE public.food_orders 
  ADD COLUMN IF NOT EXISTS pickup_lat numeric,
  ADD COLUMN IF NOT EXISTS pickup_lng numeric,
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 0;

COMMENT ON COLUMN public.food_orders.pickup_lat IS 'Restaurant pickup latitude';
COMMENT ON COLUMN public.food_orders.pickup_lng IS 'Restaurant pickup longitude';
COMMENT ON COLUMN public.food_orders.duration_minutes IS 'Estimated delivery duration in minutes';

-- Add last_active_at column to drivers for more accurate activity tracking
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.drivers.last_active_at IS 'Last time driver sent location update';

-- RPC to get driver location for a specific order (customer tracking)
-- Security: Only returns driver location for orders the customer owns and only during active delivery
CREATE OR REPLACE FUNCTION public.get_order_driver_location(p_order_id uuid)
RETURNS TABLE(
  driver_id uuid,
  driver_name text,
  driver_lat numeric,
  driver_lng numeric,
  driver_vehicle_type text,
  driver_avatar_url text,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.full_name,
    d.current_lat,
    d.current_lng,
    d.vehicle_type,
    d.avatar_url,
    COALESCE(d.last_active_at, d.updated_at)
  FROM food_orders fo
  JOIN drivers d ON d.id = fo.driver_id
  WHERE fo.id = p_order_id
    AND fo.customer_id = auth.uid()
    AND fo.status IN ('confirmed', 'ready_for_pickup', 'in_progress');
END;
$function$;
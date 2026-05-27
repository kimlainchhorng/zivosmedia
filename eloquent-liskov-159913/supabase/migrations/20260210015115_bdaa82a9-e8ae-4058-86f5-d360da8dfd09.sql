
-- 1. Create secure RPC function for public order tracking (no PII exposed)
CREATE OR REPLACE FUNCTION public.get_order_tracking(p_order_id uuid)
RETURNS TABLE (
  id uuid,
  status text,
  restaurant_name text,
  restaurant_address text,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_address text,
  delivery_lat double precision,
  delivery_lng double precision,
  distance_miles double precision,
  duration_minutes double precision,
  driver_id uuid,
  batch_id uuid,
  created_at timestamptz,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.status,
    r.name AS restaurant_name,
    r.address AS restaurant_address,
    o.pickup_lat,
    o.pickup_lng,
    o.delivery_address,
    o.delivery_lat,
    o.delivery_lng,
    o.distance_miles,
    o.duration_minutes,
    o.driver_id,
    o.batch_id,
    o.created_at,
    o.assigned_at,
    o.picked_up_at,
    o.delivered_at
  FROM food_orders o
  LEFT JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.id = p_order_id;
END;
$$;

-- 2. Add RLS policies for share_events
-- INSERT: anyone (auth or anon) can log share events
CREATE POLICY "Anyone can insert share events"
  ON public.share_events FOR INSERT
  WITH CHECK (true);

-- SELECT: authenticated users can read their own share events
CREATE POLICY "Users can read own share events"
  ON public.share_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_nearby_drivers(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  driver_id uuid,
  lat double precision,
  lng double precision,
  driver_state text,
  is_online boolean,
  is_busy boolean,
  last_seen timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ds.driver_id,
    ds.lat,
    ds.lng,
    ds.driver_state::text,
    ds.is_online,
    ds.is_busy,
    ds.last_seen
  FROM public.drivers_status ds
  WHERE ds.is_online = true
    AND ds.is_busy = false
    AND ds.lat IS NOT NULL AND ds.lng IS NOT NULL
    AND ds.driver_state::text IN ('online_available')
    AND (
      6371000.0 * 2 * asin(sqrt(
        sin(radians(ds.lat - p_lat) / 2) ^ 2 +
        cos(radians(p_lat)) * cos(radians(ds.lat)) *
        sin(radians(ds.lng - p_lng) / 2) ^ 2
      ))
    ) <= p_radius_m
  ORDER BY ds.last_seen DESC
  LIMIT p_limit;
$$;
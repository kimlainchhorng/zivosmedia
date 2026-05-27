-- =============================================================================
-- get_nearby_drivers: stale-driver freshness filter
-- =============================================================================
--
-- Bug: the previous definition (in 20260310210956) only checked
--   is_online = true AND is_busy = false AND driver_state = 'online_available'
-- but never filtered by `last_seen` recency.  If a driver app crashes,
-- loses connectivity, or is force-quit without flipping is_online=false,
-- their `drivers_status` row stays "online" indefinitely — and the rider
-- map renders a ghost car at their last reported position.
--
-- Fix: add an explicit recency clause.  The driver app heartbeats every
-- ~10s via useLiveLocationBroadcast (zivodriver), so a 60-second floor
-- gives ~6 missed heartbeats of grace before a driver is considered
-- offline — enough to ride out brief network blips while still pruning
-- truly stale rows.
--
-- Same signature, same return shape — purely a behavioral tightening so
-- no client code needs to change.
-- =============================================================================

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
    -- Freshness gate: a driver who hasn't pinged in 60s is treated as
    -- offline. ~6 missed 10-second heartbeats covers brief network blips
    -- while still pruning ghost rows.
    AND ds.last_seen IS NOT NULL
    AND ds.last_seen > now() - interval '60 seconds'
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

-- Re-grant EXECUTE so the rider app's `authenticated` role can still call
-- the RPC after the redefinition. (CREATE OR REPLACE preserves grants in
-- recent Postgres versions, but being explicit avoids surprises during
-- staging→prod migrations across PG versions.)
GRANT EXECUTE ON FUNCTION public.get_nearby_drivers(
  double precision, double precision, double precision, integer
) TO authenticated;

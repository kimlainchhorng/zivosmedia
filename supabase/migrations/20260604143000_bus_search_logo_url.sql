-- Return operator logos in public bus search results.
-- The app also performs a client-side store profile enrichment fallback so
-- older deployed RPCs continue to render while this migration rolls out.

DROP FUNCTION IF EXISTS public.search_bus_trips(text, text, date);

CREATE OR REPLACE FUNCTION public.search_bus_trips(
  p_from text DEFAULT NULL,
  p_to text DEFAULT NULL,
  p_date date DEFAULT NULL
)
RETURNS TABLE (
  trip_id uuid, store_id uuid, operator text, logo_url text,
  origin text, destination text, depart_date date, depart_time text,
  arrive_time text, duration_mins integer, bus_type text, seat_layout text,
  total_seats integer, price_cents integer, currency text, amenities jsonb,
  rating numeric, review_count integer, seats_left integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id,
    t.store_id,
    sp.name,
    sp.logo_url,
    r.origin,
    r.destination,
    t.depart_date,
    t.depart_time,
    t.arrive_time,
    r.duration_mins,
    t.bus_type,
    t.seat_layout,
    t.total_seats,
    t.price_cents,
    t.currency,
    t.amenities,
    sp.rating,
    0::integer AS review_count,
    GREATEST(
      t.total_seats - COALESCE((
        SELECT SUM(jsonb_array_length(b.seats))::int
        FROM public.bus_bookings b
        WHERE b.trip_id = t.id AND b.status IN ('hold','confirmed')
      ), 0), 0
    ) AS seats_left
  FROM public.bus_trips t
  JOIN public.bus_routes r ON r.id = t.route_id
  JOIN public.store_profiles sp ON sp.id = t.store_id
  WHERE t.status = 'scheduled'
    AND r.status = 'active'
    AND (p_date IS NULL OR t.depart_date = p_date)
    AND (p_from IS NULL OR p_from = '' OR r.origin ILIKE '%' || p_from || '%')
    AND (p_to IS NULL OR p_to = '' OR r.destination ILIKE '%' || p_to || '%')
  ORDER BY t.depart_time;
$$;

GRANT EXECUTE ON FUNCTION public.search_bus_trips(text, text, date) TO anon, authenticated;

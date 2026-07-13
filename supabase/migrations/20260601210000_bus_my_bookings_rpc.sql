-- Customer-facing read of one's own bus bookings (joined with trip/route/operator).
-- SECURITY DEFINER but self-scoped: only returns rows where customer_id = auth.uid().
-- Applied to the linked project via MCP on 2026-06-01.
CREATE OR REPLACE FUNCTION public.get_my_bus_bookings()
RETURNS TABLE (
  booking_id uuid,
  booking_ref text,
  status text,
  payment_status text,
  seats jsonb,
  passenger_count integer,
  amount_cents integer,
  currency text,
  operator text,
  origin text,
  destination text,
  depart_date date,
  depart_time text,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    b.id, b.booking_ref, b.status, b.payment_status, b.seats, b.passenger_count,
    b.amount_cents, b.currency, sp.name, r.origin, r.destination,
    t.depart_date, t.depart_time, b.created_at
  FROM public.bus_bookings b
  JOIN public.bus_trips t ON t.id = b.trip_id
  JOIN public.bus_routes r ON r.id = t.route_id
  JOIN public.store_profiles sp ON sp.id = b.store_id
  WHERE b.customer_id = auth.uid()
  ORDER BY b.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_bus_bookings() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_bus_bookings() FROM anon;

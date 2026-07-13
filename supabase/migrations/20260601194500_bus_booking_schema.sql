-- Bus booking vertical (operators = store_profiles with category='bus').
-- Routes/trips are publicly browsable catalog; bookings follow the repo's
-- reservation-security rule (customer access via SECURITY DEFINER RPC).
-- Reuses existing helpers: is_store_owner(uuid), is_admin(uuid), set_updated_at().
-- Applied to the linked project via MCP on 2026-06-01.

CREATE TABLE IF NOT EXISTS public.bus_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km numeric,
  duration_mins integer,
  base_price_cents integer NOT NULL DEFAULT 0 CHECK (base_price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  depart_date date NOT NULL,
  depart_time text NOT NULL,
  arrive_time text,
  bus_type text NOT NULL DEFAULT 'Coach',
  total_seats integer NOT NULL DEFAULT 40 CHECK (total_seats > 0 AND total_seats <= 80),
  seat_layout text NOT NULL DEFAULT '2-2',
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled','departed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.bus_trips(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seats jsonb NOT NULL DEFAULT '[]'::jsonb,
  passenger_count integer NOT NULL DEFAULT 1 CHECK (passenger_count > 0),
  contact_name text,
  contact_phone text,
  amount_cents integer NOT NULL DEFAULT 0 CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'hold' CHECK (status IN ('hold','confirmed','cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','authorized','captured','failed','refunded')),
  stripe_payment_intent_id text,
  booking_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bus_routes_store ON public.bus_routes(store_id);
CREATE INDEX IF NOT EXISTS idx_bus_routes_od ON public.bus_routes(origin, destination);
CREATE INDEX IF NOT EXISTS idx_bus_trips_store ON public.bus_trips(store_id);
CREATE INDEX IF NOT EXISTS idx_bus_trips_route ON public.bus_trips(route_id);
CREATE INDEX IF NOT EXISTS idx_bus_trips_date ON public.bus_trips(depart_date);
CREATE INDEX IF NOT EXISTS idx_bus_bookings_store ON public.bus_bookings(store_id);
CREATE INDEX IF NOT EXISTS idx_bus_bookings_trip ON public.bus_bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_bus_bookings_customer ON public.bus_bookings(customer_id);

DROP TRIGGER IF EXISTS trg_bus_routes_updated ON public.bus_routes;
CREATE TRIGGER trg_bus_routes_updated BEFORE UPDATE ON public.bus_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bus_trips_updated ON public.bus_trips;
CREATE TRIGGER trg_bus_trips_updated BEFORE UPDATE ON public.bus_trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bus_bookings_updated ON public.bus_bookings;
CREATE TRIGGER trg_bus_bookings_updated BEFORE UPDATE ON public.bus_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bus_routes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bus_routes_select ON public.bus_routes;
CREATE POLICY bus_routes_select ON public.bus_routes FOR SELECT
  USING (status = 'active' OR public.is_store_owner(store_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_routes_manage ON public.bus_routes;
CREATE POLICY bus_routes_manage ON public.bus_routes FOR ALL
  USING (public.is_store_owner(store_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS bus_trips_select ON public.bus_trips;
CREATE POLICY bus_trips_select ON public.bus_trips FOR SELECT
  USING (status = 'scheduled' OR public.is_store_owner(store_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_trips_manage ON public.bus_trips;
CREATE POLICY bus_trips_manage ON public.bus_trips FOR ALL
  USING (public.is_store_owner(store_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS bus_bookings_select ON public.bus_bookings;
CREATE POLICY bus_bookings_select ON public.bus_bookings FOR SELECT
  USING (customer_id = auth.uid() OR public.is_store_owner(store_id) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_bookings_owner_update ON public.bus_bookings;
CREATE POLICY bus_bookings_owner_update ON public.bus_bookings FOR UPDATE
  USING (public.is_store_owner(store_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id) OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.search_bus_trips(
  p_from text DEFAULT NULL,
  p_to text DEFAULT NULL,
  p_date date DEFAULT NULL
)
RETURNS TABLE (
  trip_id uuid, store_id uuid, operator text, origin text, destination text,
  depart_date date, depart_time text, arrive_time text, duration_mins integer,
  bus_type text, seat_layout text, total_seats integer, price_cents integer,
  currency text, amenities jsonb, rating numeric, seats_left integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    t.id, t.store_id, sp.name, r.origin, r.destination,
    t.depart_date, t.depart_time, t.arrive_time, r.duration_mins,
    t.bus_type, t.seat_layout, t.total_seats, t.price_cents, t.currency,
    t.amenities, sp.rating,
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

CREATE OR REPLACE FUNCTION public.get_bus_trip_seats(p_trip_id uuid)
RETURNS TABLE (seat text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT s.seat
  FROM public.bus_bookings b
  CROSS JOIN LATERAL jsonb_array_elements_text(b.seats) AS s(seat)
  WHERE b.trip_id = p_trip_id AND b.status IN ('hold','confirmed');
$$;

CREATE OR REPLACE FUNCTION public.create_bus_booking(
  p_trip_id uuid, p_seats jsonb, p_contact_name text, p_contact_phone text
)
RETURNS TABLE (booking_id uuid, booking_ref text, amount_cents integer, currency text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trip public.bus_trips%ROWTYPE;
  v_count int;
  v_amount int;
  v_ref text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF p_seats IS NULL OR jsonb_typeof(p_seats) <> 'array' OR jsonb_array_length(p_seats) = 0 THEN
    RAISE EXCEPTION 'no_seats';
  END IF;

  SELECT * INTO v_trip FROM public.bus_trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'trip_not_found'; END IF;
  IF v_trip.status <> 'scheduled' THEN RAISE EXCEPTION 'trip_unavailable'; END IF;

  v_count := jsonb_array_length(p_seats);

  IF EXISTS (
    SELECT 1 FROM public.bus_bookings b
    CROSS JOIN LATERAL jsonb_array_elements_text(b.seats) AS bs(seat)
    WHERE b.trip_id = p_trip_id AND b.status IN ('hold','confirmed')
      AND bs.seat IN (SELECT jsonb_array_elements_text(p_seats))
  ) THEN RAISE EXCEPTION 'seat_taken'; END IF;

  v_amount := v_trip.price_cents * v_count;
  v_ref := 'ZB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.bus_bookings (
    store_id, trip_id, customer_id, seats, passenger_count,
    contact_name, contact_phone, amount_cents, currency,
    status, payment_status, booking_ref
  ) VALUES (
    v_trip.store_id, p_trip_id, v_uid, p_seats, v_count,
    p_contact_name, p_contact_phone, v_amount, v_trip.currency,
    'hold', 'pending', v_ref
  ) RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_ref, v_amount, v_trip.currency;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_bus_trips(text, text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_bus_trip_seats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_bus_booking(uuid, jsonb, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_bus_booking(uuid, jsonb, text, text) FROM anon;

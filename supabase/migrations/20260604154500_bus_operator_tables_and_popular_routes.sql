-- Complete the bus operator backend used by BusOperatorConsole and the
-- customer-facing bus page. New public objects include explicit grants because
-- Supabase's 2026 Data API defaults no longer expose public tables implicitly.

CREATE TABLE IF NOT EXISTS public.bus_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  plate text,
  vehicle_type text NOT NULL DEFAULT 'Coach',
  total_seats integer NOT NULL DEFAULT 40 CHECK (total_seats > 0 AND total_seats <= 80),
  seat_layout text NOT NULL DEFAULT '2-2',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  license_number text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.bus_routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  stop_order integer NOT NULL DEFAULT 0 CHECK (stop_order >= 0),
  offset_mins integer CHECK (offset_mins IS NULL OR offset_mins >= 0),
  kind text NOT NULL DEFAULT 'both' CHECK (kind IN ('pickup','dropoff','both')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL DEFAULT 0 CHECK (discount_value > 0),
  min_fare_cents integer NOT NULL DEFAULT 0 CHECK (min_fare_cents >= 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_on date,
  ends_on date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bus_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.bus_trips(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bus_bookings(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  reply text,
  replied_at timestamptz,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bus_trips ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.bus_vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.bus_trips ADD COLUMN IF NOT EXISTS driver_id uuid REFERENCES public.bus_drivers(id) ON DELETE SET NULL;
ALTER TABLE public.bus_bookings ADD COLUMN IF NOT EXISTS boarded_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_promos_store_code ON public.bus_promos(store_id, upper(code));
CREATE INDEX IF NOT EXISTS idx_bus_vehicles_store ON public.bus_vehicles(store_id);
CREATE INDEX IF NOT EXISTS idx_bus_drivers_store ON public.bus_drivers(store_id);
CREATE INDEX IF NOT EXISTS idx_bus_route_stops_route ON public.bus_route_stops(route_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_bus_promos_store_status ON public.bus_promos(store_id, status);
CREATE INDEX IF NOT EXISTS idx_bus_reviews_store ON public.bus_reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_bus_reviews_trip ON public.bus_reviews(trip_id);

DROP TRIGGER IF EXISTS trg_bus_vehicles_updated ON public.bus_vehicles;
CREATE TRIGGER trg_bus_vehicles_updated BEFORE UPDATE ON public.bus_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bus_drivers_updated ON public.bus_drivers;
CREATE TRIGGER trg_bus_drivers_updated BEFORE UPDATE ON public.bus_drivers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bus_route_stops_updated ON public.bus_route_stops;
CREATE TRIGGER trg_bus_route_stops_updated BEFORE UPDATE ON public.bus_route_stops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bus_promos_updated ON public.bus_promos;
CREATE TRIGGER trg_bus_promos_updated BEFORE UPDATE ON public.bus_promos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bus_reviews_updated ON public.bus_reviews;
CREATE TRIGGER trg_bus_reviews_updated BEFORE UPDATE ON public.bus_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bus_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bus_vehicles_owner_manage ON public.bus_vehicles;
CREATE POLICY bus_vehicles_owner_manage ON public.bus_vehicles FOR ALL
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS bus_drivers_owner_manage ON public.bus_drivers;
CREATE POLICY bus_drivers_owner_manage ON public.bus_drivers FOR ALL
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS bus_route_stops_public_read ON public.bus_route_stops;
CREATE POLICY bus_route_stops_public_read ON public.bus_route_stops FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bus_routes r
    WHERE r.id = route_id
      AND (r.status = 'active' OR public.is_store_owner(r.store_id, auth.uid()) OR public.is_admin(auth.uid()))
  ));
DROP POLICY IF EXISTS bus_route_stops_owner_manage ON public.bus_route_stops;
CREATE POLICY bus_route_stops_owner_manage ON public.bus_route_stops FOR ALL
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS bus_promos_public_read ON public.bus_promos;
CREATE POLICY bus_promos_public_read ON public.bus_promos FOR SELECT
  USING (status = 'active' OR public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_promos_owner_manage ON public.bus_promos;
CREATE POLICY bus_promos_owner_manage ON public.bus_promos FOR ALL
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS bus_reviews_read ON public.bus_reviews;
CREATE POLICY bus_reviews_read ON public.bus_reviews FOR SELECT
  USING (status = 'published' OR customer_id = auth.uid() OR public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS bus_reviews_customer_insert ON public.bus_reviews;
CREATE POLICY bus_reviews_customer_insert ON public.bus_reviews FOR INSERT
  WITH CHECK (customer_id = auth.uid());
DROP POLICY IF EXISTS bus_reviews_owner_update ON public.bus_reviews;
CREATE POLICY bus_reviews_owner_update ON public.bus_reviews FOR UPDATE
  USING (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.is_admin(auth.uid()));

GRANT SELECT ON TABLE public.bus_routes, public.bus_trips, public.bus_route_stops, public.bus_promos, public.bus_reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bus_routes, public.bus_trips TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.bus_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bus_vehicles, public.bus_drivers, public.bus_route_stops, public.bus_promos TO authenticated;
GRANT SELECT, INSERT ON TABLE public.bus_reviews TO authenticated;
GRANT UPDATE ON TABLE public.bus_reviews TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.bus_routes, public.bus_trips, public.bus_bookings, public.bus_vehicles, public.bus_drivers, public.bus_route_stops, public.bus_promos, public.bus_reviews TO service_role;

DROP FUNCTION IF EXISTS public.create_bus_booking(uuid, jsonb, text, text);
CREATE OR REPLACE FUNCTION public.create_bus_booking(
  p_trip_id uuid,
  p_seats jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_promo_code text DEFAULT NULL
)
RETURNS TABLE (booking_id uuid, booking_ref text, amount_cents integer, currency text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_trip public.bus_trips%ROWTYPE;
  v_seats text[];
  v_seat text;
  v_row int;
  v_col int;
  v_idx int;
  v_count int;
  v_subtotal int;
  v_discount int := 0;
  v_promo public.bus_promos%ROWTYPE;
  v_ref text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF p_seats IS NULL OR jsonb_typeof(p_seats) <> 'array' OR jsonb_array_length(p_seats) = 0 THEN
    RAISE EXCEPTION 'no_seats';
  END IF;

  SELECT array_agg(upper(trim(value))) INTO v_seats
  FROM jsonb_array_elements_text(p_seats);
  v_count := COALESCE(array_length(v_seats, 1), 0);
  IF v_count = 0 OR v_count > 6 THEN RAISE EXCEPTION 'invalid_seats'; END IF;
  IF (SELECT count(*) FROM unnest(v_seats) AS s(seat)) <> (SELECT count(DISTINCT seat) FROM unnest(v_seats) AS s(seat)) THEN
    RAISE EXCEPTION 'duplicate_seats';
  END IF;

  SELECT * INTO v_trip FROM public.bus_trips WHERE id = p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'trip_not_found'; END IF;
  IF v_trip.status <> 'scheduled' THEN RAISE EXCEPTION 'trip_unavailable'; END IF;

  FOREACH v_seat IN ARRAY v_seats LOOP
    IF v_seat !~ '^[1-9][0-9]*[A-D]$' THEN RAISE EXCEPTION 'invalid_seats'; END IF;
    v_row := substring(v_seat from '^[0-9]+')::int;
    v_col := position(right(v_seat, 1) in 'ABCD') - 1;
    v_idx := ((v_row - 1) * 4) + v_col;
    IF v_idx < 0 OR v_idx >= v_trip.total_seats THEN RAISE EXCEPTION 'invalid_seats'; END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.bus_bookings b
    CROSS JOIN LATERAL jsonb_array_elements_text(b.seats) AS bs(seat)
    WHERE b.trip_id = p_trip_id AND b.status IN ('hold','confirmed')
      AND upper(trim(bs.seat)) = ANY(v_seats)
  ) THEN RAISE EXCEPTION 'seat_taken'; END IF;

  v_subtotal := v_trip.price_cents * v_count;

  IF p_promo_code IS NOT NULL AND length(trim(p_promo_code)) > 0 THEN
    SELECT * INTO v_promo
    FROM public.bus_promos
    WHERE store_id = v_trip.store_id
      AND upper(code) = upper(trim(p_promo_code))
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'promo_invalid'; END IF;
    IF v_promo.starts_on IS NOT NULL AND v_promo.starts_on > current_date THEN RAISE EXCEPTION 'promo_invalid'; END IF;
    IF v_promo.ends_on IS NOT NULL AND v_promo.ends_on < current_date THEN RAISE EXCEPTION 'promo_invalid'; END IF;
    IF v_promo.max_uses IS NOT NULL AND v_promo.used_count >= v_promo.max_uses THEN RAISE EXCEPTION 'promo_exhausted'; END IF;
    IF v_subtotal < v_promo.min_fare_cents THEN RAISE EXCEPTION 'promo_min_fare'; END IF;

    v_discount := CASE
      WHEN v_promo.discount_type = 'fixed' THEN LEAST(v_promo.discount_value, v_subtotal)
      ELSE LEAST(floor(v_subtotal * v_promo.discount_value / 100.0)::int, v_subtotal)
    END;
    UPDATE public.bus_promos SET used_count = used_count + 1 WHERE id = v_promo.id;
  END IF;

  v_ref := 'ZB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.bus_bookings (
    store_id, trip_id, customer_id, seats, passenger_count,
    contact_name, contact_phone, amount_cents, currency,
    status, payment_status, booking_ref
  ) VALUES (
    v_trip.store_id, p_trip_id, v_uid, to_jsonb(v_seats), v_count,
    p_contact_name, p_contact_phone, GREATEST(v_subtotal - v_discount, 0), v_trip.currency,
    'hold', 'pending', v_ref
  ) RETURNING id, amount_cents INTO v_id, v_subtotal;

  RETURN QUERY SELECT v_id, v_ref, v_subtotal, v_trip.currency;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_popular_bus_routes(p_limit integer DEFAULT 6)
RETURNS TABLE (
  origin text,
  destination text,
  trip_count integer,
  next_depart_date date,
  min_price_cents integer,
  currency text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    r.origin,
    r.destination,
    count(t.id)::int AS trip_count,
    min(t.depart_date) AS next_depart_date,
    min(t.price_cents)::int AS min_price_cents,
    min(t.currency) AS currency
  FROM public.bus_routes r
  JOIN public.bus_trips t ON t.route_id = r.id
  WHERE r.status = 'active'
    AND t.status = 'scheduled'
    AND t.depart_date >= current_date
  GROUP BY r.origin, r.destination
  ORDER BY count(t.id) DESC, min(t.depart_date), r.origin, r.destination
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 6), 12));
$$;

GRANT EXECUTE ON FUNCTION public.create_bus_booking(uuid, jsonb, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_bus_booking(uuid, jsonb, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_popular_bus_routes(integer) TO anon, authenticated;

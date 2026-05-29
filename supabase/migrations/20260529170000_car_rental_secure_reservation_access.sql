-- Security fix (HIGH): lock down public access to car_rental_reservations.
--
-- The "Public lookup reservation by code" policy (USING true) and
-- "Public read reservation events" (USING true) let any anon user with the
-- public key SELECT *every* reservation — leaking customer_name/phone/email,
-- addresses, notes AND Stripe identifiers. Because car_rental_reservations is
-- in the supabase_realtime publication, the same broad row policy also leaked
-- those columns through Realtime UPDATE payloads.
--
-- Fix: remove the broad anon row policies entirely and expose only the
-- legitimate anon flows through SECURITY DEFINER RPCs that return a narrow,
-- non-sensitive column set (never stripe_*, payment_lock_token,
-- last_payment_error, internal_notes, payment_provider, etc.).
--
-- Owner/admin and customer-own policies are left untouched.

-- ---------------------------------------------------------------------------
-- 1. Public booking lookup by confirmation code (PublicCarRentalBookingDetailPage)
--    Returns the single matching reservation with sensitive columns omitted.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_car_rental_reservation_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  vehicle_id uuid,
  vehicle_label text,
  vehicle_category text,
  customer_name text,
  customer_phone text,
  customer_email text,
  pickup_location_name text,
  dropoff_location_name text,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  rental_days integer,
  daily_rate_cents integer,
  base_total_cents integer,
  addons_total_cents integer,
  insurance_total_cents integer,
  taxes_cents integer,
  fees_cents integer,
  discount_cents integer,
  security_deposit_cents integer,
  total_cents integer,
  deposit_paid_cents integer,
  amount_paid_cents integer,
  status text,
  confirmation_code text,
  customer_notes text,
  cancelled_at timestamptz,
  cancellation_reason text,
  payment_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id, r.store_id, r.vehicle_id, r.vehicle_label, r.vehicle_category,
    r.customer_name, r.customer_phone, r.customer_email,
    r.pickup_location_name, r.dropoff_location_name,
    r.pickup_at, r.dropoff_at, r.rental_days,
    r.daily_rate_cents, r.base_total_cents, r.addons_total_cents,
    r.insurance_total_cents, r.taxes_cents, r.fees_cents,
    r.discount_cents, r.security_deposit_cents, r.total_cents,
    r.deposit_paid_cents, r.amount_paid_cents,
    r.status::text, r.confirmation_code, r.customer_notes,
    r.cancelled_at, r.cancellation_reason, r.payment_status
  FROM public.car_rental_reservations r
  WHERE p_code IS NOT NULL
    AND r.confirmation_code = upper(btrim(p_code))
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Public review page lookup by reservation id (PublicCarRentalReviewSubmitPage)
--    Only the non-sensitive fields the review form needs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_car_rental_reservation_for_review(p_reservation_id uuid)
RETURNS TABLE (
  id uuid,
  store_id uuid,
  customer_id uuid,
  vehicle_id uuid,
  customer_name text,
  vehicle_label text,
  status text,
  pickup_at timestamptz,
  dropoff_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    r.id, r.store_id, r.customer_id, r.vehicle_id,
    r.customer_name, r.vehicle_label, r.status::text,
    r.pickup_at, r.dropoff_at
  FROM public.car_rental_reservations r
  WHERE r.id = p_reservation_id
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 3. Payment-status poll for a freshly created reservation (PublicCarRentalBookingPage)
--    Replaces the anon Realtime subscription + table poll. Returns only the
--    two non-sensitive status fields the booking wizard waits on.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_car_rental_reservation_payment_status(p_reservation_id uuid)
RETURNS TABLE (
  payment_status text,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.payment_status, r.status::text
  FROM public.car_rental_reservations r
  WHERE r.id = p_reservation_id
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 4. Vehicle availability for the public booking page.
--    Non-sensitive (vehicle_id + dates + status) reservation windows used to
--    compute conflicts, "booked now", and "popular" client-side. Bounded to
--    the last 120 days of pickup dates plus all future bookings.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_car_rental_availability(p_store_id uuid)
RETURNS TABLE (
  vehicle_id uuid,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.vehicle_id, r.pickup_at, r.dropoff_at, r.status::text
  FROM public.car_rental_reservations r
  WHERE r.store_id = p_store_id
    AND r.vehicle_id IS NOT NULL
    AND r.status IN ('pending', 'confirmed', 'picked_up', 'returned')
    AND r.pickup_at >= now() - interval '120 days'
  LIMIT 2000;
$$;

-- ---------------------------------------------------------------------------
-- 5. Create a public ("app") reservation and return its id + confirmation code.
--    Forces source = 'app' and status = 'pending'; validates store/vehicle.
--    Lets the no-overlap exclusion violation (23P01) propagate so the client
--    can prompt the renter to pick another vehicle.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_car_rental_app_reservation(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_store_id uuid := NULLIF(p->>'store_id', '')::uuid;
  v_vehicle_id uuid := NULLIF(p->>'vehicle_id', '')::uuid;
  v_id uuid;
  v_code text;
BEGIN
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;
  IF COALESCE(btrim(p->>'customer_name'), '') = '' THEN
    RAISE EXCEPTION 'customer_name is required';
  END IF;
  IF COALESCE(btrim(p->>'vehicle_label'), '') = '' THEN
    RAISE EXCEPTION 'vehicle_label is required';
  END IF;
  IF (p->>'pickup_at') IS NULL OR (p->>'dropoff_at') IS NULL THEN
    RAISE EXCEPTION 'pickup_at and dropoff_at are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = v_store_id) THEN
    RAISE EXCEPTION 'unknown store';
  END IF;
  -- Prevent booking a vehicle that doesn't belong to the store.
  IF v_vehicle_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.car_rental_vehicles v
       WHERE v.id = v_vehicle_id AND v.store_id = v_store_id
     ) THEN
    RAISE EXCEPTION 'vehicle does not belong to store';
  END IF;

  INSERT INTO public.car_rental_reservations (
    store_id, vehicle_id, pickup_location_id, dropoff_location_id,
    vehicle_label, vehicle_category, customer_name, customer_phone, customer_email,
    pickup_location_name, dropoff_location_name, pickup_at, dropoff_at, rental_days,
    daily_rate_cents, base_total_cents, addons_total_cents, security_deposit_cents,
    discount_cents, taxes_cents, total_cents, customer_notes,
    source, status
  ) VALUES (
    v_store_id,
    v_vehicle_id,
    NULLIF(p->>'pickup_location_id', '')::uuid,
    NULLIF(p->>'dropoff_location_id', '')::uuid,
    p->>'vehicle_label',
    NULLIF(p->>'vehicle_category', ''),
    btrim(p->>'customer_name'),
    NULLIF(btrim(p->>'customer_phone'), ''),
    NULLIF(btrim(p->>'customer_email'), ''),
    NULLIF(p->>'pickup_location_name', ''),
    NULLIF(p->>'dropoff_location_name', ''),
    (p->>'pickup_at')::timestamptz,
    (p->>'dropoff_at')::timestamptz,
    GREATEST(1, COALESCE((p->>'rental_days')::int, 1)),
    GREATEST(0, COALESCE((p->>'daily_rate_cents')::int, 0)),
    GREATEST(0, COALESCE((p->>'base_total_cents')::int, 0)),
    GREATEST(0, COALESCE((p->>'addons_total_cents')::int, 0)),
    GREATEST(0, COALESCE((p->>'security_deposit_cents')::int, 0)),
    GREATEST(0, COALESCE((p->>'discount_cents')::int, 0)),
    GREATEST(0, COALESCE((p->>'taxes_cents')::int, 0)),
    GREATEST(0, COALESCE((p->>'total_cents')::int, 0)),
    NULLIF(p->>'customer_notes', ''),
    'app',
    'pending'
  )
  RETURNING id, confirmation_code INTO v_id, v_code;

  RETURN jsonb_build_object('id', v_id, 'confirmation_code', v_code);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants: these RPCs are the only public entry points into reservations.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_car_rental_reservation_by_code(text) FROM public;
REVOKE ALL ON FUNCTION public.get_car_rental_reservation_for_review(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_car_rental_reservation_payment_status(uuid) FROM public;
REVOKE ALL ON FUNCTION public.get_car_rental_availability(uuid) FROM public;
REVOKE ALL ON FUNCTION public.create_car_rental_app_reservation(jsonb) FROM public;

GRANT EXECUTE ON FUNCTION public.get_car_rental_reservation_by_code(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_car_rental_reservation_for_review(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_car_rental_reservation_payment_status(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_car_rental_availability(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_car_rental_app_reservation(jsonb) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Drop the broad anon policies now that every public flow goes through an RPC.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public lookup reservation by code" ON public.car_rental_reservations;
DROP POLICY IF EXISTS "Public can create app reservations" ON public.car_rental_reservations;
DROP POLICY IF EXISTS "Public read reservation events" ON public.car_rental_reservation_events;

-- Public self-service walk-in check-in.
--
-- Customer scans a QR at the salon door → /salon/:slug/check-in → picks
-- their service + enters name & phone. We insert a salon_bookings row with
-- source='walk_in', status='pending', start_at=now() so it shows up in the
-- existing SalonWalkinsSection at the front desk and in the queue display.
--
-- The standard public-INSERT RLS only allows source='app'; walk-ins go
-- through this SECURITY DEFINER RPC which side-steps RLS and does its own
-- validation (active store + active service + non-empty client name).
--
-- A second RPC lets the customer's check-in confirmation page poll for
-- their current queue position + estimated wait without needing to read
-- the bookings table directly.

------------------------------------------------------------------------------
-- 1. salon_public_create_walkin
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_create_walkin(UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.salon_public_create_walkin(
  p_store_id UUID,
  p_service_id UUID,
  p_client_name TEXT,
  p_client_phone TEXT
)
RETURNS TABLE (
  id UUID,
  position_in_queue INTEGER,
  estimated_wait_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_svc RECORD;
  v_clean_name TEXT;
  v_clean_phone TEXT;
  v_id UUID;
  v_now TIMESTAMPTZ := now();
  v_position INTEGER;
  v_minutes_ahead INTEGER;
  v_active_stylists INTEGER;
BEGIN
  v_clean_name := NULLIF(btrim(COALESCE(p_client_name, '')), '');
  v_clean_phone := NULLIF(btrim(COALESCE(p_client_phone, '')), '');
  IF v_clean_name IS NULL OR char_length(v_clean_name) > 120 THEN
    RAISE EXCEPTION 'valid client name required' USING ERRCODE = 'P0001';
  END IF;
  IF v_clean_phone IS NULL OR char_length(v_clean_phone) > 30 THEN
    RAISE EXCEPTION 'valid client phone required' USING ERRCODE = 'P0001';
  END IF;

  -- Validate the service. Also requires the parent store to be active —
  -- a deactivated store should not accept walk-ins via the QR.
  SELECT s.id, s.name, s.store_id, s.is_active, s.price_cents, s.duration_minutes
    INTO v_svc
    FROM public.salon_services s
    JOIN public.store_profiles sp ON sp.id = s.store_id
    WHERE s.id = p_service_id
      AND s.store_id = p_store_id
      AND s.is_active = true
      AND sp.is_active = true;
  IF v_svc.id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive service for this salon' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.salon_bookings (
    store_id, service_id,
    service_name, price_cents, duration_minutes,
    client_name, client_phone,
    start_at, end_at,
    status, source
  )
  VALUES (
    p_store_id, v_svc.id,
    v_svc.name, v_svc.price_cents, v_svc.duration_minutes,
    v_clean_name, v_clean_phone,
    v_now, v_now + make_interval(mins => v_svc.duration_minutes),
    'pending', 'walk_in'
  )
  RETURNING salon_bookings.id INTO v_id;

  -- Position in queue = count of pending walk-ins from today created BEFORE
  -- this one + 1. Using created_at (just stamped) keeps it monotonic even
  -- if start_at is identical on rapid back-to-back inserts.
  SELECT COUNT(*) + 1
    INTO v_position
    FROM public.salon_bookings
    WHERE store_id = p_store_id
      AND source = 'walk_in'
      AND status = 'pending'
      AND start_at >= date_trunc('day', v_now)
      AND created_at < (SELECT created_at FROM public.salon_bookings WHERE id = v_id);

  -- Estimated wait: total minutes of services ahead in the queue, divided
  -- by the number of active stylists at the store (so two stylists chew
  -- through the queue twice as fast). Falls back to 1 if no stylists are
  -- configured so we don't divide by zero.
  SELECT COALESCE(SUM(b.duration_minutes), 0)::INTEGER
    INTO v_minutes_ahead
    FROM public.salon_bookings b
    WHERE b.store_id = p_store_id
      AND b.source = 'walk_in'
      AND b.status = 'pending'
      AND b.start_at >= date_trunc('day', v_now)
      AND b.created_at < (SELECT created_at FROM public.salon_bookings WHERE id = v_id);

  SELECT GREATEST(1, COUNT(*))::INTEGER
    INTO v_active_stylists
    FROM public.salon_stylists
    WHERE store_id = p_store_id AND is_active = true;

  RETURN QUERY SELECT
    v_id,
    v_position,
    (v_minutes_ahead / v_active_stylists)::INTEGER;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_create_walkin(UUID, UUID, TEXT, TEXT)
  TO anon, authenticated;

------------------------------------------------------------------------------
-- 2. salon_public_get_walkin_status — polled by the customer confirmation
--    page (and refreshed via realtime). Returns the booking's current
--    status + position + ETA. Once the booking is no longer 'pending'
--    (e.g. owner seated them and flipped to 'confirmed' or 'completed'),
--    position is null and the page can render a different state.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_get_walkin_status(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_get_walkin_status(p_booking_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  service_name TEXT,
  client_name TEXT,
  store_name TEXT,
  store_slug TEXT,
  position_in_queue INTEGER,
  estimated_wait_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b RECORD;
  v_position INTEGER;
  v_minutes_ahead INTEGER;
  v_active_stylists INTEGER;
BEGIN
  SELECT b.*, sp.name AS sp_name, sp.slug AS sp_slug
    INTO v_b
    FROM public.salon_bookings b
    JOIN public.store_profiles sp ON sp.id = b.store_id
    WHERE b.id = p_booking_id
      AND b.source = 'walk_in'
      AND sp.is_active = true;
  IF v_b.id IS NULL THEN
    RAISE EXCEPTION 'walk-in not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_b.status <> 'pending' THEN
    -- No longer waiting — the page will render the in-progress / done
    -- state. Position + ETA aren't meaningful here.
    RETURN QUERY SELECT
      v_b.id, v_b.status::text, v_b.service_name, v_b.client_name,
      v_b.sp_name, v_b.sp_slug, NULL::INTEGER, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT COUNT(*) + 1
    INTO v_position
    FROM public.salon_bookings ahead
    WHERE ahead.store_id = v_b.store_id
      AND ahead.source = 'walk_in'
      AND ahead.status = 'pending'
      AND ahead.start_at >= date_trunc('day', now())
      AND ahead.created_at < v_b.created_at;

  SELECT COALESCE(SUM(ahead.duration_minutes), 0)::INTEGER
    INTO v_minutes_ahead
    FROM public.salon_bookings ahead
    WHERE ahead.store_id = v_b.store_id
      AND ahead.source = 'walk_in'
      AND ahead.status = 'pending'
      AND ahead.start_at >= date_trunc('day', now())
      AND ahead.created_at < v_b.created_at;

  SELECT GREATEST(1, COUNT(*))::INTEGER
    INTO v_active_stylists
    FROM public.salon_stylists
    WHERE store_id = v_b.store_id AND is_active = true;

  RETURN QUERY SELECT
    v_b.id, v_b.status::text, v_b.service_name, v_b.client_name,
    v_b.sp_name, v_b.sp_slug, v_position, (v_minutes_ahead / v_active_stylists)::INTEGER;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_walkin_status(UUID)
  TO anon, authenticated;

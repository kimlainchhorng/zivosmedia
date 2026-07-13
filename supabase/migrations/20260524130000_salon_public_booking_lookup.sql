-- Public booking lookup + cancel RPCs.
-- Anonymous clients can look up their booking by its UUID (which acts as
-- the unguessable secret) and cancel it if it hasn't started yet. Direct
-- table SELECT/UPDATE is NOT granted to anon — only these tightly scoped
-- functions, so anon can't enumerate or modify anything else.

CREATE OR REPLACE FUNCTION public.salon_public_get_booking(p_id UUID)
RETURNS TABLE (
  id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  service_name TEXT,
  stylist_name TEXT,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  price_cents INTEGER,
  duration_minutes INTEGER,
  status TEXT,
  source TEXT,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.store_id, sp.name AS store_name, sp.slug AS store_slug,
    b.service_name, b.stylist_name,
    b.client_name, b.client_phone, b.client_email,
    b.start_at, b.end_at,
    b.price_cents, b.duration_minutes,
    b.status::text, b.source,
    b.cancelled_at
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  WHERE b.id = p_id
    AND b.source = 'app'        -- only bookings created through the public site
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_booking(UUID) TO anon, authenticated;


CREATE OR REPLACE FUNCTION public.salon_public_cancel_booking(p_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  cancelled_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.salon_bookings;
BEGIN
  SELECT * INTO v_row FROM public.salon_bookings WHERE salon_bookings.id = p_id;

  IF v_row.id IS NULL OR v_row.source <> 'app' THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'booking is % and cannot be cancelled', v_row.status USING ERRCODE = 'P0001';
  END IF;
  IF v_row.start_at <= now() THEN
    RAISE EXCEPTION 'this appointment has already started or passed' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.salon_bookings
     SET status = 'cancelled',
         cancellation_reason = 'Cancelled by customer'
   WHERE salon_bookings.id = p_id;

  RETURN QUERY
    SELECT b.id, b.status::text, b.cancelled_at
    FROM public.salon_bookings b
    WHERE b.id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_cancel_booking(UUID) TO anon, authenticated;

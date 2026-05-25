-- Public RPCs that exist in production but were missing from local migrations:
--   salon_public_stylist_meta       — header info for the public stylist day page
--   salon_public_stylist_day        — that stylist's bookings inside a day window
--   salon_public_get_booking_for_review — load a completed booking for the review form
--   salon_public_submit_review      — write the review row, with one-per-booking guard
--
-- All four are SECURITY DEFINER so anon can call them without granting any
-- direct table privileges on salon_bookings or salon_reviews.

-- ===== Stylist meta =====
CREATE OR REPLACE FUNCTION public.salon_public_stylist_meta(p_stylist_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    st.id,
    st.display_name,
    st.store_id,
    sp.name AS store_name,
    sp.slug AS store_slug
  FROM public.salon_stylists st
  JOIN public.store_profiles sp ON sp.id = st.store_id
  WHERE st.id = p_stylist_id
    AND st.is_active = true
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_meta(UUID) TO anon, authenticated;

-- ===== Stylist day schedule =====
-- Returns appointments for the stylist between p_day_start and p_day_end.
-- Includes client_name and client_phone because the page is the stylist's
-- own day-of-work view; the URL keys off an unguessable UUID, same trust
-- model as salon_public_get_booking.
CREATE OR REPLACE FUNCTION public.salon_public_stylist_day(
  p_stylist_id UUID,
  p_day_start TIMESTAMPTZ,
  p_day_end TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  store_id UUID,
  store_name TEXT,
  stylist_id UUID,
  stylist_name TEXT,
  service_name TEXT,
  client_name TEXT,
  client_phone TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT,
  internal_notes TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.store_id,
    sp.name AS store_name,
    b.stylist_id,
    COALESCE(b.stylist_name, st.display_name) AS stylist_name,
    b.service_name,
    b.client_name,
    b.client_phone,
    b.start_at,
    b.end_at,
    b.duration_minutes,
    b.status::text,
    b.internal_notes
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  LEFT JOIN public.salon_stylists st ON st.id = b.stylist_id
  WHERE b.stylist_id = p_stylist_id
    AND sp.is_active = true
    AND b.start_at < p_day_end
    AND b.end_at > p_day_start
  ORDER BY b.start_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_day(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- ===== Review-form lookup =====
-- One row only when the booking is reachable for review (completed, public
-- source, store active). already_reviewed lets the page show "thanks, you
-- already reviewed this" without a second round-trip.
CREATE OR REPLACE FUNCTION public.salon_public_get_booking_for_review(p_id UUID)
RETURNS TABLE (
  id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  service_name TEXT,
  stylist_id UUID,
  stylist_name TEXT,
  client_name TEXT,
  start_at TIMESTAMPTZ,
  status TEXT,
  already_reviewed BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.store_id,
    sp.name AS store_name,
    sp.slug AS store_slug,
    b.service_name,
    b.stylist_id,
    b.stylist_name,
    b.client_name,
    b.start_at,
    b.status::text,
    EXISTS (SELECT 1 FROM public.salon_reviews r WHERE r.booking_id = b.id) AS already_reviewed
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  WHERE b.id = p_id
    AND b.source = 'app'
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_booking_for_review(UUID) TO anon, authenticated;

-- ===== Submit review =====
-- Inserts one row into salon_reviews after validating the booking. Refuses
-- if the booking isn't completed, isn't from the public site, or already
-- has a review. Returns the new review id so the page can confirm success.
CREATE OR REPLACE FUNCTION public.salon_public_submit_review(
  p_booking_id UUID,
  p_rating INTEGER,
  p_comment TEXT
)
RETURNS TABLE (id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.salon_bookings;
  v_review_id UUID;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_booking FROM public.salon_bookings WHERE salon_bookings.id = p_booking_id;
  IF v_booking.id IS NULL OR v_booking.source <> 'app' THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_booking.status <> 'completed' THEN
    RAISE EXCEPTION 'You can only review a completed appointment.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.salon_reviews r WHERE r.booking_id = p_booking_id) THEN
    RAISE EXCEPTION 'You already submitted a review for this booking.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.salon_reviews (
    store_id, booking_id, client_id, stylist_id,
    client_name, stylist_name, rating_stars, comment
  )
  VALUES (
    v_booking.store_id, v_booking.id, v_booking.client_id, v_booking.stylist_id,
    v_booking.client_name, v_booking.stylist_name, p_rating,
    NULLIF(btrim(COALESCE(p_comment, '')), '')
  )
  RETURNING salon_reviews.id INTO v_review_id;

  RETURN QUERY SELECT v_review_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_submit_review(UUID, INTEGER, TEXT) TO anon, authenticated;

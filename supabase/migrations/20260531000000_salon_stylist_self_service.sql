-- Stylist self-service RPCs.
--
-- Today /stylist/:id is a read-only schedule view (PublicStylistDayPage).
-- This migration adds anon-callable RPCs that let the stylist actually
-- drive the basics from their phone:
--   * Clock in / clock out (writes salon_time_entries with source='self').
--   * Mark a booking complete (flips status; owner still does the final
--     checkout with tip/tax/payment splits).
--   * Save / edit internal_notes per booking (formulas, allergy notes).
--
-- Trust model: the stylist UUID in the URL is the unguessable token, same
-- as salon_public_stylist_meta / salon_public_stylist_day. Anyone with the
-- link can act as the stylist — the owner controls who gets the link.
-- That model already passed muster for showing client phone + internal
-- notes on the page, so it's consistent for writes here too.

------------------------------------------------------------------------------
-- 1. Open-shift lookup. Used by the page to decide "Clock in" vs
--    "Clock out" + render the elapsed timer.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_stylist_open_shift(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_stylist_open_shift(p_stylist_id UUID)
RETURNS TABLE (
  id UUID,
  start_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT te.id, te.start_at
  FROM public.salon_time_entries te
  JOIN public.salon_stylists st ON st.id = te.stylist_id
  JOIN public.store_profiles sp ON sp.id = st.store_id
  WHERE te.stylist_id = p_stylist_id
    AND te.end_at IS NULL
    AND st.is_active = true
    AND sp.is_active = true
  ORDER BY te.start_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_open_shift(UUID) TO anon, authenticated;

------------------------------------------------------------------------------
-- 2. Clock in. Honors the existing one-open-shift-per-stylist partial
--    unique index by translating 23505 into a friendly error.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_stylist_clock_in(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.salon_public_stylist_clock_in(
  p_stylist_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  start_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_id UUID;
  v_start_at TIMESTAMPTZ;
BEGIN
  SELECT st.store_id INTO v_store_id
    FROM public.salon_stylists st
    JOIN public.store_profiles sp ON sp.id = st.store_id
    WHERE st.id = p_stylist_id
      AND st.is_active = true
      AND sp.is_active = true;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'stylist not found' USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    INSERT INTO public.salon_time_entries (store_id, stylist_id, source, notes)
      VALUES (v_store_id, p_stylist_id, 'self', NULLIF(btrim(p_notes), ''))
      RETURNING salon_time_entries.id, salon_time_entries.start_at
      INTO v_id, v_start_at;
  EXCEPTION
    WHEN unique_violation THEN
      -- Existing open shift — the partial unique index blocks the second
      -- INSERT. Translate to a stable app-level error code.
      RAISE EXCEPTION 'already clocked in' USING ERRCODE = 'P0001';
  END;

  RETURN QUERY SELECT v_id, v_start_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_clock_in(UUID, TEXT) TO anon, authenticated;

------------------------------------------------------------------------------
-- 3. Clock out. Closes the most-recent open shift for the stylist.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_stylist_clock_out(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.salon_public_stylist_clock_out(
  p_stylist_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.salon_time_entries;
BEGIN
  -- Stylist must be active under an active store (mirrors the open_shift
  -- gating; prevents clocking out of a deactivated stylist).
  IF NOT EXISTS (
    SELECT 1 FROM public.salon_stylists st
    JOIN public.store_profiles sp ON sp.id = st.store_id
    WHERE st.id = p_stylist_id
      AND st.is_active = true
      AND sp.is_active = true
  ) THEN
    RAISE EXCEPTION 'stylist not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.salon_time_entries
    SET end_at = now(),
        notes = COALESCE(NULLIF(btrim(p_notes), ''), salon_time_entries.notes),
        updated_at = now()
    WHERE stylist_id = p_stylist_id
      AND end_at IS NULL
    RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'no open shift to clock out' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY SELECT
    v_row.id,
    v_row.start_at,
    v_row.end_at,
    EXTRACT(EPOCH FROM (v_row.end_at - v_row.start_at))::INTEGER / 60;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_clock_out(UUID, TEXT) TO anon, authenticated;

------------------------------------------------------------------------------
-- 4. Mark complete. Stylist flips the booking they actually performed
--    to 'completed'. Tip/tax/payments still happen via the owner-side
--    checkout dialog later — this just moves the booking off the "to do
--    today" list so the page shows it as done.
--
--    Gating: booking.stylist_id must equal p_stylist_id. That stops a
--    URL holder from completing other stylists' bookings.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_stylist_mark_complete(UUID, UUID);

CREATE OR REPLACE FUNCTION public.salon_public_stylist_mark_complete(
  p_booking_id UUID,
  p_stylist_id UUID
)
RETURNS TABLE (
  id UUID,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.salon_bookings;
BEGIN
  SELECT * INTO v_row
    FROM public.salon_bookings
    WHERE salon_bookings.id = p_booking_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.stylist_id IS NULL OR v_row.stylist_id <> p_stylist_id THEN
    RAISE EXCEPTION 'this booking is not assigned to that stylist' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'booking is % and cannot be marked complete', v_row.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.salon_bookings
    SET status = 'completed', updated_at = now()
    WHERE salon_bookings.id = p_booking_id
    RETURNING salon_bookings.id, salon_bookings.status::text
    INTO v_row.id, v_row.status;

  RETURN QUERY SELECT v_row.id, v_row.status::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_mark_complete(UUID, UUID) TO anon, authenticated;

------------------------------------------------------------------------------
-- 5. Save / edit internal notes. Useful for color formulas, allergies,
--    chair-side observations the stylist wants to remember for next time.
--    Length-capped to the same 1000-char ceiling as the salon_bookings
--    column itself.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_stylist_save_notes(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.salon_public_stylist_save_notes(
  p_booking_id UUID,
  p_stylist_id UUID,
  p_notes TEXT
)
RETURNS TABLE (
  id UUID,
  internal_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.salon_bookings;
  v_clean TEXT;
BEGIN
  SELECT * INTO v_row
    FROM public.salon_bookings
    WHERE salon_bookings.id = p_booking_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.stylist_id IS NULL OR v_row.stylist_id <> p_stylist_id THEN
    RAISE EXCEPTION 'this booking is not assigned to that stylist' USING ERRCODE = 'P0001';
  END IF;

  v_clean := NULLIF(btrim(COALESCE(p_notes, '')), '');
  IF v_clean IS NOT NULL AND char_length(v_clean) > 1000 THEN
    v_clean := left(v_clean, 1000);
  END IF;

  UPDATE public.salon_bookings
    SET internal_notes = v_clean, updated_at = now()
    WHERE salon_bookings.id = p_booking_id
    RETURNING salon_bookings.id, salon_bookings.internal_notes
    INTO v_row.id, v_row.internal_notes;

  RETURN QUERY SELECT v_row.id, v_row.internal_notes;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_save_notes(UUID, UUID, TEXT) TO anon, authenticated;

-- Extend the salon_booking_addons rollup so it also pushes salon_bookings.end_at
-- forward when add-ons add to the duration. Without this, the calendar's
-- exclusion constraint (which uses end_at) doesn't account for add-on time
-- and lets a stylist get double-booked into the slot their add-ons are
-- still occupying.

CREATE OR REPLACE FUNCTION public.tg_salon_booking_addons_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_total_cents INTEGER;
  v_total_minutes INTEGER;
  v_start TIMESTAMPTZ;
  v_base_minutes INTEGER;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT
    COALESCE(SUM(price_cents * quantity), 0),
    COALESCE(SUM(duration_minutes * quantity), 0)
  INTO v_total_cents, v_total_minutes
  FROM public.salon_booking_addons
  WHERE booking_id = v_booking_id;

  -- Pull current start_at and the base service duration so we can recompute
  -- end_at as start + base + addons. Doing it inside the trigger means the
  -- end_at stays consistent regardless of what code path mutates add-ons.
  SELECT start_at, duration_minutes
  INTO v_start, v_base_minutes
  FROM public.salon_bookings
  WHERE id = v_booking_id;

  UPDATE public.salon_bookings
  SET addons_total_cents = v_total_cents,
      addons_duration_minutes = v_total_minutes,
      end_at = v_start + make_interval(mins => v_base_minutes + v_total_minutes)
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Backfill: bring existing bookings' end_at in sync with the now-correct
-- combined duration. Only touches rows where the current end_at understates
-- the real end (we never shorten — if an owner manually extended a booking
-- for any reason, leave it).
UPDATE public.salon_bookings b
SET end_at = b.start_at + make_interval(mins => b.duration_minutes + b.addons_duration_minutes)
WHERE b.addons_duration_minutes > 0
  AND b.end_at < b.start_at + make_interval(mins => b.duration_minutes + b.addons_duration_minutes);

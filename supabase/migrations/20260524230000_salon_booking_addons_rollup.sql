-- Add-on services attached to a booking (e.g., a manicure with the haircut)
-- live in salon_booking_addons. Until now, nothing rolled them up onto the
-- parent booking, so Income/Reports/Dashboard/Commissions all read
-- price_cents (base service only) and missed add-on revenue. Stylists in
-- particular were short-changed: their commission was computed on base
-- services only, not the add-ons they performed.
--
-- Solution: keep price_cents as the snapshotted *base* service price (its
-- original semantic), and add two new auto-maintained columns:
--
--   addons_total_cents     — sum of unit_price * quantity over all add-ons
--   addons_duration_minutes — sum of duration * quantity (for scheduling)
--
-- Triggers on salon_booking_addons recompute these whenever add-ons change.
-- Downstream code reads `price_cents + addons_total_cents` for total revenue.

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS addons_total_cents INTEGER NOT NULL DEFAULT 0
    CHECK (addons_total_cents >= 0);

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS addons_duration_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (addons_duration_minutes >= 0);

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
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT
    COALESCE(SUM(price_cents * quantity), 0),
    COALESCE(SUM(duration_minutes * quantity), 0)
  INTO v_total_cents, v_total_minutes
  FROM public.salon_booking_addons
  WHERE booking_id = v_booking_id;

  UPDATE public.salon_bookings
  SET addons_total_cents = v_total_cents,
      addons_duration_minutes = v_total_minutes
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS salon_booking_addons_rollup ON public.salon_booking_addons;
CREATE TRIGGER salon_booking_addons_rollup
  AFTER INSERT OR UPDATE OR DELETE ON public.salon_booking_addons
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_booking_addons_rollup();

-- Backfill: bring existing bookings up to date. New installs do nothing.
UPDATE public.salon_bookings b
SET addons_total_cents = COALESCE(t.total_cents, 0),
    addons_duration_minutes = COALESCE(t.total_minutes, 0)
FROM (
  SELECT booking_id,
         SUM(price_cents * quantity) AS total_cents,
         SUM(duration_minutes * quantity) AS total_minutes
  FROM public.salon_booking_addons
  GROUP BY booking_id
) t
WHERE t.booking_id = b.id
  AND (b.addons_total_cents <> COALESCE(t.total_cents, 0)
       OR b.addons_duration_minutes <> COALESCE(t.total_minutes, 0));

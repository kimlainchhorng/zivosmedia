-- Track no_show count on salon_clients so the owner can spot chronic
-- no-shows from the Clients tab. The column exists in the schema but
-- nothing maintained it — bookings flipping to 'no_show' left the
-- client's no_show_count untouched.
--
-- This trigger fires AFTER UPDATE OF status. It increments on transition
-- INTO 'no_show' and decrements on transition OUT (e.g. an owner who
-- marked no_show and then realised the client did arrive can flip it
-- back to 'completed' without an over-count). Bookings without a linked
-- client_id (walk-ins, unmatched public bookings) are skipped.

CREATE OR REPLACE FUNCTION public.tg_salon_booking_no_show_count_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'no_show' AND OLD.status <> 'no_show' AND NEW.client_id IS NOT NULL THEN
    UPDATE public.salon_clients
      SET no_show_count = no_show_count + 1
      WHERE id = NEW.client_id;
  ELSIF OLD.status = 'no_show' AND NEW.status <> 'no_show' AND OLD.client_id IS NOT NULL THEN
    UPDATE public.salon_clients
      SET no_show_count = GREATEST(0, no_show_count - 1)
      WHERE id = OLD.client_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_bookings_no_show_count_sync ON public.salon_bookings;
CREATE TRIGGER salon_bookings_no_show_count_sync
  AFTER UPDATE OF status ON public.salon_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_booking_no_show_count_sync();

-- One-shot backfill: compute no_show_count from existing booking history.
-- Idempotent — exact set, not a delta.
UPDATE public.salon_clients c
SET no_show_count = COALESCE(t.cnt, 0)
FROM (
  SELECT client_id, COUNT(*) AS cnt
  FROM public.salon_bookings
  WHERE status = 'no_show' AND client_id IS NOT NULL
  GROUP BY client_id
) t
WHERE t.client_id = c.id
  AND c.no_show_count <> COALESCE(t.cnt, 0);

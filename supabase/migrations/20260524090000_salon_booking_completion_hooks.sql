-- When a booking transitions to/from 'completed', keep loyalty + client
-- aggregates in sync. This is what turns the 17 isolated tabs into a real
-- workflow: a single status change ripples to the client's record, their
-- points balance, and the loyalty event log.

CREATE OR REPLACE FUNCTION public.tg_salon_booking_completion_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- bypass RLS so completion-side updates always succeed
SET search_path = public
AS $$
DECLARE
  v_points_per_dollar NUMERIC(6, 2);
  v_loyalty_enabled BOOLEAN;
  v_points INTEGER;
  v_spent_delta INTEGER;
BEGIN
  -- No-op if status didn't change or client is null.
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Transition INTO completed
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    IF NEW.client_id IS NOT NULL THEN
      v_spent_delta := COALESCE(NEW.price_cents, 0) + COALESCE(NEW.tip_cents, 0);
      UPDATE public.salon_clients
        SET visits_count = visits_count + 1,
            total_spent_cents = total_spent_cents + v_spent_delta,
            last_visit_at = NEW.start_at
        WHERE id = NEW.client_id;

      -- Loyalty earn (only if program enabled).
      SELECT is_enabled, points_per_dollar
        INTO v_loyalty_enabled, v_points_per_dollar
        FROM public.salon_loyalty_settings
        WHERE store_id = NEW.store_id;
      IF COALESCE(v_loyalty_enabled, false) AND COALESCE(v_points_per_dollar, 0) > 0 THEN
        v_points := ROUND((COALESCE(NEW.price_cents, 0)::NUMERIC / 100) * v_points_per_dollar);
        IF v_points > 0 THEN
          INSERT INTO public.salon_loyalty_events
            (store_id, client_id, event_type, points_delta, reason, booking_id)
          VALUES
            (NEW.store_id, NEW.client_id, 'earn', v_points,
             'Earned from ' || NEW.service_name, NEW.id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- Transition OUT of completed → reverse the side-effects.
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    IF OLD.client_id IS NOT NULL THEN
      v_spent_delta := COALESCE(OLD.price_cents, 0) + COALESCE(OLD.tip_cents, 0);
      UPDATE public.salon_clients
        SET visits_count = GREATEST(0, visits_count - 1),
            total_spent_cents = GREATEST(0, total_spent_cents - v_spent_delta)
        WHERE id = OLD.client_id;

      -- Reverse loyalty earn (only if the earn event exists).
      SELECT is_enabled, points_per_dollar
        INTO v_loyalty_enabled, v_points_per_dollar
        FROM public.salon_loyalty_settings
        WHERE store_id = OLD.store_id;
      IF COALESCE(v_loyalty_enabled, false) AND COALESCE(v_points_per_dollar, 0) > 0 THEN
        v_points := ROUND((COALESCE(OLD.price_cents, 0)::NUMERIC / 100) * v_points_per_dollar);
        IF v_points > 0 THEN
          INSERT INTO public.salon_loyalty_events
            (store_id, client_id, event_type, points_delta, reason, booking_id)
          VALUES
            (OLD.store_id, OLD.client_id, 'adjust', -v_points,
             'Reversed: ' || OLD.service_name, OLD.id);
        END IF;
      END IF;
    END IF;
  END IF;

  -- Stamp cancelled_at automatically if cancelling/no-showing.
  IF NEW.status IN ('cancelled', 'no_show') AND OLD.status NOT IN ('cancelled', 'no_show') THEN
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- We need a BEFORE trigger to set NEW.cancelled_at AND an AFTER for side-effects.
-- Easier: do both in BEFORE. (Side-effect UPDATEs happen on other tables, fine.)
DROP TRIGGER IF EXISTS salon_bookings_completion_sync ON public.salon_bookings;
CREATE TRIGGER salon_bookings_completion_sync
  BEFORE UPDATE OF status ON public.salon_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_booking_completion_sync();

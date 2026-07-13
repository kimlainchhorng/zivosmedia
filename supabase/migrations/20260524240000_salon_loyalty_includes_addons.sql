-- Loyalty points and salon_clients.total_spent_cents both ignored add-on
-- revenue, so a customer spending $50 on a haircut + $20 add-on got points
-- and credit for $50 only. Now that salon_bookings.addons_total_cents is
-- maintained, fold it into both the spend rollup and the points-earned calc.
--
-- This rewrites the completion-sync trigger in place. Existing rows that
-- already earned (or reversed) points off the old formula are NOT
-- retroactively adjusted — fixing the past would require a separate
-- backfill that owners can opt into, since they may have manually
-- compensated clients in the meantime.

CREATE OR REPLACE FUNCTION public.tg_salon_booking_completion_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_per_dollar NUMERIC(6, 2);
  v_loyalty_enabled BOOLEAN;
  v_points INTEGER;
  v_spend_cents INTEGER;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Transition INTO completed
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    IF NEW.client_id IS NOT NULL THEN
      -- Spend now counts the full service total (base + add-ons) + tips,
      -- to match how the Income / Reports / Dashboard tabs aggregate.
      v_spend_cents := COALESCE(NEW.price_cents, 0)
                    + COALESCE(NEW.addons_total_cents, 0)
                    + COALESCE(NEW.tip_cents, 0);
      UPDATE public.salon_clients
        SET visits_count = visits_count + 1,
            total_spent_cents = total_spent_cents + v_spend_cents,
            last_visit_at = NEW.start_at
        WHERE id = NEW.client_id;

      -- Loyalty earn (only if program enabled) — points are awarded on
      -- services + add-ons, NOT tips (tips don't go to the salon) and NOT
      -- tax (pass-through to the government).
      SELECT is_enabled, points_per_dollar
        INTO v_loyalty_enabled, v_points_per_dollar
        FROM public.salon_loyalty_settings
        WHERE store_id = NEW.store_id;
      IF COALESCE(v_loyalty_enabled, false) AND COALESCE(v_points_per_dollar, 0) > 0 THEN
        v_points := ROUND(
          ((COALESCE(NEW.price_cents, 0) + COALESCE(NEW.addons_total_cents, 0))::NUMERIC / 100)
          * v_points_per_dollar
        );
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
      v_spend_cents := COALESCE(OLD.price_cents, 0)
                    + COALESCE(OLD.addons_total_cents, 0)
                    + COALESCE(OLD.tip_cents, 0);
      UPDATE public.salon_clients
        SET visits_count = GREATEST(0, visits_count - 1),
            total_spent_cents = GREATEST(0, total_spent_cents - v_spend_cents)
        WHERE id = OLD.client_id;

      SELECT is_enabled, points_per_dollar
        INTO v_loyalty_enabled, v_points_per_dollar
        FROM public.salon_loyalty_settings
        WHERE store_id = OLD.store_id;
      IF COALESCE(v_loyalty_enabled, false) AND COALESCE(v_points_per_dollar, 0) > 0 THEN
        v_points := ROUND(
          ((COALESCE(OLD.price_cents, 0) + COALESCE(OLD.addons_total_cents, 0))::NUMERIC / 100)
          * v_points_per_dollar
        );
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

-- Trigger definition unchanged — same BEFORE UPDATE OF status on
-- salon_bookings — CREATE OR REPLACE FUNCTION above suffices.

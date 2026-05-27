-- Fix-up: my earlier 20260524240000 (loyalty includes add-ons) rewrote
-- tg_salon_booking_completion_sync but dropped the retail line-item
-- handling that 20260524100000 added — namely:
--
--   1. Iterating salon_booking_retail_items and decrementing stock for
--      each one when a booking transitions INTO 'completed' (and restoring
--      stock when it transitions OUT).
--   2. Including the retail subtotal in salon_clients.total_spent_cents.
--
-- Both regressions are silent: no error, just wrong numbers and undecremented
-- stock. Rewrite the function combining both pieces of behaviour.
--
-- Loyalty points policy stays the same as my prior pass: points are awarded
-- on services + add-ons only, NOT on retail (most US salons gate loyalty to
-- service revenue) and NOT on tips/tax.

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
  v_item RECORD;
  v_retail_total_cents INTEGER := 0;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Transition INTO completed
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    -- Walk retail line items: sum revenue and decrement stock per product.
    FOR v_item IN
      SELECT * FROM public.salon_booking_retail_items WHERE booking_id = NEW.id
    LOOP
      v_retail_total_cents := v_retail_total_cents + (v_item.unit_price_cents * v_item.quantity);
      IF v_item.product_id IS NOT NULL THEN
        UPDATE public.salon_retail_products
          SET stock_quantity = GREATEST(0, stock_quantity - v_item.quantity)
          WHERE id = v_item.product_id;
      END IF;
    END LOOP;

    IF NEW.client_id IS NOT NULL THEN
      -- Spend = services + add-ons + tips + retail. Tax excluded (pass-through).
      v_spend_cents := COALESCE(NEW.price_cents, 0)
                    + COALESCE(NEW.addons_total_cents, 0)
                    + COALESCE(NEW.tip_cents, 0)
                    + v_retail_total_cents;
      UPDATE public.salon_clients
        SET visits_count = visits_count + 1,
            total_spent_cents = total_spent_cents + v_spend_cents,
            last_visit_at = NEW.start_at
        WHERE id = NEW.client_id;

      -- Loyalty earn (points-per-dollar on services + add-ons only).
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

  -- Transition OUT of completed → restore stock and reverse the side-effects.
  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    FOR v_item IN
      SELECT * FROM public.salon_booking_retail_items WHERE booking_id = OLD.id
    LOOP
      v_retail_total_cents := v_retail_total_cents + (v_item.unit_price_cents * v_item.quantity);
      IF v_item.product_id IS NOT NULL THEN
        UPDATE public.salon_retail_products
          SET stock_quantity = stock_quantity + v_item.quantity
          WHERE id = v_item.product_id;
      END IF;
    END LOOP;

    IF OLD.client_id IS NOT NULL THEN
      v_spend_cents := COALESCE(OLD.price_cents, 0)
                    + COALESCE(OLD.addons_total_cents, 0)
                    + COALESCE(OLD.tip_cents, 0)
                    + v_retail_total_cents;
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

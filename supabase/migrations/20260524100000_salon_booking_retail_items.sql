-- Add retail line items to bookings. When a booking is completed, the
-- product stock decrements automatically. When it moves OUT of completed,
-- the stock is restored.

CREATE TABLE IF NOT EXISTS public.salon_booking_retail_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.salon_bookings(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.salon_retail_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL CHECK (char_length(product_name) BETWEEN 1 AND 120),
  unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_booking_retail_items_booking_idx
  ON public.salon_booking_retail_items (booking_id);
CREATE INDEX IF NOT EXISTS salon_booking_retail_items_product_idx
  ON public.salon_booking_retail_items (product_id) WHERE product_id IS NOT NULL;

ALTER TABLE public.salon_booking_retail_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage booking retail items - all"
  ON public.salon_booking_retail_items
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.salon_bookings b
    JOIN public.store_profiles sp ON sp.id = b.store_id
    WHERE b.id = salon_booking_retail_items.booking_id
      AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.salon_bookings b
    JOIN public.store_profiles sp ON sp.id = b.store_id
    WHERE b.id = salon_booking_retail_items.booking_id
      AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  ));

-- ===== Stock-sync trigger on retail items =====
-- Adjusts product stock immediately if the parent booking is already
-- completed at the time the line item changes.
CREATE OR REPLACE FUNCTION public.tg_salon_retail_item_stock_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_status public.salon_booking_status;
  v_product_id UUID;
  v_qty INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_product_id := NEW.product_id;
    v_qty := NEW.quantity;
    IF v_product_id IS NULL THEN RETURN NEW; END IF;
    SELECT status INTO v_parent_status FROM public.salon_bookings WHERE id = NEW.booking_id;
    IF v_parent_status = 'completed' THEN
      UPDATE public.salon_retail_products
        SET stock_quantity = GREATEST(0, stock_quantity - v_qty)
        WHERE id = v_product_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    v_qty := OLD.quantity;
    IF v_product_id IS NULL THEN RETURN OLD; END IF;
    SELECT status INTO v_parent_status FROM public.salon_bookings WHERE id = OLD.booking_id;
    IF v_parent_status = 'completed' THEN
      UPDATE public.salon_retail_products
        SET stock_quantity = stock_quantity + v_qty
        WHERE id = v_product_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS salon_booking_retail_items_stock_sync ON public.salon_booking_retail_items;
CREATE TRIGGER salon_booking_retail_items_stock_sync
  AFTER INSERT OR DELETE ON public.salon_booking_retail_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_retail_item_stock_sync();

-- ===== Extend the booking-completion trigger to flush stock for line items =====
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
  v_spent_delta INTEGER;
  v_item RECORD;
  v_retail_total_cents INTEGER := 0;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    -- Sum retail line items into the visit spend (and decrement stock).
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
      v_spent_delta := COALESCE(NEW.price_cents, 0) + COALESCE(NEW.tip_cents, 0) + v_retail_total_cents;
      UPDATE public.salon_clients
        SET visits_count = visits_count + 1,
            total_spent_cents = total_spent_cents + v_spent_delta,
            last_visit_at = NEW.start_at
        WHERE id = NEW.client_id;

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

  IF OLD.status = 'completed' AND NEW.status <> 'completed' THEN
    -- Restore stock for retail line items.
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
      v_spent_delta := COALESCE(OLD.price_cents, 0) + COALESCE(OLD.tip_cents, 0) + v_retail_total_cents;
      UPDATE public.salon_clients
        SET visits_count = GREATEST(0, visits_count - 1),
            total_spent_cents = GREATEST(0, total_spent_cents - v_spent_delta)
        WHERE id = OLD.client_id;

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

  IF NEW.status IN ('cancelled', 'no_show') AND OLD.status NOT IN ('cancelled', 'no_show') THEN
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

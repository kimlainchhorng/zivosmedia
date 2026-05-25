-- cafe_order_items already has an AFTER trigger that recalculates
-- cafe_orders.subtotal_cents and total_cents whenever line items change.
-- But total_cents also depends on discount_cents, tax_cents, and tip_cents
-- stored on cafe_orders itself. If a future admin UI (or a manual SQL
-- correction) updates one of those without also rewriting total_cents,
-- the order's grand total would silently desync from what receipts and
-- reports show.
--
-- Add a BEFORE UPDATE trigger that recomputes total_cents in-place
-- whenever any of those money inputs change.

CREATE OR REPLACE FUNCTION public.tg_cafe_orders_recalc_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only recompute if a money input actually changed; leaves callers that
  -- explicitly set total_cents (e.g. data backfills) free to do so when
  -- nothing else moved.
  IF NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
     OR NEW.discount_cents IS DISTINCT FROM OLD.discount_cents
     OR NEW.tax_cents IS DISTINCT FROM OLD.tax_cents
     OR NEW.tip_cents IS DISTINCT FROM OLD.tip_cents
  THEN
    NEW.total_cents := GREATEST(NEW.subtotal_cents - NEW.discount_cents, 0)
                       + NEW.tax_cents
                       + NEW.tip_cents;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_orders_recalc_total ON public.cafe_orders;
CREATE TRIGGER cafe_orders_recalc_total
  BEFORE UPDATE OF subtotal_cents, discount_cents, tax_cents, tip_cents
  ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_orders_recalc_total();

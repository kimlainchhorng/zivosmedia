-- Auto-stamp lifecycle timestamps on cafe_orders when status transitions.
--
-- Today the orders hook (useCafeOrders.setStatus) sets the right timestamp
-- client-side. That breaks if anyone — the auto-expire cron, a future
-- migration, an admin running raw SQL, a new code path — updates `status`
-- without setting the matching `*_at` column. The KDS, the dashboard
-- "average prep time" calc, and the reports tab all read those timestamps,
-- so a missing one would look like the order never reached that stage.
--
-- We only stamp if the column is currently NULL so callers that DID set a
-- precise timestamp (e.g. backfilling historic data) keep it.

CREATE OR REPLACE FUNCTION public.tg_cafe_orders_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;

  -- 'preparing' has no dedicated column — it sits between accepted and ready.

  IF NEW.status = 'ready' AND NEW.ready_at IS NULL THEN
    NEW.ready_at := now();
  END IF;

  IF NEW.status = 'served' AND NEW.served_at IS NULL THEN
    NEW.served_at := now();
  END IF;

  IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  END IF;

  IF NEW.status IN ('cancelled', 'refunded') AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_orders_status_timestamps ON public.cafe_orders;
CREATE TRIGGER cafe_orders_status_timestamps
  BEFORE UPDATE OF status ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_orders_status_timestamps();

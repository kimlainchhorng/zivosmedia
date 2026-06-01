-- Force Grocery shopping order lifecycle and rating updates through shopping-order-state-update.
-- Payment webhooks and server cron jobs continue to use service_role.

CREATE OR REPLACE FUNCTION public.shopping_order_state_server_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'authenticated'
     AND (
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.driver_id IS DISTINCT FROM OLD.driver_id OR
       NEW.rating IS DISTINCT FROM OLD.rating OR
       NEW.accepted_at IS DISTINCT FROM OLD.accepted_at OR
       NEW.shopping_started_at IS DISTINCT FROM OLD.shopping_started_at OR
       NEW.shopping_completed_at IS DISTINCT FROM OLD.shopping_completed_at OR
       NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at OR
       NEW.delivered_at IS DISTINCT FROM OLD.delivered_at OR
       NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
     ) THEN
    RAISE EXCEPTION 'shopping_order_state_server_gate_required';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shopping_order_state_server_gate ON public.shopping_orders;
CREATE TRIGGER trg_shopping_order_state_server_gate
BEFORE UPDATE ON public.shopping_orders
FOR EACH ROW
EXECUTE FUNCTION public.shopping_order_state_server_gate();

COMMENT ON FUNCTION public.shopping_order_state_server_gate() IS
'Blocks direct authenticated lifecycle and rating changes on shopping_orders; updates require trusted server-side validation.';

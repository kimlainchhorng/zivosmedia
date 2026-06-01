-- Force Eats driver lifecycle and customer rating changes through eats-order-state-update.
-- Other order fields keep their existing RLS policies.

CREATE OR REPLACE FUNCTION public.food_order_state_server_gate()
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
       NEW.delivered_at IS DISTINCT FROM OLD.delivered_at OR
       NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at OR
       NEW.prepared_at IS DISTINCT FROM OLD.prepared_at OR
       NEW.rating IS DISTINCT FROM OLD.rating
     ) THEN
    RAISE EXCEPTION 'food_order_state_server_gate_required';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_food_order_state_server_gate ON public.food_orders;
CREATE TRIGGER trg_food_order_state_server_gate
BEFORE UPDATE ON public.food_orders
FOR EACH ROW
EXECUTE FUNCTION public.food_order_state_server_gate();

COMMENT ON FUNCTION public.food_order_state_server_gate() IS
'Blocks direct authenticated lifecycle and rating changes on food_orders; updates require trusted server-side validation.';

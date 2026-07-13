-- Force store order lifecycle/payment confirmation changes through store-order-state-update.
-- Service-role webhooks and server jobs remain allowed.

CREATE OR REPLACE FUNCTION public.store_order_state_server_gate()
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
       NEW.payment_confirmed_at IS DISTINCT FROM OLD.payment_confirmed_at OR
       NEW.confirmed_by IS DISTINCT FROM OLD.confirmed_by OR
       NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id OR
       NEW.driver_picked_up_at IS DISTINCT FROM OLD.driver_picked_up_at OR
       NEW.delivered_at IS DISTINCT FROM OLD.delivered_at OR
       NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at OR
       NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason
     ) THEN
    RAISE EXCEPTION 'store_order_state_server_gate_required';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_order_state_server_gate ON public.store_orders;
CREATE TRIGGER trg_store_order_state_server_gate
BEFORE UPDATE ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION public.store_order_state_server_gate();

COMMENT ON FUNCTION public.store_order_state_server_gate() IS
'Blocks direct authenticated lifecycle and payment-confirmation changes on store_orders; updates require trusted server-side validation.';

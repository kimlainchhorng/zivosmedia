-- Force Eats payment status transitions through eats-payment-status-update or payment webhooks.
-- The trigger allows service-role functions while blocking direct authenticated spoofing.

CREATE OR REPLACE FUNCTION public.food_order_payment_status_server_gate()
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
       NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.payment_provider IS DISTINCT FROM OLD.payment_provider OR
       NEW.last_payment_error IS DISTINCT FROM OLD.last_payment_error OR
       NEW.paid_at IS DISTINCT FROM OLD.paid_at OR
       NEW.stripe_payment_id IS DISTINCT FROM OLD.stripe_payment_id OR
       NEW.paypal_order_id IS DISTINCT FROM OLD.paypal_order_id OR
       NEW.paypal_capture_id IS DISTINCT FROM OLD.paypal_capture_id OR
       NEW.square_checkout_id IS DISTINCT FROM OLD.square_checkout_id OR
       NEW.square_payment_id IS DISTINCT FROM OLD.square_payment_id OR
       NEW.wallet_transaction_id IS DISTINCT FROM OLD.wallet_transaction_id
     ) THEN
    RAISE EXCEPTION 'food_order_payment_status_server_gate_required';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_food_order_payment_status_server_gate ON public.food_orders;
CREATE TRIGGER trg_food_order_payment_status_server_gate
BEFORE UPDATE ON public.food_orders
FOR EACH ROW
EXECUTE FUNCTION public.food_order_payment_status_server_gate();

COMMENT ON FUNCTION public.food_order_payment_status_server_gate() IS
'Blocks direct authenticated payment-field changes on food_orders; payment status transitions require trusted server-side validation.';

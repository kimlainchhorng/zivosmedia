-- Prevent reservations for blocked customers (admin OR public path).
CREATE OR REPLACE FUNCTION public.tg_car_rental_block_blocked_customers()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  is_blocked_now BOOLEAN;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('pending', 'confirmed', 'picked_up') THEN RETURN NEW; END IF;

  SELECT is_blocked INTO is_blocked_now
  FROM public.car_rental_customers
  WHERE id = NEW.customer_id;

  IF COALESCE(is_blocked_now, false) THEN
    RAISE EXCEPTION 'CUSTOMER_BLOCKED: This renter is blocked from booking. Edit the customer to lift the block first.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS car_rental_block_blocked_customers ON public.car_rental_reservations;
CREATE TRIGGER car_rental_block_blocked_customers
  BEFORE INSERT OR UPDATE OF customer_id, status ON public.car_rental_reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_block_blocked_customers();

-- Meta CAPI bridge: trigger server-side Purchase events when sales complete.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_meta_capi_bridge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_payload JSONB;
BEGIN
  v_status := lower(coalesce(to_jsonb(NEW) ->> 'status', ''));

  -- Store orders use payment_confirmed/delivered instead of completed in many flows.
  IF TG_TABLE_NAME IN ('store_orders', 'shopping_orders') THEN
    IF v_status NOT IN ('completed', 'delivered', 'payment_confirmed') THEN
      RETURN NEW;
    END IF;
  ELSE
    IF v_status <> 'completed' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Skip duplicate dispatch for updates that were already completed.
  IF TG_OP = 'UPDATE' THEN
    IF lower(coalesce(to_jsonb(OLD) ->> 'status', '')) = v_status THEN
      RETURN NEW;
    END IF;
  END IF;

  v_payload := jsonb_build_object(
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'record', to_jsonb(NEW)
  );

  PERFORM net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/meta-capi-bridge',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := v_payload
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'notify_meta_capi_bridge failed for %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
    RETURN NEW;
END;
$$;

-- Transactions log (generic sales ledger)
DROP TRIGGER IF EXISTS trg_meta_capi_transactions ON public.transactions;
CREATE TRIGGER trg_meta_capi_transactions
AFTER INSERT OR UPDATE OF status ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

-- Ride completion
DROP TRIGGER IF EXISTS trg_meta_capi_trips ON public.trips;
CREATE TRIGGER trg_meta_capi_trips
AFTER INSERT OR UPDATE OF status ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

-- Food delivery completion
DROP TRIGGER IF EXISTS trg_meta_capi_food_orders ON public.food_orders;
CREATE TRIGGER trg_meta_capi_food_orders
AFTER INSERT OR UPDATE OF status ON public.food_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

-- Travel completions
DROP TRIGGER IF EXISTS trg_meta_capi_travel_bookings ON public.travel_bookings;
CREATE TRIGGER trg_meta_capi_travel_bookings
AFTER INSERT OR UPDATE OF status ON public.travel_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

DROP TRIGGER IF EXISTS trg_meta_capi_flight_bookings ON public.flight_bookings;
CREATE TRIGGER trg_meta_capi_flight_bookings
AFTER INSERT OR UPDATE OF status ON public.flight_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

DROP TRIGGER IF EXISTS trg_meta_capi_hotel_bookings ON public.hotel_bookings;
CREATE TRIGGER trg_meta_capi_hotel_bookings
AFTER INSERT OR UPDATE OF status ON public.hotel_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

-- Retail/shopping completions
DROP TRIGGER IF EXISTS trg_meta_capi_shopping_orders ON public.shopping_orders;
CREATE TRIGGER trg_meta_capi_shopping_orders
AFTER INSERT OR UPDATE OF status ON public.shopping_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

DROP TRIGGER IF EXISTS trg_meta_capi_store_orders ON public.store_orders;
CREATE TRIGGER trg_meta_capi_store_orders
AFTER INSERT OR UPDATE OF status ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

DROP TRIGGER IF EXISTS trg_meta_capi_marketplace_orders ON public.marketplace_orders;
CREATE TRIGGER trg_meta_capi_marketplace_orders
AFTER INSERT OR UPDATE OF status ON public.marketplace_orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_meta_capi_bridge();

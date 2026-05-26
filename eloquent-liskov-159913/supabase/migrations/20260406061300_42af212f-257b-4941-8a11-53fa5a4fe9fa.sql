
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper function: fire the meta-conversion-bridge edge function
CREATE OR REPLACE FUNCTION public.notify_meta_conversion_bridge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supabase_url TEXT;
  _service_key  TEXT;
  _payload      JSONB;
  _edge_url     TEXT;
BEGIN
  _supabase_url := current_setting('app.settings.supabase_url', true);
  IF _supabase_url IS NULL OR _supabase_url = '' THEN
    _supabase_url := 'https://slirphzzwcogdbkeicff.supabase.co';
  END IF;

  _service_key := current_setting('app.settings.service_role_key', true);

  _edge_url := _supabase_url || '/functions/v1/meta-conversion-bridge';

  _payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
  );

  PERFORM net.http_post(
    url     := _edge_url,
    body    := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(_service_key, '')
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger on trips
DROP TRIGGER IF EXISTS trg_meta_trips_completed ON public.trips;
CREATE TRIGGER trg_meta_trips_completed
  AFTER UPDATE ON public.trips
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
  EXECUTE FUNCTION public.notify_meta_conversion_bridge();

-- Trigger on food_orders (completed or delivered)
DROP TRIGGER IF EXISTS trg_meta_food_orders_completed ON public.food_orders;
CREATE TRIGGER trg_meta_food_orders_completed
  AFTER UPDATE ON public.food_orders
  FOR EACH ROW
  WHEN (
    (NEW.status = 'completed' OR NEW.status = 'delivered')
    AND OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION public.notify_meta_conversion_bridge();

-- Trigger on flight_bookings
DROP TRIGGER IF EXISTS trg_meta_flight_bookings_completed ON public.flight_bookings;
CREATE TRIGGER trg_meta_flight_bookings_completed
  AFTER UPDATE ON public.flight_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
  EXECUTE FUNCTION public.notify_meta_conversion_bridge();

-- Trigger on travel_bookings
DROP TRIGGER IF EXISTS trg_meta_travel_bookings_completed ON public.travel_bookings;
CREATE TRIGGER trg_meta_travel_bookings_completed
  AFTER UPDATE ON public.travel_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed'))
  EXECUTE FUNCTION public.notify_meta_conversion_bridge();

-- Trigger on profiles: new registration
DROP TRIGGER IF EXISTS trg_meta_profile_registration ON public.profiles;
CREATE TRIGGER trg_meta_profile_registration
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_meta_conversion_bridge();

-- Trigger on profiles: email verified
DROP TRIGGER IF EXISTS trg_meta_profile_verified ON public.profiles;
CREATE TRIGGER trg_meta_profile_verified
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (NEW.email_verified = TRUE AND (OLD.email_verified IS DISTINCT FROM TRUE))
  EXECUTE FUNCTION public.notify_meta_conversion_bridge();

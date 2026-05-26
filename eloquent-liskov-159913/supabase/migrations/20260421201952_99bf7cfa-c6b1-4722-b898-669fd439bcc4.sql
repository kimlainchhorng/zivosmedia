-- Trigger: when a ride hits a terminal status, immediately invoke the
-- close-ride-call-session edge function to tear down its Twilio Proxy session.

CREATE OR REPLACE FUNCTION public.notify_close_call_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  fn_url text := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/close-ride-call-session';
  service_key text;
BEGIN
  -- Only fire on transitions INTO a terminal status (skip if already terminal).
  IF NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('completed', 'cancelled', 'canceled', 'no_show', 'expired') THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Service role key stored as a database setting (set once via vault or alter database)
  -- Falls back silently if not configured — the 5-min cron remains the safety net.
  BEGIN
    service_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_key := NULL;
  END;

  IF service_key IS NULL OR service_key = '' THEN
    RAISE NOTICE 'notify_close_call_session: app.service_role_key not set, skipping http call';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object('ride_request_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_close_call_sessions_on_ride_end ON public.ride_requests;

CREATE TRIGGER trg_close_call_sessions_on_ride_end
AFTER UPDATE OF status ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_close_call_session();
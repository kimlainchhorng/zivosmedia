
-- 1. Create trigger function to log status changes to service_uptime_log
CREATE OR REPLACE FUNCTION public.fn_log_service_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.service_uptime_log (
    service_key,
    previous_status,
    new_status,
    changed_at,
    duration_seconds
  ) VALUES (
    NEW.service_key,
    OLD.status,
    NEW.status,
    now(),
    EXTRACT(EPOCH FROM (now() - COALESCE(OLD.updated_at, OLD.created_at)))::int
  );
  RETURN NEW;
END;
$$;

-- 2. Attach trigger to service_health_status on status change
CREATE TRIGGER trg_log_service_status_change
  AFTER UPDATE ON public.service_health_status
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.fn_log_service_status_change();

-- 3. Add INSERT policy on system_logs (allow trigger/service-role inserts)
CREATE POLICY "Allow inserts to system_logs"
  ON public.system_logs
  FOR INSERT
  WITH CHECK (true);

-- 4. Add INSERT policy on service_uptime_log (allow trigger inserts)
CREATE POLICY "Allow inserts to service_uptime_log"
  ON public.service_uptime_log
  FOR INSERT
  WITH CHECK (true);

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name
DO $$
BEGIN
  PERFORM cron.unschedule('close-trip-call-sessions-5min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'close-trip-call-sessions-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Schedule cleanup every 5 minutes
SELECT cron.schedule(
  'close-trip-call-sessions-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/close-trip-call-sessions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Helper RPC for participant check used by create-masked-call-session if not already present
CREATE OR REPLACE FUNCTION public.is_trip_participant(_ride_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ride_requests rr
    LEFT JOIN public.drivers d ON d.id = rr.assigned_driver_id
    WHERE rr.id = _ride_id
      AND (rr.user_id = _user_id OR d.user_id = _user_id)
  );
$$;
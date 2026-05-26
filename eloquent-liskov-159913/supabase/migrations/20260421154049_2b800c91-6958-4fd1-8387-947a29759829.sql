-- Remove any previous schedules with these names (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('ads-studio-auto-winner-15m') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ads-studio-auto-winner-15m');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('ads-studio-publish-drain-5m') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ads-studio-publish-drain-5m');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Auto-winner: every 15 minutes
SELECT cron.schedule(
  'ads-studio-auto-winner-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ads-studio-auto-winner',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Publish-queue drain: every 5 minutes
SELECT cron.schedule(
  'ads-studio-publish-drain-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ads-studio-publish',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb
  );
  $$
);
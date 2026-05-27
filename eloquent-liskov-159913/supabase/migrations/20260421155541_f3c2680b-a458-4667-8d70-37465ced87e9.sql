DO $$ BEGIN
  PERFORM cron.unschedule('ads-studio-budget-guard-10m') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='ads-studio-budget-guard-10m');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'ads-studio-budget-guard-10m',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ads-studio-budget-guard',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
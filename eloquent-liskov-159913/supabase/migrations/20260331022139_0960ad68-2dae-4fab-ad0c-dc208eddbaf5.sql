
SELECT cron.schedule(
  'auto-cancel-stale-orders',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://slirphzzwcogdbkeicff.supabase.co/functions/v1/auto-cancel-stale-orders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb,
    body:='{"time": "now"}'::jsonb
  ) as request_id;
  $$
);

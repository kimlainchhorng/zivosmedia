
-- Unschedule any previous instance to keep this idempotent
DO $$
DECLARE jid INT;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'channel-publish-scheduled-every-minute';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
END $$;

SELECT cron.schedule(
  'channel-publish-scheduled-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/channel-publish-scheduled',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI'
    ),
    body := jsonb_build_object('ts', now())
  );
  $$
);

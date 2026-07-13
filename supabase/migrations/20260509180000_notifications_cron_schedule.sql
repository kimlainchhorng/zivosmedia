-- ============================================================================
-- notifications-cron schedule
-- ----------------------------------------------------------------------------
-- Runs every hour. Each scan inside notifications-cron is idempotent (the
-- dispatcher dedupes by `idempotency_key` over a 24h window) so re-runs do
-- not double-send. Hourly cadence matches the 1-hour windows the function
-- uses to bracket "24h before departure", "subscription expires soon", etc.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop any prior schedule under the same name so this migration is re-runnable.
DO $$ BEGIN
  PERFORM cron.unschedule('notifications-cron-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'notifications-cron-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/notifications-cron',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

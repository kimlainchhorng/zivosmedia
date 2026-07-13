-- ============================================================================
-- weekly digest schedule
-- ----------------------------------------------------------------------------
-- Monday 09:00 UTC — sends each active user a "Your week in Zivo" inbox card
-- + email summarising new followers, unread notifications, spend, and tips.
-- Idempotency-keyed by ISO week so re-runs that week never double-send.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('notifications-weekly-digest');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'notifications-weekly-digest',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/notifications-weekly-digest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

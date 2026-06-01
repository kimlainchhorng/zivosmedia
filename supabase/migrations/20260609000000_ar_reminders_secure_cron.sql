-- Auto Repair — reschedule reminders dispatcher with an internal cron secret.
-- Supabase CLI is not available in this workspace, so this migration follows
-- the existing project timestamp sequence manually.

select cron.unschedule(jobid)
from cron.job
where jobname = 'ar-reminders-dispatch-15m';

select cron.schedule(
  'ar-reminders-dispatch-15m',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ar-reminders-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Auto Repair — schedule the reminders dispatcher to run every 15 minutes.
-- The edge function ar-reminders-dispatch queries ar_service_reminders for
-- rows with status='scheduled' and due_at<=now(), then sends email (Resend)
-- or SMS (send-sms) and marks them as sent.

select cron.schedule(
  'ar-reminders-dispatch-15m',
  '*/15 * * * *',
  $$
    select net.http_post(
      url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/ar-reminders-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

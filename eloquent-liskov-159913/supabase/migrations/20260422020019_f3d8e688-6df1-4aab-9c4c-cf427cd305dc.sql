create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule any prior job with the same name (safe re-run)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'marketing-automations-tick') then
    perform cron.unschedule('marketing-automations-tick');
  end if;
end $$;

select cron.schedule(
  'marketing-automations-tick',
  '*/5 * * * *',
  $$
  select net.http_post(
    url:='https://slirphzzwcogdbkeicff.supabase.co/functions/v1/marketing-automations-tick',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.cron_secret', true)
    ),
    body:=jsonb_build_object('triggered_at', now())
  );
  $$
);
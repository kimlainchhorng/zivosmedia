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
    headers:='{"Content-Type":"application/json","Authorization":"Bearer zivo_cron_a3f9k2b8m5n1p7q4r6s8t0v2w"}'::jsonb,
    body:=jsonb_build_object('triggered_at', now())
  );
  $$
);
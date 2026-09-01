-- Apply only after the HMAC signer preparation migration is live and signed
-- readiness requests have returned HTTP 204 for all three Edge Functions.

do $migration$
declare
  target_job_rows integer;
  redacted_history_rows integer;
begin
  if to_regprocedure(
    'private.enqueue_internal_cron(text,jsonb,text)'
  ) is null then
    raise exception 'The internal cron HMAC signer is unavailable';
  end if;

  select count(*)
    into target_job_rows
  from cron.job
  where jobname in (
    'auto-cancel-stale-orders',
    'close-trip-call-sessions-5min',
    'marketing-automations-tick'
  );

  if target_job_rows <> 3 then
    raise exception 'Expected all three internal Edge cron jobs before auth cutover';
  end if;

  -- Hosted pg_net/pg_cron extension tables are owned by supabase_admin. The
  -- project's postgres role cannot replace their owner-issued PUBLIC ACLs.
  -- Browser access is instead excluded by the hosted NOLOGIN roles, Data API
  -- schema boundary (verified in the runbook), and the bridge check below.
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'graphql_public')
      and p.prokind = 'f'
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
      and (
        pg_get_functiondef(p.oid) ilike '%net.http_request_queue%'
        or pg_get_functiondef(p.oid) ilike '%net._http_response%'
        or pg_get_functiondef(p.oid) ilike '%cron.job_run_details%'
        or pg_get_functiondef(p.oid) ilike '%cron.job%'
      )
  ) then
    raise exception 'A browser-executable Data API function exposes cron/pg_net internals';
  end if;

  -- Retain run identity, status, timing, and return evidence while removing the
  -- historical command copies that contain obsolete Authorization credentials.
  update cron.job_run_details
  set command = '[redacted legacy cron credential command]'
  where jobid in (
    select jobid
    from cron.job
    where jobname in (
      'auto-cancel-stale-orders',
      'close-trip-call-sessions-5min',
      'marketing-automations-tick'
    )
  )
    and (
      command ilike '%Authorization%'
      or command ilike '%x-cron-secret%'
    );

  get diagnostics redacted_history_rows = row_count;

  if exists (
    select 1
    from cron.job_run_details
    where jobid in (
      select jobid
      from cron.job
      where jobname in (
        'auto-cancel-stale-orders',
        'close-trip-call-sessions-5min',
        'marketing-automations-tick'
      )
    )
      and (
        command ilike '%Authorization%'
        or command ilike '%x-cron-secret%'
      )
  ) then
    raise exception 'Legacy credential material remains in pg_cron history';
  end if;

  raise notice 'Redacted % legacy cron history command rows; run metadata was retained', redacted_history_rows;

  perform cron.alter_job(
    job_id := (select jobid from cron.job where jobname = 'auto-cancel-stale-orders'),
    command := $job$
      select private.enqueue_internal_cron(
        'auto-cancel-stale-orders',
        jsonb_build_object('triggered_at', now()),
        'execute'
      ) as request_id;
    $job$
  );

  perform cron.alter_job(
    job_id := (select jobid from cron.job where jobname = 'close-trip-call-sessions-5min'),
    command := $job$
      select private.enqueue_internal_cron(
        'close-trip-call-sessions',
        '{}'::jsonb,
        'execute'
      ) as request_id;
    $job$
  );

  perform cron.alter_job(
    job_id := (select jobid from cron.job where jobname = 'marketing-automations-tick'),
    command := $job$
      select private.enqueue_internal_cron(
        'marketing-automations-tick',
        jsonb_build_object('triggered_at', now()),
        'execute'
      ) as request_id;
    $job$
  );

  if exists (
    select 1
    from cron.job
    where jobname in (
      'auto-cancel-stale-orders',
      'close-trip-call-sessions-5min',
      'marketing-automations-tick'
    )
      and (
        command ilike '%Authorization%'
        or command ilike '%x-cron-secret%'
        or command ilike '%vault.decrypted_secrets%'
      )
  ) then
    raise exception 'A cutover job still persists a long-lived credential reference';
  end if;
end
$migration$;

-- Move the three current operational Edge cron jobs off embedded bearer
-- credentials. pg_net's request queue is owned by the hosted extension and
-- cannot be re-ACL'd by the project's postgres role, so scheduled requests use
-- a short-lived HMAC envelope instead of persisting the long-lived Vault secret
-- in request headers. The Edge handler claims every nonce atomically before any
-- business work, making a captured envelope single-use.

do $precheck$
declare
  internal_secret text;
  internal_secret_rows integer;
  nonce_rls_enabled boolean;
begin
  if to_regclass('cron.job') is null
    or to_regclass('cron.job_run_details') is null then
    raise exception 'Required pg_cron operational tables are unavailable';
  end if;

  if to_regclass('net.http_request_queue') is null
    or to_regclass('net._http_response') is null
    or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    raise exception 'Required pg_net objects are unavailable';
  end if;

  if to_regclass('vault.decrypted_secrets') is null then
    raise exception 'vault.decrypted_secrets is unavailable';
  end if;

  if to_regprocedure('extensions.digest(bytea,text)') is null
    or to_regprocedure('extensions.hmac(bytea,bytea,text)') is null then
    raise exception 'Required pgcrypto digest/HMAC functions are unavailable';
  end if;

  if to_regnamespace('private') is null then
    raise exception 'The private schema is unavailable';
  end if;

  if to_regclass('public.nonce_cache') is null then
    raise exception 'The replay nonce cache is unavailable';
  end if;

  select c.relrowsecurity
    into nonce_rls_enabled
  from pg_class c
  where c.oid = 'public.nonce_cache'::regclass;

  if not coalesce(nonce_rls_enabled, false) then
    raise exception 'public.nonce_cache must keep row-level security enabled';
  end if;

  if not has_table_privilege('service_role', 'public.nonce_cache', 'INSERT') then
    raise exception 'service_role cannot claim replay nonces';
  end if;

  if exists (
    select 1
    from pg_policy p
    where p.polrelid = 'public.nonce_cache'::regclass
      and p.polcmd in ('*', 'a')
      and (
        0::oid = any (p.polroles::oid[])
        or (select oid from pg_roles where rolname = 'anon') = any (p.polroles::oid[])
        or (select oid from pg_roles where rolname = 'authenticated') = any (p.polroles::oid[])
      )
  ) then
    raise exception 'Browser roles must not have an INSERT policy on public.nonce_cache';
  end if;

  if exists (
    select 1
    from pg_roles
    where rolname in ('anon', 'authenticated')
      and rolcanlogin
  ) then
    raise exception 'Hosted browser roles unexpectedly have direct database LOGIN';
  end if;

  if not has_schema_privilege('postgres', 'private', 'USAGE')
    or not has_schema_privilege('postgres', 'vault', 'USAGE')
    or not has_table_privilege('postgres', 'vault.decrypted_secrets', 'SELECT')
    or not has_schema_privilege('postgres', 'net', 'USAGE')
    or not has_function_privilege(
      'postgres',
      'net.http_post(text,jsonb,jsonb,jsonb,integer)',
      'EXECUTE'
    ) then
    raise exception 'The preserved postgres cron role lacks required private/Vault/pg_net access';
  end if;

  select count(*), max(decrypted_secret)
    into internal_secret_rows, internal_secret
  from vault.decrypted_secrets
  where name = 'internal_cron_secret';

  if internal_secret_rows <> 1
    or internal_secret is null
    or octet_length(convert_to(internal_secret, 'UTF8')) < 32 then
    raise exception 'Vault secret internal_cron_secret must exist exactly once and contain at least 32 UTF-8 bytes';
  end if;
end
$precheck$;

create or replace function private.enqueue_internal_cron(
  p_function_name text,
  p_body jsonb default '{}'::jsonb,
  p_purpose text default 'execute'
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_body jsonb := coalesce(p_body, '{}'::jsonb);
  v_body_hash text;
  v_function_path text;
  v_internal_secret text;
  v_internal_secret_rows integer;
  v_message text;
  v_nonce text;
  v_request_id bigint;
  v_signature text;
  v_timestamp text;
begin
  v_function_path := case p_function_name
    when 'auto-cancel-stale-orders'
      then '/functions/v1/auto-cancel-stale-orders'
    when 'close-trip-call-sessions'
      then '/functions/v1/close-trip-call-sessions'
    when 'marketing-automations-tick'
      then '/functions/v1/marketing-automations-tick'
    else null
  end;

  if v_function_path is null then
    raise exception 'Internal cron function is not allowlisted';
  end if;

  if p_purpose not in ('execute', 'readiness') then
    raise exception 'Internal cron purpose is not allowlisted';
  end if;

  select count(*), max(decrypted_secret)
    into v_internal_secret_rows, v_internal_secret
  from vault.decrypted_secrets
  where name = 'internal_cron_secret';

  if v_internal_secret_rows <> 1
    or v_internal_secret is null
    or pg_catalog.octet_length(pg_catalog.convert_to(v_internal_secret, 'UTF8')) < 32 then
    raise exception 'Vault secret internal_cron_secret is not ready';
  end if;

  -- Evaluate every signed field exactly once. pg_net persists body::text as
  -- UTF-8, so the body hash below matches the exact bytes verified by Edge.
  v_timestamp := pg_catalog.floor(
    pg_catalog.date_part('epoch', pg_catalog.clock_timestamp())
  )::bigint::text;
  v_nonce := pg_catalog.gen_random_uuid()::text;
  v_body_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(v_body::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_message := pg_catalog.concat_ws(
    E'\n',
    'zivo-cron-v1',
    v_timestamp,
    v_nonce,
    'POST',
    v_function_path,
    p_purpose,
    v_body_hash
  );
  v_signature := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(v_message, 'UTF8'),
      pg_catalog.convert_to(v_internal_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  select net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co' || v_function_path,
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-zivo-cron-version', 'zivo-cron-v1',
      'x-zivo-cron-timestamp', v_timestamp,
      'x-zivo-cron-nonce', v_nonce,
      'x-zivo-cron-purpose', p_purpose,
      'x-zivo-cron-signature', v_signature
    ),
    body := v_body,
    timeout_milliseconds := 10000
  )
  into v_request_id;

  return v_request_id;
end
$function$;

revoke all on function private.enqueue_internal_cron(text, jsonb, text)
  from public, anon, authenticated, service_role;
grant execute on function private.enqueue_internal_cron(text, jsonb, text)
  to postgres;

-- This preparation migration deliberately does not alter a live job. Operators
-- must first enqueue signed readiness requests with the private function above
-- and observe HTTP 204 from all three handlers. The separate cutover migration
-- rewrites the jobs only after that evidence exists.

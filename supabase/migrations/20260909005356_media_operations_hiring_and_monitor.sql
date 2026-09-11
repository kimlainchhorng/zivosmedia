-- Narrow application intake and monitor state. No existing merchant/user rows change.
create table public.zivo_hiring_applications (
  id uuid primary key,
  full_name text not null check (char_length(full_name) between 2 and 100),
  contact text not null check (char_length(contact) between 5 and 160),
  employment_type text not null check (employment_type in ('full-time','part-time')),
  availability text not null check (char_length(availability) between 2 and 300),
  experience text not null default '' check (char_length(experience) <= 1500),
  consent_version text not null check (consent_version = '2026-09-09'),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
alter table public.zivo_hiring_applications enable row level security;
revoke all on public.zivo_hiring_applications from public, anon, authenticated;
grant select on public.zivo_hiring_applications to authenticated;
grant select, insert, update on public.zivo_hiring_applications to service_role;
create policy hiring_team_read on public.zivo_hiring_applications for select to authenticated
  using (public.has_role((select auth.uid()), 'admin'::text));
create index hiring_notification_queue on public.zivo_hiring_applications(created_at) where notified_at is null;
comment on table public.zivo_hiring_applications is 'ZIVO recruitment intake. Private to the hiring team; public submission is validated and rate limited by media-operations.';

create table public.media_operations_state (
  id text primary key check (id='realtime'),
  healthy boolean,
  checked_at timestamptz,
  endpoint_status integer,
  round_trip boolean,
  last_alert_at timestamptz,
  last_alert_healthy boolean,
  lease_until timestamptz not null default '-infinity'
);
alter table public.media_operations_state enable row level security;
revoke all on public.media_operations_state from public, anon, authenticated;
grant select, update on public.media_operations_state to service_role;
insert into public.media_operations_state(id) values ('realtime');
create function public.claim_media_operations_tick() returns boolean
language sql security invoker set search_path = '' as $$
  with claimed as (update public.media_operations_state
    set lease_until=now()+interval '2 minutes'
    where id='realtime' and lease_until <= now() returning id)
  select exists(select 1 from claimed);
$$;
revoke all on function public.claim_media_operations_tick() from public, anon, authenticated;
grant execute on function public.claim_media_operations_tick() to service_role;

create or replace function private.enqueue_media_operations(
  p_purpose text default 'execute'
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_body jsonb := '{"action":"monitor"}'::jsonb;
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
  v_function_path := '/functions/v1/media-operations';

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
    timeout_milliseconds := 30000
  )
  into v_request_id;

  return v_request_id;
end
$function$;

revoke all on function private.enqueue_media_operations(text)
  from public, anon, authenticated, service_role;
grant execute on function private.enqueue_media_operations(text)
  to postgres;


-- Activate the five-minute cron separately after the deployed handler passes signed readiness.
notify pgrst, 'reload schema';

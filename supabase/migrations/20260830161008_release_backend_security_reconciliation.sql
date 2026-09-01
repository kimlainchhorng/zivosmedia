-- Release backend security reconciliation.
--
-- Live definitions were inspected read-only before this migration was
-- generated. The objects below were absent from the main project on
-- 2026-08-30, while the listed function overloads existed with the ACLs shown
-- in the release audit. Keep every statement idempotent because the remote
-- migration history has drifted from the repository history.
--
-- Cron jobs are intentionally NOT rewritten here. Their current commands
-- contain credential-shaped values and do not yet use a reviewed Vault secret.
-- Rotating those credentials and rescheduling the jobs is an operator action,
-- not a schema default that can safely be guessed in source control.

-- ---------------------------------------------------------------------------
-- Authoritative, cross-isolate Edge Function rate limiting
-- ---------------------------------------------------------------------------

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  category text not null,
  identifier text not null,
  count integer not null default 0 check (count >= 0),
  window_start timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_window_start
  on public.rate_limit_buckets (window_start);

alter table public.rate_limit_buckets enable row level security;

drop policy if exists rate_limit_service_only on public.rate_limit_buckets;
create policy rate_limit_service_only
  on public.rate_limit_buckets
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.rate_limit_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limit_buckets to service_role;

create or replace function public.rate_limit_check(
  _category text,
  _identifier text,
  _max integer,
  _window_sec integer
)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_key text;
  v_now timestamptz := now();
  v_window interval;
  v_row public.rate_limit_buckets%rowtype;
begin
  if nullif(btrim(_category), '') is null
     or nullif(btrim(_identifier), '') is null
     or _max is null
     or _max < 1
     or _window_sec is null
     or _window_sec < 1 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  v_key := _category || ':' || _identifier;
  v_window := make_interval(secs => _window_sec);

  insert into public.rate_limit_buckets (
    bucket_key,
    category,
    identifier,
    count,
    window_start,
    updated_at
  ) values (
    v_key,
    _category,
    _identifier,
    0,
    v_now,
    v_now
  )
  on conflict (bucket_key) do nothing;

  select *
    into v_row
    from public.rate_limit_buckets
   where bucket_key = v_key
   for update;

  if v_row.window_start + v_window <= v_now then
    update public.rate_limit_buckets
       set count = 1,
           category = _category,
           identifier = _identifier,
           window_start = v_now,
           updated_at = v_now
     where bucket_key = v_key;

    return query select true, greatest(0, _max - 1), v_now + v_window;
    return;
  end if;

  if v_row.count >= _max then
    return query select false, 0, v_row.window_start + v_window;
    return;
  end if;

  update public.rate_limit_buckets
     set count = count + 1,
         updated_at = v_now
   where bucket_key = v_key;

  return query
  select true, greatest(0, _max - (v_row.count + 1)), v_row.window_start + v_window;
end;
$$;

revoke all on function public.rate_limit_check(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rate_limit_check(text, text, integer, integer)
  to service_role;

create or replace function public.rate_limit_gc()
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  delete from public.rate_limit_buckets
   where updated_at < now() - interval '1 day';
$$;

revoke all on function public.rate_limit_gc() from public, anon, authenticated;
grant execute on function public.rate_limit_gc() to service_role;

-- Keep transient buckets bounded without relying on an Edge credential. The
-- live project has pg_cron enabled; rescheduling by job id keeps this migration
-- idempotent if it must be replayed during reconciliation.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'zivo-rate-limit-gc-hourly'
   limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'zivo-rate-limit-gc-hourly',
    '17 * * * *',
    'select public.rate_limit_gc();'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic Duffel API usage accounting
-- ---------------------------------------------------------------------------

create or replace function public.increment_flight_api_usage(is_cached boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_searches_live integer := 0;
  v_daily_search_cap integer;
begin
  if is_cached is null then
    raise exception 'is_cached is required' using errcode = '22023';
  end if;

  -- Create today's counter row if needed, then serialize every reservation on
  -- that row. Concurrent live searches cannot all read the same pre-increment
  -- value and overshoot the configured daily cap.
  insert into public.flight_api_usage (
    date,
    searches_total,
    searches_cached,
    searches_live,
    updated_at
  ) values (
    current_date,
    0,
    0,
    0,
    now()
  )
  on conflict (date) do nothing;

  select coalesce(usage.searches_live, 0)
    into v_searches_live
    from public.flight_api_usage as usage
   where usage.date = current_date
   for update;

  if not found then
    raise exception 'flight_daily_usage_unavailable' using errcode = 'P0001';
  end if;

  if not is_cached then
    select limits.daily_search_cap
      into v_daily_search_cap
      from public.flight_api_limits as limits
     where limits.is_active
     order by limits.updated_at desc nulls last, limits.id desc
     limit 1;

    if not found or v_daily_search_cap is null then
      raise exception 'flight_daily_search_cap_unavailable'
        using errcode = 'P0001';
    end if;

    if v_searches_live >= v_daily_search_cap then
      raise exception 'flight_daily_search_cap_reached'
        using errcode = 'P0001',
              detail = format(
                'daily_search_cap=%s searches_live=%s',
                v_daily_search_cap,
                v_searches_live
              );
    end if;
  end if;

  update public.flight_api_usage
     set searches_total = searches_total + 1,
         searches_cached = searches_cached + case when is_cached then 1 else 0 end,
         searches_live = searches_live + case when is_cached then 0 else 1 end,
         updated_at = now()
   where date = current_date;
end;
$$;

revoke all on function public.increment_flight_api_usage(boolean)
  from public, anon, authenticated;
grant execute on function public.increment_flight_api_usage(boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- Network security audit events (raw IP addresses are never stored)
-- ---------------------------------------------------------------------------

create table if not exists public.network_security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  route text not null,
  ip_hash text,
  country text,
  region text,
  city text,
  asn text,
  colo text,
  user_agent text,
  request_id text,
  risk_score integer not null default 0 check (risk_score between 0 and 100),
  signals text[] not null default '{}',
  blocked boolean not null default false
);

alter table public.network_security_events enable row level security;

drop policy if exists "Admins can read network security events"
  on public.network_security_events;
create policy "Admins can read network security events"
  on public.network_security_events
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Service role manages network security events"
  on public.network_security_events;
create policy "Service role manages network security events"
  on public.network_security_events
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.network_security_events from public, anon, authenticated;
grant select on table public.network_security_events to authenticated;
grant select, insert, update, delete on table public.network_security_events to service_role;

create index if not exists idx_network_security_events_created_brin
  on public.network_security_events using brin (created_at);
create index if not exists idx_network_security_events_ip_created
  on public.network_security_events (ip_hash, created_at desc)
  where ip_hash is not null;
create index if not exists idx_network_security_events_route_created
  on public.network_security_events (route, created_at desc);
create index if not exists idx_network_security_events_risk
  on public.network_security_events (risk_score desc, created_at desc)
  where risk_score > 0;

comment on table public.network_security_events is
  'Hashed IP and edge network metadata for VPN/proxy/risk workflows. Raw IPs are intentionally not stored.';

-- ---------------------------------------------------------------------------
-- Disable plaintext supplier credential storage
-- ---------------------------------------------------------------------------

-- Live precheck on 2026-08-30 found zero rows, a plaintext `password` column,
-- full authenticated table privileges, and this owner/admin ALL policy. Keep
-- the table intact for compatibility, but make it service-role-only until a
-- reviewed encrypted/Vault-backed credential design replaces it.
drop policy if exists merged_all_authenticated
  on public.ar_supplier_credentials;
revoke all on table public.ar_supplier_credentials from anon, authenticated;
grant select, insert, update, delete on table public.ar_supplier_credentials
  to service_role;

comment on table public.ar_supplier_credentials is
  'Supplier credential storage is disabled for authenticated clients. Do not store secrets here until an encrypted or Vault-backed design is reviewed.';

-- ---------------------------------------------------------------------------
-- Public storefront purchase pulse
-- ---------------------------------------------------------------------------

create table if not exists public.shop_live_pulse (
  store_id uuid primary key references public.store_profiles(id) on delete cascade,
  last_purchase_at timestamptz not null default now(),
  last_event_id text,
  updated_at timestamptz not null default now()
);

alter table public.shop_live_pulse enable row level security;

drop policy if exists "Anyone can read live pulse" on public.shop_live_pulse;
create policy "Anyone can read live pulse"
  on public.shop_live_pulse
  for select
  to authenticated, anon
  using (true);

drop policy if exists "Service role writes live pulse" on public.shop_live_pulse;
create policy "Service role writes live pulse"
  on public.shop_live_pulse
  for all
  to service_role
  using (true)
  with check (true);

revoke all on table public.shop_live_pulse from public, anon, authenticated;
grant select (store_id, last_purchase_at) on table public.shop_live_pulse
  to anon, authenticated;
grant select, insert, update, delete on table public.shop_live_pulse to service_role;

create index if not exists idx_shop_live_pulse_last_purchase
  on public.shop_live_pulse (last_purchase_at desc);

-- ---------------------------------------------------------------------------
-- Exact live overload ACL/search_path reconciliation
-- ---------------------------------------------------------------------------

revoke execute on function public.mark_security_notification_sent(uuid)
  from public, anon, authenticated;
grant execute on function public.mark_security_notification_sent(uuid)
  to service_role;

revoke execute on function public.mark_security_notification_failed(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.mark_security_notification_failed(uuid, text, integer)
  to service_role;

revoke execute on function public.dequeue_security_notifications(integer, text[])
  from public, anon, authenticated;
grant execute on function public.dequeue_security_notifications(integer, text[])
  to service_role;

revoke execute on function public.cleanup_expired_chat_sender_blocks()
  from public, anon, authenticated;
grant execute on function public.cleanup_expired_chat_sender_blocks()
  to service_role;

-- The authenticated admin wrapper remains the supported entry point and
-- performs its own role check before calling this raw metadata helper.
revoke execute on function public.audit_unforced_rls()
  from public, anon, authenticated;
grant execute on function public.audit_unforced_rls()
  to service_role;

-- Admin wrappers keep their authenticated caller contract and their internal
-- role checks, but anonymous/PUBLIC callers must not reach SECURITY DEFINER
-- entry points at all.
revoke execute on function public.admin_ack_security_incident(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_ack_security_incident(uuid)
  to authenticated, service_role;

revoke execute on function public.admin_audit_unforced_rls()
  from public, anon, authenticated;
grant execute on function public.admin_audit_unforced_rls()
  to authenticated, service_role;

revoke execute on function public.admin_auth_lockouts(integer)
  from public, anon, authenticated;
grant execute on function public.admin_auth_lockouts(integer)
  to authenticated, service_role;

revoke execute on function public.admin_clear_auth_lockout(text)
  from public, anon, authenticated;
grant execute on function public.admin_clear_auth_lockout(text)
  to authenticated, service_role;

revoke execute on function public.admin_clear_chat_sender_block(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_clear_chat_sender_block(uuid)
  to authenticated, service_role;

revoke execute on function public.admin_force_auth_quarantine(text, integer, text)
  from public, anon, authenticated;
grant execute on function public.admin_force_auth_quarantine(text, integer, text)
  to authenticated, service_role;

-- This immutable sanitizer uses only pg_catalog functions; pinning its path
-- closes the mutable-search-path advisor finding without changing behavior.
alter function public.analyze_chat_content_security(text)
  set search_path = pg_catalog;

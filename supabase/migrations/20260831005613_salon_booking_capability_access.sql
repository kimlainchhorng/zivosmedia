-- Replace salon booking UUID-as-secret access with an expiring capability or
-- the authenticated account that created the booking.
--
-- The capability is returned once when it is issued. Only its SHA-256 digest
-- is persisted. Customer links carry the plaintext in the URL fragment so it
-- is not sent in HTTP requests or Referrer headers.

-- Give drifted projects an early, clear diagnostic for the base booking
-- columns most likely to be absent. PostgreSQL still validates every remaining
-- relation, column, type, and routine transactionally while defining the
-- functions below. This is intentionally not a migration-history check because
-- production history may be reconciled independently from the live objects.
do $assert_salon_booking_capability_prerequisites$
declare
  v_missing_columns text[];
begin
  select array_agg(required.column_name order by required.column_name)
  into v_missing_columns
  from (
    values
      ('addons_total_cents'),
      ('created_by_user_id'),
      ('deposit_cents'),
      ('deposit_paid_cents'),
      ('source'),
      ('tip_cents')
  ) as required(column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'salon_bookings'
      and c.column_name = required.column_name
  );

  if coalesce(cardinality(v_missing_columns), 0) > 0 then
    raise exception
      'Salon booking capability prerequisites are missing: %',
      array_to_string(v_missing_columns, ', ')
      using
        errcode = '42703',
        hint = 'Reconcile and verify the base Salon booking schema before this capability migration.';
  end if;
end;
$assert_salon_booking_capability_prerequisites$;

create schema if not exists private;

create table if not exists private.salon_booking_access (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.salon_bookings(id) on delete cascade,
  token_hash bytea not null unique,
  scope text not null check (scope in ('manage', 'review', 'deposit', 'tip')),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint salon_booking_access_future_expiry check (expires_at > created_at)
);

create index if not exists salon_booking_access_booking_scope_idx
  on private.salon_booking_access (booking_id, scope, expires_at desc);

alter table private.salon_booking_access enable row level security;
revoke all on table private.salon_booking_access from public, anon, authenticated;

-- The old check-then-insert review guard is raceable. This remains compatible
-- with legacy reviews whose booking_id is null while making each booked visit
-- reviewable at most once.
create unique index if not exists salon_reviews_one_per_booking_idx
  on public.salon_reviews (booking_id)
  where booking_id is not null;

create or replace function private.salon_booking_access_allowed(
  p_booking_id uuid,
  p_access_token text,
  p_required_scope text,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.salon_bookings b
    left join public.salon_clients c on c.id = b.client_id
    where b.id = p_booking_id
      and (p_required_scope = 'review' or b.source = 'app')
      and (
        -- Once a booking is account-linked, that account is authoritative;
        -- an older guest capability cannot override the account boundary.
        (
          (b.created_by_user_id is not null or c.user_id is not null)
          and p_user_id is not null
          and (b.created_by_user_id = p_user_id or c.user_id = p_user_id)
        )
        or (
          b.created_by_user_id is null
          and c.user_id is null
          and p_access_token is not null
          and p_access_token ~ '^[0-9a-f]{64}$'
          and exists (
            select 1
            from private.salon_booking_access a
            where a.booking_id = b.id
              and a.token_hash = extensions.digest(
                convert_to(p_access_token, 'UTF8'),
                'sha256'
              )
              and a.revoked_at is null
              and a.expires_at > now()
              and a.scope = p_required_scope
          )
        )
      )
  );
$function$;

revoke all on function private.salon_booking_access_allowed(uuid, text, text, uuid)
  from public, anon, authenticated, service_role;

-- Service workers and an authenticated store owner/customer can issue a new
-- link. Anonymous callers can never mint a capability merely by knowing the
-- booking UUID.
create or replace function public.salon_issue_booking_access(
  p_booking_id uuid,
  p_scope text default 'manage'
)
returns table (
  access_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.salon_bookings;
  v_token text;
  v_expires_at timestamptz;
  v_user_id uuid := auth.uid();
  v_is_service boolean := auth.role() = 'service_role';
  v_authorized boolean := false;
  v_account_user_id uuid;
begin
  if p_scope not in ('manage', 'review', 'deposit', 'tip') then
    raise exception 'Invalid booking access scope.' using errcode = '22023';
  end if;

  select b.*
  into v_booking
  from public.salon_bookings b
  where b.id = p_booking_id
    and (p_scope = 'review' or b.source = 'app');

  if v_booking.id is null then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;

  v_authorized := v_is_service
    or (
      v_user_id is not null
      and exists (
        select 1
        from public.salon_bookings b
        left join public.salon_clients c on c.id = b.client_id
        where b.id = v_booking.id
          and (b.created_by_user_id = v_user_id or c.user_id = v_user_id)
      )
    )
    or exists (
      select 1
      from public.store_profiles sp
      where sp.id = v_booking.store_id
        and sp.owner_id = v_user_id
    )
    or (
      v_user_id is not null
      and public.has_role(v_user_id, 'admin'::public.app_role)
    );

  if not v_authorized then
    raise exception 'Booking access denied.' using errcode = '42501';
  end if;

  select coalesce(b.created_by_user_id, c.user_id)
  into v_account_user_id
  from public.salon_bookings b
  left join public.salon_clients c on c.id = b.client_id
  where b.id = v_booking.id;

  -- Account-linked bookings deliberately do not receive bearer access. The
  -- returned null tells trusted link generators to create a tokenless URL
  -- whose page requires that customer's ZIVO session.
  if v_account_user_id is not null then
    return query select null::text, null::timestamptz;
    return;
  end if;

  if not v_is_service and p_scope in ('deposit', 'tip') then
    raise exception 'Action capabilities must be exchanged from a secure booking link.'
      using errcode = '42501';
  end if;

  -- A manage link remains usable through the appointment and a short
  -- post-visit window, but is capped even for bookings far in the future.
  v_expires_at := case
    when p_scope = 'review' then now() + interval '30 days'
    when p_scope = 'deposit' then now() + interval '30 minutes'
    when p_scope = 'tip' then now() + interval '15 minutes'
    else least(
      now() + interval '400 days',
      greatest(now() + interval '7 days', v_booking.end_at + interval '30 days')
    )
  end;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.salon_booking_access (
    booking_id,
    token_hash,
    scope,
    expires_at,
    created_by_user_id
  )
  values (
    v_booking.id,
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    p_scope,
    v_expires_at,
    v_user_id
  );

  -- Bounded housekeeping without invalidating any still-active link.
  delete from private.salon_booking_access a
  where a.booking_id = v_booking.id
    and coalesce(a.revoked_at, a.expires_at) < now() - interval '30 days';

  return query select v_token, v_expires_at;
end;
$function$;

revoke all on function public.salon_issue_booking_access(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.salon_issue_booking_access(uuid, text)
  to authenticated, service_role;

-- Convert a valid manage link (or authenticated booking ownership) into a
-- short-lived, exact-purpose payment capability. This prevents a long-lived
-- customer link from carrying ambient authority to charge a saved card.
create or replace function public.salon_exchange_booking_access(
  p_booking_id uuid,
  p_manage_token text,
  p_scope text
)
returns table (
  access_token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_token text;
  v_expires_at timestamptz;
begin
  if p_scope not in ('deposit', 'tip') then
    raise exception 'Invalid booking action scope.' using errcode = '22023';
  end if;

  if not private.salon_booking_access_allowed(
    p_booking_id,
    p_manage_token,
    'manage',
    auth.uid()
  ) then
    raise exception 'Booking access denied or expired.' using errcode = '42501';
  end if;

  v_expires_at := case
    when p_scope = 'deposit' then now() + interval '30 minutes'
    else now() + interval '15 minutes'
  end;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into private.salon_booking_access (
    booking_id,
    token_hash,
    scope,
    expires_at,
    created_by_user_id
  )
  values (
    p_booking_id,
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    p_scope,
    v_expires_at,
    auth.uid()
  );

  return query select v_token, v_expires_at;
end;
$function$;

revoke all on function public.salon_exchange_booking_access(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.salon_exchange_booking_access(uuid, text, text)
  to anon, authenticated;

-- Edge Functions use this service-only verifier after independently resolving
-- the optional caller JWT to a user id. Browser callers cannot supply a
-- forged p_user_id because they cannot execute this function.
create or replace function public.salon_verify_booking_access(
  p_booking_id uuid,
  p_access_token text,
  p_scope text,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_scope not in ('manage', 'review', 'deposit', 'tip') then
    return false;
  end if;
  return private.salon_booking_access_allowed(
    p_booking_id,
    p_access_token,
    p_scope,
    p_user_id
  );
end;
$function$;

revoke all on function public.salon_verify_booking_access(uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.salon_verify_booking_access(uuid, text, text, uuid)
  to service_role;

create or replace function public.salon_customer_get_booking(
  p_id uuid,
  p_access_token text default null
)
returns table (
  id uuid,
  store_id uuid,
  store_name text,
  store_slug text,
  service_id uuid,
  service_name text,
  stylist_id uuid,
  stylist_name text,
  client_name text,
  client_phone text,
  client_email text,
  start_at timestamptz,
  end_at timestamptz,
  price_cents integer,
  addons_total_cents integer,
  duration_minutes integer,
  status text,
  source text,
  cancelled_at timestamptz,
  cancellation_window_hours integer,
  payment_state_available boolean,
  deposit_cents integer,
  deposit_paid_cents integer,
  deposit_refunded_cents integer,
  no_show_fee_cents integer,
  tip_cents integer,
  tip_charged_at timestamptz,
  tip_charge_failed_reason text,
  card_brand text,
  card_last_four text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    b.id,
    b.store_id,
    sp.name as store_name,
    sp.slug as store_slug,
    b.service_id,
    b.service_name,
    b.stylist_id,
    b.stylist_name,
    b.client_name,
    b.client_phone,
    b.client_email,
    b.start_at,
    b.end_at,
    b.price_cents,
    coalesce(b.addons_total_cents, 0) as addons_total_cents,
    b.duration_minutes,
    b.status::text,
    b.source,
    b.cancelled_at,
    coalesce(ps.cancellation_window_hours, 0) as cancellation_window_hours,
    false as payment_state_available,
    coalesce(b.deposit_cents, 0) as deposit_cents,
    coalesce(b.deposit_paid_cents, 0) as deposit_paid_cents,
    -- Payment/no-show/tipping state is deliberately unavailable until its
    -- separately reviewed live schema is reconciled. Keep the client shape
    -- stable, mark the boundary explicitly, and never present unknown state as
    -- a zero balance or "no policy" fact.
    null::integer as deposit_refunded_cents,
    null::integer as no_show_fee_cents,
    coalesce(b.tip_cents, 0) as tip_cents,
    null::timestamptz as tip_charged_at,
    null::text as tip_charge_failed_reason,
    null::text as card_brand,
    null::text as card_last_four
  from public.salon_bookings b
  join public.store_profiles sp on sp.id = b.store_id
  left join public.store_payment_settings ps
    on ps.store_id = b.store_id
    and ps.market = 'us'
  where b.id = p_id
    and b.source = 'app'
    and sp.is_active = true
    and private.salon_booking_access_allowed(
      b.id,
      p_access_token,
      'manage',
      auth.uid()
    );
$function$;

revoke all on function public.salon_customer_get_booking(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.salon_customer_get_booking(uuid, text)
  to anon, authenticated, service_role;

create or replace function public.salon_customer_cancel_booking(
  p_id uuid,
  p_access_token text default null
)
returns table (
  id uuid,
  status text,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_row public.salon_bookings;
  v_window_hours integer;
begin
  if not private.salon_booking_access_allowed(
    p_id,
    p_access_token,
    'manage',
    auth.uid()
  ) then
    raise exception 'Booking access denied or expired.' using errcode = '42501';
  end if;

  select b.* into v_row
  from public.salon_bookings b
  where b.id = p_id
    and b.source = 'app'
  for update;

  if v_row.id is null then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if v_row.status not in ('pending', 'confirmed') then
    raise exception 'Booking is % and cannot be cancelled.', v_row.status
      using errcode = 'P0001';
  end if;
  if v_row.start_at <= now() then
    raise exception 'This appointment has already started or passed.'
      using errcode = 'P0001';
  end if;

  -- Refund state is intentionally unavailable in the additive compatibility
  -- phase. Never cancel a paid booking when we cannot truthfully tell the
  -- customer whether value remains or has already been returned.
  if coalesce(v_row.deposit_paid_cents, 0) > 0 then
    raise exception 'Online cancellation is unavailable for a paid booking; please contact the salon.'
      using errcode = 'P0001';
  end if;

  select ps.cancellation_window_hours
  into v_window_hours
  from public.store_payment_settings ps
  where ps.store_id = v_row.store_id
  order by (ps.market = 'us') desc
  limit 1;

  if coalesce(v_window_hours, 0) > 0
     and v_row.start_at <= now() + make_interval(hours => v_window_hours) then
    raise exception 'Too close to the appointment time; please call the salon (within % hour window).',
      v_window_hours using errcode = 'P0001';
  end if;

  update public.salon_bookings b
  set status = 'cancelled',
      cancellation_reason = 'Cancelled by customer',
      cancelled_at = coalesce(b.cancelled_at, now())
  where b.id = p_id;

  return query
    select b.id, b.status::text, b.cancelled_at
    from public.salon_bookings b
    where b.id = p_id;
end;
$function$;

revoke all on function public.salon_customer_cancel_booking(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.salon_customer_cancel_booking(uuid, text)
  to anon, authenticated, service_role;

create or replace function public.salon_customer_get_booking_for_review(
  p_id uuid,
  p_access_token text default null
)
returns table (
  id uuid,
  store_id uuid,
  store_name text,
  store_slug text,
  service_name text,
  stylist_id uuid,
  stylist_name text,
  client_name text,
  start_at timestamptz,
  status text,
  already_reviewed boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    b.id,
    b.store_id,
    sp.name as store_name,
    sp.slug as store_slug,
    b.service_name,
    b.stylist_id,
    b.stylist_name,
    b.client_name,
    b.start_at,
    b.status::text,
    exists (
      select 1
      from public.salon_reviews r
      where r.booking_id = b.id
    ) as already_reviewed
  from public.salon_bookings b
  join public.store_profiles sp on sp.id = b.store_id
  where b.id = p_id
    and sp.is_active = true
    and private.salon_booking_access_allowed(
      b.id,
      p_access_token,
      'review',
      auth.uid()
    );
$function$;

revoke all on function public.salon_customer_get_booking_for_review(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.salon_customer_get_booking_for_review(uuid, text)
  to anon, authenticated, service_role;

create or replace function public.salon_customer_submit_review(
  p_booking_id uuid,
  p_access_token text,
  p_rating integer,
  p_comment text
)
returns table (id uuid)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_booking public.salon_bookings;
  v_review_id uuid;
begin
  if not private.salon_booking_access_allowed(
    p_booking_id,
    p_access_token,
    'review',
    auth.uid()
  ) then
    raise exception 'Booking access denied or expired.' using errcode = '42501';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.' using errcode = '22023';
  end if;

  select b.* into v_booking
  from public.salon_bookings b
  where b.id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'Booking not found.' using errcode = 'P0002';
  end if;
  if v_booking.status <> 'completed' then
    raise exception 'You can only review a completed appointment.'
      using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.salon_reviews r
    where r.booking_id = p_booking_id
  ) then
    raise exception 'You already submitted a review for this booking.'
      using errcode = 'P0001';
  end if;

  insert into public.salon_reviews (
    store_id,
    booking_id,
    client_id,
    stylist_id,
    client_name,
    stylist_name,
    rating_stars,
    comment
  )
  values (
    v_booking.store_id,
    v_booking.id,
    v_booking.client_id,
    v_booking.stylist_id,
    v_booking.client_name,
    v_booking.stylist_name,
    p_rating,
    nullif(btrim(coalesce(p_comment, '')), '')
  )
  returning salon_reviews.id into v_review_id;

  if p_access_token ~ '^[0-9a-f]{64}$' then
    update private.salon_booking_access a
    set used_at = coalesce(a.used_at, now())
    where a.booking_id = p_booking_id
      and a.token_hash = extensions.digest(
        convert_to(p_access_token, 'UTF8'),
        'sha256'
      )
      and a.scope in ('manage', 'review');
  end if;

  return query select v_review_id;
end;
$function$;

revoke all on function public.salon_customer_submit_review(uuid, text, integer, text)
  from public, anon, authenticated, service_role;
grant execute on function public.salon_customer_submit_review(uuid, text, integer, text)
  to anon, authenticated, service_role;

-- Phase one is additive: production may keep serving the legacy RPCs until a
-- compatible web bundle has been deployed and verified. The separate legacy
-- ACL cutover migration revokes those browser grants only after that proof.
do $assert_salon_booking_capability_additive_acl$
begin
  if has_table_privilege('anon', 'private.salon_booking_access', 'select')
     or has_table_privilege('authenticated', 'private.salon_booking_access', 'select') then
    raise exception 'Salon booking capability hashes are browser-readable';
  end if;

  if has_function_privilege(
       'anon',
       'public.salon_verify_booking_access(uuid,text,text,uuid)',
       'execute'
     )
     or has_function_privilege(
       'authenticated',
       'public.salon_verify_booking_access(uuid,text,text,uuid)',
       'execute'
     ) then
    raise exception 'The trusted salon access verifier is browser-executable';
  end if;
end;
$assert_salon_booking_capability_additive_acl$;

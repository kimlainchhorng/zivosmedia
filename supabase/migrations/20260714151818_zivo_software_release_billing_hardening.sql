-- ZIVO Software release billing hardening.
--
-- This migration is additive and does not create, archive, or change Stripe
-- objects. Stripe IDs and stable lookup keys must be populated only after the
-- read-only catalog audit is reviewed and explicitly approved.

alter table public.software_pricing_plans
  add column if not exists provider_product_id text,
  add column if not exists lookup_key text;

create unique index if not exists software_pricing_plans_provider_lookup_key_unique
  on public.software_pricing_plans (provider, lookup_key)
  where lookup_key is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'software_pricing_plans_lookup_key_format'
      and conrelid = 'public.software_pricing_plans'::regclass
  ) then
    alter table public.software_pricing_plans
      add constraint software_pricing_plans_lookup_key_format
      check (
        lookup_key is null
        or (
          lookup_key = lower(btrim(lookup_key))
          and lookup_key ~ '^software_[a-z0-9]+(_[a-z0-9]+)*_(monthly|annual)$'
        )
      ) not valid;
  end if;
end $$;

comment on column public.software_pricing_plans.lookup_key is
  'Stable provider lookup key. Expected ZIVO Software keys use software_<tier>_<monthly|annual>.';

comment on column public.software_pricing_plans.provider_product_id is
  'Read-only mapping to the provider product. This migration never creates or mutates that object.';

create table if not exists public.software_pricing_tier_public_metadata (
  tier_key text primary key check (tier_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  tagline text check (tagline is null or char_length(btrim(tagline)) between 1 and 240),
  features jsonb check (
    features is null
    or (jsonb_typeof(features) = 'array' and jsonb_array_length(features) > 0)
  ),
  limits jsonb check (limits is null or jsonb_typeof(limits) = 'object'),
  support text check (support is null or char_length(btrim(support)) between 1 and 160),
  cancellation_terms text check (
    cancellation_terms is null
    or char_length(btrim(cancellation_terms)) between 1 and 240
  ),
  featured boolean not null default false,
  sort_order integer not null check (sort_order > 0),
  approved_for_publication boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint software_pricing_tier_publication_requires_approved_terms
    check (
      approved_for_publication = false
      or (
        tagline is not null
        and features is not null
        and limits is not null
        and support is not null
        and cancellation_terms is not null
        and approved_at is not null
      )
    )
);

create index if not exists software_pricing_tier_public_metadata_sort_idx
  on public.software_pricing_tier_public_metadata (sort_order, tier_key);

insert into public.software_pricing_tier_public_metadata (
  tier_key,
  display_name,
  tagline,
  features,
  limits,
  support,
    cancellation_terms,
    featured,
    sort_order,
    approved_for_publication,
    approved_at
)
values
  (
    'base',
    'Base',
    null,
    null,
    null,
    null,
    null,
    false,
    10,
    false,
    null
  ),
  (
    'gold',
    'Gold',
    null,
    null,
    null,
    null,
    null,
    false,
    20,
    false,
    null
  ),
  (
    'platinum',
    'Platinum',
    null,
    null,
    null,
    null,
    null,
    false,
    30,
    false,
    null
  ),
  (
    'pro',
    'Pro',
    null,
    null,
    null,
    null,
    null,
    false,
    40,
    false,
    null
  )
on conflict (tier_key) do nothing;

alter table public.software_pricing_tier_public_metadata enable row level security;
revoke all on table public.software_pricing_tier_public_metadata from anon, authenticated;
grant select on table public.software_pricing_tier_public_metadata to anon, authenticated;
grant all privileges on table public.software_pricing_tier_public_metadata to service_role;
grant select on table public.software_products, public.software_pricing_plans to service_role;

drop policy if exists software_pricing_tier_public_metadata_read on public.software_pricing_tier_public_metadata;
create policy software_pricing_tier_public_metadata_read
  on public.software_pricing_tier_public_metadata
  for select to anon, authenticated
  using (approved_for_publication = true);

drop view if exists public.software_public_pricing_catalog;
create view public.software_public_pricing_catalog
with (security_invoker = true) as
with normalized_plans as (
  select
    pricing_plan.id,
    pricing_plan.software_product_id,
    pricing_plan.billing_interval,
    pricing_plan.amount,
    pricing_plan.currency,
    pricing_plan.trial_period_days,
    pricing_plan.provider_product_id,
    pricing_plan.provider_price_id,
    pricing_plan.lookup_key,
    trim(
      both '-' from lower(
        regexp_replace(
          regexp_replace(
            btrim(coalesce(nullif(pricing_plan.metadata ->> 'tier_key', ''), pricing_plan.plan_name)),
            '[[:space:]]+(monthly|annual)$',
            '',
            'i'
          ),
          '[^a-zA-Z0-9]+',
          '-',
          'g'
        )
      )
    ) as tier_key
  from public.software_pricing_plans pricing_plan
  join public.software_products product
    on product.id = pricing_plan.software_product_id
   and product.status = 'active'
   and product.slug = 'zivo-auto-repair'
  where pricing_plan.active = true
    and pricing_plan.provider = 'stripe'
    and pricing_plan.billing_interval in ('month', 'year')
    and pricing_plan.amount > 0
    and pricing_plan.provider_product_id ~ '^prod_[A-Za-z0-9]+$'
    and pricing_plan.provider_price_id ~ '^price_[A-Za-z0-9]+$'
    and pricing_plan.lookup_key is not null
), complete_tiers as (
  select
    tier_key as id,
    (max(software_product_id::text))::uuid as software_product_id,
    upper(max(currency)) as currency,
    (max(id::text) filter (where billing_interval = 'month'))::uuid as monthly_plan_id,
    (max(id::text) filter (where billing_interval = 'year'))::uuid as annual_plan_id,
    max(amount) filter (where billing_interval = 'month') as monthly_amount_cents,
    max(amount) filter (where billing_interval = 'year') as annual_amount_cents,
    max(trial_period_days) as trial_days,
    max(lookup_key) filter (where billing_interval = 'month') as monthly_lookup_key,
    max(lookup_key) filter (where billing_interval = 'year') as annual_lookup_key
  from normalized_plans
  group by tier_key
  having count(*) filter (where billing_interval = 'month') = 1
     and count(*) filter (where billing_interval = 'year') = 1
     and count(distinct software_product_id) = 1
     and count(distinct provider_product_id) = 1
     and count(distinct provider_price_id) = 2
     and count(distinct lookup_key) = 2
     and count(distinct currency) = 1
     and count(distinct trial_period_days) = 1
     and bool_and(
       lookup_key = 'software_' || replace(tier_key, '-', '_') || '_'
         || case billing_interval when 'month' then 'monthly' else 'annual' end
     )
)
select
  complete_tiers.id,
  complete_tiers.software_product_id,
  metadata.display_name,
  complete_tiers.currency,
  complete_tiers.monthly_plan_id,
  complete_tiers.annual_plan_id,
  complete_tiers.monthly_amount_cents,
  complete_tiers.annual_amount_cents,
  complete_tiers.trial_days,
  metadata.tagline,
  metadata.features,
  metadata.limits,
  metadata.support,
  metadata.cancellation_terms,
  metadata.featured,
  metadata.sort_order,
  complete_tiers.monthly_lookup_key,
  complete_tiers.annual_lookup_key
from complete_tiers
join public.software_pricing_tier_public_metadata metadata
  on metadata.tier_key = complete_tiers.id
 and metadata.approved_for_publication = true;

revoke all on table public.software_public_pricing_catalog from anon, authenticated;
grant select on table public.software_public_pricing_catalog to anon, authenticated, service_role;

-- A database reservation closes the gap between the local eligibility check and
-- Stripe Checkout creation. One business can have only one outstanding
-- Checkout for a Software offering, even when two Edge Function executions run
-- concurrently. Reservations expire after one hour, matching the explicit
-- Checkout Session expiry passed to Stripe.
create table if not exists public.software_checkout_reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  software_product_id uuid not null references public.software_products(id) on delete restrict,
  plan_id uuid not null references public.software_pricing_plans(id) on delete restrict,
  owner_user_id uuid not null,
  actor_user_id uuid not null,
  request_idempotency_key text not null,
  request_hash text not null,
  provider_idempotency_key text not null,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_checkout_session_id text,
  provider_checkout_session_url text,
  status text not null default 'reserved' check (status in ('reserved', 'completed', 'released')),
  expires_at timestamptz not null,
  completed_at timestamptz,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint software_checkout_reservations_finite_expiry
    check (expires_at > created_at and expires_at <= created_at + interval '1 hour'),
  constraint software_checkout_reservations_request_key_format
    check (
      char_length(request_idempotency_key) between 8 and 200
      and request_idempotency_key ~ '^[A-Za-z0-9._:-]+$'
    ),
  constraint software_checkout_reservations_request_hash_format
    check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint software_checkout_reservations_provider_key_format
    check (
      char_length(provider_idempotency_key) between 8 and 200
      and provider_idempotency_key ~ '^[A-Za-z0-9._:-]+$'
    ),
  constraint software_checkout_reservations_session_format
    check (provider_checkout_session_id is null or provider_checkout_session_id ~ '^cs_'),
  constraint software_checkout_reservations_session_url_format
    check (
      provider_checkout_session_url is null
      or provider_checkout_session_url ~ '^https://checkout[.]stripe[.]com/'
    )
);

create unique index if not exists software_checkout_reservations_outstanding_unique
  on public.software_checkout_reservations (business_id, software_product_id)
  where status = 'reserved';

create unique index if not exists software_checkout_reservations_provider_session_unique
  on public.software_checkout_reservations (provider, provider_checkout_session_id)
  where provider_checkout_session_id is not null;

create index if not exists software_checkout_reservations_expiry_idx
  on public.software_checkout_reservations (expires_at)
  where status = 'reserved';

alter table public.software_checkout_reservations enable row level security;
revoke all on table public.software_checkout_reservations from public, anon, authenticated;
grant select, insert, update on table public.software_checkout_reservations to service_role;

create or replace function public.claim_software_checkout_reservation(
  p_business_id uuid,
  p_software_product_id uuid,
  p_plan_id uuid,
  p_owner_user_id uuid,
  p_actor_user_id uuid,
  p_request_idempotency_key text,
  p_request_hash text,
  p_provider_idempotency_key text
)
returns table (
  reservation_id uuid,
  claimed boolean,
  reservation_expires_at timestamptz,
  reservation_plan_id uuid,
  provider_checkout_session_id text,
  provider_checkout_session_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_existing public.software_checkout_reservations%rowtype;
  v_same_request boolean;
begin
  -- Repeat the endpoint's validation inside the atomic boundary. A caller may
  -- reserve only an active Stripe plan that belongs to a complete public tier
  -- and to the requested Software offering.
  if not exists (
    select 1
      from public.software_pricing_plans pricing_plan
      join public.software_products product
        on product.id = pricing_plan.software_product_id
       and product.status = 'active'
       and product.slug = 'zivo-auto-repair'
      join public.software_public_pricing_catalog catalog
        on catalog.monthly_plan_id = pricing_plan.id
        or catalog.annual_plan_id = pricing_plan.id
     where pricing_plan.id = p_plan_id
       and pricing_plan.software_product_id = p_software_product_id
       and catalog.software_product_id = p_software_product_id
       and pricing_plan.provider = 'stripe'
       and pricing_plan.active = true
  ) then
    raise exception 'Software pricing plan is not part of an active complete catalog offering'
      using errcode = '22023';
  end if;

  -- Checkout completion takes the identical transaction-scoped lock before it
  -- makes a reservation non-blocking. This serializes the handoff from the
  -- reservation row to the reconciled subscription/entitlement under READ
  -- COMMITTED, where merely repeating SELECT checks would still leave a gap.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_business_id::text || ':' || p_software_product_id::text, 0)
  );

  -- Repeat the blocking-state checks in the same transaction as the unique
  -- reservation insert. The earlier Edge Function reads are only for a
  -- friendly response and cannot be the authorization/concurrency boundary.
  if exists (
    select 1
      from public.payment_subscriptions subscription
     where subscription.provider = 'stripe'
       and subscription.business_id = p_business_id
       and subscription.software_product_id = p_software_product_id
       and subscription.status in ('trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'paused')
  ) or exists (
    select 1
      from public.business_software_entitlements entitlement
     where entitlement.business_id = p_business_id
       and entitlement.software_product_id = p_software_product_id
       and entitlement.status in ('trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'paused')
  ) then
    raise exception 'An existing Software subscription or entitlement blocks checkout'
      using errcode = 'P0001';
  end if;

  update public.software_checkout_reservations reservation
     set status = 'released',
         released_at = v_now,
         release_reason = 'reservation_expired',
         updated_at = v_now
   where reservation.business_id = p_business_id
     and reservation.software_product_id = p_software_product_id
     and reservation.status = 'reserved'
     and reservation.expires_at <= v_now;

  select reservation.*
    into v_existing
    from public.software_checkout_reservations reservation
   where reservation.business_id = p_business_id
     and reservation.software_product_id = p_software_product_id
     and reservation.status = 'reserved';

  if found then
    v_same_request :=
      v_existing.plan_id = p_plan_id
      and v_existing.owner_user_id = p_owner_user_id
      and v_existing.actor_user_id = p_actor_user_id
      and v_existing.request_idempotency_key = p_request_idempotency_key
      and v_existing.request_hash = p_request_hash
      and v_existing.provider_idempotency_key = p_provider_idempotency_key;
    return query select
      v_existing.id,
      v_same_request,
      v_existing.expires_at,
      v_existing.plan_id,
      v_existing.provider_checkout_session_id,
      v_existing.provider_checkout_session_url;
    return;
  end if;

  begin
    insert into public.software_checkout_reservations (
      business_id,
      software_product_id,
      plan_id,
      owner_user_id,
      actor_user_id,
      request_idempotency_key,
      request_hash,
      provider_idempotency_key,
      expires_at,
      created_at,
      updated_at
    ) values (
      p_business_id,
      p_software_product_id,
      p_plan_id,
      p_owner_user_id,
      p_actor_user_id,
      p_request_idempotency_key,
      p_request_hash,
      p_provider_idempotency_key,
      v_now + interval '1 hour',
      v_now,
      v_now
    )
    returning * into v_existing;
  exception when unique_violation then
    select reservation.*
      into v_existing
      from public.software_checkout_reservations reservation
     where reservation.business_id = p_business_id
       and reservation.software_product_id = p_software_product_id
       and reservation.status = 'reserved';

    if not found then
      raise;
    end if;

    v_same_request :=
      v_existing.plan_id = p_plan_id
      and v_existing.owner_user_id = p_owner_user_id
      and v_existing.actor_user_id = p_actor_user_id
      and v_existing.request_idempotency_key = p_request_idempotency_key
      and v_existing.request_hash = p_request_hash
      and v_existing.provider_idempotency_key = p_provider_idempotency_key;
    return query select
      v_existing.id,
      v_same_request,
      v_existing.expires_at,
      v_existing.plan_id,
      v_existing.provider_checkout_session_id,
      v_existing.provider_checkout_session_url;
    return;
  end;

  return query select
    v_existing.id,
    true,
    v_existing.expires_at,
    v_existing.plan_id,
    null::text,
    null::text;
end;
$$;

create or replace function public.attach_software_checkout_session(
  p_reservation_id uuid,
  p_provider_checkout_session_id text,
  p_provider_checkout_session_url text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_provider_checkout_session_id is null or p_provider_checkout_session_id !~ '^cs_' then
    raise exception 'Invalid Stripe Checkout Session id' using errcode = '22023';
  end if;
  if p_provider_checkout_session_url is null
     or p_provider_checkout_session_url !~ '^https://checkout[.]stripe[.]com/' then
    raise exception 'Invalid Stripe Checkout Session URL' using errcode = '22023';
  end if;

  update public.software_checkout_reservations reservation
     set provider_checkout_session_id = p_provider_checkout_session_id,
         provider_checkout_session_url = p_provider_checkout_session_url,
         updated_at = statement_timestamp()
   where reservation.id = p_reservation_id
     and reservation.status = 'reserved'
     and reservation.expires_at > statement_timestamp()
     and (
       reservation.provider_checkout_session_id is null
       or reservation.provider_checkout_session_id = p_provider_checkout_session_id
     )
     and (
       reservation.provider_checkout_session_url is null
       or reservation.provider_checkout_session_url = p_provider_checkout_session_url
     );

  return found;
end;
$$;

create or replace function public.complete_software_checkout_reservation(
  p_reservation_id uuid,
  p_provider_checkout_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_software_product_id uuid;
begin
  if p_provider_checkout_session_id is null or p_provider_checkout_session_id !~ '^cs_' then
    raise exception 'Invalid Stripe Checkout Session id' using errcode = '22023';
  end if;

  select reservation.business_id, reservation.software_product_id
    into v_business_id, v_software_product_id
    from public.software_checkout_reservations reservation
   where reservation.id = p_reservation_id
     and (
       reservation.provider_checkout_session_id is null
       or reservation.provider_checkout_session_id = p_provider_checkout_session_id
     );

  if not found then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_business_id::text || ':' || v_software_product_id::text, 0)
  );

  update public.software_checkout_reservations reservation
     set provider_checkout_session_id = p_provider_checkout_session_id,
         status = 'completed',
         completed_at = coalesce(reservation.completed_at, statement_timestamp()),
         updated_at = statement_timestamp()
   where reservation.id = p_reservation_id
     and reservation.status = 'reserved'
     and (
       reservation.provider_checkout_session_id is null
       or reservation.provider_checkout_session_id = p_provider_checkout_session_id
     );

  if found then
    return true;
  end if;

  return exists (
    select 1
      from public.software_checkout_reservations reservation
     where reservation.id = p_reservation_id
       and reservation.status = 'completed'
       and reservation.provider_checkout_session_id = p_provider_checkout_session_id
  );
end;
$$;

create or replace function public.release_software_checkout_reservation(
  p_reservation_id uuid,
  p_provider_checkout_session_id text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_provider_checkout_session_id is not null and p_provider_checkout_session_id !~ '^cs_' then
    raise exception 'Invalid Stripe Checkout Session id' using errcode = '22023';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'A reservation release reason is required' using errcode = '22023';
  end if;

  update public.software_checkout_reservations reservation
     set provider_checkout_session_id = coalesce(
           reservation.provider_checkout_session_id,
           p_provider_checkout_session_id
         ),
         status = 'released',
         released_at = coalesce(reservation.released_at, statement_timestamp()),
         release_reason = left(btrim(p_reason), 120),
         updated_at = statement_timestamp()
   where reservation.id = p_reservation_id
     and reservation.status = 'reserved'
     and (
       p_provider_checkout_session_id is null
       or reservation.provider_checkout_session_id is null
       or reservation.provider_checkout_session_id = p_provider_checkout_session_id
     );

  if found then
    return true;
  end if;

  return exists (
    select 1
      from public.software_checkout_reservations reservation
     where reservation.id = p_reservation_id
       and reservation.status = 'released'
       and (
         p_provider_checkout_session_id is null
         or reservation.provider_checkout_session_id = p_provider_checkout_session_id
       )
  );
end;
$$;

revoke all on function public.claim_software_checkout_reservation(uuid, uuid, uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.attach_software_checkout_session(uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_software_checkout_reservation(uuid, text) from public, anon, authenticated;
revoke all on function public.release_software_checkout_reservation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_software_checkout_reservation(uuid, uuid, uuid, uuid, uuid, text, text, text) to service_role;
grant execute on function public.attach_software_checkout_session(uuid, text, text) to service_role;
grant execute on function public.complete_software_checkout_reservation(uuid, text) to service_role;
grant execute on function public.release_software_checkout_reservation(uuid, text, text) to service_role;

comment on table public.software_checkout_reservations is
  'Service-role-only, finite checkout claims that prevent concurrent Stripe Software sessions for the same business and offering.';
comment on function public.claim_software_checkout_reservation(uuid, uuid, uuid, uuid, uuid, text, text, text) is
  'Atomically claims one active, complete Software catalog offering for one business. The identical request/provider identity may recover its claim; another request receives the stored expiry and resumable Session URL.';

-- Edge Functions use the service role but still require table privileges on
-- projects created with Supabase's explicit-grants defaults.
grant select, insert, update on table
  public.payment_customers,
  public.business_billing_profiles,
  public.payment_subscriptions,
  public.payment_invoices,
  public.payment_refunds,
  public.payment_webhook_events,
  public.business_software_entitlements
to service_role;
grant select, update on table
  public.payment_orders,
  public.payment_transactions,
  public.driver_payouts
to service_role;
grant select, insert on table public.payment_audit_logs to service_role;

comment on view public.software_public_pricing_catalog is
  'Fail-closed browser catalog: emits a tier only when exactly one active monthly and annual Stripe-backed DB plan agree on product, currency, and trial days.';

alter table public.payment_webhook_events
  add column if not exists processing_started_at timestamptz;

create index if not exists payment_webhook_events_processing_claim_idx
  on public.payment_webhook_events (provider, processed, processing_started_at)
  where processed = false;

create or replace function public.claim_payment_webhook_event(
  p_provider public.zivo_payment_provider,
  p_provider_event_id text
)
returns table (claimed boolean, already_processed boolean, retry_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_processed boolean;
  v_retry_count integer;
begin
  update public.payment_webhook_events event_row
     set processing_started_at = now(),
         retry_count = event_row.retry_count + 1
   where event_row.provider = p_provider
     and event_row.provider_event_id = p_provider_event_id
     and event_row.processed = false
     and (
       event_row.processing_started_at is null
       or event_row.processing_started_at < now() - interval '15 minutes'
     )
  returning event_row.processed, event_row.retry_count
       into v_processed, v_retry_count;

  if found then
    return query select true, false, v_retry_count;
    return;
  end if;

  select event_row.processed, event_row.retry_count
    into v_processed, v_retry_count
    from public.payment_webhook_events event_row
   where event_row.provider = p_provider
     and event_row.provider_event_id = p_provider_event_id;

  if not found then
    raise exception 'Webhook event % was not recorded before claim', p_provider_event_id;
  end if;

  return query select false, v_processed, v_retry_count;
end;
$$;

revoke all on function public.claim_payment_webhook_event(public.zivo_payment_provider, text) from public, anon, authenticated;
grant execute on function public.claim_payment_webhook_event(public.zivo_payment_provider, text) to service_role;

comment on function public.claim_payment_webhook_event(public.zivo_payment_provider, text) is
  'Atomically claims one webhook delivery. Processed duplicates are acknowledged and in-flight duplicates retry later. Handled failures release immediately; crash claims become retryable after 15 minutes, beyond the hosted Edge Function 400-second wall-clock maximum.';

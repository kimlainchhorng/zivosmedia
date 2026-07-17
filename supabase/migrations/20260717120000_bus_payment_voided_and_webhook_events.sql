-- Bus payment hardening: allow 'voided' payment_status + Stripe webhook idempotency.
--
-- WHY:
--   1. capture-bus-payment (refund mode) sets payment_status='voided' when it cancels an
--      uncaptured authorization, but the applied bus_bookings CHECK only allowed
--      ('pending','authorized','captured','failed','refunded'). Voiding therefore hit a
--      CHECK violation -> the UPDATE failed with the Stripe authorization already cancelled,
--      leaving the booking stuck in hold/authorized. This adds the missing value so the
--      cancellation/refund leg completes atomically.
--   2. Adds bus_stripe_webhook_events (UNIQUE stripe_event_id) so a signature-verified
--      stripe-bus-webhook can reconcile bus_bookings idempotently (Stripe redeliveries
--      dropped), matching car_rental_stripe_webhook_events. This is the provider-event
--      confirmation path that complements the interim operator capture.
--   3. Adds stripe_last_event_at / stripe_last_event_type to bus_bookings for reconciliation
--      observability.
--
-- SAFETY:
--   Forward-only and additive. Staged for QA. DO NOT apply to the production project until
--   the P0 migration drift (duplicate timestamps; local != remote) is reconciled and the
--   remote state is verified with SUPABASE_ACCESS_TOKEN. No data is deleted or rewritten.

-- 1. payment_status: add 'voided' -------------------------------------------------------
do $$
declare
  c record;
begin
  if to_regclass('public.bus_bookings') is null then
    raise notice 'bus_bookings absent; skipping payment_status widening';
    return;
  end if;

  -- Drop any existing CHECK constraint on bus_bookings that mentions payment_status,
  -- regardless of its (possibly auto-generated) name.
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.bus_bookings'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%payment_status%'
  loop
    execute format('alter table public.bus_bookings drop constraint %I', c.conname);
  end loop;

  alter table public.bus_bookings
    add constraint bus_bookings_payment_status_check
    check (payment_status in ('pending','authorized','captured','failed','refunded','voided'));
end $$;

-- 2. Webhook idempotency log ------------------------------------------------------------
create table if not exists public.bus_stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  event_created_at timestamptz,
  booking_id uuid references public.bus_bookings(id) on delete set null,
  stripe_payment_intent_id text,
  processing_status text not null default 'received'
    check (processing_status in ('received','applied','skipped','error')),
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_bus_stripe_webhook_events_pi
  on public.bus_stripe_webhook_events(stripe_payment_intent_id);
create index if not exists idx_bus_stripe_webhook_events_booking
  on public.bus_stripe_webhook_events(booking_id);
create index if not exists idx_bus_stripe_webhook_events_received
  on public.bus_stripe_webhook_events(received_at desc);

alter table public.bus_stripe_webhook_events enable row level security;

-- Service-role only (the webhook runs with the service-role key; no anon/authenticated
-- access to raw provider events). No policies => RLS denies all non-service-role access.
revoke all on table public.bus_stripe_webhook_events from anon, authenticated;
grant all privileges on table public.bus_stripe_webhook_events to service_role;

-- 3. Reconciliation observability on bookings -------------------------------------------
do $$
begin
  if to_regclass('public.bus_bookings') is null then return; end if;
  alter table public.bus_bookings
    add column if not exists stripe_last_event_at timestamptz;
  alter table public.bus_bookings
    add column if not exists stripe_last_event_type text;
end $$;

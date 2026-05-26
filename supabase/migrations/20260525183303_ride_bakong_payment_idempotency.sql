-- Track verified Bakong/KHQR ride payments with a database-level idempotency key.
-- This prevents duplicate ride creation if a client retries after payment
-- verification succeeds.

alter table public.ride_requests
  add column if not exists bakong_reference text,
  add column if not exists bakong_amount_khr integer,
  add column if not exists bakong_verified_by text,
  add column if not exists bakong_verified_at timestamptz;

alter table public.ride_requests
  drop constraint if exists ride_requests_bakong_verified_by_check;

alter table public.ride_requests
  add constraint ride_requests_bakong_verified_by_check
  check (
    bakong_verified_by is null
    or bakong_verified_by in ('Bakong', 'Telegram')
  );

create unique index if not exists ride_requests_bakong_reference_key
  on public.ride_requests (bakong_reference)
  where bakong_reference is not null;

create index if not exists idx_ride_requests_bakong_verified_at
  on public.ride_requests (bakong_verified_at desc)
  where bakong_verified_at is not null;

comment on column public.ride_requests.bakong_reference is
  'Unique KHQR bill/reference used as the idempotency key for Bakong ride payments.';
comment on column public.ride_requests.bakong_amount_khr is
  'Verified Bakong KHQR amount in Cambodian riel.';
comment on column public.ride_requests.bakong_verified_by is
  'Payment verification channel: Bakong Open API or Telegram receipt bridge.';
comment on column public.ride_requests.bakong_verified_at is
  'Timestamp when the Bakong KHQR payment was verified by the server.';

alter table public.ride_requests
  add column if not exists cancel_reason text,
  add column if not exists cancel_fee_cents integer,
  add column if not exists cancelled_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists idx_ride_requests_cancelled_at
  on public.ride_requests (cancelled_at desc)
  where cancelled_at is not null;

create index if not exists idx_ride_requests_completed_at
  on public.ride_requests (completed_at desc)
  where completed_at is not null;

comment on column public.ride_requests.cancel_reason is
  'Customer or driver selected cancellation reason.';
comment on column public.ride_requests.cancel_fee_cents is
  'Cancellation fee in USD cents for card/manual accounting flows.';
comment on column public.ride_requests.cancelled_at is
  'Timestamp when the ride request entered a cancelled terminal state.';
comment on column public.ride_requests.completed_at is
  'Timestamp when the ride request entered a completed terminal state.';

-- Link driver earnings to the ride_requests flow used by the current ride app.
-- Existing driver_earnings rows reference the legacy trips table only, which
-- makes Bakong/KHQR ride payouts hard to reconcile.

alter table public.driver_earnings
  add column if not exists ride_request_id uuid references public.ride_requests(id) on delete set null,
  add column if not exists currency text not null default 'USD',
  add column if not exists payout_status text not null default 'pending',
  add column if not exists payout_reference text;

alter table public.driver_earnings
  drop constraint if exists driver_earnings_currency_check;

alter table public.driver_earnings
  add constraint driver_earnings_currency_check
  check (upper(currency) in ('USD', 'KHR'));

alter table public.driver_earnings
  drop constraint if exists driver_earnings_payout_status_check;

alter table public.driver_earnings
  add constraint driver_earnings_payout_status_check
  check (
    payout_status in (
      'pending',
      'stripe_pending',
      'stripe_paid',
      'manual_pending',
      'manual_paid',
      'cash_collected',
      'waived'
    )
  );

create unique index if not exists driver_earnings_ride_request_earning_key
  on public.driver_earnings (ride_request_id, earning_type);

create index if not exists idx_driver_earnings_ride_request_id
  on public.driver_earnings (ride_request_id)
  where ride_request_id is not null;

create index if not exists idx_driver_earnings_payout_status
  on public.driver_earnings (payout_status, created_at desc);

comment on column public.driver_earnings.ride_request_id is
  'Current ride_requests row that generated this driver earning. Used for Bakong/KHQR and modern ride reconciliation.';
comment on column public.driver_earnings.currency is
  'Currency of base_amount, platform_fee, tip_amount, bonus_amount, and net_amount.';
comment on column public.driver_earnings.payout_status is
  'Operational payout state for this earning, including manual_pending for Bakong/KHQR merchant collections.';
comment on column public.driver_earnings.payout_reference is
  'External payout, bank transfer, or manual settlement reference.';

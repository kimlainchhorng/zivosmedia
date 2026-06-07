# Zivo Driver Payout Flow

Generated: 2026-06-07

Driver payouts are separate from customer payments. A paid customer transaction does not automatically mean a driver can be paid.

## Payout Preconditions

- Customer payment is `paid`.
- Driver job is assigned to `driver_id`.
- Driver job is completed.
- Refund/dispute window rules are satisfied for the job type.
- Admin/system marks payout `eligible`.
- Driver has a valid payout profile.
- If using Stripe, driver has a valid Stripe Connect account with payout capability.

## Ledger Fields

`driver_payouts` stores:

- `driver_id`
- `driver_job_id`
- `travel_booking_id`
- `provider`
- `provider_connected_account_id`
- `provider_payout_id`
- `gross_amount`
- `platform_fee`
- `driver_earning`
- `currency`
- `status`
- `available_at`
- `paid_at`
- timestamps

## Status Flow

1. `not_ready`: job or payment is not ready.
2. `pending_completion`: payment exists, waiting for job completion.
3. `eligible`: job completed and approved for payout.
4. `payout_pending`: provider transfer/payout has been requested.
5. `paid`: provider confirms payout.
6. `failed`: provider failed payout.
7. `held`: admin or risk system holds payout.
8. `cancelled`: payout is no longer valid.

## Admin Controls

Zivo Admin can:

- hold payout
- release payout
- mark manual payout paid
- retry failed payout
- inspect related customer payment
- inspect refunds/disputes before release
- view driver payout audit logs

## Driver APIs

- `POST /api/driver/create-payout-account` -> `driver-create-payout-account`
- `GET /api/driver/earnings` -> `driver-earnings`
- `GET /api/driver/payouts` -> `driver-payouts`
- `POST /webhooks/payments/driver-payout-paid` -> `driver-payout-paid`
- `POST /webhooks/payments/driver-payout-failed` -> `driver-payout-failed`

The existing admin-only `driver-payout` function remains the Stripe transfer executor for completed ride jobs. It now mirrors successful transfer creation into shared `driver_payouts` so Zivo Admin can report payout status beside customer payments, refunds, disputes, and travel bookings.

Live payout creation must stay disabled until the owner approves Stripe Connect or another marketplace payout provider.

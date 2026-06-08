# Driver Payout Flow

## Goal

Driver payouts are tracked separately from customer payments. Customer payment success does not automatically make a payout eligible.

## Required Links

- `driver_id`.
- `driver_job_id`.
- `travel_booking_id` when related.
- `zivosmedia_user_id`.
- `payment_order_id`.
- provider connected account ID.
- provider payout/transfer ID.

## Payout Flow

1. Customer pays ZIVO through shared ZivoPay.
2. Driver job is assigned.
3. Driver accepts job.
4. Driver completes job.
5. System/admin marks payout eligible.
6. Payout is sent through Stripe Connect, PayPal, Square, or equivalent provider adapter when supported.
7. Zivo Admin logs payout, platform fee, driver earning, status, and audit event.
8. Driver can see earnings and payout status.

## Statuses

- not_ready.
- pending_completion.
- eligible.
- payout_pending.
- paid.
- failed.
- held.
- cancelled.

## Admin Controls

Zivo Admin can:

- view driver earnings.
- hold payout.
- release payout.
- retry failed payout.
- inspect related booking/payment/refund/dispute.
- audit every payout action.

## Safety

Do not enable live payouts until provider sandbox flow, compliance, connected account onboarding, refund/dispute handling, and owner approval are complete.

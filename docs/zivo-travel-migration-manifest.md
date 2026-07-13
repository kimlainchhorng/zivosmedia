# Zivo Travel migration manifest

Generated: 2026-06-05T22:51:47.178Z

This manifest is local and non-destructive. It groups the live travel engine into cutover batches for Claude/Codex collaboration.

## Summary

- Source project: slirphzzwcogdbkeicff
- Target project: xbllvmpomorawkcrtbcq
- Dedicated backend flag: keep false until all service batches are migrated and smoke-tested.

## 1. Flights

- Tables: 16
- Routines/triggers/RPC: 1
- Edge Functions present locally: 8/8
- Local migration files mentioning these tables: 48

Smoke tests:
- Search offers without payment.
- Create a test checkout/payment intent in sandbox mode.
- Confirm booking writes passenger and payment audit rows.
- Refund sandbox booking.

## 2. Hotels and lodging

- Tables: 46
- Routines/triggers/RPC: 9
- Edge Functions present locally: 9/9
- Local migration files mentioning these tables: 62

Smoke tests:
- Load public hotel search/listing reads.
- Create sandbox deposit checkout.
- Confirm webhook idempotency rows write.
- Submit and read a lodging review.

## 3. Rental cars

- Tables: 18
- Routines/triggers/RPC: 11
- Edge Functions present locally: 4/4
- Local migration files mentioning these tables: 36

Smoke tests:
- Load public fleet and availability.
- Create sandbox deposit.
- Capture sandbox balance.
- Refund sandbox deposit.

## 4. Booking bus

- Tables: 8
- Routines/triggers/RPC: 5
- Edge Functions present locally: 2/2
- Local migration files mentioning these tables: 6

Smoke tests:
- Search bus routes and trips.
- Create booking hold.
- Create sandbox payment intent.
- Capture and refund sandbox bus payment.

## 5. Shared payments, wallet, and payouts

- Tables: 27
- Routines/triggers/RPC: 6
- Edge Functions present locally: 9/9
- Local migration files mentioning these tables: 44

Smoke tests:
- Read wallet summary in sandbox user account.
- Create Connect onboarding link in sandbox.
- Record payout method without exposing secrets.
- Request sandbox withdrawal/cashout.

## Cutover rule

Do not enable `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true` until every batch above has schema, RLS, explicit Data API grants for intended roles, Edge Functions, secrets, storage policies, and sandbox smoke tests complete in `xbllvmpomorawkcrtbcq`.


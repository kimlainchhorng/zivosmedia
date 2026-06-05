# Zivo Travel backend cutover

Date: 2026-06-05

## Current state

- `zivostravel.com` is served by the shared ZIVO web app.
- The travel telemetry/config project is `xbllvmpomorawkcrtbcq`.
- The live booking/payment source project remains `slirphzzwcogdbkeicff`.
- The app keeps using the shared live engine by default. Dedicated travel backend mode is gated by `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true`.

## Live engine inventory

The main project currently contains the live travel engine:

- Flights: 16 tables.
- Hotels/lodging: 46 tables.
- Car rental: 18 tables.
- Bus: 8 tables.
- Payment, wallet, and payout related tables: 68 tables.

The travel project currently contains telemetry/config tables only:

- `zivo_travel_backend_links`
- `zivo_travel_partner_workflows`
- `zivo_travel_search_events`
- `zivo_travel_service_catalog`
- `zivo_travel_sync_runs`

See `docs/zivo-travel-supabase-inventory.md` for the latest source/target inventory and Supabase MCP queries to rerun.

## Required before dedicated backend cutover

1. Copy or recreate the travel engine schema in `xbllvmpomorawkcrtbcq`, including RLS policies, triggers, RPC functions, storage buckets, and indexes.
   For any table or function the browser app reads through Supabase Data API/PostgREST, add explicit `GRANT` access for the intended roles (`anon` and/or `authenticated`) and verify RLS is enabled.
2. Deploy required Edge Functions to the travel project:
   - Flights: `duffel-flights`, `duffel-fare-calendar`, `duffel-destination-prices`, `duffel-hot-deals`, `create-flight-checkout`, `create-flight-payment-intent`, `confirm-flight-payment`, `process-flight-refund`.
   - Hotels: `hotelbeds-hotels`, `ratehawk-hotels`, `create-lodging-deposit`, `create-lodging-paypal-order`, `capture-lodging-paypal-order`, `create-lodging-square-checkout`, `stripe-lodging-webhook`, `square-lodging-webhook`, `paypal-lodging-webhook`.
   - Car rental: `create-car-rental-deposit`, `capture-car-rental-balance`, `refund-car-rental-deposit`, `stripe-car-rental-webhook`.
   - Bus: `create-bus-payment-intent`, `capture-bus-payment`.
   - Payouts/wallet: `connect-onboard`, `connect-status`, `connect-account-session`, `connect-instant-payout`, `process-withdrawal`, `customer-payout-method-record`, `merchant-payout-request`, `paypal-payout`, `square-payout`.
3. Configure project secrets for provider APIs and payment processors in the travel project. Do not copy secrets into the repo.
4. Configure Supabase Auth URL allowlists for:
   - `https://zivostravel.com`
   - `https://www.zivostravel.com`
   - `https://zivosmedia.com/auth/handoff`
   - `https://zivostravel.com/auth/handoff`
5. Smoke-test non-payment reads first, then test payment flows in sandbox/provider test mode before enabling live keys.
6. Set `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true` only after the checks above pass.

## Why the flag stays off now

If the flag is enabled before the travel project has the engine schema and Edge Functions, `/flights`, `/hotels`, `/cars`, `/bus`, checkout, wallet, and payout flows will call missing tables/functions and fail for customers.

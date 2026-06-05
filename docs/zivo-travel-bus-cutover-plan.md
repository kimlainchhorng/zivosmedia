# Zivo Travel bus cutover plan

Date: 2026-06-05

## Goal

Move the bus booking backend from the main Zivo Supabase project (`slirphzzwcogdbkeicff`) into the dedicated Zivo Travel project (`xbllvmpomorawkcrtbcq`) as the first small travel-engine cutover batch.

Keep `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=false` until this batch is deployed and smoke-tested in the target project.

## Live source inventory

Source project: `slirphzzwcogdbkeicff`

Bus tables:

- `bus_routes` - public/operator route definitions, origin/destination, base fare, status.
- `bus_route_stops` - ordered pickup/dropoff stops per route.
- `bus_trips` - dated departures with vehicle, driver, seat layout, pricing, and status.
- `bus_bookings` - customer bookings, seat JSON, payment intent, booking reference, status.
- `bus_vehicles` - operator vehicles and seat layout defaults.
- `bus_drivers` - operator drivers.
- `bus_promos` - operator promo codes and active date windows.
- `bus_reviews` - customer reviews and operator replies.

Live RLS:

- RLS is enabled on all 8 bus tables.
- Public reads exist for active/scheduled route, stop, trip, promo, and published review data.
- Customer-scoped reads/inserts exist for bookings and reviews.
- Store-owner/admin policies manage route, trip, booking, promo, vehicle, driver, and review reply operations.

Live triggers:

- Every bus table has a `BEFORE UPDATE` trigger calling `set_updated_at()`.

Live routines required by UI:

- `search_bus_trips`
- `create_bus_booking`
- `get_bus_trip_seats`
- `get_my_bus_bookings`
- `get_popular_bus_routes`

Live Edge Functions required:

- `create-bus-payment-intent`
- `capture-bus-payment`

Draft target SQL:

- `docs/zivo-travel-bus-target-migration-draft.sql`

## Target-project prerequisites

Before applying bus schema to `xbllvmpomorawkcrtbcq`, confirm shared dependencies exist:

- `auth.users` references are available through Supabase Auth.
- `store_profiles` exists or a travel-specific operator profile replacement is planned.
- Shared helper functions exist or are recreated:
  - `set_updated_at()`
  - `is_store_owner(uuid, uuid)`
  - `is_admin(uuid)`
- `private` exists and is not listed in the Supabase Data API exposed schemas.
- Stripe/payment secrets are configured for sandbox before any live key usage.

## Migration batch order

1. Shared helpers and operator dependency:
   - `set_updated_at()`
   - `is_store_owner`
   - `is_admin`
   - `store_profiles` dependency or travel operator mapping
2. Route catalog:
   - `bus_routes`
   - `bus_route_stops`
   - public read policies
3. Operations resources:
   - `bus_vehicles`
   - `bus_drivers`
   - owner/admin manage policies
4. Departures and inventory:
   - `bus_trips`
   - private privileged routines plus public wrappers for `search_bus_trips`
   - private privileged routines plus public wrappers for `get_bus_trip_seats`
5. Customer flow:
   - `bus_bookings`
   - private privileged routines plus public wrappers for `create_bus_booking`
   - private privileged routines plus public wrappers for `get_my_bus_bookings`
6. Growth and feedback:
   - `bus_promos`
   - `bus_reviews`
   - `get_popular_bus_routes`
7. Payments:
   - deploy `create-bus-payment-intent`
   - deploy `capture-bus-payment`
   - configure Stripe sandbox secrets and webhooks

## Index cleanup note

The live source has 31 bus indexes, including duplicate-purpose indexes such as both `bus_vehicles_store_idx` and `idx_bus_vehicles_store`. When drafting the target migration, keep one stable index per access pattern instead of copying duplicate index names blindly.

Required access patterns:

- `bus_routes(store_id)`
- `bus_routes(origin, destination)`
- `bus_route_stops(route_id, stop_order)`
- `bus_route_stops(store_id)`
- `bus_trips(store_id)`
- `bus_trips(route_id)`
- `bus_trips(depart_date)`
- `bus_bookings(store_id)`
- `bus_bookings(trip_id)`
- `bus_bookings(customer_id)`
- `bus_promos(store_id, status)`
- unique promo code per store
- `bus_reviews(store_id, created_at desc)`
- `bus_reviews(trip_id)`
- `bus_reviews(customer_id)`
- `bus_vehicles(store_id)`
- `bus_drivers(store_id)`

## Smoke tests

Run these with sandbox/test keys before any dedicated-backend flag flip:

- Public user can search active routes and scheduled trips.
- Public user can view stops for an active route.
- Authenticated user can create a booking hold.
- Seat availability excludes already-held/confirmed seats.
- Authenticated user can create a Stripe sandbox payment intent.
- Operator/admin can confirm/cancel/refund through `capture-bus-payment`.
- Customer can view their ticket in `get_my_bus_bookings`.
- Customer can submit a review after a booking.
- Operator can reply to a review.

## Cutover rule

Do not enable `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true` until the target project passes the smoke tests above and the travel project has the two bus Edge Functions deployed with sandbox secrets first.

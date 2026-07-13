# Zivo Travel Supabase inventory

Date: 2026-06-05

## Projects

- Source/live engine: `slirphzzwcogdbkeicff` (`https://slirphzzwcogdbkeicff.supabase.co`)
- Target/travel project: `xbllvmpomorawkcrtbcq` (`https://xbllvmpomorawkcrtbcq.supabase.co`)

## Target project today

The target project currently has telemetry/config tables only:

- `zivo_travel_backend_links`
- `zivo_travel_partner_workflows`
- `zivo_travel_search_events`
- `zivo_travel_service_catalog`
- `zivo_travel_sync_runs`

Target Edge Functions: `0`.

## Source project live travel engine

The source project currently contains the live engine needed by `zivostravel.com`:

- Flight tables: `16`
- Hotel/lodging tables: `46`
- Car rental tables: `18`
- Bus tables: `8`
- Payment/wallet/payout tables matching travel/payment patterns: `68`
- Travel-related public routines/RPC/triggers found: `37`

Representative required routines:

- Flights: `clean_expired_flight_cache`
- Bus: `create_bus_booking`, `get_bus_trip_seats`, `get_my_bus_bookings`, `get_popular_bus_routes`, `search_bus_trips`
- Car rental: `create_car_rental_app_reservation`, `get_car_rental_availability`, `get_car_rental_reservation`, `get_car_rental_reservation_payment_status`
- Lodging: `is_lodge_reservation_guest`, `is_lodge_store_manager`, `is_lodge_store_owner`, `lodging_wiring_report`, `notify_lodging_host_new_paid_booking`, `notify_lodging_host_refund`
- Wallet/payout: `apply_wallet_credit`, `compute_est_payout`, `credit_referral_wallet_bonus`, `credit_user_wallet_topup`, `refresh_wallet_balance`, `request_live_earnings_payout`

## Required local Edge Function source folders

The local repo currently contains all `32/32` required source folders for the first travel backend cutover audit:

- Flights: `duffel-flights`, `duffel-fare-calendar`, `duffel-destination-prices`, `duffel-hot-deals`, `create-flight-checkout`, `create-flight-payment-intent`, `confirm-flight-payment`, `process-flight-refund`
- Hotels: `hotelbeds-hotels`, `ratehawk-hotels`, `create-lodging-deposit`, `create-lodging-paypal-order`, `capture-lodging-paypal-order`, `create-lodging-square-checkout`, `stripe-lodging-webhook`, `square-lodging-webhook`, `paypal-lodging-webhook`
- Cars: `create-car-rental-deposit`, `capture-car-rental-balance`, `refund-car-rental-deposit`, `stripe-car-rental-webhook`
- Bus: `create-bus-payment-intent`, `capture-bus-payment`
- Payouts: `connect-onboard`, `connect-status`, `connect-account-session`, `connect-instant-payout`, `process-withdrawal`, `customer-payout-method-record`, `merchant-payout-request`, `paypal-payout`, `square-payout`

## Cutover status

`VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND` must stay `false` until the target project has the engine schema, policies, routines, storage, Edge Functions, secrets, Auth redirects, and sandbox payment smoke tests.

## Supabase MCP queries to rerun

Source table inventory:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
  and (
    table_name like 'flight\_%' escape '\' or table_name = 'flights' or table_name like 'flights\_%' escape '\' or
    table_name like 'lodge\_%' escape '\' or table_name like 'lodging\_%' escape '\' or
    table_name like 'car\_rental\_%' escape '\' or table_name = 'car_rentals' or
    table_name like 'bus\_%' escape '\' or
    table_name like '%wallet%' or table_name like '%payout%' or table_name like '%payment%' or
    table_name = 'travel_payments'
  )
order by table_name;
```

Target table inventory:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
```

Source travel routines:

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and (
    routine_name like '%flight%' or routine_name like '%lodge%' or routine_name like '%lodging%' or
    routine_name like '%car_rental%' or routine_name like '%bus%' or
    routine_name like '%wallet%' or routine_name like '%payout%'
  )
order by routine_name;
```

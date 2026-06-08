# Zivo Admin Dashboard Plan

## Role

Zivo Admin is the control center for ZIVO LLC.

## Core Modules

- platform registry.
- all 8 domains.
- GitHub repo mapping.
- Supabase project mapping.
- app health status.
- user search.
- payment dashboard.
- chat dashboard.
- travel/driver dashboard.
- business/software dashboard.
- audit logs.

## Platform Registry Fields

- platform key.
- platform name.
- domain.
- repo.
- Supabase project ref.
- deployment target.
- health URL.
- owner/status notes.
- last checked time.

## Payment Dashboard

Admin should see:

- who paid.
- source platform.
- related record.
- provider.
- local status.
- provider status.
- refunds.
- disputes.
- driver payouts.
- business payouts.
- webhook history.
- audit logs.

## Chat Dashboard

Admin should see:

- source platform.
- app key.
- users/participants.
- related IDs.
- assigned admin.
- priority.
- status.
- audit history.

## Travel/Driver Dashboard

Admin should see travel bookings, driver jobs, driver assignment status, customer payment status, refund status, payout eligibility, and payout status.

## Business/Software Dashboard

Admin should see business profiles, software products, subscriptions, invoices, setup/support status, and entitlement state.

## Recommended First Safe PR

After PR 1, create platform registry foundation in `kimlainchhorng/Zivo-Admin` once repo access is available.

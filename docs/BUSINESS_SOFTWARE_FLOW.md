# Business Software Flow

## Goal

Zivo Business owns business profiles and billing ownership. ZivoSoftware lists and delivers business software products.

## Business Profile

A business profile should connect to:

- `business_id`.
- owner `zivosmedia_user_id`.
- billing profile.
- active software subscriptions.
- invoices.
- setup/support chat threads.

## ZivoSoftware Products

Software products can include:

- POS.
- booking.
- CRM.
- payroll.
- website.
- AI assistant.
- driver/fleet.
- travel agency.
- invoice.
- marketing.
- custom software.

## Flow

1. Business owner signs in through Zivosmedia.
2. Business profile is linked to `zivosmedia_user_id`.
3. Business browses ZivoSoftware products.
4. Business activates a product through shared ZivoPay checkout/subscription flow.
5. Payment/subscription record links to `business_id`, `software_product_id`, and `zivosmedia_user_id`.
6. Software access activates only from verified payment/subscription state.
7. Zivo Business shows active software and invoices.
8. Zivo Admin manages subscriptions, failed payments, setup status, and support.
9. ZivoChat supports setup and support threads.

## Admin Requirements

Zivo Admin should show:

- business profile.
- owner user.
- active software.
- subscription status.
- invoice status.
- payment status.
- setup/support status.
- audit logs.

## Open Repo Question

Confirm whether Zivo Business and Zivo Employee need dedicated repos or stay as modules inside another repo.

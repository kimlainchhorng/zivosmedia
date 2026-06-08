# ZIVO Ecosystem Map

ZIVO LLC operates a connected product ecosystem with Zivosmedia as the all-in-one platform, central identity hub, and central payment hub.

## Core Rule

Zivosmedia is the source of truth for shared identity and shared payment records. Product apps can own local workflow records, but cross-platform identity and payment references must resolve back to Zivosmedia.

## Platforms

| Platform | Primary role | Domain |
| --- | --- | --- |
| Zivosmedia | All-in-one platform, identity hub, payment hub | zivosmedia.com |
| Zivo Business | Business profiles, billing owner, business operations | zivobusiness.com |
| Zivo Driver | Driver jobs, earnings, payouts | zivodriver.com |
| Zivo Employee | Employee/staff workflows | zivoemployee.com |
| ZivoChat | Shared communication layer | zivoschat.com |
| ZivoSoftware | Business software products and subscriptions | zivosoftware.com |
| Zivo Travel | Travel search, booking, checkout, support | zivostravel.com |
| Zivo Admin | Control center for all platforms | zivoadmin.com |

## Shared IDs

Use `zivosmedia_user_id` as the standard cross-platform user identifier. Local apps may keep `local_user_id`, `driver_id`, `business_id`, `employee_id`, or customer IDs, but those records should map back to `zivosmedia_user_id` when user-owned.

## Shared Layers

- Identity: Zivosmedia auth, account linking, Continue with Zivosmedia, auth audit logs.
- Payments: ZivoPay/Zivosmedia Payments, provider adapters, payment audit logs.
- Chat: ZivoChat shared thread model with platform context and related IDs.
- Admin: Zivo Admin registry, health, dashboards, audit, support, refunds, payouts.

## Current Implementation Posture

This document is a planning inventory only. It does not create runtime behavior, database tables, migrations, routes, secrets, or payment processing.

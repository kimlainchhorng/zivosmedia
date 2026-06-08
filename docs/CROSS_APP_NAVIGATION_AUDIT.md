# Cross-App Navigation Audit

## Goal

Every ZIVO app should make it clear how users move between Zivosmedia, Travel, Driver, Chat, Software, Business, Employee, and Admin.

## Current Findings

- App switcher is not consistently visible on public domains or local routes.
- Continue with Zivosmedia is not prominent enough on auth surfaces.
- ZivoChat support entry is not consistently visible from booking, payment, business, software, driver, or admin surfaces.
- Payment/billing status is not consistently connected to travel booking, driver job, software subscription, business profile, wallet, or admin webhook views.

## Required Navigation Targets

- zivosmedia.com.
- zivobusiness.com.
- zivodriver.com.
- zivoemployee.com.
- zivoschat.com.
- zivosoftware.com.
- zivostravel.com.
- zivoadmin.com.

## Recommended Fixes

| Fix | Description | Priority |
| --- | --- | --- |
| Unified app switcher | Compact menu listing all 8 apps with current app highlighted. | P1 |
| Continue with Zivosmedia CTA | Standard auth CTA on login/signup and public app pages. | P1 |
| ZivoChat support link | Persistent support entry that creates a thread with source platform and related IDs. | P1 |
| Payment/billing link | Surface payment status, wallet, subscriptions, invoices, and payouts from relevant product routes. | P1 |
| Admin registry link | Admin should expose platform health and repo/Supabase mapping. | P1 |

## Blockers

- Zivo Admin, Zivo Driver, ZivoChat, and ZivoSoftware repo access still needs confirmation from the master plan inventory.
- `zivoadmin.com` did not resolve during captures.
# Chat UI Audit

## Screens Reviewed

- Public domain: `zivoschat.com`.
- Local route: `/chat`.
- Related route: `/support/new`.

## Summary

ZivoChat exists as a visible surface, but the audit shows it should be positioned more explicitly as the shared support and communication layer across all ZIVO apps.

## Key Findings

| Area | Finding | Fix | Priority |
| --- | --- | --- | --- |
| Shared role | Cross-app chat role is not obvious enough. | Add language and UI showing Travel, Driver, Business, Software, Payment, and Admin thread contexts. | P1 |
| Support | `/support/new` exists but should map to ZivoChat thread metadata. | Capture source platform, app key, user ID, related IDs, priority, and assigned admin placeholder. | P1 |
| Auth | Continue with Zivosmedia should be clear. | Use the standard auth CTA. | P1 |
| Navigation | App switcher missing/inconsistent. | Add app switcher. | P1 |

## Recommended Chat Fix

After identity foundation, create a support thread intake pattern that pre-fills source platform and related IDs for payment, travel, driver, business, and software issues.
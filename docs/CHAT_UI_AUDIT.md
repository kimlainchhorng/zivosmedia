# Chat UI Audit

<<<<<<< Updated upstream
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
=======
Screens reviewed: `https://zivoschat.com`, `/chat`, `/support/new`.

## Findings

| Screen | Screenshot evidence | Status | First impression and consistency | Missing items | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| `https://zivoschat.com` | `docs/audits/screenshots/mobile/public-zivoschat-com--iphone-15-pro.png`, `docs/audits/screenshots/desktop/public-zivoschat-com--desktop-1440.png` | Login-gated. | Clear sign-in page, but not enough context about shared ZIVO identity or support/chat purpose. | `Continue with Zivosmedia`, app/thread context, support escalation explanation. | Add shared identity CTA and route-aware chat copy later. | P1 |
| `/chat` | `docs/audits/screenshots/mobile/local-chat--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-chat--desktop-1440.png` | Login-gated. | Generic ZIVO sign-in loses chat context. | `Continue with Zivosmedia`, chat-specific auth gate. | Add chat route context in auth UI. | P1 |
| `/support/new` | `docs/audits/screenshots/mobile/local-support-new--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-support-new--desktop-1440.png` | Loads support form. | Form is usable, but navigation mixes feed and travel. It is not visibly a ZivoChat support entry. | `ZivoChat support`, shared identity, app-context handoff, clearer support categories. | Convert support entry into a ZivoChat-aware support request path. | P1 |

## Chat Top Fixes

1. Add consistent `ZivoChat support` entry across Travel, Driver, Software, Business, Admin, and Zivosmedia.
2. Add `Continue with Zivosmedia` to chat login/auth gates.
3. Preserve source app and record context when users open support.
>>>>>>> Stashed changes

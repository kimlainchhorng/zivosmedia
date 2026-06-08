# Mobile UI Audit

## Scope

Mobile screenshots were captured for iPhone 13 and iPhone 15 Pro under `docs/ui-audit-screenshots/`.

## Mobile Status Summary

- Public domains generally load except `zivoadmin.com`, which failed/unresolved during capture.
- Zivo Travel is the strongest mobile domain experience.
- Zivo Driver, Zivo Business, and Zivo Employee need dedicated first-view pages.
- The cookie/banner surface can block first-viewport content on mobile.
- Several authenticated/role routes load but need role context or empty states.
- `npm run test:visual` found account safe-area snapshot diffs on iPhone SE, iPhone 13, and iPhone 14 Pro Max.

## Priority Mobile Findings

| Finding | Affected screens | Recommended fix | Priority |
| --- | --- | --- | --- |
| Admin domain not available | `zivoadmin.com` | Confirm DNS/deployment and publish a minimal health/admin landing shell. | P0 |
| Hotel route content mismatch | `/hotels` | Fix route/content mapping so hotel page displays hotel search and booking copy. | P0 |
| Driver domain is generic | `zivodriver.com`, `/driver/orders` | Create driver-specific mobile landing with onboarding, jobs, earnings, and payouts. | P1 |
| Continue with Zivosmedia not visible enough | `/login`, `/signup`, public app domains | Make Continue with Zivosmedia the primary identity CTA. | P1 |
| Missing app switcher | All public domains and hub routes | Add compact mobile app switcher linking the 8 ZIVO domains. | P1 |
| Missing ZivoChat support path | Travel, driver, software, business, checkout, wallet | Add support/chat CTA with source platform metadata. | P1 |
| Account safe-area snapshot diffs | account visual snapshots | Review top/bottom safe-area snapshots and update baseline only after confirming UI is correct. | P1 |

## Mobile Design Notes

Use compact navigation, clear app identity, and role-aware empty states. Avoid first-viewport overlays that hide product purpose or primary CTAs.
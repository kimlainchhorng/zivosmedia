# Mobile UI Audit

Viewports captured: iPhone 13 and iPhone 15 Pro.

Screenshot folder: `docs/audits/screenshots/mobile`.

## Summary

| Screen group | Screenshot evidence | Mobile status | Key UI/UX findings | Missing items | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| ZIVO/feed shell: `zivosmedia.com`, `/`, `/feed` | `docs/audits/screenshots/mobile/public-zivosmedia-com--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-home--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-feed--iphone-15-pro.png` | Loads. | First impression is crowded by cookie/privacy banner. Brand identity varies between feed and travel-super-app language. Navigation is dense. | `Continue with Zivosmedia`, ZivoChat support, payment hub/app switcher. | Reduce consent banner footprint and clarify mobile hub navigation. | P1 |
| Auth: `/login`, `/signup` | `docs/audits/screenshots/mobile/local-login--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-signup--iphone-15-pro.png` | Loads. | Login is readable; signup is dense on mobile. Protected-route users lose context when redirected to generic auth. | `Continue with Zivosmedia`, route-specific auth copy, form/context clarity. | Add shared identity CTA and progressive signup/context copy later. | P1 |
| Protected local modules: `/chat`, `/travel`, `/wallet`, `/settings`, `/shop-dashboard*`, `/admin/*` | `docs/audits/screenshots/mobile/local-chat--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-wallet--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-admin-security--iphone-15-pro.png` | Login-gated. | Generic sign-in is usable but confusing for wallet/admin/chat/business routes because the destination is not explained. | `Continue with Zivosmedia`, ZivoChat support, payment/admin safety context. | Add route-aware auth gates; do not change auth logic in this PR. | P1 |
| Travel: `zivostravel.com`, `/flights`, `/cars`, `/bus`, `/travel/checkout` | `docs/audits/screenshots/mobile/public-zivostravel-com--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-flights--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-bus--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-travel-checkout--iphone-15-pro.png` | Loads. | Real product surfaces, but first viewports are dense and checkout empty state is thin. Cookie/privacy banner competes with search and checkout tasks. | `Continue with Zivosmedia`, ZivoChat support, ZivoPay/payment status. | Reduce first-viewport clutter and add identity/support/payment labels. | P1 |
| `/hotels` | `docs/audits/screenshots/mobile/local-hotels--iphone-15-pro.png` | Loads wrong content. | Hotel route shows rides/Cambodia availability messaging. This is confusing and blocks the expected hotel workflow. | Hotel search CTA, booking/payment path, support entry. | Fix route mapping/content before visual polish. | P0 |
| Driver: `zivodriver.com`, `/driver/orders` | `docs/audits/screenshots/mobile/public-zivodriver-com--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-driver-orders--iphone-15-pro.png` | Loads, but not driver-specific. | Public driver site shows generic ZIVO/travel-super-app; local driver route shows shopping orders empty state. | Become a Driver, benefits, requirements, earnings/payouts, Travel-to-Driver explanation, support/chat, Privacy/Terms. | Create full driver landing page in the first follow-up UI PR. | P1 |
| ZivoChat/support: `zivoschat.com`, `/support/new` | `docs/audits/screenshots/mobile/public-zivoschat-com--iphone-15-pro.png`, `docs/audits/screenshots/mobile/local-support-new--iphone-15-pro.png` | Chat is login-gated; support form loads. | Support route mixes feed and travel navigation. ZivoChat is not clearly presented as the support channel. | `Continue with Zivosmedia`, `ZivoChat support`, app-context support handoff. | Add ZivoChat-aware support entry and identity copy. | P1 |
| Business/Software/Employee | `docs/audits/screenshots/mobile/public-zivosoftware-com--iphone-15-pro.png`, `docs/audits/screenshots/mobile/public-zivobusiness-com--iphone-15-pro.png`, `docs/audits/screenshots/mobile/public-zivoemployee-com--iphone-15-pro.png` | Software loads correctly; Business/Employee load generic ZIVO. | Software is professional; Business/Employee domains do not match their names. | Business/employee CTAs, identity, support, billing/role context. | Add domain-specific holding/landing pages after ownership confirmation. | P1/P2 |

## Mobile Accessibility Issues

- Cookie/privacy banner can dominate the first viewport and obscure primary content.
- Generic auth redirects reduce orientation for screen reader and keyboard users because the destination module is not named.
- Dense mobile travel/search pages need clearer single-primary-action hierarchy.
- Missing `Continue with Zivosmedia` creates an identity-orientation gap across auth and satellite apps.

## Mobile Priority Notes

- P0: `/hotels` content mismatch.
- P1: driver landing missing, shared identity missing, support/payment context missing, route-aware auth gates missing.
- P2: employee/legal/settings polish after higher-priority flow fixes.

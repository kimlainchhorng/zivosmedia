# Mobile UI Audit

Viewports captured: `iphone-13` and `iphone-15-pro`.

Screenshot root: `docs/ui-audit-screenshots/`.

## Mobile Findings

| Screen Group | Screenshot Paths | First Impression | Mobile Problems | CTA/Nav/Brand Issues | Recommended Fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| ZIVO feed domains: `zivosmedia.com`, `zivodriver.com`, `zivobusiness.com`, `zivoemployee.com`, `/`, `/feed` | `docs/ui-audit-screenshots/public/zivodriver-com/iphone-15-pro.png`, `docs/ui-audit-screenshots/local/home/iphone-15-pro.png` | Mobile app shell loads, but the first impression is generic feed rather than domain-specific product. | Cookie banner consumes most of the viewport; bottom nav remains visible but core content is hidden. | Driver, Business, and Employee domains lack their own mobile brand story. Missing Continue with Zivosmedia. | Use a smaller consent banner and domain-specific mobile landing screens. | P1 |
| Login and protected redirects: `/login`, `/chat`, `/shop-dashboard`, `/admin/security`, `/wallet`, `/settings` | `docs/ui-audit-screenshots/local/login/iphone-15-pro.png`, `docs/ui-audit-screenshots/local/admin-security/iphone-15-pro.png` | Login UI is clean and readable. | Card is large; lower content is pushed down. Protected routes lose module context after redirect. | No Continue with Zivosmedia, no route-specific sign-in message, no admin/wallet safety context. | Add central identity CTA and preserve route purpose in the auth gate. | P1 |
| Signup: `/signup` | `docs/ui-audit-screenshots/local/signup/iphone-13.png`, `docs/ui-audit-screenshots/local/signup/iphone-15-pro.png` | Form is reachable. | Dense form and age/date controls create friction on a small screen. | Missing Continue with Zivosmedia and account-linking explanation. | Add Zivosmedia SSO first, then collect extra signup fields progressively. | P1 |
| Travel pages: `zivostravel.com`, `/flights`, `/cars`, `/bus`, `/travel/checkout` | `docs/ui-audit-screenshots/public/zivostravel-com/iphone-15-pro.png`, `docs/ui-audit-screenshots/local/flights/iphone-15-pro.png`, `docs/ui-audit-screenshots/local/travel-checkout/iphone-15-pro.png` | Travel surfaces look product-rich. | Cookie banner blocks flight/search/checkout content; mobile hero imagery competes with search controls; checkout empty state lacks payment support context. | Missing Continue with Zivosmedia and explicit ZivoChat support. Payment appears as wallet/checkout copy but not as ZivoPay. | Reduce banner height, prioritize one primary search CTA, add identity and support/payment context. | P1 |
| `/hotels` | `docs/ui-audit-screenshots/local/hotels/iphone-15-pro.png` | Route loads, but content appears unrelated to hotels. | Hotel users see rides/Cambodia availability messaging. | Confusing route identity; missing hotel CTA. | Fix route content mapping before visual polish. | P0 |
| Driver: `zivodriver.com`, `/driver/orders` | `docs/ui-audit-screenshots/public/zivodriver-com/iphone-15-pro.png`, `docs/ui-audit-screenshots/local/driver-orders/iphone-15-pro.png` | Driver domain is not driver-specific; orders page empty state is minimal. | Cookie banner hides public domain content; driver orders empty state does not explain jobs. | Missing Apply to Drive, Continue with Zivosmedia, ZivoChat support, payout status. | Add the driver landing page in the roadmap and improve empty-state workflow copy. | P1 |
| ZivoChat: `zivoschat.com`, `/chat`, `/support/new` | `docs/ui-audit-screenshots/public/zivoschat-com/iphone-15-pro.png`, `docs/ui-audit-screenshots/local/support-new/iphone-15-pro.png` | Chat domain goes to login; support route loads. | Support route has mixed navigation; chat login has no cross-app identity language. | Missing Continue with Zivosmedia and app-context thread creation. | Add ZivoChat support entry and identity-aware chat auth. | P1 |

## Mobile Accessibility Notes

- Cookie banner on mobile uses very large text and controls; it blocks the page and can trap the first impression.
- Several protected routes show a generic login form with no route-specific heading, which hurts orientation for screen reader and keyboard users.
- Some mobile pages use dense, image-heavy hero areas before the primary task control.
- Missing “Continue with Zivosmedia” is both an auth workflow gap and an accessibility/orientation gap because users cannot identify the common identity option.


# Desktop UI Audit

Viewport captured: desktop `1440x1000`.

Screenshot folder: `docs/audits/screenshots/desktop`.

## Summary

| Screen group | Screenshot evidence | Desktop status | Key UI/UX findings | Missing items | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| ZIVO/feed shell: `zivosmedia.com`, `/`, `/feed` | `docs/audits/screenshots/desktop/public-zivosmedia-com--desktop-1440.png`, `docs/audits/screenshots/desktop/local-home--desktop-1440.png`, `docs/audits/screenshots/desktop/local-feed--desktop-1440.png` | Loads feed. | Active app surface, but consent banner blocks lower content and nav blends feed, services, chat, and hub responsibilities. | `Continue with Zivosmedia`, app switcher/return links, payment/support hub. | Clarify ecosystem navigation and reduce banner obstruction. | P1 |
| Driver/Business/Employee public domains | `docs/audits/screenshots/desktop/public-zivodriver-com--desktop-1440.png`, `docs/audits/screenshots/desktop/public-zivobusiness-com--desktop-1440.png`, `docs/audits/screenshots/desktop/public-zivoemployee-com--desktop-1440.png` | Load generic feed. | Domain names imply dedicated products, but first impression is social/feed content. | Driver/business/employee CTAs, identity, support, payment/role context. | Driver landing first; business/employee holding pages later. | P1/P2 |
| Zivo Travel public and local travel modules | `docs/audits/screenshots/desktop/public-zivostravel-com--desktop-1440.png`, `docs/audits/screenshots/desktop/local-flights--desktop-1440.png`, `docs/audits/screenshots/desktop/local-cars--desktop-1440.png`, `docs/audits/screenshots/desktop/local-bus--desktop-1440.png` | Loads product surfaces. | Strongest product UI, but dense hero/search controls and unclear support/payment ownership. | `Continue with Zivosmedia`, ZivoChat support, ZivoPay/payment link. | Add cross-app labels and simplify primary CTA hierarchy. | P1 |
| `/hotels` and `/travel/checkout` | `docs/audits/screenshots/desktop/local-hotels--desktop-1440.png`, `docs/audits/screenshots/desktop/local-travel-checkout--desktop-1440.png` | Loads. | `/hotels` shows rides/Cambodia availability; checkout empty state is generic and points only to hotels. | Hotel booking flow, checkout payment status, support path. | Fix `/hotels`; add checkout empty-state payment/support context. | P0/P1 |
| Zivo Software and `/business` | `docs/audits/screenshots/desktop/public-zivosoftware-com--desktop-1440.png`, `docs/audits/screenshots/desktop/local-business--desktop-1440.png` | Loads polished software page. | Page quality is good; Business vs Software IA and billing/support ownership are unclear. | `Continue with Zivosmedia`, ZivoChat setup/support, billing connection. | Add identity/support/billing labels in follow-up PR. | P1 |
| ZivoChat and support | `docs/audits/screenshots/desktop/public-zivoschat-com--desktop-1440.png`, `docs/audits/screenshots/desktop/local-chat--desktop-1440.png`, `docs/audits/screenshots/desktop/local-support-new--desktop-1440.png` | Chat login-gated; support form loads. | Chat login is readable; support form mixes feed/travel nav and does not clearly become ZivoChat support. | `Continue with Zivosmedia`, ZivoChat support entry, app context. | Add route-aware support/chat entry. | P1 |
| Admin | `docs/audits/screenshots/desktop/public-zivoadmin-com--desktop-1440.png`, `docs/audits/screenshots/desktop/local-admin-security--desktop-1440.png`, `docs/audits/screenshots/desktop/local-admin-payments-webhook-status--desktop-1440.png` | Public domain fails; local routes login-gated. | `zivoadmin.com` DNS failure is blocking. Local admin routes cannot be visually audited unauthenticated and show generic sign-in. | Admin identity policy, webhook/payment context, support path. | Confirm DNS/deployment target; add admin-specific auth gates later. | P0/P1 |
| Wallet/shop/settings protected routes | `docs/audits/screenshots/desktop/local-wallet--desktop-1440.png`, `docs/audits/screenshots/desktop/local-shop-dashboard-wallet--desktop-1440.png`, `docs/audits/screenshots/desktop/local-settings--desktop-1440.png` | Login-gated. | Generic sign-in is particularly weak for wallet/payment routes because safety context is absent. | Identity CTA, billing/wallet context, route labels. | Add route-aware auth-gate copy. | P1/P2 |

## Desktop Accessibility Issues

- Large cookie/privacy banner can obscure content and interfere with task focus.
- Dense travel desktop pages need stronger primary-action hierarchy.
- Generic protected-route login does not announce destination context.
- `zivoadmin.com` DNS failure is an availability issue, not desktop polish.

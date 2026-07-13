# Cross-App Navigation Audit

Purpose: review whether users can move between Zivosmedia, Travel, Driver, Chat, Software, Business, Employee, Admin, support, and payment/billing contexts.

## Cross-App Requirements

| Requirement | Observed state | Evidence | Priority |
| --- | --- | --- | --- |
| Every satellite app offers `Continue with Zivosmedia`. | Not visible in any captured screen metadata or screenshots. | 0 of 124 screenshots contained the phrase. | P1 |
| Each public domain has a domain-specific first impression. | Travel and Software are specific; Driver, Business, Employee show generic ZIVO/feed; Admin does not resolve. | `docs/audits/screenshots/desktop/public-zivodriver-com--desktop-1440.png`, `docs/audits/screenshots/desktop/public-zivobusiness-com--desktop-1440.png`, `docs/audits/screenshots/desktop/public-zivoadmin-com--desktop-1440.png`. | P0/P1 |
| Users can find ZivoChat support from each app. | Chat nav/support form exists, but no consistent `ZivoChat support` entry was captured. | 0 of 124 screenshots contained `ZivoChat support`. | P1 |
| Payment/billing routes explain shared payment ownership. | Wallet, checkout, webhook, payout, and billing-related surfaces exist but lack a shared payment identity. | `/travel/checkout`, `/wallet`, `/shop-dashboard/wallet`, `/admin/payments/webhook-status`, `/driver/orders`. | P1 |
| App switcher or return-to-Zivosmedia link is clear. | Generic feed nav has many links, but satellite domains do not clearly show app switcher/return behavior. | Public domain screenshots. | P1 |

## Public Domain Navigation

| Domain | Current result | Missing items | Recommended fix | Priority |
| --- | --- | --- | --- | --- |
| `zivosmedia.com` | Feed/hub-like shell. | Clear ecosystem hub, payment/support hub. | Add app switcher/return-to-hub language. | P1 |
| `zivostravel.com` | Dedicated Travel product. | `Continue with Zivosmedia`, ZivoChat support, ZivoPay/payment label. | Add cross-app labels without redesigning Travel. | P1 |
| `zivodriver.com` | Generic feed/super-app. | Driver landing, Become a Driver, benefits, requirements, earnings/payouts, Travel-to-Driver explanation, support/chat, legal. | First follow-up UI PR: full driver landing page. | P1 |
| `zivoschat.com` | Login page. | `Continue with Zivosmedia`, app/thread context. | Add shared identity and chat context. | P1 |
| `zivosoftware.com` | Dedicated Software product. | Shared identity, ZivoChat support, billing/subscription clarity. | Add ecosystem CTAs. | P1 |
| `zivobusiness.com` | Generic feed/super-app. | Business onboarding, billing, software ownership, support. | Add business holding/landing page. | P1 |
| `zivoemployee.com` | Generic feed/super-app. | Employee role/onboarding, business/admin return path. | Add employee holding page later. | P2 |
| `zivoadmin.com` | DNS resolution failure. | Admin availability and navigation. | Confirm DNS/deployment target with owner approval. | P0 |

## Local Navigation

| Route type | Screens | Observed state | Recommended fix | Priority |
| --- | --- | --- | --- | --- |
| Auth | `/login`, `/signup` | Auth forms work but lack shared identity language. | Add `Continue with Zivosmedia` and route-aware copy. | P1 |
| Protected modules | `/chat`, `/travel`, `/wallet`, `/settings`, `/shop-dashboard*`, `/admin/*` | Generic sign-in. | Preserve route context in auth gate. | P1 |
| Travel modules | `/flights`, `/cars`, `/bus`, `/travel/checkout` | Product screens load, but support/payment identity is inconsistent. | Add ZivoChat/ZivoPay labels. | P1 |
| Broken/mismatched module | `/hotels` | Shows rides/Cambodia availability. | Fix route mapping/content. | P0 |
| Driver module | `/driver/orders` | Shopping orders empty state, not driver-jobs context. | Add driver job/payout/support context. | P1 |

## Broken Links And Load Failures

- Confirmed load failure: `https://zivoadmin.com` fails DNS in all captured viewports.
- No full link crawl was performed in this audit PR. First-load/document navigation was checked for every requested URL/route; deeper anchor-level broken-link testing should be a separate QA task.

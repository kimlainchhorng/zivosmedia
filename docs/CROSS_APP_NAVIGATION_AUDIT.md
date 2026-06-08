# Cross-App Navigation Audit

Purpose: identify whether users can move through the ZIVO ecosystem using Zivosmedia identity, ZivoChat support, and ZivoPay/payment context.

## Summary

| Requirement | Observed State | Priority |
| --- | --- | --- |
| Every app shows “Continue with Zivosmedia.” | Not visible in any captured screen metadata or screenshots. | P1 |
| Each satellite domain has its own purpose. | Travel and Software are specific; Driver, Business, Employee show generic ZIVO feed; Admin does not resolve. | P0/P1 |
| ZivoChat support is available across apps. | Chat appears in ZIVO feed navigation and support route exists, but no consistent “Open ZivoChat” support CTA. | P1 |
| Payments connect to source platform and Zivosmedia user. | Wallet/checkout copy exists in Travel/Software areas, but no shared ZivoPay identity is visible. | P1 |
| Admin can monitor platforms. | Public Admin domain unavailable; local admin routes are protected and not auditable without auth. | P0 |

## Public App Navigation

| App/Domain | Current Navigation Result | Missing Items | Recommended Fix | Priority |
| --- | --- | --- | --- | --- |
| Zivosmedia `zivosmedia.com` | Feed shell with app-style side navigation. | Central hub language, payment hub, support hub. | Add clear hub navigation once identity foundation is approved. | P1 |
| Zivo Travel `zivostravel.com` | Travel-specific nav: Flights, Hotels, Rental cars, Bus, Deals, Wallet, Support. | Continue with Zivosmedia, ZivoChat support label, ZivoPay label. | Add cross-app identity and payment/support labels. | P1 |
| Zivo Driver `zivodriver.com` | Generic feed shell. | Apply to Drive, Sign in with Zivosmedia, job workflow, earnings, support, legal. | Replace with driver landing page. | P1 |
| ZivoChat `zivoschat.com` | Protected login. | Continue with Zivosmedia and chat-thread context. | Add identity CTA and fix deployed Supabase env fallback. | P1 |
| ZivoSoftware `zivosoftware.com` | Software landing page. | Continue with Zivosmedia, ZivoChat setup/help, ZivoPay subscription label. | Add ecosystem CTAs without redesigning core page. | P1 |
| Zivo Business `zivobusiness.com` | Generic feed shell. | Business profile, software ownership, billing, support, identity. | Create business holding/landing page after repo confirmation. | P1 |
| Zivo Employee `zivoemployee.com` | Generic feed shell. | Employee onboarding, business/admin relationship, identity. | Create employee holding page later. | P2 |
| Zivo Admin `zivoadmin.com` | DNS resolution failed. | Everything. | Confirm DNS/deployment target with owner approval. | P0 |

## Local Route Navigation

| Route Type | Screens | Observed State | Recommended Fix | Priority |
| --- | --- | --- | --- | --- |
| Auth | `/login`, `/signup` | Local auth form exists but no Zivosmedia identity CTA. | Add “Continue with Zivosmedia” and explain local session linking. | P1 |
| Protected modules | `/chat`, `/shop-dashboard*`, `/admin/*`, `/wallet`, `/settings`, `/travel` | Redirect to generic login. | Preserve route context and show module-specific sign-in copy. | P1 |
| Travel modules | `/flights`, `/cars`, `/bus`, `/travel/checkout` | Load product screens, but support/payment identity is inconsistent. | Add ZivoChat and ZivoPay affordances. | P1 |
| Broken/mismatched module | `/hotels` | Shows rides/Cambodia availability copy. | Fix route mapping or content. | P0 |
| Driver module | `/driver/orders` | Empty order state loads. | Add travel-driver job context, payout status, support. | P1 |

## Cross-App Workflow Gaps

| Workflow | Current Visual Evidence | Gap | Priority |
| --- | --- | --- | --- |
| Travel booking to Driver job | Travel pages exist; driver orders exists; public Driver landing missing. | No visible bridge from booking to driver request/status. | P1 |
| Driver payout | Driver orders empty state exists. | No payout state, provider, or status messaging. | P1 |
| Business to Software subscription | Software page exists; Business domain generic. | Ownership and billing are not visually connected. | P1 |
| Chat support for every app | Chat login and support route exist. | No consistent “Open ZivoChat” CTA tied to app records. | P1 |
| Payment through ZivoPay | Wallet/checkout copy exists. | No visible shared provider abstraction or payment identity. | P1 |
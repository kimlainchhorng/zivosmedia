<<<<<<< Updated upstream
# Software and Business UI Audit

## Screens Reviewed

- Public domains: `zivosoftware.com`, `zivobusiness.com`.
- Local routes: `/business`, `/shop-dashboard`, `/shop-dashboard/orders`, `/shop-dashboard/employees`, `/shop-dashboard/wallet`.

## Summary

ZivoSoftware has a clearer software direction than Zivo Business, but both need stronger billing, subscription, business profile, and setup/support continuity.

## Key Findings

| Area | Finding | Fix | Priority |
| --- | --- | --- | --- |
| ZivoSoftware | Product offering is visible but catalog/subscription hierarchy needs clarity. | Group products by POS, booking, CRM, payroll, website, AI assistant, driver/fleet, travel agency, invoice, marketing, custom software. | P1 |
| Zivo Business | Domain reads generic rather than as a business portal. | Add business profile, active software, invoices, employees, billing, setup support. | P1 |
| Shop dashboard | Local dashboard routes exist but need Zivo Business relationship. | Align naming and navigation with business profile ownership. | P2 |
| Billing | Payment/billing connection is not obvious enough. | Add ZivoPay subscription/invoice state. | P1 |
| Support | Setup chat missing from first-view. | Add ZivoChat setup/support entry. | P1 |

## Recommended Fix

Build a clearer business/software information architecture before visual polish: business profile owns subscriptions, ZivoSoftware lists products, ZivoChat supports setup, and ZivoPay handles billing.
=======
# Software And Business UI Audit

Screens reviewed: `https://zivosoftware.com`, `https://zivobusiness.com`, `https://zivoemployee.com`, `/business`, `/shop-dashboard`, `/shop-dashboard/orders`, `/shop-dashboard/employees`, `/shop-dashboard/wallet`.

## Findings

| Screen | Screenshot evidence | Status | First impression and consistency | Missing items | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| `https://zivosoftware.com` | `docs/audits/screenshots/mobile/public-zivosoftware-com--iphone-15-pro.png`, `docs/audits/screenshots/desktop/public-zivosoftware-com--desktop-1440.png` | Loads dedicated Software page. | Professional business-management landing page with consistent visual style. Ecosystem identity/support/billing ownership is not clear enough. | `Continue with Zivosmedia`, ZivoChat support, subscription/billing/payment connection. | Add shared identity, support, and billing labels later. | P1 |
| `/business` | `docs/audits/screenshots/mobile/local-business--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-business--desktop-1440.png` | Loads Software page. | Polished page, but Business and Software meanings are blended. | Business account onboarding, software activation distinction, shared identity, billing. | Split business workspace entry from software product marketing. | P1 |
| `https://zivobusiness.com` | `docs/audits/screenshots/mobile/public-zivobusiness-com--iphone-15-pro.png`, `docs/audits/screenshots/desktop/public-zivobusiness-com--desktop-1440.png` | Loads generic ZIVO/feed surface. | Public Business domain does not match the expected business product or portal. | Business profile, onboarding, billing, support, `Continue with Zivosmedia`, app switcher. | Create business-specific holding/landing page after ownership confirmation. | P1 |
| `https://zivoemployee.com` | `docs/audits/screenshots/mobile/public-zivoemployee-com--iphone-15-pro.png`, `docs/audits/screenshots/desktop/public-zivoemployee-com--desktop-1440.png` | Loads generic ZIVO/feed surface. | Public Employee domain does not match employee onboarding or employee portal expectations. | Employee role context, business/admin relationship, identity, support. | Create employee holding page after roles are defined. | P2 |
| `/shop-dashboard` | `docs/audits/screenshots/mobile/local-shop-dashboard--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-shop-dashboard--desktop-1440.png` | Login-gated. | Generic sign-in loses business dashboard context. | Route-aware auth, shared identity. | Add business dashboard auth-gate copy. | P2 |
| `/shop-dashboard/orders` | `docs/audits/screenshots/mobile/local-shop-dashboard-orders--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-shop-dashboard-orders--desktop-1440.png` | Login-gated. | Generic sign-in loses order-management context. | Order/payment context, shared identity. | Preserve order route label in auth gate. | P2 |
| `/shop-dashboard/employees` | `docs/audits/screenshots/mobile/local-shop-dashboard-employees--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-shop-dashboard-employees--desktop-1440.png` | Login-gated. | Generic sign-in loses employee-management context. | Employee role/admin relationship. | Add employee-management auth copy. | P2 |
| `/shop-dashboard/wallet` | `docs/audits/screenshots/mobile/local-shop-dashboard-wallet--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-shop-dashboard-wallet--desktop-1440.png` | Login-gated. | Generic sign-in for a financial route. | Billing/payment safety context, shared identity. | Add wallet/billing auth-gate copy after payment ownership is confirmed. | P1 |

## Software/Business Top Fixes

1. Keep `zivosoftware.com` as the stronger product model and add identity/support/billing labels.
2. Give `zivobusiness.com` a business-specific landing or holding page.
3. Add route-aware auth gates to shop dashboard routes.
4. Do employee-domain work after business/admin role definitions are stable.
>>>>>>> Stashed changes

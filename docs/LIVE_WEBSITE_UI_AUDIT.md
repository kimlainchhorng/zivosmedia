# Live Website UI Audit

Branch: `docs/live-ui-visual-audit`
Type: documentation and screenshot audit only.

## Scope

Captured screenshot artifacts exist locally under `docs/ui-audit-screenshots/`. The set contains 124 PNGs: 8 public domains and 23 local routes across 4 viewports.

Viewports:

- iPhone 13.
- iPhone 15 Pro.
- iPad/tablet.
- Desktop 1440px.

## Screenshot Artifact Note

The PNG screenshots were captured in the local Codex workspace. Binary Git push is not configured in this machine session: HTTPS push prompts for a username and SSH returns `Permission denied (publickey)`. The audit docs keep the screenshot paths so the owner can inspect them locally and so a follow-up artifact upload can attach the PNGs when Git credentials are available.

## Public Domain Audit Matrix

| Screen | Screenshot path | Mobile status | Desktop status | First impression and brand | UI findings | Missing platform links | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| zivosmedia.com | `docs/ui-audit-screenshots/public/zivosmedia-com/{viewport}.png` | Loads | Loads | Main ZIVO surface is recognizable. | Cookie/banner and dense feed patterns compete with first-view messaging; navigation needs clearer app switcher. | Continue with Zivosmedia, app switcher, ZivoChat support, billing/payment entry. | Add unified first-viewport hub navigation and explicit cross-app CTAs. | P1 |
| zivostravel.com | `docs/ui-audit-screenshots/public/zivostravel-com/{viewport}.png` | Loads | Loads | Travel brand is clearer than other app domains. | Travel CTAs exist, but cross-app identity/payment context is not obvious. | Continue with Zivosmedia, app switcher, payment/billing connection. | Add Zivosmedia account strip, chat support, and payment-status link near booking CTAs. | P1 |
| zivodriver.com | `docs/ui-audit-screenshots/public/zivodriver-com/{viewport}.png` | Loads generic surface | Loads generic surface | Does not read as a dedicated driver landing page. | Copy, CTA, and navigation do not clearly target drivers. | Continue with Zivosmedia, ZivoChat support, app switcher, payout/payment link. | Build driver-specific landing page with driver onboarding, jobs, earnings, and payout status. | P0 |
| zivoschat.com | `docs/ui-audit-screenshots/public/zivoschat-com/{viewport}.png` | Loads | Loads | Chat purpose is present but not clearly connected to all apps. | Needs clearer support-routing, related-record context, and admin handoff. | App switcher, payment/support linkage, Continue with Zivosmedia. | Add shared chat positioning and support thread entry points. | P1 |
| zivosoftware.com | `docs/ui-audit-screenshots/public/zivosoftware-com/{viewport}.png` | Loads | Loads | Software direction is visible. | Product catalog and billing/subscription relation need stronger hierarchy. | Continue with Zivosmedia, app switcher, billing connection, ZivoChat setup support. | Clarify product categories, subscription path, setup chat, and business ownership. | P1 |
| zivobusiness.com | `docs/ui-audit-screenshots/public/zivobusiness-com/{viewport}.png` | Loads generic surface | Loads generic surface | Does not yet feel like a dedicated business portal. | Business profile, subscriptions, invoices, and employee workflows are not first-view obvious. | Continue with Zivosmedia, app switcher, billing/payment link, ZivoChat support. | Create business landing/dashboard entry with profile, software, invoices, and team links. | P1 |
| zivoemployee.com | `docs/ui-audit-screenshots/public/zivoemployee-com/{viewport}.png` | Loads generic surface | Loads generic surface | Employee purpose is not clear. | No strong employee onboarding, schedule, payroll, or staff navigation in first view. | Continue with Zivosmedia, app switcher, ZivoChat support. | Add employee-specific entry page and clarify repo/module ownership. | P2 |
| zivoadmin.com | `docs/ui-audit-screenshots/public/zivoadmin-com/{viewport}.png` | Failed/unresolved in capture | Failed/unresolved in capture | Admin control center is not reachable. | Domain did not load consistently during audit. | All admin modules inaccessible. | Confirm DNS/deployment and create Zivo Admin shell/health page. | P0 |

## Local Route Audit Matrix

| Route | Screenshot path | Mobile status | Desktop status | First impression and UI findings | Missing items | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `docs/ui-audit-screenshots/local/home/{viewport}.png` | Loads | Loads | Main hub loads but needs stronger all-in-one value and app switcher. | Continue with Zivosmedia, support, payment hub. | Add app-switching and central identity/payment CTAs. | P1 |
| `/login` | `docs/ui-audit-screenshots/local/login/{viewport}.png` | Loads | Loads | Auth page works but brand/account handoff language needs alignment. | Continue with Zivosmedia label. | Rename/position primary auth path as Continue with Zivosmedia. | P1 |
| `/signup` | `docs/ui-audit-screenshots/local/signup/{viewport}.png` | Loads | Loads | Signup path visible. | Cross-app account linking explanation. | Explain single Zivosmedia account across apps. | P1 |
| `/feed` | `docs/ui-audit-screenshots/local/feed/{viewport}.png` | Loads | Loads | Feed is dense and social-first. | App switcher, support, payment/wallet context. | Add compact hub rail or menu. | P2 |
| `/business` | `docs/ui-audit-screenshots/local/business/{viewport}.png` | Loads | Loads | Business page visible. | Software/billing ownership link. | Surface business profile, software, invoices, setup chat. | P1 |
| `/chat` | `docs/ui-audit-screenshots/local/chat/{viewport}.png` | Loads/needs auth context | Loads/needs auth context | Chat exists but shared-support role needs stronger positioning. | Related record/thread context, support link. | Add source platform and support intent entry points. | P1 |
| `/travel` | `docs/ui-audit-screenshots/local/travel/{viewport}.png` | Loads | Loads | Travel surface reads well. | Driver handoff/payment status. | Add booking payment and driver status placeholders. | P1 |
| `/flights` | `docs/ui-audit-screenshots/local/flights/{viewport}.png` | Loads | Loads | Flight search visible. | Chat/support and payment connection. | Add help and checkout continuity. | P2 |
| `/hotels` | `docs/ui-audit-screenshots/local/hotels/{viewport}.png` | Loads but content mismatch | Loads but content mismatch | Appears to show rides/Cambodia availability copy instead of hotel content. | Correct hotel content. | Fix route content mapping before UI polish. | P0 |
| `/cars` | `docs/ui-audit-screenshots/local/cars/{viewport}.png` | Loads | Loads | Car/rental flow visible. | Driver/job/payment linkage. | Clarify rental vs driver pickup flow. | P2 |
| `/bus` | `docs/ui-audit-screenshots/local/bus/{viewport}.png` | Loads | Loads | Bus flow visible. | Support/payment continuity. | Add support and checkout status. | P2 |
| `/travel/checkout` | `docs/ui-audit-screenshots/local/travel-checkout/{viewport}.png` | Loads/checkout context | Loads/checkout context | Checkout surface needs payment hub clarity. | ZivoPay/provider identity, chat support. | Add payment identity and support entry. | P1 |
| `/wallet` | `docs/ui-audit-screenshots/local/wallet/{viewport}.png` | Loads/needs auth | Loads/needs auth | Wallet exists but shared payment hub role is not explicit. | ZivoPay identity and billing history. | Align wallet with ZivoPay architecture. | P1 |
| `/driver/orders` | `docs/ui-audit-screenshots/local/driver-orders/{viewport}.png` | Loads/needs role | Loads/needs role | Driver orders route exists. | Driver onboarding/payout status. | Add driver landing and status empty states. | P1 |
| `/shop-dashboard` | `docs/ui-audit-screenshots/local/shop-dashboard/{viewport}.png` | Loads/needs role | Loads/needs role | Shop dashboard route exists. | Business/software ownership link. | Align shop dashboard with Zivo Business. | P2 |
| `/shop-dashboard/orders` | `docs/ui-audit-screenshots/local/shop-dashboard-orders/{viewport}.png` | Loads/needs role | Loads/needs role | Orders route visible. | Payment/status linkage. | Add order payment status and support path. | P2 |
| `/shop-dashboard/employees` | `docs/ui-audit-screenshots/local/shop-dashboard-employees/{viewport}.png` | Loads/needs role | Loads/needs role | Employee management route exists. | Zivo Employee relation. | Add employee platform handoff. | P2 |
| `/shop-dashboard/wallet` | `docs/ui-audit-screenshots/local/shop-dashboard-wallet/{viewport}.png` | Loads/needs role | Loads/needs role | Wallet route exists. | Business payouts/billing link. | Connect to shared business payment profile. | P1 |
| `/admin/security` | `docs/ui-audit-screenshots/local/admin-security/{viewport}.png` | Loads/needs admin | Loads/needs admin | Security admin surface exists. | Platform registry and audit hub relation. | Align with Zivo Admin control center. | P1 |
| `/admin/payments/webhook-status` | `docs/ui-audit-screenshots/local/admin-payments-webhook-status/{viewport}.png` | Loads/needs admin | Loads/needs admin | Payment webhook route exists. | Provider adapters and dashboard context. | Tie to ZivoPay dashboard docs. | P1 |
| `/support/new` | `docs/ui-audit-screenshots/local/support-new/{viewport}.png` | Loads | Loads | Support intake is available. | ZivoChat thread metadata. | Add app/source/related-record support routing. | P1 |
| `/legal/privacy` | `docs/ui-audit-screenshots/local/legal-privacy/{viewport}.png` | Loads | Loads | Legal content visible. | Cross-platform privacy context. | Clarify all-app identity/payment data use. | P2 |
| `/settings` | `docs/ui-audit-screenshots/local/settings/{viewport}.png` | Loads/needs auth | Loads/needs auth | Settings route exists. | Account linking and app switcher. | Add linked apps and login audit entry points. | P1 |

## Pages that Failed or Need Login

- Failed to load: `zivoadmin.com`.
- Needs login/admin/role context: `/chat`, `/wallet`, `/driver/orders`, shop dashboard routes, admin routes, `/settings`.

## Validation

- `npm run qa:frontend-visual-contracts`: passed.
- `npm run qa:safe-area:all`: static checks passed; Playwright safe-area tests skipped.
- `npm run perf:media-report`: completed as report-only with 37 media readiness issues.
- `npm run test:visual`: failed with 6 account safe-area snapshot diffs, 24 passed, 56 skipped.

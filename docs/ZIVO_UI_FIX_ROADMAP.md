# ZIVO UI Fix Roadmap

This roadmap is based on the live screenshot audit. It is documentation-only and does not approve production UI, auth, payment, DNS, database, or Supabase migration changes.

## P0 Fixes

| Item | Evidence | Recommended next step |
| --- | --- | --- |
| Restore or confirm `zivoadmin.com` availability. | `docs/audits/screenshots/desktop/public-zivoadmin-com--desktop-1440.png`; all viewports failed with `net::ERR_NAME_NOT_RESOLVED`. | Confirm DNS/Cloudflare/deployment target with owner approval before touching UI. |
| Fix `/hotels` route/content mismatch. | `docs/audits/screenshots/desktop/local-hotels--desktop-1440.png` shows rides/Cambodia availability copy. | Confirm route target and restore hotel-specific search/landing content in a later UI PR. |

## P1 Fixes

| Item | Evidence | Recommended PR |
| --- | --- | --- |
| Build a real `zivodriver.com` landing page. | `docs/audits/screenshots/desktop/public-zivodriver-com--desktop-1440.png` shows generic feed. | First UI fix PR after this audit. |
| Add `Continue with Zivosmedia` to auth and satellite app surfaces. | 0 of 124 screenshots contained the phrase. | Identity UI PR after architecture approval. |
| Add consistent ZivoChat support entries. | 0 of 124 screenshots contained `ZivoChat support`; `/support/new` mixes feed/travel nav. | ZivoChat support PR after source-app context is defined. |
| Add payment/billing context to checkout, wallet, admin webhook, driver payouts, and business billing. | `/travel/checkout`, `/wallet`, `/shop-dashboard/wallet`, `/admin/payments/webhook-status`, `/driver/orders`. | Payment-context UI PR after payment ownership is confirmed. |
| Give `zivobusiness.com` a domain-specific entry page. | `docs/audits/screenshots/desktop/public-zivobusiness-com--desktop-1440.png` shows generic feed. | Business holding/landing PR after repo/domain ownership confirmation. |
| Add route-aware auth gates. | 48 auth/login screenshots show generic sign-in across auth and protected routes. | Auth UI PR that preserves module context without changing auth logic. |
| Reduce first-viewport cookie/privacy banner obstruction. | Mobile and desktop feed/travel screenshots. | Consent UX PR with accessibility review. |
| Stabilize visual QA snapshots. | `npm run test:visual` failed 6 account safe-area snapshots. | QA PR to review/update/fix account safe-area baselines or layout. |

## P2 Fixes

| Item | Evidence | Notes |
| --- | --- | --- |
| Add `zivoemployee.com` holding/landing page. | Generic feed surface. | Do after Business/Admin employee role definitions. |
| Create a clearer legal-center shell. | `/legal/privacy` loads real content but uses generic app shell/title. | Polish after route/auth/payment fixes. |
| Improve desktop density on Travel screens. | `zivostravel.com`, `/flights`, `/bus`. | Keep product-rich style, simplify hierarchy. |
| Add context to `/settings` auth gate. | Generic login. | Lower priority than wallet/admin/auth core routes. |

## Driver Landing Page PR Requirements

Required in a future UI PR:

- Header: Zivo Driver logo/name, `Continue with Zivosmedia`, Sign in, Become a Driver.
- Hero: Become/Apply CTA and shared identity CTA.
- Driver benefits.
- How it works: apply, verify documents, accept jobs, complete trips, get paid.
- Requirements.
- Earnings and payouts.
- Travel-to-Driver connection explanation.
- ZivoChat support link.
- Real Privacy Policy and real Terms of Service.

## Recommended PR Order

1. Docs PR: live UI audit and screenshots only.
2. Admin availability/DNS confirmation task for `zivoadmin.com`.
3. Routing PR: fix `/hotels` route/content mismatch.
4. Driver landing PR: replace `zivodriver.com` generic feed with real driver page.
5. Identity UI PR: add `Continue with Zivosmedia` and route-aware auth gates.
6. ZivoChat support PR: consistent support entry and source-app context.
7. Payment-context UI PR: checkout, wallet, webhook, driver payout, and business billing labels.
8. QA PR: address `npm run test:visual` account safe-area snapshot failures.

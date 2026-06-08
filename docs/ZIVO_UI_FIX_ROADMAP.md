# ZIVO UI Fix Roadmap

This roadmap is based on the live visual audit. It is intentionally documentation-only and does not approve production UI, auth, payment, DNS, or deployment changes.

## P0 Fixes

| Item | Evidence | Owner/Repo | Notes |
| --- | --- | --- | --- |
| Confirm and restore `zivoadmin.com` availability. | `docs/ui-audit-screenshots/public/zivoadmin-com/*.png` and Playwright `net::ERR_NAME_NOT_RESOLVED`. | Zivo Admin / Cloudflare / deployment owner | Do not change DNS without owner approval. First confirm domain mapping and deployment target. |
| Fix `/hotels` route content mismatch. | `docs/ui-audit-screenshots/local/hotels/desktop-1440.png` shows rides/Cambodia copy. | `kimlainchhorng/zivosmedia` | Confirm route component before editing. |
| Stabilize visual test runner. | `npm run test:visual` failed due `127.0.0.1:8080` reset/refused connections. | `kimlainchhorng/zivosmedia` | Fix QA infrastructure before using visual tests as a release gate. |

## P1 Fixes

| Item | Evidence | Recommended First PR |
| --- | --- | --- |
| Add “Continue with Zivosmedia” to auth surfaces. | 0 captured screens showed the phrase. | Identity foundation PR after architecture approval. |
| Replace `zivodriver.com` placeholder with real driver landing page. | `docs/ui-audit-screenshots/public/zivodriver-com/desktop-1440.png`. | Driver landing page PR. |
| Add domain-specific pages for `zivobusiness.com` and `zivoemployee.com`. | Public screenshots show generic feed. | Business/Employee holding page PR after repo confirmation. |
| Reduce mobile cookie banner footprint. | iPhone screenshots for feed/travel/search pages. | Consent UX PR with accessibility review. |
| Add ZivoChat support CTAs across Travel, Driver, Software, Business, Admin. | Cross-app audit screenshots show inconsistent chat support. | ZivoChat integration PR after thread model exists. |
| Add ZivoPay/payment context to checkout, wallet, admin webhook status, driver payouts, business billing. | Checkout/wallet/admin screenshots lack shared payment language. | ZivoPay foundation PR after database owner is confirmed. |
| Add route-aware auth gates. | Protected routes redirect to generic login. | Auth UI PR after identity foundation. |
| Clarify Business vs Software relationship. | `/business` and `zivosoftware.com` blend concepts. | Business/Software workflow PR. |

## P2 Fixes

| Item | Evidence | Notes |
| --- | --- | --- |
| Create employee-specific content after Business/Admin roles are defined. | `zivoemployee.com` shows generic feed. | Later phase. |
| Add simpler legal page shell. | `/legal/privacy` uses global feed navigation. | Polish after higher-priority routing/auth issues. |
| Improve desktop hierarchy on dense travel screens. | `zivostravel.com` and `/flights` desktop screenshots. | Keep after route correctness and auth/payment work. |

## Driver Landing Page PR Requirements

Do this in a future UI PR, not in this audit PR.

Required sections:

1. Header
   - Zivo Driver logo/name
   - Continue with Zivosmedia
   - Sign in
   - Become a Driver

2. Hero
   - Headline: Drive with Zivo. Earn on your schedule.
   - Subtext: Accept trips, airport transfers, delivery jobs, and travel-driver requests from Zivo Travel.
   - CTA: Apply to Drive
   - CTA: Sign in with Zivosmedia

3. How it works
   - Apply
   - Verify documents
   - Accept jobs
   - Complete trips
   - Get paid

4. Connected workflow
   - Zivo Travel booking can create driver job
   - Driver accepts/rejects
   - Customer sees status
   - Driver payout after completion

5. Earnings
   - Job earnings
   - Tips
   - Payout status
   - Stripe/PayPal/Square payout support later

6. Safety and trust
   - Verification
   - Support
   - Secure payouts
   - Audit logs

7. Support
   - Open ZivoChat
   - Contact support

8. Legal
   - Real Privacy Policy
   - Real Terms of Service

## Recommended PR Order After This Audit

1. Docs PR: live UI audit and screenshots only.
2. QA PR: stabilize `npm run test:visual` server lifecycle.
3. Routing PR: fix `/hotels` route mismatch.
4. Identity UI PR: add Continue with Zivosmedia to login/signup/auth gates.
5. Driver landing PR: replace `zivodriver.com` generic feed with real driver page.
6. ZivoChat support PR: consistent support CTA and thread context placeholders.
7. ZivoPay UI context PR: checkout, wallet, webhook status, driver/business payout labels.


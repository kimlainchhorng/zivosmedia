# Driver UI Audit

<<<<<<< Updated upstream
## Screens Reviewed

- Public domain: `zivodriver.com`.
- Local route: `/driver/orders`.

## Summary

The driver domain currently reads as too generic and does not clearly tell drivers what to do next. The first dedicated UI fix should likely be the `zivodriver.com` landing page.

## Key Findings

| Area | Finding | Fix | Priority |
| --- | --- | --- | --- |
| Landing | Does not read as a dedicated driver product. | Add driver-specific hero, onboarding, app download/sign-in, jobs, earnings, and payout status. | P0 |
| Auth | Continue with Zivosmedia not prominent. | Add standard identity CTA. | P1 |
| Payouts | Driver payout path is not first-view obvious. | Add earnings/payout explanation and ZivoPay relation. | P1 |
| Support | ZivoChat driver support is not obvious. | Add support link with driver/job context. | P1 |
| Navigation | App switcher missing. | Add unified ZIVO app switcher. | P1 |

## Recommended First UI Fix PR

Repo target after access is confirmed: `kimlainchhorng/zivodriver`.

Goal: build a dedicated driver landing page for `zivodriver.com` with onboarding, job status, earnings, payout status, support, and Continue with Zivosmedia.
=======
Screens reviewed: `https://zivodriver.com`, `/driver/orders`.

## Findings

| Screen | Screenshot evidence | Status | First impression and consistency | Missing items | Recommended fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| `https://zivodriver.com` | `docs/audits/screenshots/mobile/public-zivodriver-com--iphone-15-pro.png`, `docs/audits/screenshots/desktop/public-zivodriver-com--desktop-1440.png` | Loads generic ZIVO/feed surface. | Looks like a placeholder/misrouted domain. It does not communicate driver recruiting, driver operations, benefits, payouts, requirements, support, or legal terms. | Become a Driver CTA, `Continue with Zivosmedia`, benefits, how it works, requirements, earnings/payouts, Travel-to-Driver explanation, ZivoChat support link, real Privacy Policy, real Terms of Service. | Replace with a full driver landing page in the first follow-up UI PR. | P1 |
| `/driver/orders` | `docs/audits/screenshots/mobile/local-driver-orders--iphone-15-pro.png`, `docs/audits/screenshots/desktop/local-driver-orders--desktop-1440.png` | Loads shopping orders empty state. | Local driver route does not look driver-specific. Empty state says there are no shopping orders, not no driver jobs/trips. | Travel-to-Driver job context, payout/payment status, support/chat, route-specific loading/empty/error states. | Add driver orders/job empty state after the driver landing page work. | P1 |

## Required Driver Landing Page Scope

This belongs in a future UI PR, not this documentation PR.

- Header with Zivo Driver name/logo, `Continue with Zivosmedia`, Sign in, and Become a Driver.
- Hero with Apply/Become CTA and sign-in CTA.
- Driver benefits.
- How it works: apply, verify documents, accept jobs, complete trips, get paid.
- Requirements.
- Earnings and payouts.
- Travel-to-Driver explanation: Travel booking creates driver job; driver accepts/rejects; customer sees status; payout follows completion.
- ZivoChat support link.
- Real Privacy Policy and real Terms of Service links.

## Driver Priority

`zivodriver.com` should be the recommended first UI fix PR after this audit because it is public, visible, revenue/operations-adjacent, and already has a clear landing-page requirement list.
>>>>>>> Stashed changes

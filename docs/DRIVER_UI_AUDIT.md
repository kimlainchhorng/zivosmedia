# Driver UI Audit

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
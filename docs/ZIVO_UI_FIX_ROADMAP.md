# ZIVO UI Fix Roadmap

## Top 10 UX/UI Problems

1. P0: `zivoadmin.com` did not load during capture.
2. P0: `/hotels` appears to show non-hotel/rides availability content.
3. P0: `zivodriver.com` does not read as a dedicated driver landing page.
4. P1: Continue with Zivosmedia is not prominent across auth and app domains.
5. P1: Unified app switcher is missing or inconsistent across domains.
6. P1: ZivoChat support is not consistently visible from app workflows.
7. P1: Payment/billing connection is not visible enough in checkout, wallet, business, software, driver, and admin routes.
8. P1: Business and Employee domains read too generic for their intended platforms.
9. P1: `npm run test:visual` shows account safe-area snapshot diffs on multiple mobile baselines.
10. P2: Media readiness report lists 37 lazy-loading/decoding issues across high-traffic pages.

## Recommended First UI Fix PR

First UI fix after screenshot review should likely target `kimlainchhorng/zivodriver` once access is confirmed.

Branch suggestion: `feature/driver-landing-page`.

Goal:

- Create a dedicated `zivodriver.com` landing page.
- Add Continue with Zivosmedia.
- Add driver onboarding and job/earning/payout explanation.
- Add ZivoChat support link.
- Add app switcher placeholder.
- Do not implement payout logic in this UI fix.

## Follow-Up Order

1. Review screenshots and audit docs.
2. Fix `zivodriver.com` landing page.
3. Build Zivosmedia identity foundation.
4. Build Zivo Admin platform registry.
5. Connect Travel and Driver.

## Validation Status

- `npm run qa:frontend-visual-contracts`: passed.
- `npm run qa:safe-area:all`: static checks passed; Playwright safe-area tests skipped.
- `npm run perf:media-report`: report-only with 37 issues.
- `npm run test:visual`: failed with 6 account safe-area snapshot diffs, 24 passed, 56 skipped.

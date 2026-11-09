# P23 — Media suite shell honesty

Suite-shell add-ons from the ecosystem upgrade roadmap. **Honesty only** in this
wave — no invented live dashboards or secret-bearing status pages.

| Surface | Honesty rule |
|---|---|
| App directory (Ride / Driver / Business / Admin cards) | Links may list products; never claim live deploy health or signed-in cross-app state without a real contract |
| Unified language + theme preference sync | Prefer local preference; cross-product sync is `not_configured` until Family owns a shared prefs API |
| Cross-product notification inbox bridge | Media inbox stays Media-scoped; no silent federation into Ride/Admin without owner-approved SSO |
| Marketing Studio → Ride asset pipeline | Staging / fail-closed until cutover checklist passes; no production R2 delete from Media |
| Suite status page | Synthetic only; **no secrets**, no forged Hosting tokens, no production health claims from unverified probes |

## Ride embed / SSO (this repo)

- Local Media parent: `http://localhost:8081` / `http://127.0.0.1:8081` only (`allowLocalDevelopment`)
- Local Ride child: `http://localhost:5177` / `http://127.0.0.1:5177` only
- Retired Vite ports **5173 / 5174** are rejected (see `zivoRideProductionBoundary` tests)
- Production Ride: `https://ride.zivosmedia.com` only; production allowlist must not widen without evidence
- Forbid path: honest “Continue to ZIVO Ride” handoff — **no iframe**, no silent SSO
- Tip charging (`capture-ride-tip`) is not invoked from Canonical Ride frame
- KHR parity: `KHR_PER_USD = 4100`

## Gates

- `npm run test:zivo-ride-contract`
- `npm run qa:sso-auth-contracts`
- Do not forge Hosting/SSO tokens for screenshots

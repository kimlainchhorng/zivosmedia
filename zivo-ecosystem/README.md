# `zivo-ecosystem/` — Cross-App Integration Contract (v1)

Reference implementation of the ZIVO ecosystem integration contracts defined in
`ZIVO-wallet/docs/ecosystem/*`. Ships on the isolated branch
**`integration/zivo-ecosystem-user-flow-v1`** in every ZIVO repo so all products
share **one** version of these rules instead of forking them.

**Dependency-free ESM + JSDoc types.** Runs identically under Next.js (Wallet),
Vite (Driver/Media/Software/Travel/Chat), and Deno edge functions. Pure — no I/O,
no live auth, no network. This is a *contract*, not a wiring; §"Adoption" below.

## Modules
| File | Contract | Key guarantee |
|------|----------|---------------|
| `identity.mjs` | canonical subject + account-linking state machine + role/tenant map | email alone never identifies; cross-app resolve needs a **verified, non-revoked** link; no silent merge |
| `events.mjs` | versioned event/correlation envelope | financial events require `correlation_id` + `event_id` (idempotency); no secrets/card/session/full-payload in `safe_metadata` |
| `deeplink.mjs` | allowlisted deep-link parser + authorizer | only allowlisted routes parse; **no** link can auto-pay/refund/transfer/change-role/expose-secret; read-entity needs auth + ownership |
| `app-switcher.mjs` | global-nav access model | shows only accessible products; Admin only with staff/admin role |
| `notifications.mjs` | notification contract | push carries **no** financial payload; quiet hours/locale/role/prefs respected; security-alert overrides |
| `ux-terms.mjs` | shared UX states + EN/KM glossary | **transfer ≠ payout**; every term has EN + KM |

## Run the tests (offline, zero deps)
```sh
node --test zivo-ecosystem/*.test.mjs
```
17 invariant + cross-app-journey tests. No network; proves the **contract** only.
Live-runtime cross-app journeys (real accounts + deployed apps) are **PENDING** —
see `ZIVO-wallet/docs/ecosystem/ZIVO_ECOSYSTEM_INTEGRATION_V1.md`.

## Adoption (per repo, follow-up — not wired in this scaffold)
This package is intentionally **not imported by the app yet**, so it cannot break
any product build. To adopt:
1. Import `resolveCanonicalSubject` at every cross-app handoff (SSO return).
2. Emit `makeEvent(...)` for cross-app facts; keep provider finalization in Wallet.
3. Route inbound deep links through `parseDeepLink` + `authorizeDeepLink`.
4. Render the switcher from `visibleProducts(grants)`.
5. Build push via `buildPush` (never raw notification objects).
6. Use `ux-terms` copy so transfer/payout are never conflated.

**Financial ownership is unchanged:** this contract transports already-finalized,
redacted facts. It never charges, refunds, transfers, or writes a ledger.

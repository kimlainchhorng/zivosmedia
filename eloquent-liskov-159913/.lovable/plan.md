## Next Upgrade — Phase 3: Edge Function Reliability & Speed

With Phase 1 (RLS perf) and Phase 2 (function/view hardening) done, the next biggest user-visible win is fixing the flaky edge functions surfacing in console logs and standardizing the runtime.

### Scope

**1. Fix failing functions**
- `duffel-destination-prices` — repeated `FunctionsFetchError`. Add 10s timeout, response caching via `service_health_status` (15-min TTL per origin/destination), and graceful 503 fallback so frontend stops retrying.
- `check-zivo-plus` — failing on load. Audit secret presence (`STRIPE_SECRET_KEY`), add cold-start guard, return cached membership status from DB if Stripe is unreachable.

**2. Runtime standardization**
- Sweep all ~150 edge functions: replace `esm.sh/` imports with `npm:` specifiers (per project memory). This eliminates the recurring "module resolution failed" deploy errors.
- Remove stale `deno.lock` files from functions where deploys have been flaky.

**3. Latency wins**
- Add `EdgeRuntime.waitUntil(...)` for all fire-and-forget work (audit logs, push notification dispatch, analytics events) so user-facing latency drops 100–400ms.
- Add `Cache-Control: public, max-age=...` headers to read-only functions (destination prices, currency rates, flight search suggestions).

**4. Circuit breaker pattern**
- Extend `src/utils/edgeFunctionFallback.ts` with a per-function failure counter — after 3 consecutive failures within 60s, skip calls for 2 minutes and serve fallback immediately. Stops the retry storms visible in network logs.

### Out of scope
- Frontend bundle work (Phase 4)
- Half-built hotel scraper cleanup (Phase 5)
- Anon-callable SECURITY DEFINER audit (Phase 2 follow-up)

### Risk
Low. Each function is edited independently; failures are isolated. No DB migrations needed.

### Confirm before I start
- OK to proceed with Phase 3?
- Any function I should leave alone (e.g. one you're actively debugging)?

# Software-domain auth — owner decision brief (2026-11-10)

Status: **awaiting owner decision**. Do **not** change `useDedicatedSoftwareAuth` until the owner picks an option below.

## Current code vs locked architecture

| Source | Auth on `zivosoftware.com` |
| --- | --- |
| Locked federation (`AGENTS.md`, `docs/zivo-multidomain-architecture.md`) | Auth **always** on main project `slirphzzwcogdbkeicff`; per-domain projects use claims-based RLS + dual client (auth=main, data=domain). |
| Live client (`src/integrations/supabase/client.ts`) | When host is software **and** software URL/key are set, `useDedicatedSoftwareAuth` routes **both** auth and data to `ydxztoresbdeoeijhxww`. |

This is the known deliberate-looking deviation called out in `AGENTS.md`. It must not be “fixed” unilaterally.

## Options

### Option A — Keep dedicated software auth (amend the locked decision)

- **Meaning:** Software accounts live on `ydxztoresbdeoeijhxww`. Media hub identity remains separate unless an explicit SSO bridge is used.
- **Pros:** Matches today’s client + software Supabase Auth redirect URL config (`cloudflare/README.md`); least immediate churn; software vertical can keep evolving its own auth users.
- **Cons:** Breaks the “ONE ZIVO account across all domains” lock; Ride/Media SSO does **not** automatically equal software login; future federation/SSO docs stay forked; owner must formally amend the multidomain architecture.
- **Work if chosen:** Update `AGENTS.md` + architecture doc to document the exception; keep software Auth Site URL / Redirect URLs on the software project; avoid dual-client refactor.

### Option B — Move software auth onto main (`slirph`) dual-client (align with lock)

- **Meaning:** Auth always on main; software host keeps data on `ydxz` via `accessToken` injection (same pattern as travel/driver when dedicated data is enabled).
- **Pros:** Restores one account across domains; simplifies SSO story with Media/Ride; matches locked architecture.
- **Cons:** Requires shared JWT secret on software project, claims-based RLS audit, session migration / account linking plan for existing `ydxz` auth users, Auth redirect URL moves to main project, regression pass on software login/signup/password reset.
- **Work if chosen:** Dual-client refactor in `client.ts` (clear `useDedicatedSoftwareAuth`); verify software RLS accepts main JWTs; migrate or link existing software users; update Auth URL config; keep Media Auth up (Ride SSO depends on it).

## Recommendation

**Prefer Option B** for full-production federation, but **do not start the code cutover until** the owner blesses it and the JWT/RLS/account-link prerequisites are ready.

Until then, **leave Option A’s runtime behavior in place** (current code) and treat software auth as an explicit architecture exception — not a silent bug.

## Guardrails (unchanged)

- Do not pause/delete Media Auth Edges used by Ride SSO.
- Do not flip `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND`.
- Do not run casual live Stripe charge tests while deciding this.

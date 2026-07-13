# Production Deploy Secrets

Use this checklist for the GitHub `production` environment and any CI runner that can deploy `myzivo.com`.

## Required GitHub Secrets

| Secret | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | build, strict preflight | Browser Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build, strict preflight | Browser-safe Supabase publishable key. |
| `VITE_SUPABASE_PROJECT_ID` | build, strict preflight | Supabase project ref; must match `VITE_SUPABASE_URL`. |
| `VITE_ZIVO_SOFTWARE_SUPABASE_URL` | Cloudflare build, strict preflight | Dedicated browser Supabase URL for `zivosoftware.com`; must be `https://ydxztoresbdeoeijhxww.supabase.co`. |
| `VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY` | Cloudflare build, strict preflight | Browser-safe publishable key for the `Zivo software` Supabase project. |
| `VITE_ZIVO_DRIVER_SUPABASE_URL` | Cloudflare build for `zivodriver.com` browser bundle | Dedicated browser Supabase URL for Driver data calls; should be `https://yiedlgoxwjmansszdypf.supabase.co`. |
| `VITE_ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY` | Cloudflare build for `zivodriver.com` browser bundle | Browser-safe publishable key for the `Zivo Driver` Supabase project. Leave blank until Driver browser routing is ready. |
| `ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY` | `zivo-domain-summary` Edge Function | Browser-safe publishable key for the Driver project, used server-side to call `zivo_driver_share_summary` with the user's Bearer token. |
| `ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY` | `zivo-domain-summary` Edge Function | Browser-safe publishable key for the Travel project, used server-side to call `zivo_travel_share_summary` with the user's Bearer token. |
| `ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY` | `zivo-domain-summary` Edge Function | Browser-safe publishable key for the Software project, used server-side to call `zivo_software_share_summary` with the user's Bearer token. |
| `ZIVO_DRIVER_SUMMARY_RPC` | `zivo-domain-summary` Edge Function | Optional override. Default: `zivo_driver_share_summary`. |
| `ZIVO_TRAVEL_SUMMARY_RPC` | `zivo-domain-summary` Edge Function | Optional override. Default: `zivo_travel_share_summary`. |
| `ZIVO_SOFTWARE_SUMMARY_RPC` | `zivo-domain-summary` Edge Function | Optional override. Default: `zivo_software_share_summary`. |
| `SUPABASE_URL` | strict preflight, backend scripts | Backend Supabase project URL for cron/runtime settings. |
| `SUPABASE_ANON_KEY` | strict preflight, backend scripts | Legacy anon JWT or compatible function-auth key for Edge Function JWT verification and database cron auth. |
| `SUPABASE_ACCESS_TOKEN` | strict preflight | Supabase CLI token for linked remote migration-history checks. |
| `CHANNEL_OG_FUNCTION_URL` | strict preflight, share previews | Optional explicit `channel-og` Edge Function URL; omit when `SUPABASE_URL` can derive it. |
| `NETLIFY_AUTH_TOKEN` | production deploy | Netlify API token for publishing the production bundle. |
| `NETLIFY_SITE_ID` | production deploy | Netlify site API ID for `myzivo.com`. |

## Setup Rules

- Store these as GitHub environment secrets on the `production` environment, not as committed files.
- Keep real values out of `.env.example`, `.env.deploy.example`, docs, source code, and workflow logs.
- Keep the `VITE_ZIVO_SOFTWARE_*` values tied to Supabase project `ydxztoresbdeoeijhxww` so `zivosoftware.com` does not boot with the main Zivo media backend key.
- Keep the `VITE_ZIVO_DRIVER_*` values tied to Supabase project `yiedlgoxwjmansszdypf`; leaving the publishable key blank keeps Driver data calls on the main backend from this app.
- Do not use `SUPABASE_SERVICE_ROLE_KEY` as `SUPABASE_ANON_KEY`.
- Do not use `SUPABASE_ACCESS_TOKEN` or any `sbp_...` management token as `SUPABASE_ANON_KEY`.
- Keep `SUPABASE_ACCESS_TOKEN` scoped to automation that needs migration-history checks, and rotate it if it is ever exposed.
- Use `.env.deploy.example` only as a local template; real `.env.deploy` is ignored by Git.
- Follow `docs/supabase-secret-rotation-runbook.md` immediately if any Supabase key, JWT, or access token is pasted outside the approved secret store.

## Verify

After configuring secrets, the deploy workflow should pass these gates before Netlify publish:

```bash
npm run deploy:preflight:strict -- --skip-build --skip-type-check
npm run release:production-gate
```

After configuring the `zivo-domain-summary` Edge Function secrets, run an authenticated bridge smoke:

```bash
ZIVO_DOMAIN_SUMMARY_ACCESS_TOKEN=<test-user-access-token> npm run smoke:zivo-domain-summary
```

If you only have a test user's refresh token or Supabase session JSON:

```bash
ZIVO_DOMAIN_SUMMARY_REFRESH_TOKEN=<test-user-refresh-token> npm run smoke:zivo-domain-summary
ZIVO_DOMAIN_SUMMARY_SESSION_JSON='<supabase-session-json>' npm run smoke:zivo-domain-summary
```

Without a token, the smoke command safely checks that the deployed function is reachable and returns `401 Unauthorized`.

For local builder checks without production secrets:

```bash
npm run deploy:preflight:local
npm run deploy:preflight:check-summary
```

Related setup:

- `docs/supabase-deploy-env-setup.md`
- `docs/supabase-migration-auth-setup.md`
- `docs/supabase-secret-rotation-runbook.md`
- `.github/workflows/deploy-production.yml`

# Production Deploy Secrets

Use this checklist for the GitHub `production` environment and any CI runner that can deploy `myzivo.com`.

## Required GitHub Secrets

| Secret | Used by | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | build, strict preflight | Browser Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | build, strict preflight | Browser-safe Supabase publishable key. |
| `VITE_SUPABASE_PROJECT_ID` | build, strict preflight | Supabase project ref; must match `VITE_SUPABASE_URL`. |
| `SUPABASE_URL` | strict preflight, backend scripts | Backend Supabase project URL for cron/runtime settings. |
| `SUPABASE_ANON_KEY` | strict preflight, backend scripts | Legacy anon JWT or compatible function-auth key for Edge Function JWT verification and database cron auth. |
| `SUPABASE_ACCESS_TOKEN` | strict preflight | Supabase CLI token for linked remote migration-history checks. |
| `CHANNEL_OG_FUNCTION_URL` | strict preflight, share previews | Optional explicit `channel-og` Edge Function URL; omit when `SUPABASE_URL` can derive it. |
| `NETLIFY_AUTH_TOKEN` | production deploy | Netlify API token for publishing the production bundle. |
| `NETLIFY_SITE_ID` | production deploy | Netlify site API ID for `myzivo.com`. |

## Setup Rules

- Store these as GitHub environment secrets on the `production` environment, not as committed files.
- Keep real values out of `.env.example`, `.env.deploy.example`, docs, source code, and workflow logs.
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

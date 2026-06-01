# Supabase Deploy Environment Setup

Production preflight needs three Supabase values that are intentionally not committed:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_ACCESS_TOKEN`

These are backend/deploy values. They are separate from the frontend `VITE_`
values so database cron jobs and Edge Function verification can use a compatible
anon JWT without exposing secrets to browser code. Never put
`SUPABASE_ACCESS_TOKEN`, `sbp_...`, `sb_secret_...`, or a service-role JWT in
any `VITE_` variable.

GitHub and Netlify deploy secrets are tracked in `docs/production-deploy-secrets.md`.

## Required Values

Start from the safe template:

```bash
cp .env.deploy.example .env.deploy
```

Then set these in the private `.env.deploy`, CI secret store, or local shell:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<legacy-anon-jwt-or-compatible-function-auth-key>
SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>
```

Optional share-preview override:

```bash
CHANNEL_OG_FUNCTION_URL=https://<project-ref>.supabase.co/functions/v1/channel-og
```

Most deploys can omit `CHANNEL_OG_FUNCTION_URL` because channel previews can be
derived from `SUPABASE_URL`. Use it only when the public channel preview route
must call a custom Edge Function origin or proxy.

Do not use `SUPABASE_SERVICE_ROLE_KEY` for `SUPABASE_ANON_KEY`.
`scripts/deploy/env-preflight.mjs --strict` rejects service-role JWTs in the
anon-key slot, rejects `sbp_...` Supabase management access tokens in the
anon-key slot and public `VITE_` variables, validates `CHANNEL_OG_FUNCTION_URL`
when it is set, and fails production checks when `SUPABASE_ACCESS_TOKEN` is
missing.

If any value is pasted into chat, logs, docs, or source code, treat it as compromised and follow `docs/supabase-secret-rotation-runbook.md`.

## Why This Blocks Preflight

`npm run deploy:preflight` runs:

- `scripts/deploy/env-preflight.mjs --strict`
- `scripts/supabase/runtime-settings-sql.mjs --strict`

Those checks make sure database-side jobs can call the correct Supabase project using `app.settings.supabase_url` and `app.settings.supabase_anon_key`.

## Verify

After setting the values, run:

```bash
npm run deploy:env-check
npm run supabase:runtime-settings:sql -- --strict
npm run deploy:preflight
```

Expected result:

- Environment readiness has `0` critical findings.
- Runtime settings SQL renders without errors.
- `docs/production-preflight-summary.json` has `"runtimeSettingsSqlInputs": true`.

## Related Setup

Remote migration history also accepts an interactive Supabase CLI login instead of `SUPABASE_ACCESS_TOKEN` for local checks:

```bash
supabase login
```

or:

```bash
export SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>
```

See `docs/supabase-migration-auth-setup.md`.

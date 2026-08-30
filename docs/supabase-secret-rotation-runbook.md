# Supabase Secret Rotation Runbook

Use this runbook whenever a Supabase access token, service-role key, secret key, anon JWT, or publishable key is pasted into chat, logs, issues, screenshots, docs, source code, CI output, or any place outside the approved secret store.

## Immediate Response

1. Treat the value as compromised even if the exposure looked temporary.
2. Do not paste the value into commits, ticket comments, pull requests, docs, or logs while investigating.
3. Run local scans before any commit:

```bash
npm run security:check-secrets
npm run security:check-secrets:local
npm run security:check-supabase-token-fragments
npm run security:check-supabase-token-fragments:local
npm run security:scan:local
rg -l --hidden 'sb_publishable_[A-Za-z0-9_-]+|sb_secret_[A-Za-z0-9_-]+|sbp_[A-Za-z0-9]+' --glob '!node_modules/**' --glob '!dist/**' --glob '!build/**' --glob '!coverage/**' --glob '!.git/**' --glob '!.env.local' --glob '!.env.*.local' .
```

4. Identify which class leaked:
   - `sbp_...`: Supabase management access token.
   - JWT with `"role":"service_role"`: backend-only service-role key.
   - `sb_secret_...`: backend-only secret key.
   - JWT with `"role":"anon"`: legacy anon key.
   - `sb_publishable_...`: browser-safe publishable key, still rotate if exposed in an untrusted place.

## Rotate

1. Revoke or rotate the compromised Supabase management access token from the Supabase account settings.
2. Rotate project API keys from the Supabase project API settings when a project key leaked.
3. Update only approved secret stores:
   - GitHub `production` environment secrets.
   - Netlify/Vercel/Cloudflare deploy secrets, if used by the environment.
   - Local `.env.deploy` or shell variables for operators who need deploy checks.
4. Keep `SUPABASE_SERVICE_ROLE_KEY` separate from `SUPABASE_ANON_KEY`.
5. Keep `SUPABASE_ACCESS_TOKEN` scoped to automation that needs migration-history checks.

## Validate

After rotation, run:

```bash
npm run deploy:env-check -- --strict
npm run supabase:migrations:report
npm run security:api-readiness:report
npm run deploy:preflight:strict -- --skip-type-check
npm run release:production-gate
npm run security:check-secrets
npm run security:check-secrets:local
npm run security:check-supabase-token-fragments
npm run security:check-supabase-token-fragments:local
npm run security:scan:local
```

Expected signals:

- `SUPABASE_ANON_KEY` is not reported as a service-role/secret key.
- Remote migration history is readable when `SUPABASE_ACCESS_TOKEN` is configured
  **or** the Supabase CLI has a stored `supabase login` session. Either path
  authenticates the linked query, so a machine that is logged in reads the history
  even with the env var unset — the drift report still prints
  `SUPABASE_ACCESS_TOKEN configured: no` in that case, which is expected.
- API readiness has `critical: 0`.
- Secret scan reports no leaked secrets.
- Local env audit reports no leaked Supabase tokens after machine-local values are rotated or removed.

## Incident Closeout

- Record the incident owner, time detected, affected secret class, rotation time, and validation commands in the incident tracker.
- Review recent deploy logs and Edge Function logs for unexpected use of the old key.
- If service-role credentials were exposed, review privileged writes, account deletion/export requests, payout changes, payment/refund actions, and storage signed URL activity for the exposure window.
- Add or update tests when the leak revealed a missing guard.

# Security Scripts

## check-secrets.mjs

Scans the repository for known secret-leak patterns. Runs as part of CI and can be invoked locally.
Generated web bundles under `dist`, Android assets, and iOS assets are skipped; scan and fix the source/env inputs that produce them.
Local-only env files such as `.env.local` and `.env.*.local` are skipped by default so developer machines can keep local credentials outside commit/deploy gates; deploy env files such as `.env.production` are scanned.
Findings print only the detector name, file, line, and a redacted token-family prefix so CI logs do not expose secret material.

To include local-only env files during incident response or a personal machine audit:

```bash
npm run security:check-secrets:local
```

```bash
npm run security:check-secrets
```

Detects:
- Stripe live keys (`sk_live_*`, `rk_live_*`)
- AWS access keys (`AKIA[0-9A-Z]{16}`)
- Google API keys (`AIza...`)
- Supabase keys and management tokens (`sb_publishable_*`, `sb_secret_*`, `sbp_*`, service-role JWTs)
- Private key blocks (`-----BEGIN ... PRIVATE KEY-----`)
- GitHub / OpenAI / Slack tokens

Exits non-zero on detection. Add this to CI **before** any deploy step.

## security:audit

Runs `npm audit --audit-level=moderate` against installed dependencies.

```bash
npm run security:audit
```

The command is wrapped by `scripts/security/npm-audit-with-retry.mjs`, which
retries only npm-registry outages (the advisory-endpoint network timeout).
Real audit findings and every other failure exit non-zero on the first
attempt — the retry can never mask a vulnerable tree.

Run monthly per the policy in `SECURITY.md`. To attempt automatic patching:

```bash
npm run security:audit:fix
```

## security:scan

Combined: dependency audit, general secret scan, Supabase token-fragment scan, and
production CSP policy checks in one command.

```bash
npm run security:scan
npm run security:scan:local
```

Use `security:scan:local` for incident response or personal machine audits; it includes local-only env files and fails when those files still contain matching secrets.

## check-csp.mjs

Checks every production CSP emitter and fails if a policy permits executable
`unsafe-inline` or `unsafe-eval`. Analytics consent loading and font activation
run from the same-origin `/analytics-bootstrap.js`; `style-src 'unsafe-inline'`
remains only for the app's critical and runtime-generated styles.

```bash
npm run security:check-csp
```

## check-supabase-token-fragments.mjs

Runs the Supabase-only pasted-token fragment sweep used in rotation closeout. It scans hidden workflow/config paths such as `.github`, skips generated bundles and local-only env files by default, and prints redacted findings only.

```bash
npm run security:check-supabase-token-fragments
npm run security:check-supabase-token-fragments:local
```

## api-readiness-check.mjs

Inventories the Supabase/API surface and writes a production readiness report.

```bash
npm run security:api-readiness:report
npm run security:api-readiness
```

Checks:
- required Supabase public env variables in `.env.example`
- frontend source for backend-only secret references
- Supabase Edge Function handler coverage
- high-risk functions missing the shared `withSecurity()` wrapper
- any secured Edge Function missing wrapper-level `allowedMethods`
- wildcard CORS plus service-role risk
- migration drift summary from `docs/supabase-migration-drift-report.md`

Strict mode exits non-zero only for critical safety breaks. Warnings remain in
the report so the hardening backlog is visible without blocking every local run.

## deploy/env-preflight.mjs

Validates deploy-time Supabase environment wiring without printing secret values.

```bash
npm run deploy:env-check
npm run deploy:preflight:strict
```

Checks:
- required browser Supabase URL and publishable key
- backend-compatible `SUPABASE_ANON_KEY` shape when present
- `VITE_` variables for accidental Supabase secret/service-role keys
- frontend/backend Supabase project URL mismatch
- channel share preview backend URL configuration

## Recommended pre-commit hook

If `husky` is added later:

```bash
# .husky/pre-commit
npm run security:check-secrets
```

For now, run manually before each commit, especially when adding new env vars.

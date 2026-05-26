# Security Scripts

## check-secrets.mjs

Scans the repository for known secret-leak patterns. Runs as part of CI and can be invoked locally.

```bash
npm run security:check-secrets
```

Detects:
- Stripe live keys (`sk_live_*`, `rk_live_*`)
- AWS access keys (`AKIA[0-9A-Z]{16}`)
- Google API keys (`AIza...`)
- Private key blocks (`-----BEGIN ... PRIVATE KEY-----`)
- GitHub / OpenAI / Slack tokens

Exits non-zero on detection. Add this to CI **before** any deploy step.

## security:audit

Runs `npm audit --audit-level=high` against installed dependencies.

```bash
npm run security:audit
```

Run monthly per the policy in `SECURITY.md`. To attempt automatic patching:

```bash
npm run security:audit:fix
```

## security:scan

Combined: dependency audit + secret scan in one command.

```bash
npm run security:scan
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
- wildcard CORS plus service-role risk
- migration drift summary from `docs/supabase-migration-drift-report.md`

Strict mode exits non-zero only for critical safety breaks. Warnings remain in
the report so the hardening backlog is visible without blocking every local run.

## Recommended pre-commit hook

If `husky` is added later:

```bash
# .husky/pre-commit
npm run security:check-secrets
```

For now, run manually before each commit, especially when adding new env vars.

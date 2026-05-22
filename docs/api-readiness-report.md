# API Readiness Report

Generated: 2026-05-22T01:36:23.162Z

## Summary

- Critical findings: 0
- Warnings: 2
- Edge Functions inventoried: 253
- High-risk Edge Functions: 108
- Functions using withSecurity(): 110
- Functions using strictCorsHeaders(): 93
- Functions using service role: 202
- Supabase migration drift: reportLocal=690, currentLocal=690, remote=0, matched=0, duplicateVersions=8, remoteError=yes

## Critical

- No critical API readiness issues found.

## Warnings

- [duplicate-migration-versions] Local Supabase migrations contain 8 duplicate version(s). (docs/supabase-migration-drift-report.md)
- [migration-history-unavailable] Linked Supabase migration history could not be read. Run supabase login or configure authenticated MCP before production schema work. (docs/supabase-migration-drift-report.md)

## High-Risk Functions Missing withSecurity()

- None

## Next Hardening Moves

- Reconcile Supabase migration history before running production schema pushes.
- Run npm run supabase:upgrade-readiness before a Postgres major-version upgrade.
- Move browser Supabase URL/key to Vite env variables for staging and production separation.
- Add withSecurity() to high-risk Edge Functions first, starting with payment, webhook, admin, auth, and wallet routes.
- Replace wildcard CORS on authenticated/service-role functions with strictCorsHeaders().

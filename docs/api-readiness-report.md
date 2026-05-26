# API Readiness Report

Generated: 2026-05-26T19:21:57.714Z

## Summary

- Critical findings: 0
- Warnings: 1
- Edge Functions inventoried: 258
- High-risk Edge Functions: 111
- Functions using withSecurity(): 116
- Functions using strictCorsHeaders(): 99
- Functions using service role: 208
- Supabase migration drift: reportLocal=700, currentLocal=700, remote=0, matched=0, duplicateVersions=8, allowedDuplicateVersions=8, newDuplicateVersions=0, remoteError=yes

## Critical

- No critical API readiness issues found.

## Warnings

- [migration-history-unavailable] Linked Supabase migration history could not be read. Run supabase login or configure authenticated MCP before production schema work. (docs/supabase-migration-drift-report.md)

## High-Risk Functions Missing withSecurity()

- None

## Next Hardening Moves

- Reconcile Supabase migration history before running production schema pushes.
- Run npm run supabase:upgrade-readiness before a Postgres major-version upgrade.
- Move browser Supabase URL/key to Vite env variables for staging and production separation.
- Add withSecurity() to high-risk Edge Functions first, starting with payment, webhook, admin, auth, and wallet routes.
- Replace wildcard CORS on authenticated/service-role functions with strictCorsHeaders().

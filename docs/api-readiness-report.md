# API Readiness Report

Generated: 2026-05-26T20:14:06.212Z

## Summary

- Critical findings: 0
- Warnings: 4
- Edge Functions inventoried: 262
- High-risk Edge Functions: 112
- Functions using withSecurity(): 116
- Functions using strictCorsHeaders(): 99
- Functions using service role: 212
- Supabase migration drift: reportLocal=830, currentLocal=830, remote=1409, matched=0, duplicateVersions=24, allowedDuplicateVersions=8, newDuplicateVersions=16, remoteError=no

## Critical

- No critical API readiness issues found.

## Warnings

- [high-risk-function-without-wrapper] High-risk Edge Function does not use withSecurity(). (supabase/functions/twilio-webhook/index.ts)
- [service-role-wildcard-cors] High-risk service-role function appears to use wildcard CORS without the shared security wrapper. (supabase/functions/twilio-webhook/index.ts)
- [duplicate-migration-versions] Local Supabase migrations contain 16 new duplicate version(s). (docs/supabase-migration-drift-report.md)
- [migration-history-disconnected] Local and remote Supabase migration histories have no matching versions. Treat db push/pull as risky until reconciled. (docs/supabase-migration-drift-report.md)

## High-Risk Functions Missing withSecurity()

- supabase/functions/twilio-webhook/index.ts

## Next Hardening Moves

- Reconcile Supabase migration history before running production schema pushes.
- Run npm run supabase:upgrade-readiness before a Postgres major-version upgrade.
- Move browser Supabase URL/key to Vite env variables for staging and production separation.
- Add withSecurity() to high-risk Edge Functions first, starting with payment, webhook, admin, auth, and wallet routes.
- Replace wildcard CORS on authenticated/service-role functions with strictCorsHeaders().

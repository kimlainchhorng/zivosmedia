# API Readiness Report

Generated: 2026-06-01T12:56:18.108Z

## Summary

- Critical findings: 0
- Warnings: 1
- Edge Functions inventoried: 397
- High-risk Edge Functions: 134
- Functions using withSecurity(): 397
- Functions using strictCorsHeaders(): 397
- Method-gated Edge Functions: 397
- Functions using service role: 340
- Loose Edge Function security backlog: 0
- Method gate backlog: 0
- Required public env documented: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
- Recommended backend env documented: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- API operations runbook: present (0 missing topics)
- Supabase migration drift: reportLocal=1049, currentLocal=1049, remote=0, matched=0, duplicateVersions=0, allowedDuplicateVersions=0, newDuplicateVersions=0, remoteError=yes
- Supabase migration near-match diagnostics: near5s=0, near60s=0, oneToOne5s=0, oneToOne60s=0, unmatchedLocal=1049, unmatchedRemote=0, localAfterRemoteRange=0, sharedDays=0
- Pending local migration risk gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Critical

- No critical API readiness issues found.

## Warnings

- [migration-history-unavailable] Linked Supabase migration history could not be read. Run supabase login or configure authenticated MCP before production schema work. (docs/supabase-migration-drift-report.md)

## High-Risk Functions Missing withSecurity()

- None

## High-Risk Functions Missing allowedMethods

- None

## Loose Edge Function Security Backlog

- None

## Next Hardening Moves

- Reconcile Supabase migration history before running production schema pushes.
- Configure `SUPABASE_ACCESS_TOKEN` or run `supabase login` so readiness checks can compare remote migration history. See `docs/supabase-migration-auth-setup.md`.
- Configure `app.settings.supabase_url` and `app.settings.supabase_anon_key` per Supabase project before relying on database cron jobs.
- Run `npm run supabase:upgrade-readiness` before a Postgres major-version upgrade or production schema push.
- Keep new high-risk Edge Functions on `withSecurity()` and strict CORS from the first commit.
- Prefer wrapper-level `allowedMethods` on mutating Edge Functions so method rejection happens before handler logic reads request bodies.
- Keep `docs/api-operations-runbook.md` current with owners for function 5xx, webhook failures, slow queries, and auth/payment spikes.

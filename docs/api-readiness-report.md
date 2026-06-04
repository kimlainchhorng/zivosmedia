# API Readiness Report

Generated: 2026-06-03T22:14:26.058Z

## Summary

- Critical findings: 0
- Warnings: 2
- Edge Functions inventoried: 400
- High-risk Edge Functions: 136
- Functions using withSecurity(): 400
- Functions using strictCorsHeaders(): 400
- Method-gated Edge Functions: 400
- Functions using service role: 343
- Loose Edge Function security backlog: 0
- Method gate backlog: 0
- Required public env documented: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
- Recommended backend env documented: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- API operations runbook: present (0 missing topics)
- Supabase migration drift: reportLocal=1073, currentLocal=1073, remote=1515, matched=0, duplicateVersions=4, allowedDuplicateVersions=0, newDuplicateVersions=4, remoteError=no
- Supabase migration near-match diagnostics: near5s=585, near60s=616, oneToOne5s=584, oneToOne60s=614, unmatchedLocal=459, unmatchedRemote=901, localAfterRemoteRange=15, sharedDays=86
- Pending local migration risk gates: createsTables=2, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Critical

- No critical API readiness issues found.

## Warnings

- [duplicate-migration-versions] Local Supabase migrations contain 4 new duplicate version(s). (docs/supabase-migration-drift-report.md)
- [migration-history-disconnected] Local and remote Supabase migration histories have no exact matches, but 616 local migrations have a remote timestamp within one minute. Treat db push/pull as risky until version-id drift is reconciled. (docs/supabase-migration-drift-report.md)

## High-Risk Functions Missing withSecurity()

- None

## High-Risk Functions Missing allowedMethods

- None

## Loose Edge Function Security Backlog

- None

## Next Hardening Moves

- Reconcile Supabase migration history before running production schema pushes.
- Keep `SUPABASE_ACCESS_TOKEN` available in production readiness jobs so remote migration history remains comparable.
- Configure `app.settings.supabase_url` and `app.settings.supabase_anon_key` per Supabase project before relying on database cron jobs.
- Run `npm run supabase:upgrade-readiness` before a Postgres major-version upgrade or production schema push.
- Keep new high-risk Edge Functions on `withSecurity()` and strict CORS from the first commit.
- Prefer wrapper-level `allowedMethods` on mutating Edge Functions so method rejection happens before handler logic reads request bodies.
- Keep `docs/api-operations-runbook.md` current with owners for function 5xx, webhook failures, slow queries, and auth/payment spikes.

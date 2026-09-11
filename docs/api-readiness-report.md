# API Readiness Report

Generated: 2026-09-09T16:13:15.144Z

## Summary

- Critical findings: 0
- Warnings: 0
- Edge Functions inventoried: 467
- High-risk Edge Functions: 177
- Functions using withSecurity(): 467
- Functions using strictCorsHeaders(): 467
- Method-gated Edge Functions: 467
- Functions using service role: 353
- Loose Edge Function security backlog: 0
- Method gate backlog: 0
- Required public env documented: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
- Recommended backend env documented: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- API operations runbook: present (0 missing topics)
- Supabase migration drift: reportLocal=1183, currentLocal=1183, remote=1784, matched=774, duplicateVersions=6, allowedDuplicateVersions=6, newDuplicateVersions=0, remoteError=no, mcpVerified=yes
- Supabase MCP migration history: remote=1784, first=20260126182101, latest=20260909005602, verified=20260722192749, 20260722193417, 20260722193446, 20260830165252, 20260830165904, 20260830174518, 20260830180554, 20260908225412, 20260909005356, 20260909005359, 20260909005602
- Supabase migration near-match diagnostics: near5s=4, near60s=19, oneToOne5s=3, oneToOne60s=17, unmatchedLocal=392, unmatchedRemote=995, localAfterRemoteRange=0, sharedDays=23
- Pending local migration risk gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Critical

- No critical API readiness issues found.

## Warnings

- No warnings found.

## High-Risk Functions Missing withSecurity()

- None

## High-Risk Functions Missing allowedMethods

- None

## Loose Edge Function Security Backlog

- None

## Next Hardening Moves

- Reconcile Supabase migration history before running production schema pushes.
- Supabase MCP migration history is verified for this run; keep `SUPABASE_ACCESS_TOKEN` available in CI so the CLI report can also compare remote history.
- Configure `app.settings.supabase_url` and `app.settings.supabase_anon_key` per Supabase project before relying on database cron jobs.
- Run `npm run supabase:upgrade-readiness` before a Postgres major-version upgrade or production schema push.
- Keep new high-risk Edge Functions on `withSecurity()` and strict CORS from the first commit.
- Prefer wrapper-level `allowedMethods` on mutating Edge Functions so method rejection happens before handler logic reads request bodies.
- Keep `docs/api-operations-runbook.md` current with owners for function 5xx, webhook failures, slow queries, and auth/payment spikes.

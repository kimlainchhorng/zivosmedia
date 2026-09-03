# API Readiness Report

Generated: 2026-09-03T18:57:06.418Z

## Summary

- Critical findings: 0
- Warnings: 2
- Edge Functions inventoried: 466
- High-risk Edge Functions: 177
- Functions using withSecurity(): 466
- Functions using strictCorsHeaders(): 466
- Method-gated Edge Functions: 466
- Functions using service role: 351
- Loose Edge Function security backlog: 0
- Method gate backlog: 0
- Required public env documented: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
- Recommended backend env documented: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- API operations runbook: present (0 missing topics)
- Supabase migration drift: reportLocal=1176, currentLocal=1176, remote=1625, matched=13, duplicateVersions=6, allowedDuplicateVersions=6, newDuplicateVersions=0, remoteError=no, mcpVerified=no

- Supabase migration near-match diagnostics: near5s=585, near60s=619, oneToOne5s=584, oneToOne60s=617, unmatchedLocal=546, unmatchedRemote=995, localAfterRemoteRange=0, sharedDays=95
- Pending local migration risk gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Critical

- No critical API readiness issues found.

## Warnings

- [active-hardcoded-supabase-url] Active app/script code contains a hardcoded Supabase project URL. Prefer SUPABASE_URL/VITE_SUPABASE_URL. (src/lib/zivoBusinessRestaurantCatalog.ts:15)
- [stale-mcp-migration-history-report] Supabase MCP migration-history verification is missing required current production details. (docs/supabase-mcp-migration-history-report.json)

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

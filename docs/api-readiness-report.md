# API Readiness Report

Generated: 2026-06-04T22:32:34.423Z

## Summary

- Critical findings: 1
- Warnings: 4
- Edge Functions inventoried: 401
- High-risk Edge Functions: 136
- Functions using withSecurity(): 400
- Functions using strictCorsHeaders(): 400
- Method-gated Edge Functions: 400
- Functions using service role: 344
- Loose Edge Function security backlog: 1
- Method gate backlog: 0
- Required public env documented: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
- Recommended backend env documented: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- API operations runbook: present (0 missing topics)
- Supabase migration drift: reportLocal=1080, currentLocal=1080, remote=0, matched=0, duplicateVersions=6, allowedDuplicateVersions=0, newDuplicateVersions=6, remoteError=yes
- Supabase migration near-match diagnostics: near5s=0, near60s=0, oneToOne5s=0, oneToOne60s=0, unmatchedLocal=1080, unmatchedRemote=0, localAfterRemoteRange=0, sharedDays=0
- Pending local migration risk gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Critical

- [edge-function-security-backlog] Every Edge Function must use withSecurity(), strict CORS, and avoid literal wildcard origins.

## Warnings

- [hardcoded-supabase-browser-config] Browser Supabase URL/key are hardcoded. Prefer Vite env values so staging and production can use separate projects. (src/integrations/supabase/client.ts)
- [active-hardcoded-supabase-url] Active app/script code contains a hardcoded Supabase project URL. Prefer SUPABASE_URL/VITE_SUPABASE_URL. (src/integrations/supabase/client.ts:9)
- [duplicate-migration-versions] Local Supabase migrations contain 6 new duplicate version(s). (docs/supabase-migration-drift-report.md)
- [migration-history-unavailable] Linked Supabase migration history could not be read. Run supabase login or configure authenticated MCP before production schema work. (docs/supabase-migration-drift-report.md)

## High-Risk Functions Missing withSecurity()

- None

## High-Risk Functions Missing allowedMethods

- None

## Loose Edge Function Security Backlog

- supabase/functions/store-post-distribute/index.ts

## Next Hardening Moves

- Reconcile Supabase migration history before running production schema pushes.
- Configure `SUPABASE_ACCESS_TOKEN` or run `supabase login` so readiness checks can compare remote migration history. See `docs/supabase-migration-auth-setup.md`.
- Configure `app.settings.supabase_url` and `app.settings.supabase_anon_key` per Supabase project before relying on database cron jobs.
- Run `npm run supabase:upgrade-readiness` before a Postgres major-version upgrade or production schema push.
- Keep new high-risk Edge Functions on `withSecurity()` and strict CORS from the first commit.
- Prefer wrapper-level `allowedMethods` on mutating Edge Functions so method rejection happens before handler logic reads request bodies.
- Keep `docs/api-operations-runbook.md` current with owners for function 5xx, webhook failures, slow queries, and auth/payment spikes.

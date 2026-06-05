# API Readiness Report

Generated: 2026-06-05T15:12:22.678Z

## Summary

- Critical findings: 0
- Warnings: 7
- Edge Functions inventoried: 401
- High-risk Edge Functions: 136
- Functions using withSecurity(): 401
- Functions using strictCorsHeaders(): 401
- Method-gated Edge Functions: 401
- Functions using service role: 344
- Loose Edge Function security backlog: 0
- Method gate backlog: 0
- Required public env documented: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
- Recommended backend env documented: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- API operations runbook: present (0 missing topics)
- Supabase migration drift: reportLocal=1096, currentLocal=1096, remote=1531, matched=0, duplicateVersions=6, allowedDuplicateVersions=0, newDuplicateVersions=6, remoteError=no
- Supabase migration near-match diagnostics: near5s=585, near60s=618, oneToOne5s=584, oneToOne60s=616, unmatchedLocal=480, unmatchedRemote=915, localAfterRemoteRange=17, sharedDays=88
- Pending local migration risk gates: createsTables=3, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Critical

- No critical API readiness issues found.

## Warnings

- [hardcoded-supabase-browser-config] Browser Supabase URL/key are hardcoded. Prefer Vite env values so staging and production can use separate projects. (src/integrations/supabase/client.ts)
- [active-hardcoded-supabase-url] Active app/script code contains a hardcoded Supabase project URL. Prefer SUPABASE_URL/VITE_SUPABASE_URL. (src/config/autoRepairDomain.ts:11)
- [active-hardcoded-supabase-url] Active app/script code contains a hardcoded Supabase project URL. Prefer SUPABASE_URL/VITE_SUPABASE_URL. (src/integrations/supabase/client.ts:22)
- [active-hardcoded-supabase-url] Active app/script code contains a hardcoded Supabase project URL. Prefer SUPABASE_URL/VITE_SUPABASE_URL. (src/pages/OAuthForwarder.tsx:4)
- [active-hardcoded-supabase-url] Active app/script code contains a hardcoded Supabase project URL. Prefer SUPABASE_URL/VITE_SUPABASE_URL. (cloudflare/README.md:78)
- [duplicate-migration-versions] Local Supabase migrations contain 6 new duplicate version(s). (docs/supabase-migration-drift-report.md)
- [migration-history-disconnected] Local and remote Supabase migration histories have no exact matches, but 618 local migrations have a remote timestamp within one minute. Treat db push/pull as risky until version-id drift is reconciled. (docs/supabase-migration-drift-report.md)

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

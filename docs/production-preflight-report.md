# Production Preflight Report

Generated: 2026-06-01T04:21:38.091Z
Mode: strict
Options: strict=yes, skipBuild=no, skipTypeCheck=yes

## Summary

- Machine summary: `docs/production-preflight-summary.json`
- Enforce current JSON gate: `npm run deploy:preflight:check-summary`
- Run local release gate without TypeScript resource pressure: `npm run deploy:preflight:local`
- Enforce production JSON gate: `npm run deploy:preflight:check-summary -- --production`
- Enforce strict production JSON gate: `npm run deploy:preflight:check-production-summary`
- Preview GitHub step summary locally: `npm run deploy:preflight:summary`
- Enforce another summary file: `npm run deploy:preflight:check-summary -- --summary-path <path>`
- Preview another summary file: `npm run deploy:preflight:summary -- --summary-path <path>`
- Validate another summary file: `npm run deploy:preflight:test-summary-schema -- --summary-path <path>`
- Override JSON freshness window: append `-- --max-age-minutes=60`
- Require a strict-mode summary: append `-- --require-mode=strict`
- TypeScript SIGTERM/resource notes: `docs/typescript-preflight-resource-notes.md`
- API readiness: critical=0, warnings=1
- Environment readiness: critical=3, warnings=0
- Runtime settings SQL: failed
- Database readiness: blockers=0, warnings=0
- Supabase auth: envAccessToken=no, driftAccessToken=no
- Supabase remote migration history read: no
- Supabase remote migration history status: access_token_missing
- Migration drift: duplicateVersions=0, allowedDuplicateVersions=0, newDuplicateVersions=0, linkedHistoryDisconnected=no, remoteError=yes
- Reconciliation: candidates=0, highConfidence=0, mediumConfidence=0, unmatchedLocal=1048, unmatchedRemote=0, likelyPendingLocal=0
- Reconciliation review order: high-confidence candidate mappings (0) -> medium-confidence candidate mappings (0) -> unmatched local migrations after candidates (1048) -> unmatched remote versions after candidates (0) -> likely pending local migrations after remote range (0)
- Pending migration gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Steps

### Security scan

- Command: `npm run security:scan`
- Status: passed

### Supabase deploy environment

- Command: `node scripts/deploy/env-preflight.mjs --strict`
- Status: failed
- Failure: exitStatus=1

```json
{
  "critical": 3,
  "warnings": 0,
  "checked": {
    "viteSupabaseUrl": true,
    "backendSupabaseUrl": false,
    "publishableKey": true,
    "anonKey": false,
    "runtimeSettingsSqlInputs": false,
    "serviceRoleKey": false,
    "supabaseAccessToken": false,
    "channelOgUrl": false
  },
  "findings": [
    {
      "severity": "critical",
      "id": "backend-supabase-url-missing",
      "message": "Missing SUPABASE_URL for backend cron/runtime settings. See docs/supabase-deploy-env-setup.md."
    },
    {
      "severity": "critical",
      "id": "supabase-access-token-missing",
      "message": "Missing SUPABASE_ACCESS_TOKEN for production migration-history verification. See docs/supabase-deploy-env-setup.md."
    },
    {
      "severity": "critical",
      "id": "anon-key-missing",
      "message": "Missing SUPABASE_ANON_KEY for Edge Function verification and database cron auth. See docs/supabase-deploy-env-setup.md."
    }
  ]
}
```

### Supabase runtime settings SQL

- Command: `node scripts/supabase/runtime-settings-sql.mjs --strict`
- Status: failed
- Failure: exitStatus=1

```text
runtime-settings-sql: Missing Supabase URL. Set SUPABASE_URL or pass --url/--project-ref. See docs/supabase-deploy-env-setup.md.
runtime-settings-sql: Missing anon key. Set SUPABASE_ANON_KEY or pass --anon-key. See docs/supabase-deploy-env-setup.md.
```

### Supabase migration drift report

- Command: `node scripts/supabase/audit-migration-drift.mjs --linked --write-report --allow-duplicate-version=20260429230000 --allow-duplicate-version=20260429240000 --allow-duplicate-version=20260429250000 --allow-duplicate-version=20260429260000 --allow-duplicate-version=20260430020000 --allow-duplicate-version=20260430040000 --allow-duplicate-version=20260430050000 --allow-duplicate-version=20260430060000`
- Status: passed

```json
{
  "localMigrations": 1048,
  "invalidFilenames": 0,
  "duplicateVersions": 0,
  "allowedDuplicateVersions": 0,
  "newDuplicateVersions": 0,
  "duplicateHashes": 0,
  "supabaseAccessToken": false,
  "remoteMigrations": 0,
  "matchedVersions": 0,
  "linkedHistoryDisconnected": false,
  "localOnlyPending": 1048,
  "remoteOnlyMissingLocally": 0,
  "nearTimestampPairsWithinFiveSeconds": 0,
  "nearTimestampPairsWithinOneMinute": 0,
  "oneToOneReconciliationCandidatesWithinFiveSeconds": 0,
  "oneToOneReconciliationCandidatesWithinOneMinute": 0,
  "sharedMigrationCalendarDays": 0,
  "reconciliationCandidates": 0,
  "unmatchedLocalAfterReconciliationCandidates": 1048,
  "unmatchedRemoteAfterReconciliationCandidates": 0,
  "unmatchedLocalAfterRemoteRange": 0,
  "unmatchedRemoteBeforeLocalRange": 0,
  "pendingLocalRiskGates": {
    "createsTables": 0,
    "withoutRls": 0,
    "withoutGrants": 0,
    "sequenceWithoutGrants": 0,
    "definerWithoutSearchPath": 0,
    "hardcodedUrls": 0,
    "legacyAnonJwts": 0
  },
  "pendingLocalRiskGateFailures": 0,
  "pendingLocalRiskGateDetails": {
    "withoutRls": 0,
    "withoutGrants": 0,
    "sequenceWithoutGrants": 0,
    "definerWithoutSearchPath": 0,
    "hardcodedUrls": 0,
    "legacyAnonJwts": 0
  },
  "pendingRisk": {
    "high": 973,
    "medium": 53,
    "low": 22
  },
  "report": "docs/supabase-migration-drift-report.md",
  "reconciliationCandidatesReport": "docs/supabase-migration-reconciliation-candidates.csv",
  "unmatchedLocalReport": "docs/supabase-migration-unmatched-local.csv",
  "unmatchedRemoteReport": "docs/supabase-migration-unmatched-remote.csv",
  "reconciliationPlan": "docs/supabase-migration-reconciliation-plan.md",
  "pendingLocalReviewReport": "docs/supabase-migration-pending-local-review.csv",
  "reconciliationRepairDraft": "docs/supabase-migration-reconciliation-repair-draft.sql",
  "remoteError": "Initialising login role...\n2026/05/31 21:21:28 Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable."
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 0,
  "warnings": 0,
  "localMigrations": 1048,
  "duplicateVersions": 0,
  "allowedDuplicateVersions": 0,
  "newDuplicateVersions": 0,
  "duplicateHashes": 0,
  "unsupportedPg17Extensions": 0,
  "publicTablesNeedingRlsReview": 0,
  "dataApiGrantReviewCandidates": 0,
  "viewsNeedingSecurityInvokerReview": 0,
  "securityDefinerFilesNeedingSearchPathReview": 0,
  "hardcodedSupabaseUrls": 35,
  "hardcodedScheduledFunctionUrls": 19,
  "cronFunctionUrlRemediation": true,
  "hardcodedLegacyAnonJwts": 14,
  "hardcodedCronLegacyAnonJwts": 13,
  "cronAnonKeyRemediation": true,
  "cronRemediationRegexIssues": 0,
  "pendingLocalMigrationGates": {
    "createsTables": 0,
    "withoutRls": 0,
    "withoutGrants": 0,
    "sequenceWithoutGrants": 0,
    "definerWithoutSearchPath": 0,
    "hardcodedUrls": 0,
    "legacyAnonJwts": 0
  },
  "supabaseCli": "2.100.0",
  "report": "docs/database-upgrade-readiness-report.md"
}
```

### API readiness

- Command: `node scripts/security/api-readiness-check.mjs --write-report`
- Status: passed

```json
{
  "critical": 0,
  "warnings": 1,
  "edgeFunctions": {
    "total": 397,
    "highRisk": 134,
    "withSecurity": 397,
    "strictCors": 397,
    "methodGated": 397,
    "serviceRole": 340,
    "highRiskMissingSecurity": [],
    "highRiskMissingMethodGate": [],
    "missingWithSecurity": [],
    "missingStrictCors": [],
    "missingMethodGate": [],
    "wildcardCors": [],
    "looseRouteBacklog": []
  },
  "migrationDrift": {
    "local": 1048,
    "duplicateVersions": 0,
    "allowedDuplicateVersions": 0,
    "newDuplicateVersions": 0,
    "remote": 0,
    "matched": 0,
    "localOnly": 1048,
    "remoteOnly": 0,
    "nearFiveSeconds": 0,
    "nearOneMinute": 0,
    "oneToOneNearFiveSeconds": 0,
    "oneToOneNearOneMinute": 0,
    "unmatchedLocalAfterCandidates": 1048,
    "unmatchedRemoteAfterCandidates": 0,
    "unmatchedLocalAfterRemoteRange": 0,
    "unmatchedRemoteBeforeLocalRange": 0,
    "pendingCreatesTables": 0,
    "pendingCreatesTablesWithoutRls": 0,
    "pendingCreatesTablesWithoutGrants": 0,
    "pendingSequenceBackedIdsWithoutSequenceGrants": 0,
    "pendingSecurityDefinersWithoutSearchPath": 0,
    "pendingHardcodedSupabaseUrls": 0,
    "pendingLegacyAnonJwts": 0,
    "sharedDays": 0,
    "remoteError": true,
    "currentLocal": 1048
  },
  "operations": {
    "present": true,
    "file": "docs/api-operations-runbook.md",
    "missingTopics": []
  },
  "report": "docs/api-readiness-report.md"
}
```

### Media lazy-load readiness

- Command: `node scripts/performance/media-readiness-check.mjs`
- Status: passed

```text
Media readiness report: 0 issue(s) across 0 file(s).
```

### Production build

- Command: `node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build --logLevel warn`
- Status: passed

## Production Gate

- Strict mode fails on any readiness warning, database blocker, failed command, or unavailable migration history.

## Migration Reconciliation

- Candidate mappings: 0
- High-confidence candidates: 0
- Medium-confidence candidates: 0
- Unmatched local after candidates: 1048
- Unmatched remote after candidates: 0
- Likely pending local after remote range: 0
- Review order: high-confidence candidate mappings (0) -> medium-confidence candidate mappings (0) -> unmatched local migrations after candidates (1048) -> unmatched remote versions after candidates (0) -> likely pending local migrations after remote range (0)

## Production Blockers

- Failed command: Supabase deploy environment
- Failed command: Supabase runtime settings SQL
- Environment readiness has 3 critical finding(s).
- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- API readiness has 1 warning(s).
- Supabase remote migration history is unavailable (access_token_missing).

## Current Gate Blockers

- Failed command: Supabase deploy environment
- Failed command: Supabase runtime settings SQL
- Environment readiness has 3 critical finding(s).
- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- API readiness has 1 warning(s).
- Supabase remote migration history is unavailable (access_token_missing).

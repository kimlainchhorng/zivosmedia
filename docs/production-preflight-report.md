# Production Preflight Report

Generated: 2026-05-26T21:29:39.608Z
Mode: strict

## Summary

- API readiness: critical=0, warnings=3
- Database readiness: blockers=1, warnings=1
- Migration drift: duplicateVersions=8, allowedDuplicateVersions=8, newDuplicateVersions=0, remoteError=yes

## Steps

### Secret scan

- Command: `node scripts/security/check-secrets.mjs`
- Status: passed

### Supabase migration drift report

- Command: `node scripts/supabase/audit-migration-drift.mjs --linked --write-report --allow-duplicate-version=20260429230000 --allow-duplicate-version=20260429240000 --allow-duplicate-version=20260429250000 --allow-duplicate-version=20260429260000 --allow-duplicate-version=20260430020000 --allow-duplicate-version=20260430040000 --allow-duplicate-version=20260430050000 --allow-duplicate-version=20260430060000`
- Status: passed

```json
{
  "localMigrations": 831,
  "invalidFilenames": 0,
  "duplicateVersions": 8,
  "allowedDuplicateVersions": 8,
  "newDuplicateVersions": 0,
  "duplicateHashes": 0,
  "remoteMigrations": 0,
  "matchedVersions": 0,
  "localOnlyPending": 831,
  "remoteOnlyMissingLocally": 0,
  "pendingRisk": {
    "high": 763,
    "medium": 50,
    "low": 18
  },
  "report": "docs\\supabase-migration-drift-report.md",
  "remoteError": "Initialising login role...\n2026/05/26 16:27:07 Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable."
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 1,
  "warnings": 1,
  "localMigrations": 831,
  "duplicateVersions": 8,
  "allowedDuplicateVersions": 8,
  "newDuplicateVersions": 0,
  "duplicateHashes": 0,
  "unsupportedPg17Extensions": 0,
  "publicTablesNeedingRlsReview": 0,
  "dataApiGrantReviewCandidates": 92,
  "viewsNeedingSecurityInvokerReview": 0,
  "securityDefinerFilesNeedingSearchPathReview": 0,
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
  "warnings": 3,
  "edgeFunctions": {
    "total": 262,
    "highRisk": 112,
    "withSecurity": 116,
    "strictCors": 99,
    "serviceRole": 212,
    "highRiskMissingSecurity": [
      "supabase/functions/twilio-webhook/index.ts"
    ]
  },
  "migrationDrift": {
    "local": 831,
    "duplicateVersions": 8,
    "allowedDuplicateVersions": 8,
    "newDuplicateVersions": 0,
    "remote": 0,
    "matched": 0,
    "localOnly": 831,
    "remoteOnly": 0,
    "remoteError": true,
    "currentLocal": 831
  },
  "report": "docs/api-readiness-report.md"
}
```

### Media lazy-load readiness

- Command: `node scripts/performance/media-readiness-check.mjs`
- Status: failed

```text
node:internal/child_process:1143
    result.error = new ErrnoException(result.error, 'spawnSync ' + options.file);
                   ^

<ref *1> Error: spawnSync rg ENOENT
    at Object.spawnSync (node:internal/child_process:1143:20)
    at spawnSync (node:child_process:911:24)
    at execFileSync (node:child_process:954:15)
    at file:///C:/Users/chhor/Documents/GitHub/myzivo/scripts/performance/media-readiness-check.mjs:9:15
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:633:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  errno: -4058,
  code: 'ENOENT',
  syscall: 'spawnSync rg',
  path: 'rg',
  spawnargs: [ '--files', 'src', '-g', '*.tsx' ],
  error: [Circular *1],
  status: null,
  signal: null,
  output: null,
  pid: 0,
  stdout: undefined,
  stderr: undefined
}

Node.js v24.16.0
```

### TypeScript type-check

- Command: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo.app -p tsconfig.app.json`
- Status: failed

## Production Gate

- Strict mode fails on any readiness warning, database blocker, failed command, or unavailable migration history.

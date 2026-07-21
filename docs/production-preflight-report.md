# Production Preflight Report

Generated: 2026-07-21T17:42:47.333Z
Mode: soft
Options: strict=no, skipBuild=no, skipTypeCheck=yes

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
- API readiness: critical=2, warnings=21
- Environment readiness: critical=2, warnings=1
- Runtime settings SQL: failed
- Database readiness: blockers=1, warnings=1
- Edge Function deploy contracts: failures=0
- Edge Function slot readiness: mode=local-plus-known-live-gap, missingLiveCritical=6, warnings=1, failures=0
- Edge Function browser gates: gatedFunctions=6, failures=2
- Supabase auth: envAccessToken=yes, driftAccessToken=yes
- Supabase remote migration history read: no
- Supabase remote migration history status: unavailable
- Migration drift: duplicateVersions=6, allowedDuplicateVersions=0, newDuplicateVersions=6, linkedHistoryDisconnected=no, remoteError=yes
- Reconciliation: candidates=0, highConfidence=0, mediumConfidence=0, unmatchedLocal=1132, unmatchedRemote=0, likelyPendingLocal=0
- Reconciliation review order: high-confidence candidate mappings (0) -> medium-confidence candidate mappings (0) -> unmatched local migrations after candidates (1132) -> unmatched remote versions after candidates (0) -> likely pending local migrations after remote range (0)
- Pending migration gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Steps

### Security scan

- Command: `npm run security:scan`
- Status: passed

### Supabase deploy environment

- Command: `node scripts/deploy/env-preflight.mjs`
- Status: failed
- Failure: exitStatus=1

```json
{
  "critical": 2,
  "warnings": 1,
  "checked": {
    "viteSupabaseUrl": false,
    "zivoSoftwareSupabaseUrl": false,
    "zivoSoftwarePublishableKey": true,
    "zivoDomainSummaryBridgeKeys": false,
    "zivoSoftwareDomainRequired": false,
    "backendSupabaseUrl": false,
    "publishableKey": false,
    "anonKey": false,
    "runtimeSettingsSqlInputs": false,
    "serviceRoleKey": false,
    "supabaseAccessToken": true,
    "channelOgUrl": false
  },
  "findings": [
    {
      "severity": "critical",
      "id": "VITE_SUPABASE_URL-missing",
      "message": "Missing VITE_SUPABASE_URL."
    },
    {
      "severity": "warning",
      "id": "channel-og-unconfigured",
      "message": "Channel share previews need SUPABASE_URL or CHANNEL_OG_FUNCTION_URL."
    },
    {
      "severity": "critical",
      "id": "VITE_SUPABASE_PUBLISHABLE_KEY-missing",
      "message": "Missing VITE_SUPABASE_PUBLISHABLE_KEY."
    }
  ]
}
```

### Supabase runtime settings SQL

- Command: `node scripts/supabase/runtime-settings-sql.mjs`
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
  "localMigrations": 1132,
  "invalidFilenames": 0,
  "duplicateVersions": 6,
  "allowedDuplicateVersions": 0,
  "newDuplicateVersions": 6,
  "duplicateHashes": 0,
  "supabaseAccessToken": true,
  "remoteMigrations": 0,
  "matchedVersions": 0,
  "linkedHistoryDisconnected": false,
  "localOnlyPending": 1132,
  "remoteOnlyMissingLocally": 0,
  "nearTimestampPairsWithinFiveSeconds": 0,
  "nearTimestampPairsWithinOneMinute": 0,
  "oneToOneReconciliationCandidatesWithinFiveSeconds": 0,
  "oneToOneReconciliationCandidatesWithinOneMinute": 0,
  "sharedMigrationCalendarDays": 0,
  "reconciliationCandidates": 0,
  "unmatchedLocalAfterReconciliationCandidates": 1132,
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
    "high": 1053,
    "medium": 56,
    "low": 23
  },
  "report": "docs\\supabase-migration-drift-report.md",
  "reconciliationCandidatesReport": "docs\\supabase-migration-reconciliation-candidates.csv",
  "unmatchedLocalReport": "docs\\supabase-migration-unmatched-local.csv",
  "unmatchedRemoteReport": "docs\\supabase-migration-unmatched-remote.csv",
  "reconciliationPlan": "docs\\supabase-migration-reconciliation-plan.md",
  "pendingLocalReviewReport": "docs\\supabase-migration-pending-local-review.csv",
  "reconciliationRepairDraft": "docs\\supabase-migration-reconciliation-repair-draft.sql",
  "remoteError": "Initialising login role...\n\u001b[31munexpected login role status 401: {\"message\":\"Unauthorized\"}\u001b[39m\nTry rerunning the command with --debug to troubleshoot the error."
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 1,
  "warnings": 1,
  "localMigrations": 1132,
  "duplicateVersions": 6,
  "allowedDuplicateVersions": 0,
  "newDuplicateVersions": 6,
  "duplicateHashes": 0,
  "unsupportedPg17Extensions": 0,
  "publicTablesNeedingRlsReview": 0,
  "dataApiGrantReviewCandidates": 11,
  "viewsNeedingSecurityInvokerReview": 0,
  "securityDefinerFilesNeedingSearchPathReview": 0,
  "hardcodedSupabaseUrls": 36,
  "hardcodedScheduledFunctionUrls": 18,
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
  "supabaseCli": "2.109.1",
  "report": "docs/database-upgrade-readiness-report.md"
}
```

### API readiness

- Command: `node scripts/security/api-readiness-check.mjs --write-report`
- Status: passed

```json
{
  "critical": 2,
  "warnings": 21,
  "edgeFunctions": {
    "total": 457,
    "highRisk": 170,
    "withSecurity": 457,
    "strictCors": 456,
    "methodGated": 456,
    "serviceRole": 351,
    "highRiskMissingSecurity": [],
    "highRiskMissingMethodGate": [
      "supabase/functions/zivo-wallet-ext/index.ts"
    ],
    "missingWithSecurity": [],
    "missingStrictCors": [
      "supabase/functions/zivo-wallet-ext/index.ts"
    ],
    "missingMethodGate": [
      "supabase/functions/zivo-wallet-ext/index.ts"
    ],
    "wildcardCors": [],
    "looseRouteBacklog": [
      "supabase/functions/zivo-wallet-ext/index.ts"
    ]
  },
  "migrationDrift": {
    "local": 1132,
    "duplicateVersions": 6,
    "allowedDuplicateVersions": 0,
    "newDuplicateVersions": 6,
    "remote": 0,
    "matched": 0,
    "localOnly": 1132,
    "remoteOnly": 0,
    "nearFiveSeconds": 0,
    "nearOneMinute": 0,
    "oneToOneNearFiveSeconds": 0,
    "oneToOneNearOneMinute": 0,
    "unmatchedLocalAfterCandidates": 1132,
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
    "currentLocal": 1132
  },
  "operations": {
    "present": true,
    "file": "docs/api-operations-runbook.md",
    "missingTopics": []
  },
  "report": "docs/api-readiness-report.md"
}
```

### Edge Function deploy contracts

- Command: `node scripts/qa/edge-function-deploy-contracts.mjs`
- Status: passed

```json
{
  "generated": "2026-07-21T17:42:20.530Z",
  "counts": {
    "functions": 7,
    "failures": 0
  },
  "functions": [
    {
      "slug": "analytics-event-track",
      "verifyJwt": false,
      "why": "anonymous browser analytics queues"
    },
    {
      "slug": "notification-manage",
      "verifyJwt": true,
      "why": "user notification read/delete/snooze"
    },
    {
      "slug": "social-notification-manage",
      "verifyJwt": true,
      "why": "social notification create/read state"
    },
    {
      "slug": "push-device-manage",
      "verifyJwt": true,
      "why": "push subscription revoke"
    },
    {
      "slug": "talent-invite-notification",
      "verifyJwt": true,
      "why": "job invite notification creation"
    },
    {
      "slug": "admin-broadcast-notification",
      "verifyJwt": true,
      "why": "admin broadcast notification creation"
    },
    {
      "slug": "mint-sso-handoff",
      "verifyJwt": true,
      "why": "cross-domain SSO one-time token minting"
    }
  ],
  "failures": []
}
```

### Edge Function slot readiness

- Command: `node scripts/qa/edge-function-slot-readiness.mjs --write-report`
- Status: passed

```json
{
  "generated": "2026-07-21T17:42:20.645Z",
  "mode": "local-plus-known-live-gap",
  "counts": {
    "configuredFunctions": 100,
    "localConfiguredFunctions": 100,
    "liveFunctions": null,
    "knownMissingLiveFunctions": 6,
    "criticalFunctions": 7,
    "missingLiveCritical": 6,
    "warnings": 1,
    "failures": 0
  },
  "slotPolicy": {
    "conservativeSlotLimit": 25,
    "source": "Supabase hosted limits are plan-dependent; set SUPABASE_EDGE_FUNCTION_SLOT_LIMIT for the project plan.",
    "deployBlocker": "Do not enable browser calls for a missing live function; resolve plan/spend-cap/function-slot capacity first."
  },
  "knownLiveGap": {
    "path": "docs/qa/edge-function-live-gap-2026-06-03.json",
    "generated": "2026-06-03T21:20:00.000Z",
    "projectId": "slirphzzwcogdbkeicff",
    "missing": [
      "analytics-event-track",
      "notification-manage",
      "social-notification-manage",
      "push-device-manage",
      "talent-invite-notification",
      "admin-broadcast-notification"
    ]
  },
  "readiness": [
    {
      "slug": "analytics-event-track",
      "why": "browser analytics telemetry",
      "verifyJwt": false,
      "configPresent": true,
      "localPresent": true,
      "livePresent": false,
      "browserFeatureFlag": "VITE_ANALYTICS_EVENT_TRACK_ENABLED",
      "envDefaults": {
        ".env.example": "false",
        ".env.deploy.example": "false"
      }
    },
    {
      "slug": "notification-manage",
      "why": "notification read/delete/snooze mutations",
      "verifyJwt": true,
      "configPresent": true,
      "localPresent": true,
      "livePresent": false,
      "browserFeatureFlag": "VITE_NOTIFICATION_MANAGE_ENABLED",
      "envDefaults": {
        ".env.example": "false",
        ".env.deploy.example": "false"
      }
    },
    {
      "slug": "social-notification-manage",
      "why": "social notification mutations",
      "verifyJwt": true,
      "configPresent": true,
      "localPresent": true,
      "livePresent": false,
      "browserFeatureFlag": "VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED",
      "envDefaults": {
        ".env.example": "false",
        ".env.deploy.example": "false"
      }
    },
    {
      "slug": "push-device-manage",
      "why": "push device revocation",
      "verifyJwt": true,
      "configPresent": true,
      "localPresent": true,
      "livePresent": false,
      "browserFeatureFlag": "VITE_PUSH_DEVICE_MANAGE_ENABLED",
      "envDefaults": {
        ".env.example": "false",
        ".env.deploy.example": "false"
      }
    },
    {
      "slug": "talent-invite-notification",
      "why": "talent invite notification creation",
      "verifyJwt": true,
      "configPresent": true,
      "localPresent": true,
      "livePresent": false,
      "browserFeatureFlag": "VITE_TALENT_INVITE_NOTIFICATION_ENABLED",
      "envDefaults": {
        ".env.example": "false",
        ".env.deploy.example": "false"
      }
    },
    {
      "slug": "admin-broadcast-notification",
      "why": "admin broadcast notification creation",
      "verifyJwt": true,
      "configPresent": true,
      "localPresent": true,
      "livePresent": false,
      "browserFeatureFlag": "VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED",
      "envDefaults": {
        ".env.example": "false",
        ".env.deploy.example": "false"
      }
    },
    {
      "slug": "mint-sso-handoff",
      "why": "cross-domain SSO one-time token minting",
      "verifyJwt": true,
      "configPresent": true,
      "localPresent": true,
      "livePresent": null,
      "browserFeatureFlag": null,
      "envDefaults": null
    }
  ],
  "missingLiveCritical": [
    "analytics-event-track",
    "notification-manage",
    "social-notification-manage",
    "push-device-manage",
    "talent-invite-notification",
    "admin-broadcast-notification"
  ],
  "warnings": [
    "using known live-gap artifact docs/qa/edge-function-live-gap-2026-06-03.json; replace with --live-snapshot after the next Supabase deploy"
  ],
  "failures": []
}
```

### Edge Function browser gates

- Command: `node scripts/qa/edge-function-browser-gates.mjs`
- Status: failed
- Failure: exitStatus=1

```json
{
  "generated": "2026-07-21T17:42:25.800Z",
  "counts": {
    "gatedFunctions": 6,
    "scannedSrcFiles": 2641,
    "failures": 2
  },
  "gatedFunctions": [
    {
      "slug": "analytics-event-track",
      "flag": "VITE_ANALYTICS_EVENT_TRACK_ENABLED",
      "wrapper": "src/lib/analytics.ts",
      "errorName": null
    },
    {
      "slug": "notification-manage",
      "flag": "VITE_NOTIFICATION_MANAGE_ENABLED",
      "wrapper": "src/lib/notifications/notificationManage.ts",
      "errorName": "NotificationManageUnavailableError"
    },
    {
      "slug": "social-notification-manage",
      "flag": "VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED",
      "wrapper": "src/lib/notifications/socialNotificationManage.ts",
      "errorName": "SocialNotificationManageUnavailableError"
    },
    {
      "slug": "push-device-manage",
      "flag": "VITE_PUSH_DEVICE_MANAGE_ENABLED",
      "wrapper": "src/lib/notifications/pushDeviceManage.ts",
      "errorName": "PushDeviceManageUnavailableError"
    },
    {
      "slug": "talent-invite-notification",
      "flag": "VITE_TALENT_INVITE_NOTIFICATION_ENABLED",
      "wrapper": "src/lib/notifications/talentInviteNotification.ts",
      "errorName": "TalentInviteNotificationUnavailableError"
    },
    {
      "slug": "admin-broadcast-notification",
      "flag": "VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED",
      "wrapper": "src/lib/notifications/adminBroadcastNotification.ts",
      "errorName": "AdminBroadcastNotificationUnavailableError"
    }
  ],
  "failures": [
    "notification-manage: src/lib/notifications/notificationManage.ts missing VITE_NOTIFICATION_MANAGE_ENABLED",
    "notification-manage: src/lib/notifications/notificationManage.ts must contain functions.invoke(\"notification-manage\")"
  ]
}
```

### Media lazy-load readiness

- Command: `node scripts/performance/media-readiness-check.mjs`
- Status: passed

```text
Media readiness report: 31 issue(s) across 8 file(s).

src\components\admin\marketing\CreateMarketingCampaignWizard.tsx
  59: img missing loading="lazy"/SmartImage
  59: img missing decoding="async"/SmartImage

src\components\admin\store\MediaCropDialog.tsx
  223: img missing loading="lazy"/SmartImage
  223: img missing decoding="async"/SmartImage

src\pages\AITripPlanner.tsx
  270: img missing loading="lazy"/SmartImage
  270: img missing decoding="async"/SmartImage
  446: img missing loading="lazy"/SmartImage
  446: img missing decoding="async"/SmartImage
  802: img missing loading="lazy"/SmartImage
  802: img missing decoding="async"/SmartImage
  849: img missing loading="lazy"/SmartImage
  849: img missing decoding="async"/SmartImage

src\pages\FlightLanding.tsx
  875: img missing loading="lazy"/SmartImage
  875: img missing decoding="async"/SmartImage

src\pages\Signup.tsx
  58: img missing loading="lazy"/SmartImage
  58: img missing decoding="async"/SmartImage
  59: img missing loading="lazy"/SmartImage
  59: img missing decoding="async"/SmartImage
  123: img missing loading="lazy"/SmartImage
  123: img missing decoding="async"/SmartImage
  124: img missing loading="lazy"/SmartImage
  124: img missing decoding="async"/SmartImage

src\pages\ZivoTravelHome.tsx
  633: img missing loading="lazy"/SmartImage
  633: img missing decoding="async"/SmartImage
  759: img missing decoding="async"/SmartImage
  909: img missing decoding="async"/SmartImage
  1005: img missing decoding="async"/SmartImage
  2113: img missing decoding="async"/SmartImage

src\pages\app\BusOperatorConsole.tsx
  1130: img missing loading="lazy"/SmartImage
  1130: img missing decoding="async"/SmartImage

src\pages\business\BusinessLandingPage.tsx
  342: img missing decoding="async"/SmartImage

This command is report-only for now. Move high-traffic surfaces to SmartImage/LazyVideo first, then make it strict.
```

### Production build

- Command: `node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build --logLevel warn`
- Status: passed

## Production Gate

- Soft mode reports readiness blockers but only fails for command/runtime failures.

## Migration Reconciliation

- Candidate mappings: 0
- High-confidence candidates: 0
- Medium-confidence candidates: 0
- Unmatched local after candidates: 1132
- Unmatched remote after candidates: 0
- Likely pending local after remote range: 0
- Review order: high-confidence candidate mappings (0) -> medium-confidence candidate mappings (0) -> unmatched local migrations after candidates (1132) -> unmatched remote versions after candidates (0) -> likely pending local migrations after remote range (0)

## Production Blockers

- Failed command: Supabase deploy environment
- Failed command: Supabase runtime settings SQL
- Failed command: Edge Function browser gates
- API readiness has 2 critical finding(s).
- Environment readiness has 2 critical finding(s).
- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Environment readiness has 1 warning(s).
- API readiness has 21 warning(s).
- Database readiness has 1 blocker(s).
- Database readiness has 1 warning(s).
- Supabase remote migration history is unavailable (unavailable).
- Supabase migrations have 6 unresolved duplicate version(s).

## Current Gate Blockers

- Failed command: Supabase deploy environment
- Failed command: Supabase runtime settings SQL
- Failed command: Edge Function browser gates
- API readiness has 2 critical finding(s).
- Environment readiness has 2 critical finding(s).

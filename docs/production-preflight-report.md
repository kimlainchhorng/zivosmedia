# Production Preflight Report

Generated: 2026-06-11T15:36:56.198Z
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
- API readiness: critical=0, warnings=20
- Environment readiness: critical=0, warnings=0
- Runtime settings SQL: passed
- Database readiness: blockers=1, warnings=1
- Edge Function deploy contracts: failures=0
- Edge Function slot readiness: mode=local-plus-known-live-gap, missingLiveCritical=6, warnings=1, failures=0
- Edge Function browser gates: gatedFunctions=6, failures=0
- Supabase auth: envAccessToken=no, driftAccessToken=no
- Supabase remote migration history read: yes
- Supabase remote migration history status: read
- Migration drift: duplicateVersions=6, allowedDuplicateVersions=0, newDuplicateVersions=6, linkedHistoryDisconnected=no, remoteError=no
- Reconciliation: candidates=616, highConfidence=584, mediumConfidence=32, unmatchedLocal=503, unmatchedRemote=951, likelyPendingLocal=19
- Reconciliation review order: high-confidence candidate mappings (584) -> medium-confidence candidate mappings (32) -> unmatched local migrations after candidates (503) -> unmatched remote versions after candidates (951) -> likely pending local migrations after remote range (19)
- Pending migration gates: createsTables=2, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Steps

### Security scan

- Command: `npm run security:scan`
- Status: passed

### Supabase deploy environment

- Command: `node scripts/deploy/env-preflight.mjs`
- Status: passed

```json
{
  "critical": 0,
  "warnings": 0,
  "checked": {
    "viteSupabaseUrl": true,
    "zivoSoftwareSupabaseUrl": true,
    "zivoSoftwarePublishableKey": true,
    "zivoDomainSummaryBridgeKeys": false,
    "zivoSoftwareDomainRequired": false,
    "backendSupabaseUrl": false,
    "publishableKey": true,
    "anonKey": false,
    "runtimeSettingsSqlInputs": false,
    "serviceRoleKey": false,
    "supabaseAccessToken": false,
    "channelOgUrl": false
  },
  "findings": []
}
```

### Supabase runtime settings SQL

- Command: `node scripts/supabase/runtime-settings-sql.mjs`
- Status: passed

```text
-- Supabase runtime settings for database-side Edge Function calls
-- Review before running in the Supabase SQL editor.
-- Preview mode used VITE_SUPABASE_PUBLISHABLE_KEY; use SUPABASE_ANON_KEY with --strict for production cron auth.
alter database postgres set "app.settings.supabase_url" = 'https://slirphzzwcogdbkeicff.supabase.co';
alter database postgres set "app.settings.supabase_anon_key" = '<redacted: set SUPABASE_ANON_KEY and rerun with --emit-secrets>';
select pg_reload_conf();
```

### Supabase migration drift report

- Command: `node scripts/supabase/audit-migration-drift.mjs --linked --write-report --allow-duplicate-version=20260429230000 --allow-duplicate-version=20260429240000 --allow-duplicate-version=20260429250000 --allow-duplicate-version=20260429260000 --allow-duplicate-version=20260430020000 --allow-duplicate-version=20260430040000 --allow-duplicate-version=20260430050000 --allow-duplicate-version=20260430060000`
- Status: passed

```json
{
  "localMigrations": 1120,
  "invalidFilenames": 0,
  "duplicateVersions": 6,
  "allowedDuplicateVersions": 0,
  "newDuplicateVersions": 6,
  "duplicateHashes": 0,
  "supabaseAccessToken": false,
  "remoteMigrations": 1568,
  "matchedVersions": 1,
  "linkedHistoryDisconnected": false,
  "localOnlyPending": 1119,
  "remoteOnlyMissingLocally": 1567,
  "nearTimestampPairsWithinFiveSeconds": 585,
  "nearTimestampPairsWithinOneMinute": 618,
  "oneToOneReconciliationCandidatesWithinFiveSeconds": 584,
  "oneToOneReconciliationCandidatesWithinOneMinute": 616,
  "sharedMigrationCalendarDays": 91,
  "reconciliationCandidates": 616,
  "unmatchedLocalAfterReconciliationCandidates": 503,
  "unmatchedRemoteAfterReconciliationCandidates": 951,
  "unmatchedLocalAfterRemoteRange": 19,
  "unmatchedRemoteBeforeLocalRange": 0,
  "pendingLocalRiskGates": {
    "createsTables": 2,
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
    "high": 1042,
    "medium": 54,
    "low": 23
  },
  "report": "docs/supabase-migration-drift-report.md",
  "reconciliationCandidatesReport": "docs/supabase-migration-reconciliation-candidates.csv",
  "unmatchedLocalReport": "docs/supabase-migration-unmatched-local.csv",
  "unmatchedRemoteReport": "docs/supabase-migration-unmatched-remote.csv",
  "reconciliationPlan": "docs/supabase-migration-reconciliation-plan.md",
  "pendingLocalReviewReport": "docs/supabase-migration-pending-local-review.csv",
  "reconciliationRepairDraft": "docs/supabase-migration-reconciliation-repair-draft.sql",
  "remoteError": null
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 1,
  "warnings": 1,
  "localMigrations": 1120,
  "duplicateVersions": 6,
  "allowedDuplicateVersions": 0,
  "newDuplicateVersions": 6,
  "duplicateHashes": 0,
  "unsupportedPg17Extensions": 0,
  "publicTablesNeedingRlsReview": 0,
  "dataApiGrantReviewCandidates": 12,
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
    "createsTables": 2,
    "withoutRls": 0,
    "withoutGrants": 0,
    "sequenceWithoutGrants": 0,
    "definerWithoutSearchPath": 0,
    "hardcodedUrls": 0,
    "legacyAnonJwts": 0
  },
  "supabaseCli": "2.105.0",
  "report": "docs/database-upgrade-readiness-report.md"
}
```

### API readiness

- Command: `node scripts/security/api-readiness-check.mjs --write-report`
- Status: passed

```json
{
  "critical": 0,
  "warnings": 20,
  "edgeFunctions": {
    "total": 452,
    "highRisk": 168,
    "withSecurity": 452,
    "strictCors": 452,
    "methodGated": 452,
    "serviceRole": 349,
    "highRiskMissingSecurity": [],
    "highRiskMissingMethodGate": [],
    "missingWithSecurity": [],
    "missingStrictCors": [],
    "missingMethodGate": [],
    "wildcardCors": [],
    "looseRouteBacklog": []
  },
  "migrationDrift": {
    "local": 1120,
    "duplicateVersions": 6,
    "allowedDuplicateVersions": 0,
    "newDuplicateVersions": 6,
    "remote": 1568,
    "matched": 1,
    "localOnly": 1119,
    "remoteOnly": 1567,
    "nearFiveSeconds": 585,
    "nearOneMinute": 618,
    "oneToOneNearFiveSeconds": 584,
    "oneToOneNearOneMinute": 616,
    "unmatchedLocalAfterCandidates": 503,
    "unmatchedRemoteAfterCandidates": 951,
    "unmatchedLocalAfterRemoteRange": 19,
    "unmatchedRemoteBeforeLocalRange": 0,
    "pendingCreatesTables": 2,
    "pendingCreatesTablesWithoutRls": 0,
    "pendingCreatesTablesWithoutGrants": 0,
    "pendingSequenceBackedIdsWithoutSequenceGrants": 0,
    "pendingSecurityDefinersWithoutSearchPath": 0,
    "pendingHardcodedSupabaseUrls": 0,
    "pendingLegacyAnonJwts": 0,
    "sharedDays": 91,
    "remoteError": false,
    "currentLocal": 1120
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
  "generated": "2026-06-11T15:36:46.905Z",
  "counts": {
    "functions": 6,
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
  "generated": "2026-06-11T15:36:46.979Z",
  "mode": "local-plus-known-live-gap",
  "counts": {
    "configuredFunctions": 85,
    "localConfiguredFunctions": 85,
    "liveFunctions": null,
    "knownMissingLiveFunctions": 6,
    "criticalFunctions": 6,
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
- Status: passed

```json
{
  "generated": "2026-06-11T15:36:47.631Z",
  "counts": {
    "gatedFunctions": 6,
    "scannedSrcFiles": 2834,
    "failures": 0
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
  "failures": []
}
```

### Media lazy-load readiness

- Command: `node scripts/performance/media-readiness-check.mjs`
- Status: passed

```text
Media readiness report: 41 issue(s) across 9 file(s).

src/components/admin/marketing/CreateMarketingCampaignWizard.tsx
  59: img missing loading="lazy"/SmartImage
  59: img missing decoding="async"/SmartImage

src/components/admin/store/MediaCropDialog.tsx
  223: img missing loading="lazy"/SmartImage
  223: img missing decoding="async"/SmartImage

src/pages/Login.tsx
  58: img missing loading="lazy"/SmartImage
  58: img missing decoding="async"/SmartImage
  59: img missing loading="lazy"/SmartImage
  59: img missing decoding="async"/SmartImage
  123: img missing loading="lazy"/SmartImage
  123: img missing decoding="async"/SmartImage
  124: img missing loading="lazy"/SmartImage
  124: img missing decoding="async"/SmartImage

src/pages/Signup.tsx
  58: img missing loading="lazy"/SmartImage
  58: img missing decoding="async"/SmartImage
  59: img missing loading="lazy"/SmartImage
  59: img missing decoding="async"/SmartImage
  123: img missing loading="lazy"/SmartImage
  123: img missing decoding="async"/SmartImage
  124: img missing loading="lazy"/SmartImage
  124: img missing decoding="async"/SmartImage

src/pages/ZivoTravelHome.tsx
  633: img missing loading="lazy"/SmartImage
  633: img missing decoding="async"/SmartImage
  759: img missing decoding="async"/SmartImage
  908: img missing decoding="async"/SmartImage
  1003: img missing decoding="async"/SmartImage
  2108: img missing decoding="async"/SmartImage

src/pages/app/BusOperatorConsole.tsx
  1130: img missing loading="lazy"/SmartImage
  1130: img missing decoding="async"/SmartImage

src/pages/business/BusinessLandingPage.tsx
  342: img missing decoding="async"/SmartImage

src/pages/business/BusinessSoftwarePortalPage.tsx
  368: img missing loading="lazy"/SmartImage
  368: img missing decoding="async"/SmartImage
  427: img missing loading="lazy"/SmartImage
  427: img missing decoding="async"/SmartImage
  501: img missing loading="lazy"/SmartImage
  501: img missing decoding="async"/SmartImage
  533: img missing loading="lazy"/SmartImage
  533: img missing decoding="async"/SmartImage

src/pages/channels/ChannelPage.tsx
  430: img missing loading="lazy"/SmartImage
  430: img missing decoding="async"/SmartImage
  459: img missing loading="lazy"/SmartImage
  459: img missing decoding="async"/SmartImage

This command is report-only for now. Move high-traffic surfaces to SmartImage/LazyVideo first, then make it strict.
```

### Production build

- Command: `node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build --logLevel warn`
- Status: passed

## Production Gate

- Soft mode reports readiness blockers but only fails for command/runtime failures.

## Migration Reconciliation

- Candidate mappings: 616
- High-confidence candidates: 584
- Medium-confidence candidates: 32
- Unmatched local after candidates: 503
- Unmatched remote after candidates: 951
- Likely pending local after remote range: 19
- Review order: high-confidence candidate mappings (584) -> medium-confidence candidate mappings (32) -> unmatched local migrations after candidates (503) -> unmatched remote versions after candidates (951) -> likely pending local migrations after remote range (19)

## Production Blockers

- Missing SUPABASE_URL for production backend cron/runtime settings.
- Missing SUPABASE_ANON_KEY for production Edge Function verification and database cron auth.
- Missing SUPABASE_ACCESS_TOKEN for production migration-history verification.
- API readiness has 20 warning(s).
- Database readiness has 1 blocker(s).
- Database readiness has 1 warning(s).
- Supabase migrations have 6 unresolved duplicate version(s).

## Current Gate Blockers

- None

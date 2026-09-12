# Production Preflight Report

Generated: 2026-09-03T18:57:22.081Z
Mode: strict
Options: strict=yes, skipBuild=yes, skipTypeCheck=yes

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
- API readiness: critical=0, warnings=2
- Environment readiness: critical=0, warnings=5
- Runtime settings SQL: passed
- Database readiness: blockers=0, warnings=1
- Edge Function deploy contracts: failures=0
- Edge Function slot readiness: mode=local-plus-live-snapshot, missingLiveCritical=3, warnings=1, failures=0
- Edge Function browser gates: gatedFunctions=6, failures=0
- Supabase auth: envAccessToken=yes, driftAccessToken=yes
- Supabase remote migration history read: yes
- Supabase remote migration history status: read
- Migration drift: duplicateVersions=6, allowedDuplicateVersions=6, newDuplicateVersions=0, linkedHistoryDisconnected=no, remoteError=no
- Reconciliation: candidates=617, highConfidence=584, mediumConfidence=33, unmatchedLocal=546, unmatchedRemote=995, likelyPendingLocal=0
- Reconciliation review order: high-confidence candidate mappings (584) -> medium-confidence candidate mappings (33) -> unmatched local migrations after candidates (546) -> unmatched remote versions after candidates (995) -> likely pending local migrations after remote range (0)
- Pending migration gates: createsTables=0, withoutRls=0, withoutGrants=0, sequenceWithoutGrants=0, definerWithoutSearchPath=0, hardcodedUrls=0, legacyAnonJwts=0

## Steps

### Security scan

- Command: `npm run security:scan`
- Status: failed
- Failure: exitStatus=1

### Supabase deploy environment

- Command: `node scripts/deploy/env-preflight.mjs --strict`
- Status: failed
- Failure: exitStatus=1

```json
{
  "critical": 0,
  "warnings": 5,
  "checked": {
    "viteSupabaseUrl": true,
    "zivoRideAppUrl": true,
    "zivoSoftwareSupabaseUrl": true,
    "zivoSoftwarePublishableKey": true,
    "zivoDomainSummaryBridgeKeys": true,
    "zivoSoftwareDomainRequired": true,
    "backendSupabaseUrl": true,
    "publishableKey": true,
    "anonKey": true,
    "runtimeSettingsSqlInputs": true,
    "serviceRoleKey": false,
    "supabaseAccessToken": true,
    "channelOgUrl": false
  },
  "findings": [
    {
      "severity": "warning",
      "id": "VITE_SUPABASE_PUBLISHABLE_KEY-legacy",
      "message": "VITE_SUPABASE_PUBLISHABLE_KEY is a legacy JWT anon key; prefer sb_publishable."
    },
    {
      "severity": "warning",
      "id": "VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY-legacy",
      "message": "VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY is a legacy JWT anon key; prefer sb_publishable."
    },
    {
      "severity": "warning",
      "id": "ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY-legacy",
      "message": "ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY is a legacy JWT anon key; prefer sb_publishable."
    },
    {
      "severity": "warning",
      "id": "ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY-legacy",
      "message": "ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY is a legacy JWT anon key; prefer sb_publishable."
    },
    {
      "severity": "warning",
      "id": "ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY-legacy",
      "message": "ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY is a legacy JWT anon key; prefer sb_publishable."
    }
  ]
}
```

### Supabase runtime settings SQL

- Command: `node scripts/supabase/runtime-settings-sql.mjs --strict`
- Status: passed

```text
-- Supabase runtime settings for database-side Edge Function calls
-- Review before running in the Supabase SQL editor.
alter database postgres set "app.settings.supabase_url" = 'https://slirphzzwcogdbkeicff.supabase.co';
alter database postgres set "app.settings.supabase_anon_key" = '<redacted: set SUPABASE_ANON_KEY and rerun with --emit-secrets>';
select pg_reload_conf();
```

### Supabase migration drift report

- Command: `node scripts/supabase/audit-migration-drift.mjs --linked --write-report --allow-duplicate-version=20260429230000 --allow-duplicate-version=20260429240000 --allow-duplicate-version=20260429250000 --allow-duplicate-version=20260429260000 --allow-duplicate-version=20260430020000 --allow-duplicate-version=20260430040000 --allow-duplicate-version=20260430050000 --allow-duplicate-version=20260430060000 --allow-duplicate-version=20260601000000 --allow-duplicate-version=20260601194500 --allow-duplicate-version=20260601210000 --allow-duplicate-version=20260601211500 --allow-duplicate-version=20260612000200 --allow-duplicate-version=20260612000300`
- Status: passed

```json
{
  "localMigrations": 1176,
  "invalidFilenames": 0,
  "duplicateVersions": 6,
  "duplicateVersionGroups": [
    {
      "version": "20260601000000",
      "files": [
        "20260601000000_revoke_anon_execute_admin_rpcs.sql",
        "20260601000000_salon_color_formulas.sql"
      ]
    },
    {
      "version": "20260601194500",
      "files": [
        "20260601194500_bus_booking_schema.sql",
        "20260601194500_car_rental_reservations_server_gate.sql"
      ]
    },
    {
      "version": "20260601210000",
      "files": [
        "20260601210000_bus_my_bookings_rpc.sql",
        "20260601210000_car_dealership_expenses_server_gate.sql"
      ]
    },
    {
      "version": "20260601211500",
      "files": [
        "20260601211500_car_dealership_financing_server_gate.sql",
        "20260601211500_fix_bus_rls_store_owner.sql"
      ]
    },
    {
      "version": "20260612000200",
      "files": [
        "20260612000200_add_ar_estimate_issue_and_start_dates.sql",
        "20260612000200_ar_invoices_estimates_mileage.sql"
      ]
    },
    {
      "version": "20260612000300",
      "files": [
        "20260612000300_add_ar_invoice_issue_and_start_dates.sql",
        "20260612000300_ar_invoices_estimates_vsm_fields.sql"
      ]
    }
  ],
  "allowedDuplicateVersions": 6,
  "allowedDuplicateVersionGroups": [
    {
      "version": "20260601000000",
      "files": [
        "20260601000000_revoke_anon_execute_admin_rpcs.sql",
        "20260601000000_salon_color_formulas.sql"
      ]
    },
    {
      "version": "20260601194500",
      "files": [
        "20260601194500_bus_booking_schema.sql",
        "20260601194500_car_rental_reservations_server_gate.sql"
      ]
    },
    {
      "version": "20260601210000",
      "files": [
        "20260601210000_bus_my_bookings_rpc.sql",
        "20260601210000_car_dealership_expenses_server_gate.sql"
      ]
    },
    {
      "version": "20260601211500",
      "files": [
        "20260601211500_car_dealership_financing_server_gate.sql",
        "20260601211500_fix_bus_rls_store_owner.sql"
      ]
    },
    {
      "version": "20260612000200",
      "files": [
        "20260612000200_add_ar_estimate_issue_and_start_dates.sql",
        "20260612000200_ar_invoices_estimates_mileage.sql"
      ]
    },
    {
      "version": "20260612000300",
      "files": [
        "20260612000300_add_ar_invoice_issue_and_start_dates.sql",
        "20260612000300_ar_invoices_estimates_vsm_fields.sql"
      ]
    }
  ],
  "newDuplicateVersions": 0,
  "blockingDuplicateVersionGroups": [],
  "duplicateHashes": 0,
  "duplicateHashGroups": [],
  "supabaseAccessToken": true,
  "remoteMigrations": 1625,
  "matchedVersions": 13,
  "linkedHistoryDisconnected": false,
  "localOnlyPending": 1163,
  "remoteOnlyMissingLocally": 1612,
  "nearTimestampPairsWithinFiveSeconds": 585,
  "nearTimestampPairsWithinOneMinute": 619,
  "oneToOneReconciliationCandidatesWithinFiveSeconds": 584,
  "oneToOneReconciliationCandidatesWithinOneMinute": 617,
  "sharedMigrationCalendarDays": 95,
  "reconciliationCandidates": 617,
  "unmatchedLocalAfterReconciliationCandidates": 546,
  "unmatchedRemoteAfterReconciliationCandidates": 995,
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
    "high": 1082,
    "medium": 58,
    "low": 23
  },
  "report": "docs\\supabase-migration-drift-report.md",
  "reconciliationCandidatesReport": "docs\\supabase-migration-reconciliation-candidates.csv",
  "unmatchedLocalReport": "docs\\supabase-migration-unmatched-local.csv",
  "unmatchedRemoteReport": "docs\\supabase-migration-unmatched-remote.csv",
  "reconciliationPlan": "docs\\supabase-migration-reconciliation-plan.md",
  "pendingLocalReviewReport": "docs\\supabase-migration-pending-local-review.csv",
  "reconciliationRepairDraft": "docs\\supabase-migration-reconciliation-repair-draft.sql",
  "remoteError": null
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 0,
  "warnings": 1,
  "localMigrations": 1176,
  "duplicateVersions": 6,
  "allowedDuplicateVersions": 6,
  "newDuplicateVersions": 0,
  "duplicateHashes": 0,
  "unsupportedPg17Extensions": 0,
  "publicTablesNeedingRlsReview": 0,
  "dataApiGrantReviewCandidates": 0,
  "viewsNeedingSecurityInvokerReview": 1,
  "securityDefinerFilesNeedingSearchPathReview": 0,
  "hardcodedSupabaseUrls": 37,
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
  "supabaseCli": "2.116.0",
  "report": "docs/database-upgrade-readiness-report.md"
}
```

### API readiness

- Command: `node scripts/security/api-readiness-check.mjs --write-report`
- Status: passed

```json
{
  "critical": 0,
  "warnings": 2,
  "edgeFunctions": {
    "total": 466,
    "highRisk": 177,
    "withSecurity": 466,
    "strictCors": 466,
    "methodGated": 466,
    "serviceRole": 351,
    "highRiskMissingSecurity": [],
    "highRiskMissingMethodGate": [],
    "missingWithSecurity": [],
    "missingStrictCors": [],
    "missingMethodGate": [],
    "wildcardCors": [],
    "looseRouteBacklog": []
  },
  "migrationDrift": {
    "local": 1176,
    "duplicateVersions": 6,
    "allowedDuplicateVersions": 6,
    "newDuplicateVersions": 0,
    "remote": 1625,
    "matched": 13,
    "localOnly": 1163,
    "remoteOnly": 1612,
    "nearFiveSeconds": 585,
    "nearOneMinute": 619,
    "oneToOneNearFiveSeconds": 584,
    "oneToOneNearOneMinute": 617,
    "unmatchedLocalAfterCandidates": 546,
    "unmatchedRemoteAfterCandidates": 995,
    "unmatchedLocalAfterRemoteRange": 0,
    "unmatchedRemoteBeforeLocalRange": 0,
    "pendingCreatesTables": 0,
    "pendingCreatesTablesWithoutRls": 0,
    "pendingCreatesTablesWithoutGrants": 0,
    "pendingSequenceBackedIdsWithoutSequenceGrants": 0,
    "pendingSecurityDefinersWithoutSearchPath": 0,
    "pendingHardcodedSupabaseUrls": 0,
    "pendingLegacyAnonJwts": 0,
    "sharedDays": 95,
    "remoteError": false,
    "currentLocal": 1176,
    "mcpHistory": {
      "file": "docs/supabase-mcp-migration-history-report.json",
      "valid": false,
      "source": "supabase-mcp",
      "projectRef": "slirphzzwcogdbkeicff",
      "generated": "2026-08-30T23:51:18Z",
      "localMigrations": 1166,
      "remoteMigrations": 1622,
      "firstRemoteVersion": "20260126182059",
      "latestRemoteVersion": "20260830180554",
      "verifiedVersions": [
        "20260722192749",
        "20260722193417",
        "20260722193446",
        "20260830165252",
        "20260830165904",
        "20260830174518",
        "20260830180554"
      ]
    }
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
  "generated": "2026-09-03T18:57:06.536Z",
  "counts": {
    "functions": 9,
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
    },
    {
      "slug": "zivosmedia-auth-issue-code",
      "verifyJwt": true,
      "why": "central PKCE authorization-code issuance"
    },
    {
      "slug": "zivosmedia-auth-validate-code",
      "verifyJwt": false,
      "why": "server-to-server client-secret + PKCE exchange"
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
  "generated": "2026-09-03T18:57:06.699Z",
  "mode": "local-plus-live-snapshot",
  "counts": {
    "configuredFunctions": 147,
    "localConfiguredFunctions": 147,
    "liveFunctions": 528,
    "knownMissingLiveFunctions": 0,
    "criticalFunctions": 10,
    "missingLiveCritical": 3,
    "warnings": 1,
    "failures": 0
  },
  "slotPolicy": {
    "conservativeSlotLimit": 25,
    "source": "Supabase hosted limits are plan-dependent; set SUPABASE_EDGE_FUNCTION_SLOT_LIMIT for the project plan.",
    "deployBlocker": "Do not enable browser calls for a missing live function; resolve plan/spend-cap/function-slot capacity first."
  },
  "knownLiveGap": null,
  "readiness": [
    {
      "slug": "analytics-event-track",
      "why": "browser analytics telemetry",
      "verifyJwt": false,
      "configPresent": true,
      "configVerifyJwt": false,
      "localPresent": true,
      "livePresent": false,
      "liveVerifyJwt": null,
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
      "configVerifyJwt": true,
      "localPresent": true,
      "livePresent": true,
      "liveVerifyJwt": true,
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
      "configVerifyJwt": true,
      "localPresent": true,
      "livePresent": true,
      "liveVerifyJwt": true,
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
      "configVerifyJwt": true,
      "localPresent": true,
      "livePresent": true,
      "liveVerifyJwt": true,
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
      "configVerifyJwt": true,
      "localPresent": true,
      "livePresent": false,
      "liveVerifyJwt": null,
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
      "configVerifyJwt": true,
      "localPresent": true,
      "livePresent": false,
      "liveVerifyJwt": null,
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
      "configVerifyJwt": true,
      "localPresent": true,
      "livePresent": true,
      "liveVerifyJwt": true,
      "browserFeatureFlag": null,
      "envDefaults": null
    },
    {
      "slug": "supplier-proxy",
      "why": "authenticated, non-forwarding supplier compatibility tombstone",
      "verifyJwt": true,
      "configPresent": true,
      "configVerifyJwt": true,
      "localPresent": true,
      "livePresent": true,
      "liveVerifyJwt": true,
      "browserFeatureFlag": null,
      "envDefaults": null
    },
    {
      "slug": "send-transactional-email",
      "why": "service-key-only email delivery with handler-owned authorization",
      "verifyJwt": false,
      "configPresent": true,
      "configVerifyJwt": false,
      "localPresent": true,
      "livePresent": true,
      "liveVerifyJwt": false,
      "browserFeatureFlag": null,
      "envDefaults": null
    },
    {
      "slug": "software-subscription-intent",
      "why": "public checkout bootstrap with handler-owned authorization",
      "verifyJwt": false,
      "configPresent": true,
      "configVerifyJwt": false,
      "localPresent": true,
      "livePresent": true,
      "liveVerifyJwt": false,
      "browserFeatureFlag": null,
      "envDefaults": null
    }
  ],
  "missingLiveCritical": [
    "analytics-event-track",
    "talent-invite-notification",
    "admin-broadcast-notification"
  ],
  "warnings": [
    "live snapshot has 528 functions, at or above conservative slot limit 25"
  ],
  "failures": []
}
```

### Edge Function browser gates

- Command: `node scripts/qa/edge-function-browser-gates.mjs`
- Status: passed

```json
{
  "generated": "2026-09-03T18:57:20.623Z",
  "counts": {
    "gatedFunctions": 6,
    "scannedSrcFiles": 2913,
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
Media readiness report: 2 issue(s) across 1 file(s).

src\pages\app\ServicesPage.tsx
  508: img missing loading="lazy"/SmartImage
  508: img missing decoding="async"/SmartImage

This command is report-only for now. Move high-traffic surfaces to SmartImage/LazyVideo first, then make it strict.
```

## Production Gate

- Strict mode fails on any readiness warning, database blocker, failed command, or unavailable migration history.

## Migration Reconciliation

- Candidate mappings: 617
- High-confidence candidates: 584
- Medium-confidence candidates: 33
- Unmatched local after candidates: 546
- Unmatched remote after candidates: 995
- Likely pending local after remote range: 0
- Review order: high-confidence candidate mappings (584) -> medium-confidence candidate mappings (33) -> unmatched local migrations after candidates (546) -> unmatched remote versions after candidates (995) -> likely pending local migrations after remote range (0)

## Production Blockers

- Failed command: Security scan
- Failed command: Supabase deploy environment
- Environment readiness has 5 warning(s).
- API readiness has 2 warning(s).
- Database readiness has 1 warning(s).

## Current Gate Blockers

- Failed command: Security scan
- Failed command: Supabase deploy environment
- Environment readiness has 5 warning(s).
- API readiness has 2 warning(s).
- Database readiness has 1 warning(s).

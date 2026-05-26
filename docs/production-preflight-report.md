# Production Preflight Report

Generated: 2026-05-26T20:15:32.214Z
Mode: strict

## Summary

- API readiness: critical=0, warnings=4
- Database readiness: blockers=2, warnings=1
- Migration drift: duplicateVersions=24, allowedDuplicateVersions=8, newDuplicateVersions=16, remoteError=no

## Steps

### Secret scan

- Command: `node scripts/security/check-secrets.mjs`
- Status: passed

### Supabase migration drift report

- Command: `node scripts/supabase/audit-migration-drift.mjs --linked --write-report --allow-duplicate-version=20260429230000 --allow-duplicate-version=20260429240000 --allow-duplicate-version=20260429250000 --allow-duplicate-version=20260429260000 --allow-duplicate-version=20260430020000 --allow-duplicate-version=20260430040000 --allow-duplicate-version=20260430050000 --allow-duplicate-version=20260430060000`
- Status: passed

```json
{
  "localMigrations": 830,
  "invalidFilenames": 0,
  "duplicateVersions": 24,
  "allowedDuplicateVersions": 8,
  "newDuplicateVersions": 16,
  "duplicateHashes": 0,
  "remoteMigrations": 1409,
  "matchedVersions": 0,
  "localOnlyPending": 830,
  "remoteOnlyMissingLocally": 1409,
  "pendingRisk": {
    "high": 762,
    "medium": 50,
    "low": 18
  },
  "report": "docs\\supabase-migration-drift-report.md",
  "remoteError": null
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 2,
  "warnings": 1,
  "localMigrations": 830,
  "duplicateVersions": 24,
  "allowedDuplicateVersions": 8,
  "newDuplicateVersions": 16,
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
  "warnings": 4,
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
    "local": 830,
    "duplicateVersions": 24,
    "allowedDuplicateVersions": 8,
    "newDuplicateVersions": 16,
    "remote": 1409,
    "matched": 0,
    "localOnly": 830,
    "remoteOnly": 1409,
    "remoteError": false,
    "currentLocal": 830
  },
  "report": "docs/api-readiness-report.md"
}
```

### Media lazy-load readiness

- Command: `node scripts/performance/media-readiness-check.mjs`
- Status: passed

```text
Media readiness report: 503 issue(s) across 150 file(s).

src\components\admin\store\cafe\CafeBaristasSection.tsx
  125: img missing loading="lazy"/SmartImage
  125: img missing decoding="async"/SmartImage

src\components\admin\store\cafe\CafeMenuSection.tsx
  528: img missing loading="lazy"/SmartImage
  528: img missing decoding="async"/SmartImage
  674: img missing loading="lazy"/SmartImage
  674: img missing decoding="async"/SmartImage

src\components\admin\store\cafe\CafeTablesSection.tsx
  158: img missing loading="lazy"/SmartImage
  158: img missing decoding="async"/SmartImage

src\components\admin\store\car-dealership\CarDealershipInventorySection.tsx
  142: img missing loading="lazy"/SmartImage
  142: img missing decoding="async"/SmartImage
  226: img missing loading="lazy"/SmartImage
  226: img missing decoding="async"/SmartImage
  301: img missing decoding="async"/SmartImage
  751: img missing decoding="async"/SmartImage

src\components\admin\store\car-dealership\VehiclePhotoManager.tsx
  149: img missing decoding="async"/SmartImage

src\components\admin\store\car-rental\CarRentalCustomersSection.tsx
  345: img missing loading="lazy"/SmartImage
  345: img missing decoding="async"/SmartImage
  351: img missing loading="lazy"/SmartImage
  351: img missing decoding="async"/SmartImage

src\components\admin\store\car-rental\CarRentalFleetSection.tsx
  484: img missing loading="lazy"/SmartImage
  484: img missing decoding="async"/SmartImage
  670: img missing loading="lazy"/SmartImage
  670: img missing decoding="async"/SmartImage

src\components\admin\store\car-rental\CarRentalReturnsSection.tsx
  376: img missing loading="lazy"/SmartImage
  376: img missing decoding="async"/SmartImage

src\components\admin\store\salon\SalonServiceMenuSection.tsx
  295: img missing decoding="async"/SmartImage
  494: img missing decoding="async"/SmartImage

src\components\admin\store\salon\SalonStylistsSection.tsx
  245: img missing loading="lazy"/SmartImage
  245: img missing decoding="async"/SmartImage

src\pages\FavoritesPage.tsx
  157: img missing decoding="async"/SmartImage

src\pages\FlightResults.tsx
  1059: img missing loading="lazy"/SmartImage
  1059: img missing decoding="async"/SmartImage

src\pages\FriendRequestsPage.tsx
  189: img missing decoding="async"/SmartImage
  229: img missing decoding="async"/SmartImage

src\pages\GifLibraryPage.tsx
  266: img missing decoding="async"/SmartImage
  317: img missing decoding="async"/SmartImage

src\pages\GoLivePage.tsx
  1443: img missing loading="lazy"/SmartImage
  1443: img missing decoding="async"/SmartImage
  1785: img missing loading="lazy"/SmartImage
  1785: img missing decoding="async"/SmartImage
  1978: img missing loading="lazy"/SmartImage
  1978: img missing decoding="async"/SmartImage
  2371: img missing loading="lazy"/SmartImage
  2371: img missing decoding="async"/SmartImage
  2446: img missing loading="lazy"/SmartImage
  2446: img missing decoding="async"/SmartImage
  2491: img missing loading="lazy"/SmartImage
  2491: img missing decoding="async"/SmartImage
  ... 6 more

src\pages\GroceryMarketplace.tsx
  72: img missing loading="lazy"/SmartImage
  72: img missing decoding="async"/SmartImage
  135: img missing loading="lazy"/SmartImage
  135: img missing decoding="async"/SmartImage

src\pages\GroceryOrderHistory.tsx
  243: img missing loading="lazy"/SmartImage
  243: img missing decoding="async"/SmartImage

src\pages\GroceryPage.tsx
  105: img missing loading="lazy"/SmartImage
  105: img missing decoding="async"/SmartImage
  131: img missing loading="lazy"/SmartImage
  131: img missing decoding="async"/SmartImage
  179: img missing loading="lazy"/SmartImage
  179: img missing decoding="async"/SmartImage

src\pages\GroceryStorePage.tsx
  126: img missing loading="lazy"/SmartImage
  126: img missing decoding="async"/SmartImage
  179: img missing decoding="async"/SmartImage
  402: img missing loading="lazy"/SmartImage
  402: img missing decoding="async"/SmartImage

src\pages\GroupOrdersPage.tsx
  187: img missing decoding="async"/SmartImage

src\pages\HashtagPage.tsx
  232: img missing decoding="async"/SmartImage

src\pages\HighlightsPage.tsx
  281: img missing decoding="async"/SmartImage
  346: img missing loading="lazy"/SmartImage
  346: img missing decoding="async"/SmartImage
  372: img missing loading="lazy"/SmartImage
  372: img missing decoding="async"/SmartImage

src\pages\HotelLanding.tsx
  118: img missing decoding="async"/SmartImage
  225: img missing decoding="async"/SmartImage

src\pages\ItinerariesPage.tsx
  134: img missing decoding="async"/SmartImage

src\pages\LeaderboardsPage.tsx
  213: img missing decoding="async"/SmartImage

src\pages\LiveStreamPage.tsx
  763: img missing loading="lazy"/SmartImage
  763: img missing decoding="async"/SmartImage
  794: img missing decoding="async"/SmartImage
  805: img missing decoding="async"/SmartImage
  824: img missing loading="lazy"/SmartImage
  824: img missing decoding="async"/SmartImage
  832: img missing loading="lazy"/SmartImage
  832: img missing decoding="async"/SmartImage
  878: img missing loading="lazy"/SmartImage
  878: img missing decoding="async"/SmartImage
  2700: img missing decoding="async"/SmartImage
  2756: img missing decoding="async"/SmartImage

src\pages\Login.tsx
  79: img missing loading="lazy"/SmartImage
  79: img missing decoding="async"/SmartImage
  547: img missing loading="lazy"/SmartImage
  547: img missing decoding="async"/SmartImage

src\pages\MarketplaceCartPage.tsx
  244: img missing decoding="async"/SmartImage

src\pages\MarketplacePage.tsx
  1047: img missing decoding="async"/SmartImage
  1110: img missing decoding="async"/SmartImage
  1142: img missing decoding="async"/SmartImage
  1174: img missing decoding="async"/SmartImage
  1479: img missing decoding="async"/SmartImage
  1998: img missing loading="lazy"/SmartImage
  1998: img missing decoding="async"/SmartImage
  2412: img missing loading="lazy"/SmartImage
  2412: img missing decoding="asyn
...truncated
```

### TypeScript type-check

- Command: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo.app -p tsconfig.app.json`
- Status: failed

### Production build

- Command: `node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build --logLevel warn`
- Status: failed

## Production Gate

- Strict mode fails on any readiness warning, database blocker, failed command, or unavailable migration history.

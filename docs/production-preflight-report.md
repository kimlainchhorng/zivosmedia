# Production Preflight Report

Generated: 2026-05-26T19:22:53.734Z
Mode: strict

## Summary

- API readiness: critical=0, warnings=1
- Database readiness: blockers=1, warnings=0
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
  "localMigrations": 700,
  "invalidFilenames": 0,
  "duplicateVersions": 8,
  "allowedDuplicateVersions": 8,
  "newDuplicateVersions": 0,
  "duplicateHashes": 0,
  "remoteMigrations": 0,
  "matchedVersions": 0,
  "localOnlyPending": 700,
  "remoteOnlyMissingLocally": 0,
  "pendingRisk": {
    "high": 633,
    "medium": 50,
    "low": 17
  },
  "report": "docs\\supabase-migration-drift-report.md",
  "remoteError": "Initialising login role...\n2026/05/26 14:21:51 Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable."
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 1,
  "warnings": 0,
  "localMigrations": 700,
  "duplicateVersions": 8,
  "allowedDuplicateVersions": 8,
  "newDuplicateVersions": 0,
  "duplicateHashes": 0,
  "unsupportedPg17Extensions": 0,
  "publicTablesNeedingRlsReview": 0,
  "dataApiGrantReviewCandidates": 0,
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
  "warnings": 1,
  "edgeFunctions": {
    "total": 258,
    "highRisk": 111,
    "withSecurity": 116,
    "strictCors": 99,
    "serviceRole": 208,
    "highRiskMissingSecurity": []
  },
  "migrationDrift": {
    "local": 700,
    "duplicateVersions": 8,
    "allowedDuplicateVersions": 8,
    "newDuplicateVersions": 0,
    "remote": 0,
    "matched": 0,
    "localOnly": 700,
    "remoteOnly": 0,
    "remoteError": true,
    "currentLocal": 700
  },
  "report": "docs/api-readiness-report.md"
}
```

### Media lazy-load readiness

- Command: `node scripts/performance/media-readiness-check.mjs`
- Status: passed

```text
Media readiness report: 406 issue(s) across 122 file(s).

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
  2412: img missing decoding="async"/SmartImage
  2452: img missing decoding="async"/SmartImage
  2902: img missing decoding="async"/SmartImage

src\pages\MediaLibraryPage.tsx
  168: img missing decoding="async"/SmartImage

src\pages\MentionsPage.tsx
  228: img missing decoding="async"/SmartImage

src\pages\MindfulnessPage.tsx
  140: img missing decoding="async"/SmartImage
  176: img missing decoding="async"/SmartImage

src\pages\MutedBlockedUsersPage.tsx
  156: img missing decoding="async"/SmartImage

src\pages\MyActivityTripPage.tsx
  180: img missing loading="lazy"/SmartImage
  180: img missing decoding="async"/SmartImage

src\pages\MyCarTripPage.tsx
  202: img missing loading="lazy"/SmartImage
  202: img missing decoding="async"/SmartImage

src\pages\MyChallengeSubmissionsPage.tsx
  169: img missing decoding="async"/SmartImage

src\pages\MyPodcastsPage.tsx
  100: img missing decoding="async"/SmartImage

src\pages\MyRestaurantTripPage.tsx
  180: img missing loading="lazy"/SmartImage
  180: img missing decoding="async"/SmartImage

src\pages\MyUnlocksPage.tsx
  208: img missing decoding="async"/SmartImage

src\pages\NetworkPlacesPage.tsx
  346: img missing decoding="async"/SmartImage
  410: img missing decoding="async"/SmartImage

src\pages\P2PMoneyPage.tsx
  178: img missing decoding="async"/SmartImage

src\pages\PartnerLogin.tsx
  168: img missing loading="lazy"/SmartImage
  168: img missing decoding="async"/SmartImage
  383: img missing loading="lazy"/SmartImage
  383: img missing decoding="async"/SmartImage
  397: img missing loading="lazy"/SmartImage
  397: img missing decoding="async"/SmartImage
  398: img missing loading="lazy"/SmartImage
  398: img missing decoding="async"/SmartImage

src\pages\PlaceClicksPage.tsx
  174: img missing decoding="async"/SmartImage

src\pages\PlacesPage.tsx
  175: img missing decoding="async"/SmartImage

src\pages\PlaylistsPage.tsx
  302: img missing decoding="async"/SmartImage

src\pages\PodcastsPage.tsx
  129: img missing decoding
...truncated
```

### TypeScript type-check

- Command: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo.app -p tsconfig.app.json`
- Status: passed

### Production build

- Command: `node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build --logLevel warn`
- Status: passed

## Production Gate

- Strict mode fails on any readiness warning, database blocker, failed command, or unavailable migration history.

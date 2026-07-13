# Production Preflight Report

Generated: 2026-05-22T01:36:50.080Z
Mode: soft

## Summary

- API readiness: critical=0, warnings=2
- Database readiness: blockers=2, warnings=0
- Migration drift: duplicateVersions=8, remoteError=yes

## Steps

### Secret scan

- Command: `node scripts/security/check-secrets.mjs`
- Status: passed

### Supabase migration drift report

- Command: `node scripts/supabase/audit-migration-drift.mjs --linked --write-report`
- Status: passed

```json
{
  "localMigrations": 690,
  "invalidFilenames": 0,
  "duplicateVersions": 8,
  "allowedDuplicateVersions": 0,
  "newDuplicateVersions": 8,
  "duplicateHashes": 0,
  "remoteMigrations": 0,
  "matchedVersions": 0,
  "localOnlyPending": 690,
  "remoteOnlyMissingLocally": 0,
  "pendingRisk": {
    "high": 623,
    "medium": 50,
    "low": 17
  },
  "report": "docs/supabase-migration-drift-report.md",
  "remoteError": "Initialising login role...\n2026/05/21 20:36:21 Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable."
}
```

### Database upgrade readiness

- Command: `node scripts/supabase/database-upgrade-readiness.mjs --write-report`
- Status: passed

```json
{
  "blockers": 2,
  "warnings": 0,
  "localMigrations": 690,
  "duplicateVersions": 8,
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
  "warnings": 2,
  "edgeFunctions": {
    "total": 253,
    "highRisk": 108,
    "withSecurity": 110,
    "strictCors": 93,
    "serviceRole": 202,
    "highRiskMissingSecurity": []
  },
  "migrationDrift": {
    "local": 690,
    "duplicateVersions": 8,
    "remote": 0,
    "matched": 0,
    "localOnly": 690,
    "remoteOnly": 0,
    "remoteError": true,
    "currentLocal": 690
  },
  "report": "docs/api-readiness-report.md"
}
```

### Media lazy-load readiness

- Command: `node scripts/performance/media-readiness-check.mjs`
- Status: passed

```text
Media readiness report: 1072 issue(s) across 318 file(s).

src/components/Header.tsx
  99: img missing loading="lazy"/SmartImage
  99: img missing decoding="async"/SmartImage
  125: img missing loading="lazy"/SmartImage
  125: img missing decoding="async"/SmartImage

src/components/ZivoLogo.tsx
  23: img missing loading="lazy"/SmartImage
  23: img missing decoding="async"/SmartImage

src/components/admin/AdminLayout.tsx
  239: img missing loading="lazy"/SmartImage
  239: img missing decoding="async"/SmartImage

src/components/admin/AdminStoresVerification.tsx
  116: img missing loading="lazy"/SmartImage
  116: img missing decoding="async"/SmartImage

src/components/admin/AdsStudioWizard.tsx
  364: img missing decoding="async"/SmartImage

src/components/admin/ReelPreviewCard.tsx
  13: video missing preload policy/LazyVideo
  22: img missing loading="lazy"/SmartImage
  22: img missing decoding="async"/SmartImage

src/components/admin/StoreLiveStreamSection.tsx
  768: img missing decoding="async"/SmartImage

src/components/admin/StoreMarketingSection.tsx
  626: img missing loading="lazy"/SmartImage
  626: img missing decoding="async"/SmartImage
  946: img missing loading="lazy"/SmartImage
  946: img missing decoding="async"/SmartImage

src/components/admin/StoreOrdersSection.tsx
  420: img missing loading="lazy"/SmartImage
  420: img missing decoding="async"/SmartImage
  482: img missing loading="lazy"/SmartImage
  482: img missing decoding="async"/SmartImage

src/components/admin/StoreOwnerLayout.tsx
  354: img missing loading="lazy"/SmartImage
  354: img missing decoding="async"/SmartImage

src/components/admin/StorePaymentSection.tsx
  227: img missing decoding="async"/SmartImage
  324: img missing decoding="async"/SmartImage
  329: img missing decoding="async"/SmartImage
  358: img missing loading="lazy"/SmartImage
  358: img missing decoding="async"/SmartImage
  417: img missing loading="lazy"/SmartImage
  417: img missing decoding="async"/SmartImage

src/components/admin/ads/AdsCampaignDetailDrawer.tsx
  383: img missing loading="lazy"/SmartImage
  383: img missing decoding="async"/SmartImage

src/components/admin/store/autorepair/AutoRepairPartShopSection.tsx
  765: img missing loading="lazy"/SmartImage
  765: img missing decoding="async"/SmartImage
  881: img missing loading="lazy"/SmartImage
  881: img missing decoding="async"/SmartImage

src/components/admin/store/autorepair/AutoRepairPhotosSection.tsx
  155: img missing loading="lazy"/SmartImage
  155: img missing decoding="async"/SmartImage
  275: img missing loading="lazy"/SmartImage
  275: img missing decoding="async"/SmartImage

src/components/admin/store/autorepair/PartsSupplierLogo.tsx
  71: img missing loading="lazy"/SmartImage
  71: img missing decoding="async"/SmartImage

src/components/admin/store/autorepair/WarrantyNetworkLogo.tsx
  71: img missing loading="lazy"/SmartImage
  71: img missing decoding="async"/SmartImage

src/components/admin/store/autorepair/finance/FinanceExpensesSection.tsx
  1082: img missing loading="lazy"/SmartImage
  1082: img missing decoding="async"/SmartImage

src/components/admin/store/lodging/LodgingGallerySection.tsx
  151: img missing decoding="async"/SmartImage

src/components/admin/store/lodging/LodgingLostFoundSection.tsx
  73: img missing decoding="async"/SmartImage

src/components/admin/store/lodging/LodgingRoomsSection.tsx
  389: img missing loading="lazy"/SmartImage
  389: img missing decoding="async"/SmartImage

src/components/admin/store/lodging/LostFoundPhotoUploader.tsx
  48: img missing loading="lazy"/SmartImage
  48: img missing decoding="async"/SmartImage

src/components/auth/CountryPhoneInput.tsx
  119: img missing loading="lazy"/SmartImage
  119: img missing decoding="async"/SmartImage
  260: img missing loading="lazy"/SmartImage
  260: img missing decoding="async"/SmartImage
  297: img missing loading="lazy"/SmartImage
  297: img missing decoding="async"/SmartImage

src/components/auth/TwoFactorSetupDialog.tsx
  136: img missing loading="lazy"/SmartImage
  136: img missing decoding="async"/SmartImage

src/components/car/CarCategoryTiles.tsx
  74: img missing loading="lazy"/SmartImage
  74: img missing decoding="async"/SmartImage

src/components/car/CarElectricVehicles.tsx
  56: img missing loading="lazy"/SmartImage
  56: img missing decoding="async"/SmartImage

src/components/car/CarResultCardPro.tsx
  131: img missing loading="lazy"/SmartImage
  131: img missing decoding="async"/SmartImage

src/components/channels/ChannelPostCard.tsx
  467: video missing preload policy/LazyVideo
  486: img missing loading="lazy"/SmartImage
  486: img missing decoding="async"/SmartImage
  617: video missing preload policy/LazyVideo
  631: img missing loading="lazy"/SmartImage
  631: img missing decoding="async"/SmartImage

src/components/channels/ChannelPostComments.tsx
  198: img missing loading="lazy"/SmartImage
  198: img missing decoding="async"/SmartImage

src/components/channels/ChannelPostComposer.tsx
  329: img missing loading="lazy"/SmartImage
  329: img missing decoding="async"/SmartImage

src/components/chat/AvatarPreviewSheet.tsx
  49: img missing loading="lazy"/SmartImage
  49: img missing decoding="async"/SmartImage

src/components/chat/CallPiP.tsx
  207: video missing preload policy/LazyVideo
  217: img missing loading="lazy"/SmartImage
  217: img missing decoding="async"/SmartImage
  226: img missing loading="lazy"/SmartImage
  226: img missing decoding="async"/SmartImage

src/components/chat/CallScreen.tsx
  810: img missing loading="lazy"/SmartImage
  810: img missing decoding="async"/SmartImage
  829: video missing preload policy/LazyVideo
  900: video missing preload policy/LazyVideo

src/components/chat/ChatContactInfo.tsx
  521: img missing loading="lazy"/SmartImage
  521: img missing decoding="async"/SmartImage
  566: img missing loading="lazy"/SmartImage
  566: img missing decoding="async"/SmartImage
  609: img missing loading="lazy"/SmartImage
  609: img missing dec
...truncated
```

### TypeScript type-check

- Command: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo.app -p tsconfig.app.json`
- Status: passed

### Production build

- Command: `node --max-old-space-size=8192 ./node_modules/vite/bin/vite.js build --logLevel warn`
- Status: passed

## Production Gate

- Soft mode reports readiness blockers but only fails for command/runtime failures.

# iOS / Android (Capacitor) Readiness Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files.

## Summary
Native readiness is **strong** — Capacitor v8 with complete iOS/Android shells, permissions, safe-area handling (E2E-tested), OTA, and offline support. The remaining blockers are **non-code credentials/assets**, not engineering work.

## Inventory

| Capability | Status | Path(s) | Notes |
|------------|--------|---------|-------|
| Capacitor core | ✅ Complete | `capacitor.config.ts` (v8.3.4, webDir=dist, dev-server guarded) | |
| iOS shell | ✅ Complete | `ios/App/App.xcodeproj`, `Info.plist`, `App.entitlements`, `PrivacyInfo.xcprivacy` | bundle `com.hizovo.app`, Sign in with Apple, universal links |
| Android shell | ✅ Complete | `android/app/build.gradle`, `AndroidManifest.xml`, `network_security_config.xml` | versioned, HTTPS-only, FileProvider, verified app links |
| Plugins | ✅ Complete | `package.json` (25+ `@capacitor/*`) | camera, push, geolocation, keyboard, storage… |
| Permissions (iOS/Android) | ✅ Complete | `Info.plist` (camera/mic/location/photos/ATT), `AndroidManifest.xml` (POST_NOTIFICATIONS/CAMERA/RECORD_AUDIO/FINE+COARSE_LOCATION) | declared + JS request hooks |
| Safe area | ✅ Complete | `scripts/qa/safe-area-check.mjs`, `tests/e2e/safe-area.spec.ts`, `src/index.css` tokens | 5 device profiles incl. Dynamic Island fallback |
| Offline / service worker | ✅ Complete | `src/sw.js` (Workbox 7.4.1), `src/hooks/usePWAUpdate.ts` | precache + SWR/NetworkFirst |
| OTA live updates | ✅ Complete | `src/hooks/useOTAUpdate.ts`, `OTAUpdateBanner.tsx` (@capgo) | manifest validation, SHA256, size limit, minNativeVersion, mandatory mode |
| Rich notifications (iOS) | ✅ Complete | `NotificationServiceExtension/NotificationService.swift` | avatar download, comm intent |
| Store assets | ✅ Complete | `ios/store-listing/`, `android/store-listing/`, `src/pages/admin/AdminAppStoreAssets.tsx`, `docs/native-release-checklist.md` | metadata + screenshots |
| Native doctor / QA | ✅ Complete | `scripts/native/doctor.mjs`, `scripts/qa/native-app-contracts.mjs` (passes) | |
| **FCM/APNs runtime creds** | 🔴 Blocked (non-code) | `google-services.json` (Android), `GoogleService-Info.plist` (iOS) absent | per-app, generated in Firebase/Apple — not in repo |
| **iOS prod push entitlement** | 🟡 | `App.entitlements` `aps-environment=development` | flip to `production` for store build |
| **Android signing keystore** | 🟡 Blocked (non-code) | referenced, not documented | needed for Play upload |
| **OTA bundle bucket** | 🟡 | Supabase Storage `/app-updates/` | verify bucket + public-read + CI publish |
| Offline visual indicator | 🟡 Partial | `OfflineBanner` exists | wire to `navigator.onLine` events broadly |

## Top gaps
- **P1 (non-code):** add `google-services.json` + `GoogleService-Info.plist`; configure APNs; create Android keystore; verify OTA bucket. These block store push + uploads but require no source changes.
- **P1:** flip iOS `aps-environment` to `production` for release; add Android notification channels (ties to NOTIFICATIONS P1).
- **P2:** broaden offline indicator; tune cold-start splash (2500ms cap) on mid-tier Android.

## Readiness flags
- P0: none in-code.
- P1: FCM/APNs creds + keystore + OTA bucket (non-code); iOS prod entitlement; Android channels.
- P2: offline UX indicator; splash tuning.

## Maps to roadmap
PR 15 (iOS/Android push) pairs with the FCM v1 fix from NOTIFICATIONS. PR 29 covers safe-area/cookie-banner cleanup. PR 30 (release gate) should checklist the non-code store credentials.

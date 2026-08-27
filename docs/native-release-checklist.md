# Native Release Checklist

Use this checklist for every ZIVO iOS and Android store release.

## 1. Preflight

Run the local release guards before opening Xcode or Android Studio:

```bash
npm run qa:native-app-contracts
npm run native:doctor
npm run native:doctor -- --android-only
npm run native:release-secrets:guide
npm run native:push-secrets:preflight
npm run native:store-signing:preflight
```

`native:doctor` must pass before the build is handed to a store. The
Android-only doctor is the focused check for Gradle/SDK handoff. On this Mac,
Android requires a local-only `android/local.properties` copied from
`android/local.properties.example`, with the local SDK path described in
`docs/native-android-setup.md`.

`npm run native:store-signing:preflight` must pass before claiming App Store or Google Play upload readiness. Local simulator, debug, and unsigned compile checks are useful for QA, but store upload requires the owner-controlled Android upload keystore, an Apple Distribution signing path (local certificate or Xcode cloud-managed export), and App Store provisioning profile.
`npm run native:release-secrets:guide` prints safe setup commands for the GitHub
Actions secrets without displaying private file contents or passwords.

Before any production push test, set the Supabase Edge push secrets with the
same guide: `FCM_SERVICE_ACCOUNT_JSON`, `APNS_KEY_ID`, `APNS_TEAM_ID`,
`APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID=com.hizovo.app`, `APNS_ENV=production`,
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. The GitHub
`VITE_VAPID_PUBLIC_KEY` release secret must match `VAPID_PUBLIC_KEY`.
`npm run native:push-secrets:preflight` checks the local env-file shape without
printing secret values.

## 2. Sync Web Bundle

Build the production web app and sync both native shells:

```bash
npm run native:sync
```

Use platform-specific sync commands only when preparing one store at a time:

```bash
npm run ios:sync
npm run android:sync
```

## 3. Version And Metadata

Confirm these values match before upload:

```text
App version: 1.3.0
iOS build: 4
iOS bundle ID: com.hizovo.app
Android versionCode: 2026082601
Android package: com.hizovo.app
Android target SDK: 36 (Android 16)
```

Google Play requires normal mobile app updates submitted on or after August 31,
2026 to target Android 16 (API level 36) or higher. The supported Android build
runner fails before rebuilding if `android/variables.gradle` falls below that
minimum. Treat a Play Console extension as active only after it is visibly
approved for this app.

The matching store text lives in:

```text
ios/store-listing/APP_STORE.md
android/store-listing/PLAY_STORE.md
```

## 4. Build And Upload

iOS:

```bash
npm run ios:build:sim
npm run ios:archive:store
npm run ios:export:store
```

The iOS simulator build script runs `npm run native:doctor -- --ios-only`
before Xcode, so missing Xcode/project setup fails with the local doctor output.

For local store release, `npm run ios:archive:store` creates the Release
archive and `npm run ios:export:store` exports the App Store Connect `.ipa`
using `ios/App/ExportOptions.plist`. `npm run ios:build:store` runs both steps.
Apple must have the latest Developer Program License Agreement accepted before
Xcode can create/download the App Store profiles or iOS Distribution
certificate. For GitHub release workflow runs, the signed archive is exported
with the same export options, and the artifact includes the App Store Connect
`.ipa`.

Run the guarded App Store upload helper first as a dry run:

```bash
npm run ios:upload:app-store
```

To upload the `.ipa` to App Store Connect processing, provide either App Store
Connect API key credentials or `APP_STORE_CONNECT_USERNAME` plus an
app-specific password, then rerun with:

```bash
ZIVO_APP_STORE_UPLOAD_CONFIRM=UPLOAD_APP npm run ios:upload:app-store
```

The helper does not submit the build for App Store review; the owner must review
TestFlight/App Store metadata and approve that final App Store Connect action.

Android:

```bash
npm run android:build:debug
npm run android:build:release
```

Both Android build scripts run `npm run native:doctor -- --android-only`
before Gradle, so missing Android SDK/platform-tools setup fails with the local
setup instructions instead of a late Gradle error.

Run the guarded Play Console helper first as a dry run:

```bash
npm run android:upload:play:draft
```

To upload the signed `.aab` to the existing Play Console draft, rerun with:

```bash
ZIVO_PLAY_UPLOAD_CONFIRM=UPLOAD_DRAFT npm run android:upload:play:draft
```

The helper is draft-only. It does not start rollout or submit the release for
review; the owner must review and approve that final Play Console action.

## 5. Store Assets

Confirm upload-ready assets are present:

```text
android/store-listing/icon-512.png
android/store-listing/feature-graphic.jpg
ios/store-listing/sim-home-now.png
ios/store-listing/sim-profile-now.png
```

The App Store listing should include at least 6 current iPhone screenshots.
The Play Store listing should include 2 to 8 phone screenshots, the 512 icon,
and the 1024 x 500 feature graphic.

## 6. OTA Safety

Before publishing any OTA bundle, run a dry run:

```bash
npm run deploy:update:dry-run
```

OTA updates must not add native plugins, permissions, entitlements, app IDs,
bundle IDs, or store-reviewed privacy behavior. Those changes require a new
native build and store review.

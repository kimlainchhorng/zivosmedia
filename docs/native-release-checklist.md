# Native Release Checklist

Use this checklist for every ZIVO iOS and Android store release.

## 1. Preflight

Run the local release guards before opening Xcode or Android Studio:

```bash
npm run qa:native-app-contracts
npm run native:doctor
```

`native:doctor` must pass before the build is handed to a store. On this Mac,
Android requires `android/local.properties` with the local SDK path described in
`docs/native-android-setup.md`.

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
iOS build: 3
iOS bundle ID: com.hizovo.app
Android versionCode: 2026053101
Android package: com.hizovo.app
```

The matching store text lives in:

```text
ios/store-listing/APP_STORE.md
android/store-listing/PLAY_STORE.md
```

## 4. Build And Upload

iOS:

```bash
npm run ios:build:sim
```

Then open Xcode Organizer and upload the archive to App Store Connect.

Android:

```bash
npm run android:build:debug
npm run android:build:release
```

Upload the signed `.aab` in Play Console.

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

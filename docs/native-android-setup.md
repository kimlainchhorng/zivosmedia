# Android Native Setup

This app is ready for Android builds once the local Android SDK is installed and discoverable.

## Current Blocker

`npm run native:doctor` checks the app configuration, iOS project, Android Gradle files, and local SDK paths. The expected local SDK path on this Mac is:

```text
/Users/kimlain/Library/Android/sdk
```

If Android Studio is not installed yet, install Android Studio first, open it once, and install:

- Android SDK Platform
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator

## Local SDK File

After the SDK exists, create this local-only file:

```properties
sdk.dir=/Users/kimlain/Library/Android/sdk
```

Save it as:

```text
android/local.properties
```

`android/local.properties` is ignored by Git because it contains a machine-specific path.

## Verify

Run:

```bash
npm run native:doctor
npm run android:build:debug
```

Expected result: `native:doctor` should report all checks passed, then Gradle should produce the debug APK.

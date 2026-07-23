# iOS Simulator Setup

Zivosmedia's native customer shell is ready to compile for the iOS simulator when
Xcode is installed.

## Verify Xcode and project wiring

Run the iOS-only native doctor:

```bash
npm run native:doctor -- --ios-only
```

The doctor checks the Capacitor config, installed Capacitor iOS dependency,
Xcode availability, the iOS Xcode project, the Capacitor SwiftPM package,
bundle identifier, and marketing version.

## Build the simulator app

Run:

```bash
npm run ios:build:sim
```

This command runs `npm run native:doctor -- --ios-only` before `xcodebuild`, so
missing Xcode/project setup fails early with the native doctor output.

For store upload, open the same `ios/App/App.xcodeproj` project in Xcode and
archive with an owner-controlled App Store signing path: either a local Apple
Distribution certificate plus App Store provisioning profile, or Xcode's
cloud-managed Apple Distribution export. The project is configured for the ZIVO
Apple team `9KWY67J6LX`, bundle id `com.hizovo.app`, marketing version `1.3.0`,
and build number `3`.

For repeatable local store builds, run:

```bash
npm run ios:archive:store
npm run ios:export:store
```

Or run both steps together:

```bash
npm run ios:build:store
```

If Xcode reports `PLA Update available`, accept the latest Apple Developer
Program License Agreement in the Apple Developer account first. Xcode cannot
issue/download App Store provisioning profiles or an iOS Distribution
certificate until that agreement is accepted.

The GitHub mobile workflow can build signed iOS release archives and export an
App Store Connect `.ipa` using `ios/App/ExportOptions.plist` after these
repository secrets are configured:

- `IOS_P12_BASE64`
- `IOS_P12_PASSWORD`
- `IOS_PROVISIONING_PROFILE_B64`
- `IOS_TEAM_ID`

Release workflow runs fail closed when any required iOS signing secret is
missing. Debug/unsigned archive checks do not require App Store signing.

For production push delivery, the Supabase Edge Function secret `APNS_ENV` must
be `production`, and `APNS_BUNDLE_ID` must stay `com.hizovo.app`. The
`APNS_KEY_ID`, `APNS_TEAM_ID`, and `APNS_PRIVATE_KEY` secrets must come from an
Apple push key on the same Apple team used for the App Store profile.
Run `npm run native:push-secrets:preflight` before setting the Supabase secrets
so placeholder or mismatched push values are caught without printing secret
values.

To print the safe GitHub secret setup commands without exposing secret values,
run:

```bash
npm run native:release-secrets:guide
```

Run the combined store upload preflight before claiming Google Play or App Store
readiness:

```bash
npm run native:store-signing:preflight
```

It checks that the Android release bundle exists and is signed with the
owner-controlled upload keystore. It also checks the Android Firebase config,
an Apple Distribution signing path (local certificate or verified cloud-managed
export), and matching App Store provisioning profiles for `com.hizovo.app` and
`com.hizovo.app.NotificationServiceExtension` on team `9KWY67J6LX`.

## Guarded App Store Connect upload helper

The App Store upload helper is intentionally guarded. A normal run is a dry run
that prints the exported `.ipa`, signing summary, and credential status:

```bash
npm run ios:upload:app-store
```

To upload the `.ipa` to App Store Connect processing, provide Apple upload
credentials and confirm the action explicitly:

```bash
APP_STORE_CONNECT_API_KEY_ID=... \
APP_STORE_CONNECT_API_ISSUER_ID=... \
APP_STORE_CONNECT_API_KEY_PATH=/path/to/AuthKey_....p8 \
ZIVO_APP_STORE_UPLOAD_CONFIRM=UPLOAD_APP \
npm run ios:upload:app-store
```

Alternatively, use `APP_STORE_CONNECT_USERNAME` plus an app-specific password in
`APP_SPECIFIC_PASSWORD`. The helper uploads a build for Apple processing only;
it does not submit the app for review.

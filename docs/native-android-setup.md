# Android Native Setup

This app can build Android debug artifacts locally without store signing. Google
Play release bundles require the owner-controlled upload keystore.

## Current Blocker

`npm run native:doctor -- --android-only` checks the Android app configuration,
Gradle files, and local SDK paths. The expected local SDK path on this Mac is:

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

You can copy the checked-in template:

```bash
cp android/local.properties.example android/local.properties
```

`android/local.properties` is ignored by Git because it contains a machine-specific path.

## Verify

Run:

```bash
npm run native:doctor -- --android-only
npm run android:build:debug
```

Expected result: the Android-only native doctor should report all checks passed, then Gradle should produce the debug APK.
The Android build scripts also run `npm run native:doctor -- --android-only`
before Gradle so a missing SDK stops with the setup message above.

## Build release AAB

For a compile-only local release bundle:

```bash
npm run android:build:release
```

This command now rebuilds the web app, runs the Android Capacitor sync, and
verifies that the generated native config still has splash auto-hide enabled,
does not add an Android 12 pre-draw splash timer, and contains the static ZIVO
boot shell outside the React root before Gradle can package the bundle. Keeping
that shell outside `#root` prevents React from clearing it into a white WebView
before the first route paints; native shells retain it for a short 350 ms
handoff after React commits so the WebView cannot expose an unpainted frame. Do
not bypass this check with a direct Gradle command for a Google Play build.

For a Google Play-ready signed release, add the real upload key outside Git:

```text
android/app/release.keystore
android/keystore.properties
android/app/google-services.json
```

Start from the checked-in non-secret template:

```bash
cp android/keystore.properties.example android/keystore.properties
```

`android/keystore.properties` should use this shape:

```properties
storeFile=app/release.keystore
storePassword=<owner-controlled password>
keyAlias=<owner-controlled alias>
keyPassword=<owner-controlled password>
```

Never commit the keystore or passwords. The Android gitignore blocks
`*.jks`, `*.keystore`, and `keystore.properties`.

## GitHub release secrets

The mobile workflow can also sign releases from repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_SERVICES_JSON_BASE64`
- `VITE_VAPID_PUBLIC_KEY`

`GOOGLE_SERVICES_JSON_BASE64` should be the base64 value of
`android/app/google-services.json` from the same Firebase project used by the
push sender's `FCM_SERVICE_ACCOUNT_JSON`. The file stays gitignored locally.
It must include an Android client for package `com.hizovo.app`; the store
signing preflight checks this before Google Play upload readiness is claimed.
`VITE_VAPID_PUBLIC_KEY` is public, but it must match the Supabase Edge Function
secret named `VAPID_PUBLIC_KEY` so browser push subscriptions use the same key
pair as the server.

Release workflow runs fail closed when any required Android signing or Firebase
release secret is missing. Debug workflow runs do not require store signing.

To print the safe GitHub secret setup commands without exposing secret values,
run:

```bash
npm run native:release-secrets:guide
```

## Supabase push delivery secrets

Native and web push also need server-side Supabase Edge Function secrets before
production delivery can work:

- `FCM_SERVICE_ACCOUNT_JSON`
- `APNS_KEY_ID`
- `APNS_TEAM_ID`
- `APNS_PRIVATE_KEY`
- `APNS_BUNDLE_ID=com.hizovo.app`
- `APNS_ENV=production`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

The safe guide above prints the `supabase secrets set --env-file` handoff. Keep
`FCM_SERVICE_ACCOUNT_JSON` and `android/app/google-services.json` from the same
Firebase project.
Before setting the Supabase secrets, run:

```bash
npm run native:push-secrets:preflight
```

## Store upload preflight

Run this before claiming Google Play or App Store upload readiness:

```bash
npm run native:store-signing:preflight
```

It checks that the compile-only Android release bundle exists, then separately
blocks Google Play upload until that bundle is signed with the owner-controlled
upload keystore and has the local Firebase config required for native push. It
also checks that the Android keystore configuration is present and that iOS has
an owner-controlled App Store signing path: either a local Apple Distribution
certificate plus matching App Store provisioning profiles, or a successful Xcode
cloud-managed App Store export for this app.

## Draft-only Google Play upload helper

The Play upload helper is intentionally guarded and draft-only. A normal run is
a dry run that prints the current release and target:

```bash
npm run android:upload:play:draft
```

To upload the current signed `.aab` to the existing Play Console draft, confirm
the action explicitly:

```bash
ZIVO_PLAY_UPLOAD_CONFIRM=UPLOAD_DRAFT npm run android:upload:play:draft
```

The helper does not start rollout or submit the release for review. Review the
draft in Play Console and start rollout manually only when the owner approves.

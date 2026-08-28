# 🤖 PLAY STORE LISTING — Android (ZIVO)

**Edit only the text inside the boxes. Character limits are enforced by Google.**

Play Console → ZIVO → Grow → Store presence → Main store listing

Package name: `com.hizovo.app`

---

## 1. App Name (max 30 characters)

```
ZIVO
```

Keep this exactly `ZIVO` so the public listing matches the installed Android app label and icon identity.

## 2. Short Description (max 80 characters)

```
Social, messaging, and travel search in one ZIVO account.
```

## 3. Full Description (max 4000 characters)

```
ZIVO brings social discovery, messaging, and travel search into one app.

SOCIAL
• Browse posts and short videos
• Follow accounts and manage your profile
• Create and share supported content after signing in

MESSAGING
• Start and manage conversations
• Share supported photos, videos, files, and voice messages
• Manage chat notification and privacy settings

TRAVEL
• Search flights, hotels, car rentals, and bus options
• Review available prices, schedules, and provider details before continuing
• View and manage supported trips from your account

ACCOUNT & PRIVACY
• Manage sign-in, profile, and security settings
• Request account deletion in the app or on the ZIVO website
• Access ZIVO's privacy, terms, and support resources

Feature availability varies by location, provider, account, and internet connection. Prices and inventory appear only when returned by the relevant travel provider. ZIVO does not guarantee that every service is available to every user.

—
ZIVO LLC is a registered booking agent. Airlines, hotels, and car suppliers are the merchants of record for their inventory. Some premium features and creator subscriptions may have a price.

Support:  support@zivosmedia.com
Website:  https://zivosmedia.com
Privacy:  https://zivosmedia.com/legal/privacy
Terms:    https://zivosmedia.com/legal/terms
```

## 4. What's New / Release Notes (max 500 characters — UPDATE EVERY RELEASE)

```
• Improved Android startup reliability
• Aligned the installed app name and icon with the Play listing
• Updated account privacy and deletion guidance
• Performance and stability improvements

Feedback? support@zivosmedia.com
```

Keep the listing conservative. Do not add a feature, price, partner-count,
availability, or "free" claim until that exact behavior has been verified in the
Play-track build on a supported Android device.

## 5. Categorization

```
App category:    Lifestyle
Tags:            Travel, Social, Shopping, Communication
Target audience: 13+
Contains ads:    No (UGC + commerce)
In-app purchases: Yes (creator subscriptions, premium features)
```

## 6. Contact Details

```
Email:    support@zivosmedia.com
Website:  https://zivosmedia.com
Phone:    (optional — leave blank if not used)
```

## 7. Privacy Policy URL

```
https://zivosmedia.com/legal/privacy
```

## 8. Account Deletion URL

Use this in Play Console -> App content -> Data safety -> Account deletion.

```
https://zivosmedia.com/delete-account
```

Before preparing any Play upload, verify both public policy pages from a real browser:

```bash
npm run android:policy-pages:check
```

This check fails if either canonical URL is unavailable, redirects elsewhere, returns a non-HTML
document, or no longer visibly identifies ZIVO and the required privacy/deletion information. The
draft upload helper runs the same check automatically before it opens Play Console.

Verify that the release bundle was built with R8 and resource shrinking:

```bash
npm run android:optimization:check
```

The normal release build runs this automatically, and the draft upload helper
repeats it. It requires non-empty R8 mapping, removed-code, and preserved-plugin
reports and verifies that deobfuscation metadata is embedded in the bundle. Use
Play Console Bundle Explorer as the authority for Google's exact optimization
percentages after upload.

`npm run android:sync` remains available for a manual Android Studio preview;
the supported release command rebuilds and syncs again before packaging.
If Android Studio's **Build → Generate Signed App Bundle** flow is used, rerun
the optimization check against that newly generated bundle before upload.

Verify that the same release bundle can produce a structurally valid, signed
universal APK:

```bash
npm run android:installability:check
```

The supported release command runs Gradle's `bundleRelease` and
`packageReleaseUniversalApk` tasks together. The check locks the package,
version, SDK, `ZIVO` label, launch activity, signature, archive contents, native
arm64 coverage, and current built web/AAB/APK payload parity. It does not
install anything. Before submission, install and launch this exact release
through a Play test track on a real supported Android device.

## 9. Release Metadata

```
Version: 1.3.0
Version code: 2026082601
Package name: com.hizovo.app
Target SDK: 36 (Android 16)
```

## 10. Graphic Assets (sizes Google requires)

```
Icon:               512 × 512, 32-bit PNG with alpha, sRGB, max 1024 KB
Feature graphic:    1024 × 500 PNG/JPG
Phone screenshots:  min 2, max 8 — at least 1080px on shorter side
Tablet screenshots: optional but recommended for 7" and 10"
```

`android/store-listing/icon-512.png` is the canonical ZIVO artwork. Google Play applies the
final icon mask and drop shadow, so do not add a platform mask or shadow to an upload copy.
`android/store-listing/feature-graphic.jpg` is the canonical ZIVO feature graphic. It uses the
same icon and wordmark without product, price, availability, or partner-count claims; replace it
only with another 1024 × 500 asset that preserves that truthful installed/listing identity.
After replacing the canonical icon, regenerate and verify every installed Android launcher:

```bash
npm run android:icons:generate
npm run android:icons:check
```

Capture the 2–8 phone screenshots from the exact signed Play-track Android build on a supported
Android device. Do not relabel iOS Simulator or browser screenshots as Android evidence.
Place approved captures in `android/store-listing/phone-screenshots/` using the checklist in that
folder. The screenshot contract treats an empty folder as truthfully pending and rejects a partial
one-image package or invalid portrait dimensions.

---

### How to publish

1. Run `npm run android:policy-pages:check` so the public privacy and deletion paths are live
2. Run `npm run android:icons:check` so the installed launcher matches the listing icon
3. Bump `versionCode` and `versionName` in `android/app/build.gradle`
4. Run `npm run android:build:release` to sync, build, and verify R8/resource shrinking
5. Run `npm run android:installability:check` and install/launch the exact release from a Play test track on a real supported device
6. Run `npm run android:optimization:check` again after any Android Studio rebuild
7. Play Console → Production → **Create new release** → upload `.aab`
8. Confirm the uploaded bundle's optimization results in Bundle Explorer
9. Paste fields above into matching boxes → Save → Review → Roll out

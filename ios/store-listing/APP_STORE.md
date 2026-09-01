# APP STORE LISTING — iOS (ZIVO)

This file is a conservative source draft for App Store Connect. It does not
change the live listing, submit a build, or prove that the listed behavior is
present in a signed candidate.

App Store Connect → My Apps → ZIVO → App Information / Version Information

Bundle ID: `com.hizovo.app` · App ID: `6759480121`

## Identity preflight — resolve before submission

The cross-platform brand, Capacitor config, Android app, Info.plist, and iOS
Debug/Release build settings now use `ZIVO`. The public App Store listing may
still show `ZIVOS`; editing source does not change App Store Connect. Confirm
and update that owner-controlled listing before submission so the store and
signed candidate show the same identity.

## 1. App Name (max 30 characters)

```text
ZIVO
```

## 2. Subtitle (max 30 characters)

```text
Social, Messaging & Travel
```

## 3. Promotional Text (max 170 characters)

```text
Explore social content, manage conversations, and search supported travel options with one ZIVO account. Availability varies by provider and location.
```

## 4. Keywords (max 100 characters, comma-separated)

```text
social,messaging,travel,flights,hotels,cars,bus,profile,chat,video,shopping,trips
```

## 5. Description (max 4000 characters)

```text
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
ZIVO LLC is a registered booking agent. Airlines, hotels, and car suppliers are the merchants of record for their inventory.

Support: support@zivosmedia.com
Website: https://zivosmedia.com
Privacy: https://zivosmedia.com/legal/privacy
Terms: https://zivosmedia.com/legal/terms
```

Keep this description aligned with `android/store-listing/PLAY_STORE.md`.
Do not add a partner count, price, availability, encryption, AI, payout,
language, calling-quality, or “free” claim until that exact behavior has been
verified in the signed candidate and is reflected in the privacy disclosures.

## 6. What's New in This Version (max 4000 characters)

```text
• Improved account privacy isolation on shared devices
• Hardened installed-app purchase and tracking boundaries
• Improved travel, ride, and navigation reliability
• Performance and stability improvements

Thanks for using ZIVO. Email support@zivosmedia.com with feedback.
```

This is draft release text. Reconcile it with the final frozen diff and exact
signed-candidate QA before pasting it into App Store Connect.

## 7. Support / Marketing URLs

```text
Support URL:    https://zivosmedia.com/support
Marketing URL:  https://zivosmedia.com
Privacy URL:    https://zivosmedia.com/legal/privacy
```

## 8. Category

```text
Primary:    Lifestyle
Secondary:  Travel
```

## 9. Age Rating

Do not paste the obsolete `12+` note or force a rating from this document.
Complete Apple's current age-rating questionnaire truthfully for the exact
candidate, including:

- user-generated content and moderation;
- social networking and direct/group messaging;
- advertising, commerce, and access to existing subscriptions; installed-app
  cross-app tracking is disabled in build 5 and must be answered **No** unless
  the signed candidate changes;
- unrestricted web access or external links;
- mature, violent, sexual, or medical content exposure;
- age assurance, parental controls, reporting, and blocking.

Use the rating calculated by App Store Connect and record it here after the
owner confirms the answers. Keep the selected age range compatible with the
Play target-audience declaration; do not claim they match until both consoles
have been reviewed.

The build 5 privacy manifest declares no tracking domains and no data used for
tracking or third-party advertising. App Store Connect privacy answers must
match that exact candidate while still disclosing linked account, contact,
location, purchase, and app-functionality data collected by the enabled
features.

## 10. Copyright

```text
© 2026 ZIVO LLC
```

## 11. Release Metadata

```text
Version: 1.3.0
Build: 5
Bundle ID: com.hizovo.app
```

App Store Connect already processed build 4 on August 27, 2026. Build 5 is the
next source candidate; confirm it remains unused immediately before upload.

## 12. Screenshot Assets

Upload at least 6 iPhone screenshots from the exact signed release candidate.
The first six should truthfully cover Home/Feed, Account, Travel, Messaging,
Rides, and Shop only when those exact flows pass candidate QA.

The repository currently contains these reference captures:

```text
ios/store-listing/sim-home-now.png
ios/store-listing/sim-profile-now.png
ios/store-listing/simulator-feed-fix-v2.png
ios/store-listing/simulator-test-flights.png
ios/store-listing/simulator-profile-compact.png
ios/store-listing/simulator-current-review.png
```

Their presence is not upload readiness. Re-capture after the final web bundle
is synchronized into iOS, the archive is signed, and the exact candidate is
replayed at current App Store screenshot sizes. Reject duplicate images,
browser-only captures, stale simulator builds, debug overlays, unavailable
content, and screens whose visible behavior does not match the listing.

## How to publish

1. Confirm the signed iOS candidate displays `ZIVO`, then align App Store Connect if it still shows `ZIVOS`.
2. Confirm Apple's calculated age rating and privacy answers for current features.
3. Build and synchronize the frozen web payload; verify archive payload parity.
4. Install both App Store profiles: the app and `NotificationServiceExtension`.
5. Open Xcode, choose the next unused build number, and create the archive.
6. Replay the exact signed candidate and capture fresh screenshots.
7. Paste the reviewed fields above into App Store Connect.
8. Upload build via Xcode → Organizer → Distribute App.
9. Review TestFlight processing, signing, metadata, and screenshots before any submission.

Uploading a build does not submit it for review. The owner must approve the
final App Store Connect submission.

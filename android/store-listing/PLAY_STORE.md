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
Flights, hotels, reels, jobs, shop & chat — one free super-app for everything.
```

## 3. Full Description (max 4000 characters)

```
ZIVO is the free all-in-one super-app for travel, social, shopping, and work — built for everyone, everywhere.

✈️ TRAVEL & DELIVERY
• Search and compare flights, hotels, and car rentals from 500+ partners
• Book rides and order food or groceries in seconds
• AI trip planner creates your full itinerary instantly

📱 SOCIAL & CREATORS
• Share short videos, reels, and stories
• Follow your favorite creators and subscribe for exclusive content
• Watch live streams, join audio spaces, react in real time

🛒 SHOP & SELL
• Open an online shop in minutes — no monthly fees
• Built-in POS, order management, and Stripe payouts
• Sell to buyers worldwide

💼 JOBS & HIRING
• Find and apply to jobs with one tap
• Businesses post unlimited listings and review applicants
• Side hustles to full-time — all in one feed

💬 CHAT, CALLS & CHANNELS
• Messaging with photos, voice notes, and reactions
• Free HD voice and video calls
• Group chats, public channels, and audio rooms

🌍 LANGUAGES
• English, Khmer, Arabic, French
• Sign in with Google

Why ZIVO?
• One app instead of ten — travel, social, shop, jobs, chat
• No booking fees on travel
• Free to join, post, sell, and chat
• Lightweight, fast, and offline-friendly

Download ZIVO and run your whole day in one app.

—
ZIVO LLC is a registered booking agent. Airlines, hotels, and car suppliers are the merchants of record for their inventory. Some premium features and creator subscriptions may have a price.

Support:  support@zivosmedia.com
Website:  https://zivosmedia.com
Privacy:  https://zivosmedia.com/legal/privacy
Terms:    https://zivosmedia.com/legal/terms
```

## 4. What's New / Release Notes (max 500 characters — UPDATE EVERY RELEASE)

```
• Faster flight search and smoother feed
• New AI trip planner — get a full itinerary instantly
• HD video call quality improvements
• Bug fixes and stability updates

Feedback? support@zivosmedia.com
```

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
After replacing the canonical icon, regenerate and verify every installed Android launcher:

```bash
npm run android:icons:generate
npm run android:icons:check
```

---

### How to publish

1. Run `npm run android:policy-pages:check` so the public privacy and deletion paths are live
2. Run `npm run android:icons:check` so the installed launcher matches the listing icon
3. Bump `versionCode` and `versionName` in `android/app/build.gradle`
4. Run `npm run android:build:release` to sync, build, and verify R8/resource shrinking
5. Run `npm run android:optimization:check` again after any Android Studio rebuild
6. Play Console → Production → **Create new release** → upload `.aab`
7. Confirm the uploaded bundle's optimization results in Bundle Explorer
8. Paste fields above into matching boxes → Save → Review → Roll out

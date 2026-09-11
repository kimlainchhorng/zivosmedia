# Zivo - Media Android release record — 2026-09-07

## Current status

Version **1.4.0 (2)** passed the full update gate, focused tests and signed Android build. Release **2** was published and verified **Active / Available to internal testers** on Sep 7 at 11:09 PM (console display). The existing Kimlain tester list remains selected. Google shows Not reviewed and temporary package name `com.zivosmedia.app (unreviewed)`. Preview showed zero blocking errors and one missing-native-debug-symbols warning. No public production release or review submission.

Code 2 replaces unsupported Android insurance offers, coverage statistics and payout testimonials with an explicit unavailable state and working support/back navigation. Web/iOS behavior is preserved.

Current artifacts (these paths now contain code 2):

- AAB: `android/app/build/outputs/bundle/release/app-release.aab`; SHA-256 `da668e99f846121dfe5584ee4eae7e1a7661b5647920e735749c45350514b062`.
- Universal APK: `android/app/build/outputs/apk_from_bundle/release/app-release-universal.apk`; SHA-256 `5a8fafbff5747b57f80d431c3cb53b22d68b7ef1b4019985555f0ffb89d3c856`.
- `npm run update` exit 0; focused tests 9/9 across 3 files; Android signed release build and guards passed; web payload matches `dist` (2574 files).
- Logs: `/tmp/zivosmedia-android-code2-{update,focused,build}-20260907.log`.

Completed and saved: content rating, health features and financial features. Three app-content declarations remain: sign-in details, target audience and Data safety. The listing also needs genuine Android screenshots. Target audience is blocked by sign-in details; dedicated reviewer credentials remain unavailable.

Health selections: activity/fitness, nutrition/weight, sleep, stress/relaxation/mental acuity, medication/treatment management, and other manual on-device wellness logs (heart rate/blood pressure; no diagnosis or clinical decisions). Financial selections: mobile payments/digital wallets and rewards/points/incentives. No insurance offer selected for the corrected Android release. Console requested no additional regional documentation for either declaration.

Data safety is a saved **25-type draft**, including fitness and contacts in addition to the original 23 categories below. Crash logs/diagnostics were removed after verifying `VITE_ANALYTICS_EVENT_TRACK_ENABLED` is unset/default false: error-reporting queues do not upload in this build. Local-only health logs are not counted as collection. Per-type collection/sharing, ephemeral handling, optionality and purposes still require completion. Exported CSV was corrected locally at `artifacts/android-play-2026-09-07/data-safety-code2-draft.csv`; import was rejected for missing `PSL_DATA_USAGE_RESPONSES`, so category corrections were saved directly through the UI. Do not treat the CSV as imported or final.

The sections below retain the earlier code-1 release evidence and setup history. Their earlier incomplete-declaration counts and artifact hashes are historical; this current-status section takes precedence.

## Identity and console

Owner authorized the new app, final name **Zivo - Media**, and website **https://zivosmedia.com**. The new Play app is created in ZIVO LLC, with package `com.zivosmedia.app`, default en-US, App, Free. App ID: `4975172017680024293`.

Console: https://play.google.com/console/u/0/developers/5585425195147923232/app/4975172017680024293/app-dashboard

Android application ID and custom links are migrated; Java namespace and activity remain `com.hizovo.app`. iOS retains its existing bundle ID. Firebase project `zivo-llc` has a registered `com.zivosmedia.app` Android client and matching ignored local google-services.json.

The old `com.hizovo.app` is still suspended (appeal `5-6274000042114`). Creating this app does not establish policy compliance or resolve the old appeal.

## Historical code-1 release and artifact hashes

Version name **1.4.0**, version code **1**. The initial uploaded bundle used inherited code 2026090101; Google flagged it as unusually high. It was removed from the internal release draft. Google accepted the corrected code-1 bundle, the saved preview showed zero errors, and the release was published to internal testing on Sep 7 at 9:52 PM (console display). The internal track now shows Active and Available to internal testers. The existing Kimlain list (`support@hizivo.com`) is selected and saved. The app is Not reviewed and Google currently shows temporary name `com.zivosmedia.app (unreviewed)`.

Internal track: `4700722321762723546`; release: `1`.

Owner tester opt-in: https://play.google.com/apps/internaltest/4700722321762723546

- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- AAB SHA-256: `e3cba4996c9d2d496691de280f7c3bfed437eaf63ae69a3fb12e2779254fbd30`
- Universal APK: `android/app/build/outputs/apk_from_bundle/release/app-release-universal.apk`
- APK SHA-256: `a3b7bc551904e6e7a28283fb11ddc480276bddb534d7d2c56ebb97731b114674`

Both artifacts are signed. Internal testing release is published; no public production release or store review submission is evidenced. The only remaining release-preview warning after tester configuration is expected to be missing native debug symbols; it was not revalidated after saving testers.

## Completed console setup

Privacy policy `https://zivosmedia.com/legal/privacy`; contact `support@zivosmedia.com`; website `https://zivosmedia.com`; Lifestyle category; Ads Yes; government app No. English listing draft, name, descriptions, 512px icon and 1024x500 feature graphic saved. Actual Android phone screenshots are missing. Local listing text additionally retains the terms URL for release contracts.

## Validation

- Final `npm run update`: exit 0 (Node 24.19.0).
- Focused native identity, safe-area, commands, listing, workflow, links and permissions: 30/30 tests passed across 7 files; the additional version-alignment test passed 1/1 after updating its new-package version-code range.
- Installability and restore-credential guards: 14/14 tests passed.
- Signed Android release build and package/installability/signing guards passed.
- After final full build: Android web payload matches `dist`, 2574 files.
- Build log: `/tmp/zivosmedia-new-package-final-build-20260907.log`.
- Gate log: `/tmp/zivosmedia-new-package-final-update-20260907.log`.
- Focused log: `/tmp/zivosmedia-new-package-final-focused-20260907.log`.

These are source/build checks, not physical-device or Play-installed authenticated QA. The broad historical native QA matrix still pins old release metadata and is not claimed green.

## Remaining launch requirements

1. Internal upload, save, zero-error preview and publication completed. Native debug symbols remain missing (warning).
2. Provide a dedicated reviewer account with persistent sign-in instructions and complete App access.
3. The existing Kimlain tester list is configured. Install the Play-distributed app on Android using that account. Verify startup, sign-in, account deletion, links and notifications. Capture genuine screenshots per `android/store-listing/phone-screenshots/README.md`.
4. Complete truthful content rating, target audience, data safety, financial/health and other console declarations using actual service behavior. Existing draft documentation does not attest current production behavior.
5. New Digital Asset Links are staged locally, not deployed. Google Play signing SHA-256 is `86:83:9B:39:F4:D7:1E:0C:1E:D6:8B:15:76:6B:60:31:24:62:E9:19:F5:B7:A2:3F:93:BA:57:9C:6A:7B:AD:05`; upload cert is retained alongside it. Deploy narrowly and verify live association before claiming Android verified links.
6. Restore credentials remain disabled. Package-bound credential backend settings and live integration have not been changed/tested. Play Integrity is not integrated; its legacy backend still references an old package and is not claimed ready.
7. Resolve applicable previous policy issues and complete review before claiming public availability.

All unrelated dirty work is preserved. No git commit/push or website/backend deployment was performed in this task.

## Continued console setup

- Advertising ID declaration saved as **No**; Console confirmed Change saved. Android source explicitly removes `com.google.android.gms.permission.AD_ID`, the merged release manifest contains no AD_ID permission, and native AdSense is disabled. Contains ads remains Yes because sponsored content exists.
- App content now reports **6 declarations need attention**: sign-in details, content ratings, target audience, data safety, financial features, health.
- Google explicitly blocks the target-audience questionnaire until Sign in details is completed. The repository's stated intended audience is adults 18+.
- Opened the new app Sign in details form, selected restricted access Yes, and inspected Add details. Nothing was submitted without credentials. Required: a dedicated reusable account, password if applicable, any extra access steps in English, and verified access to all app features. Google states reviewers cannot create accounts or contact the developer and OTP-dependent credentials must be reusable/non-expiring.
- No reviewer account was found in repository release instructions. Previous suspended-app content navigation did not open; no old credentials were recovered.
- Public production remains inactive. Internal testing remains the previously verified active release.

## Content-rating draft and feature review

Saved IARC questionnaire draft in Console (confirmed "Your changes have been saved"):

- Contact: support@zivosmedia.com; category Social or Communication, subtype Social.
- Dating/sexual-relationship purpose: No; no dating route found in current App.tsx.
- Public nudity and non-newsworthy graphic violence permitted: No, matching the published SocialMediaPolicy prohibition. An old AdultDiscoveryPage exists in source but is not imported/routed in current App.tsx; it was not treated as an active app feature.
- Shares current precise location with users: Yes; PersonalChat and GroupChat use geolocation and render LocationShareBubble.
- Digital-goods purchases: No, matching the nativeDigitalPurchasePolicy restriction.
- User/content blocking: Yes; reporting: Yes, matching profile and chat safety controls.
- Chat moderation and invited-friends-only interactions: unanswered pending confirmation of effective behavior. Report submission and profile visibility alone do not prove either complete capability.

No final rating was generated or submitted. IARC entry terms were accepted as part of the authorized store setup; terms reference https://web.iarcservices.com/terms .

Health and financial declarations remain unsubmitted. Current source includes WalletPage and TravelInsurance routes, wellness notification settings, and clinic/fitness partner links; simply selecting "none" without clarifying their effective behavior would not be supported. WalletPage uses native purchase restrictions but also exposes payout/payment method surfaces. TravelInsurance includes coverage and commercial claims that require provider verification before public submission.

Local sign-in supports email/password as well as email-code fallback. No reviewer credential was found in release documentation or task-scoped local environment variable names, and no service-role auth API credential was present there. No personal account was reset, no email sent, no account created, and no auth bypass introduced.

## Completed content rating and initial Data safety draft

Content rating is now COMPLETED AND SAVED to Publishing overview; Console confirmed Change saved. Prior draft/unanswered notes above are historical.

- Chat moderation Yes: AdminModerationPage invokes admin-moderation-review, which supports direct_message/group_message visibility actions; ChatHubPage mounts TripChatSheet with automated and administrator moderation paths.
- Invited-friends-only interactions No: PrivacySettingsPage explicitly states non-contact alert preference does not block messages; useAllowMessageRequests controls alerts, not message authorization.
- Generated ratings: North America ESRB Teen; Brazil 12+; Europe PEGI Parental Guidance; Germany USK 12+; generic/rest of world, Russia and South Korea 12+. Interactive elements Users Interact and Shares Location. Ratings saved, not yet sent for public review. Intended audience remains separately 18+.
- App content reduced from 6 to 5 declarations needing attention.

Initial Data safety draft saved (not finalized): collects/shares required data Yes; encryption in transit Yes (release cleartext disabled); supported account methods username/password, username with other authentication, password with additional authentication, and OAuth. Canonical deletion URL entered and verified saved.

Live browser verification: https://zivosmedia.com/delete-account renders Delete Your ZIVO Account, in-app deletion steps, email request alternatives, deleted/retained data and 30-day grace period. No deletion request was sent. https://zivosmedia.com/legal/privacy renders Privacy Policy and its collection disclosure covering account identity, payment/booking data, messages, images/video, audio/calls, files, preferences, location, device identifiers and usage. This establishes public page availability/content, not backend deletion execution or the full correctness of every policy claim.

Data types/usage/sharing form still requires completion against current implementation and SDK/provider handling. No independent-security-review badge claimed. Public launch still blocked by reviewer access, remaining declarations and Play-installed Android QA/screenshots.

### Detailed Data safety category draft

Saved draft on Data types step; Console confirmed Your changes have been saved. Selected 23 types: approximate/precise location; name, email, user ID, address, phone, other personal information (e.g. DOB/identity details); payment info, purchase history, other financial info; in-app messages; photos/videos; voice recordings/music/other audio attachments; files/documents; interactions, in-app search history, other UGC, other actions; device/other IDs (push registrations).

The selections are an initial inventory based on live privacy disclosures and current routes/source, not a completed accuracy attestation. Health/fitness, calendar, contacts, web-browsing and diagnostics remain unselected pending scope verification. Data handling/purposes/recipient exemptions still require review. The final declaration has not been submitted.

# DeepSeek run — 2026-06-25T02:15:28.398Z

- model: deepseek-chat
- task: ZIVO super-app (Capacitor+React, appId com.hizovo.app) push-notification PRODUCTION-READINESS SCAN. Confirmed from code audit: (1) Client usePushNotifications.ts registers native iOS/Android via Capacitor PushNotifications and invokes register-push-token; useWebPush via register-web-push. (2) Delivery (attached send-push-notification) uses modern APNs token auth (APNS_KEY_ID/APNS_TEAM_ID/APNS_PRIVATE_KEY/APNS_BUNDLE_ID/APNS_ENV) + FCM HTTP v1 (FCM_SERVICE_ACCOUNT_JSON via oauth2) + VAPID web-push (VAPID_PUBLIC_KEY/PRIVATE/SUBJECT). (3) iOS App.entitlements: aps-environment=development, UIBackgroundModes=remote-notification, usernotifications.communication=true. (4) Android: android/build.gradle has classpath com.google.gms:google-services:4.4.4; app/build.gradle conditionally applies google-services plugin ONLY if google-services.json exists else logs 'Push Notifications wont work'; google-services.json is MISSING and gitignored. (5) Diagnostic (attached send-test-notification) checks env FCM_SERVER_KEY (legacy/decommissioned) but real sender uses FCM_SERVICE_ACCOUNT_JSON = MISMATCH. (6) repo qa:push-notification-contracts passes 0 failures. TASK: For iOS+Android+Web push to actually DELIVER in TestFlight/Play production, what is missing or wrong? Give a prioritized blocker list. Catch anything I missed: APNS_ENV vs aps-environment=development production mismatch, FCM service-account project_id vs google-services.json project mismatch, client VAPID public key wiring, Android 13 POST_NOTIFICATIONS runtime permission, iOS provisioning-profile push capability, token cleanup on 410/unregistered. Be specific and terse, max ~400 words.
- files: supabase/functions/send-push-notification/index.ts, supabase/functions/send-test-notification/index.ts

---

# Push Notification Production-Readiness Scan

## Plan

Audit the 6 files for production-blocking gaps across iOS/Android/Web delivery. Prioritize by blast radius (data loss > silent failure > degraded UX).

## Prioritized Blocker List

### P0 — `aps-environment=development` in iOS entitlements (PRODUCTION BLOCKER)
**File:** `ios/App/App/App.entitlements`
- **Bug:** `aps-environment` is set to `development`. Apple's APNs sandbox rejects production push tokens. In TestFlight/App Store, **all iOS push notifications will silently fail** (device registers a production token, server sends to sandbox → 400 BadDeviceToken).
- **Fix:** Change to `aps-environment=production` for release builds. Use a build-script or Xcode config to swap to `development` for debug builds (or maintain two entitlement files).

### P0 — `send-test-notification` checks `FCM_SERVER_KEY` (legacy) instead of `FCM_SERVICE_ACCOUNT_JSON` (MISMATCH)
**File:** `supabase/functions/send-test-notification/index.ts` (line ~78)
- **Bug:** Diagnostic checks `!!Deno.env.get("FCM_SERVER_KEY")` — this is the **decommissioned** legacy FCM server key. The real sender (`send-push-notification`) uses `FCM_SERVICE_ACCOUNT_JSON`. So the diagnostic reports `fcm: false` even when FCM is fully configured, and `fcm: true` when only the legacy key is set (which won't work).
- **Fix:** Change to `!!Deno.env.get("FCM_SERVICE_ACCOUNT_JSON")`.

### P1 — Android `google-services.json` is MISSING and gitignored
**File:** `android/app/google-services.json` (does not exist)
- **Bug:** `app/build.gradle` conditionally applies the Google Services plugin only if this file exists. Without it, FCM registration **silently fails** on Android — no crash, no error, just `"Push Notifications wont work"` log. The app compiles and runs, but no Android push tokens are ever generated.
- **Fix:** Generate `google-services.json` from Firebase Console (project matching `FCM_SERVICE_ACCOUNT_JSON`'s `project_id`), place it in `android/app/`. Add to `.gitignore` (it's a secret) but document in `AGENTS.md` or a setup doc.

### P1 — No Android 13+ `POST_NOTIFICATIONS` runtime permission request
**File:** `src/hooks/usePushNotifications.ts` (client-side registration)
- **Bug:** Android 13 (API 33+) requires `POST_NOTIFICATIONS` permission before registering for push. Without it, `PushNotifications.register()` silently fails. The Capacitor plugin doesn't request it automatically.
- **Fix:** Before `PushNotifications.register()`, check `Capacitor.getPlatform() === 'android'` and request `android.permission.POST_NOTIFICATIONS` via `Permissions.request()`.

### P2 — No token cleanup on 410/UNREGISTERED for APNs
**File:** `supabase/functions/send-push-notification/index.ts`
- **Bug:** The FCM sender detects `UNREGISTERED`/`NOT_FOUND` and returns `{ error: "UNREGISTERED" }`, but the caller (`send-push-notification`) **does not deactivate the token** in the `device_tokens` table. The APNs sender returns `{ error: "APNS 410: ..." }` but also doesn't clean up. Stale tokens accumulate, wasting API calls and polluting logs.
- **Fix:** After detecting a stale token (APNS 410, FCM UNREGISTERED), call `supabase.from("device_tokens").update({ is_active: false }).eq("id", token.id)`.

### P2 — VAPID public key not wired to client registration
**File:** `src/hooks/useWebPush.ts` (client-side)
- **Bug:** The client's `PushManager.subscribe()` call must include `applicationServerKey` (the VAPID public key). If it's missing or uses a different key than the server's `VAPID_PUBLIC_KEY`, web push subscriptions will fail or produce mismatched keys.
- **Fix:** Verify the client fetches the VAPID public key from the server (or an env var) and passes it as `Uint8Array` to `subscribe({ userVisibleOnly: true, applicationServerKey })`.

## Summary

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | `aps-environment=development` | iOS push 100% dead in production |
| P0 | `send-test-notification` checks wrong env var | False diagnostic, can't verify FCM |
| P1 | Missing `google-services.json` | Android push 100% dead |
| P1 | No `POST_NOTIFICATIONS` permission | Android 13+ push 100% dead |
| P2 | No token cleanup on stale tokens | Wasted API calls, log pollution |
| P2 | VAPID key wiring unverified | Web push may silently fail |

**Owner must:** (1) Generate `google-services.json` from Firebase Console and place in `android/app/`. (2) Switch `aps-environment` to `production` for release builds. (3) Set `FCM_SERVICE_ACCOUNT_JSON` Supabase secret (not `FCM_SERVER_KEY`). (4) Verify VAPID public key is wired in client registration code.

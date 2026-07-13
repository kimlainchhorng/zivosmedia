# Notifications Readiness Audit

**Date:** 2026-06-08 · Audit only. Part of the ZIVO platform readiness pass. Evidence cites real files.

## Scope
iOS push, Android push, web push, in-app alerts, notification preferences, delivery logs, failed-notification retries. (Email/SMS alerts are in `EMAIL_SMS_ALERTS_AUDIT.md`.)

## Inventory

| Capability | Status | Path(s) | Notes |
|------------|--------|---------|-------|
| Web push (VAPID) | ✅ Complete | `src/hooks/usePushNotifications.ts`, `supabase/functions/register-web-push/`, `push_subscriptions` table, `src/sw.js` | Service-worker subscriptions, p256dh/auth keys, RLS-gated |
| In-app alerts | ✅ Complete | `src/components/notifications/NotificationBell.tsx`, `notifications` table (Realtime) | Real-time inbox, read/unread, category icons |
| Notification preferences | ✅ Complete | `src/pages/account/NotificationSettings.tsx`, `src/hooks/useNotificationPreferences.ts`, `notification_preferences` table | 16 categories, quiet hours, SMS consent, phone masking |
| Device token registry | ✅ Complete | `supabase/functions/register-push-token/`, `device_tokens` table | platform/is_active/last_used_at |
| Push delivery logs | ✅ Complete | `push_notification_logs` table | pending/sent/delivered/failed/opened + timestamps |
| Admin broadcast | ✅ Complete | `supabase/functions/admin-broadcast-notification/` (verify_jwt), `src/pages/admin/AdminBroadcastPage.tsx`, `push_segments/campaigns` | Segment campaigns |
| iOS push (APNs) | 🟡 Partial | `ios/App/App/App.entitlements`, `NotificationServiceExtension/NotificationService.swift` | Registration + rich notifications work; **`aps-environment=development`** (sandbox cert only) |
| Android push (FCM) | 🔴 Broken | `supabase/functions/send-push-notification/index.ts` (~line 643) | Uses Google's **decommissioned legacy `/fcm/send`**; missing key returns `success:true` silently |
| Incoming-call push | 🟡 Stub | `usePushNotifications.ts` (receiver only) | Client handles `incoming_call` payload but **no server emitter** → backgrounded users miss calls |
| Failed-notification retries | 🟡 Stub | `send-push-notification` logs failures | No retry queue/cron; `jobs_queue` table exists but unwired |

**Providers:** Web Push (VAPID), Capacitor native, Supabase Realtime (in-app). APNs sandbox-only; FCM broken.

## Top gaps
- **P0** Android FCM on dead endpoint + silent success on missing creds → migrate to FCM HTTP v1, fail loudly on missing config.
- **P0** No server-side emitter for incoming-call push (only client receiver) → calls invisible when app backgrounded.
- **P1** iOS `aps-environment=development` → switch to `production` for store builds; add Android notification channels (Android 8+).
- **P1** No retry scheduler for failed pushes (wire `jobs_queue` + pg_cron).
- **P2** No stale-device-token cleanup; campaign has no per-recipient backoff.

## Readiness flags
- P0: Android FCM broken; incoming-call emitter missing; silent-success on missing provider creds.
- P1: iOS sandbox entitlement; no Android channels; no retry scheduler.
- P2: token cleanup; campaign backoff; content-length guards.

## Maps to roadmap
PR 14 (notifications readiness plan) → PR 15 (iOS/Android push implementation). Retry/log work pairs with PR 27 (webhook logs/retries).

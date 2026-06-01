#!/usr/bin/env node
/**
 * Push notification and notification-center contract check.
 *
 * Verifies authenticated token registration, push preference opt-outs,
 * digest/marketing/test dispatch routing, and service worker push handling.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requireMatch(id, text, pattern, relativePath) {
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} missing pattern ${pattern}`);
  }
}

function requireNotContains(id, text, needle, relativePath) {
  if (text.includes(needle)) {
    failures.push(`${id}: ${relativePath} must not contain ${JSON.stringify(needle)}`);
  }
}

function requireStrictSecurity(id, relativePath, text, risk = 80) {
  requireContains(id, text, "withSecurity(", relativePath);
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, 'allowedMethods: ["POST"]', relativePath);
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
  requireContains(id, text, `blockNetworkRiskAt: ${risk}`, relativePath);
  if (text.includes('"Access-Control-Allow-Origin": "*"')) {
    failures.push(`${id}: ${relativePath} must not use wildcard CORS`);
  }
}

const contracts = [
  {
    id: "authenticated-token-registration",
    category: "registration",
    check() {
      const nativePath = "supabase/functions/register-push-token/index.ts";
      const webPath = "supabase/functions/register-web-push/index.ts";
      const unregisterPath = "supabase/functions/unregister-web-push/index.ts";
      const integrityPath = "supabase/functions/check-device-integrity/index.ts";
      const corsPath = "supabase/functions/_shared/cors.ts";
      const hookPath = "src/hooks/usePushNotifications.ts";
      const vapidKeyPath = "src/lib/push/vapidKey.ts";
      const nativeRegister = source(nativePath);
      const webRegister = source(webPath);
      const webUnregister = source(unregisterPath);
      const deviceIntegrity = source(integrityPath);
      const cors = source(corsPath);
      const pushHook = source(hookPath);
      const vapidKey = source(vapidKeyPath);

      for (const [relativePath, text] of [
        [nativePath, nativeRegister],
        [webPath, webRegister],
        [unregisterPath, webUnregister],
      ]) {
        requireContains(this.id, text, "Missing authorization header", relativePath);
        requireContains(this.id, text, "Invalid or expired token", relativePath);
      }
      requireContains(this.id, nativeRegister, '.from("device_tokens")', nativePath);
      requireContains(this.id, nativeRegister, '.eq("user_id", user.id)', nativePath);
      requireContains(this.id, webRegister, '.from("push_subscriptions")', webPath);
      requireContains(this.id, webRegister, "user_id: user.id", webPath);
      requireContains(this.id, webUnregister, '.eq("user_id", user.id)', unregisterPath);
      requireContains(this.id, cors, "x-supabase-client-platform", corsPath);
      requireContains(this.id, pushHook, "urlBase64ToUint8Array(vapidPublicKey)", hookPath);
      requireContains(this.id, vapidKey, "window.atob", vapidKeyPath);
      requireContains(this.id, vapidKey, "Uint8Array", vapidKeyPath);
      requireContains(this.id, pushHook, "getSupabaseFunctionErrorDetails", hookPath);
      requireContains(this.id, pushHook, "register-push-token failed", hookPath);
      requireContains(this.id, pushHook, "Could not unregister token: auth session unavailable", hookPath);
      requireContains(this.id, pushHook, "deactivate: true", hookPath);
      requireNotContains(this.id, pushHook, '.from("device_tokens")', hookPath);
      requireNotContains(this.id, pushHook, ".upsert(payload", hookPath);
      for (const [relativePath, text] of [
        [webPath, webRegister],
        [unregisterPath, webUnregister],
        [integrityPath, deviceIntegrity],
      ]) {
        requireStrictSecurity(this.id, relativePath, text);
        requireContains(this.id, text, "const cors", relativePath);
      }
      requireContains(this.id, pushHook, "if (!user?.id) return;", hookPath);
      requireContains(this.id, pushHook, "Authorization: `Bearer ${activeSession.access_token}`", hookPath);
    },
  },
  {
    id: "database-push-preferences",
    category: "preferences",
    check() {
      const prefsPath = "src/hooks/useNotificationPreferences.ts";
      const settingsPath = "src/pages/account/NotificationSettings.tsx";
      const prefs = source(prefsPath);
      const settings = source(settingsPath);

      for (const needle of [
        "pushEnabled: boolean",
        "push_enabled: boolean",
        "pushEnabled: raw.push_enabled",
        'supabase.functions.invoke("notification-preferences-update"',
      ]) {
        requireContains(this.id, prefs, needle, prefsPath);
      }
      requireStrictSecurity(this.id, "supabase/functions/notification-preferences-update/index.ts", source("supabase/functions/notification-preferences-update/index.ts"));
      requireContains(this.id, settings, "updatePrefs.mutate({ pushEnabled: true, inAppEnabled: true })", settingsPath);
      requireContains(this.id, settings, "updatePrefs.mutate({ pushEnabled: false })", settingsPath);
    },
  },
  {
    id: "opt-out-aware-dispatch",
    category: "dispatch",
    check() {
      const paths = {
        dispatch: "supabase/functions/notify-dispatch/index.ts",
        cron: "supabase/functions/notifications-cron/index.ts",
        weeklyDigest: "supabase/functions/notifications-weekly-digest/index.ts",
        appUpdate: "supabase/functions/notify-app-update/index.ts",
        adminTest: "supabase/functions/send-test-notification/index.ts",
        sendPush: "supabase/functions/send-push-notification/index.ts",
        eatsConfirmed: "supabase/functions/notify-eats-order-confirmed/index.ts",
        lodgingConfirmed: "supabase/functions/notify-lodging-booking-confirmed/index.ts",
        marketingTick: "supabase/functions/marketing-automations-tick/index.ts",
        webPushHook: "src/hooks/useWebPush.ts",
      };
      const files = Object.fromEntries(Object.entries(paths).map(([key, relativePath]) => [key, source(relativePath)]));

      for (const key of ["dispatch", "cron", "weeklyDigest", "appUpdate", "sendPush", "eatsConfirmed", "lodgingConfirmed"]) {
        requireStrictSecurity(this.id, paths[key], files[key]);
      }
      requireStrictSecurity(this.id, paths.adminTest, files.adminTest, 85);
      for (const key of ["cron", "weeklyDigest", "appUpdate", "eatsConfirmed", "lodgingConfirmed"]) {
        requireContains(this.id, files[key], "const corsHeaders = ctx.corsHeaders", paths[key]);
      }
      for (const key of ["cron", "weeklyDigest"]) {
        requireContains(this.id, files[key], "skipBotDetection: true", paths[key]);
        requireContains(this.id, files[key], "x-cron-secret", paths[key]);
        requireContains(this.id, files[key], "cronOk", paths[key]);
        requireContains(this.id, files[key], "notify-dispatch", paths[key]);
      }
      for (const needle of [
        '.from("notification_preferences")',
        "push_enabled",
        "marketing_enabled",
        "operational_enabled",
        "automated_messages_enabled",
        "push_disabled",
        "marketing_disabled",
        "recipient_preferences_disabled",
      ]) {
        requireContains(this.id, files.sendPush, needle, paths.sendPush);
      }
      for (const needle of [
        'payload.category !== "marketing"',
        "marketing_enabled",
        "const deliveryAllowed = eventFlagAllowed && marketingAllowed",
        "marketing_disabled",
      ]) {
        requireContains(this.id, files.dispatch, needle, paths.dispatch);
      }
      requireMatch(this.id, files.dispatch, /requested\.has\("push"\) && pushEnabled && deliveryAllowed/, paths.dispatch);
      requireMatch(this.id, files.dispatch, /requested\.has\("email"\) && emailEnabled && deliveryAllowed/, paths.dispatch);
      requireMatch(this.id, files.dispatch, /requested\.has\("sms"\) && smsEnabled && deliveryAllowed/, paths.dispatch);
      requireContains(this.id, files.weeklyDigest, 'category: "marketing"', paths.weeklyDigest);
      requireContains(this.id, files.weeklyDigest, 'channels: ["inbox", "email"]', paths.weeklyDigest);
      requireContains(this.id, files.appUpdate, "is_admin", paths.appUpdate);
      requireContains(this.id, files.appUpdate, "app_version_releases", paths.appUpdate);
      requireContains(this.id, files.appUpdate, "send-push-notification", paths.appUpdate);
      requireContains(this.id, files.eatsConfirmed, "customer_id !== user.id", paths.eatsConfirmed);
      requireContains(this.id, files.eatsConfirmed, 'payment_status !== "paid"', paths.eatsConfirmed);
      requireContains(this.id, files.lodgingConfirmed, "guest_id !== user.id", paths.lodgingConfirmed);
      requireContains(this.id, files.adminTest, "notify-dispatch", paths.adminTest);
      requireContains(this.id, files.adminTest, 'category: "transactional"', paths.adminTest);
      requireContains(this.id, files.marketingTick, "notify-dispatch", paths.marketingTick);
      requireContains(this.id, files.marketingTick, 'notification_type: "marketing_automation"', paths.marketingTick);
      requireContains(this.id, files.marketingTick, 'category: "marketing"', paths.marketingTick);
      requireContains(this.id, files.webPushHook, 'supabase.functions.invoke("notify-dispatch"', paths.webPushHook);
      requireContains(this.id, files.webPushHook, 'event_type: "push_test"', paths.webPushHook);
      requireContains(this.id, files.webPushHook, 'channels: ["push"]', paths.webPushHook);
      if (files.webPushHook.includes('supabase.functions.invoke("send-push-notification"')) {
        failures.push(`${this.id}: ${paths.webPushHook} must route tests through notify-dispatch`);
      }
    },
  },
  {
    id: "service-worker-push-routing",
    category: "client-runtime",
    check() {
      const swPath = "src/sw.js";
      const serviceWorker = source(swPath);
      for (const needle of [
        "self.addEventListener('push'",
        "showNotification",
        "self.addEventListener('notificationclick'",
        "notification_type",
        "Incoming ZIVO call",
      ]) {
        requireContains(this.id, serviceWorker, needle, swPath);
      }
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

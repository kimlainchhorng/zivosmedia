import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("push notifications and notification-center workflow", () => {
  it("keeps the standalone push notification contract gate wired into platform audit", () => {
    const contractScript = read("scripts/qa/push-notification-contracts.mjs");
    const coverageScript = read("scripts/qa/workflow-coverage.mjs");
    const packageJson = read("package.json");

    for (const contractId of [
      "authenticated-token-registration",
      "database-push-preferences",
      "opt-out-aware-dispatch",
      "service-worker-push-routing",
    ]) {
      expect(contractScript).toContain(contractId);
    }

    expect(coverageScript).toContain("qa:push-notification-contracts");
    expect(packageJson).toContain('"qa:push-notification-contracts"');
    expect(packageJson).toContain("npm run qa:push-notification-contracts");
  });

  it("requires an authenticated user before saving push tokens or subscriptions", () => {
    const nativeRegister = read("supabase/functions/register-push-token/index.ts");
    const webRegister = read("supabase/functions/register-web-push/index.ts");
    const webUnregister = read("supabase/functions/unregister-web-push/index.ts");
    const deviceIntegrity = read("supabase/functions/check-device-integrity/index.ts");
    const cors = read("supabase/functions/_shared/cors.ts");
    const pushHook = read("src/hooks/usePushNotifications.ts");

    expect(nativeRegister).toContain("Missing authorization header");
    expect(nativeRegister).toContain("Invalid or expired token");
    expect(nativeRegister).toContain(".from(\"device_tokens\")");
    expect(nativeRegister).toContain(".eq(\"user_id\", user.id)");

    expect(webRegister).toContain("Missing authorization header");
    expect(webRegister).toContain("Invalid or expired token");
    expect(webRegister).toContain(".from(\"push_subscriptions\")");
    expect(webRegister).toContain("user_id: user.id");

    expect(webUnregister).toContain("Missing authorization header");
    expect(webUnregister).toContain("Invalid or expired token");
    expect(webUnregister).toContain(".eq(\"user_id\", user.id)");

    expect(cors).toContain("x-supabase-client-platform");
    for (const source of [webRegister, webUnregister, deviceIntegrity]) {
      expect(source).toContain("withSecurity(");
      expect(source).toContain("const cors");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(pushHook).toContain("if (!user?.id) return;");
    expect(pushHook).toContain("Authorization: `Bearer ${activeSession.access_token}`");
  });

  it("uses the database push preference when enabling and disabling push", () => {
    const prefsHook = read("src/hooks/useNotificationPreferences.ts");
    const settingsPage = read("src/pages/account/NotificationSettings.tsx");

    expect(prefsHook).toContain("pushEnabled: boolean");
    expect(prefsHook).toContain("push_enabled: boolean");
    expect(prefsHook).toContain("pushEnabled: raw.push_enabled");
    expect(prefsHook).toContain('functions.invoke("notification-preferences-update"');
    expect(prefsHook).not.toMatch(/from\("notification_preferences"\)[\s\S]{0,260}\.(insert|update|upsert|delete)/);

    expect(settingsPage).toContain("updatePrefs.mutate({ pushEnabled: true, inAppEnabled: true })");
    expect(settingsPage).toContain("updatePrefs.mutate({ pushEnabled: false })");
  });

  it("keeps notification preference writes behind validated server-side intake", () => {
    const prefsFn = read("supabase/functions/notification-preferences-update/index.ts");
    const prefsGate = read("supabase/migrations/20260601104500_notification_preferences_server_gate.sql");
    const prefsHook = read("src/hooks/useNotificationPreferences.ts");

    expect(prefsFn).toContain('withSecurity("notification-preferences-update"');
    expect(prefsFn).toContain("strictCors: true");
    expect(prefsFn).toContain('trackNetwork: "suspicious"');
    expect(prefsFn).toContain("blockNetworkRiskAt: 80");
    expect(prefsFn).toContain("auth.getUser(token)");
    expect(prefsFn).toContain('from("notification_preferences")');
    expect(prefsFn).toContain('from("profiles")');
    expect(prefsFn).toContain("sms_opted_out: false");
    expect(prefsFn).toContain("sms_consent_at: now");
    expect(prefsFn).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "notification_preferences_block_direct_insert",
      "notification_preferences_block_direct_update",
    ]) {
      expect(prefsGate).toContain(policy);
    }
    expect(prefsGate).toContain("AS RESTRICTIVE");
    expect(prefsGate).toContain("trusted server-side validation");

    expect(prefsHook).toContain('action: "update"');
    expect(prefsHook).toContain('action: "reenable_sms"');
    expect(prefsHook).not.toMatch(/from\("profiles"\)[\s\S]{0,220}\.update\(\{[\s\S]{0,120}sms_/);
  });

  it("routes digest, marketing, and test-send paths through opt-out aware dispatch", () => {
    const dispatch = read("supabase/functions/notify-dispatch/index.ts");
    const cron = read("supabase/functions/notifications-cron/index.ts");
    const weeklyDigest = read("supabase/functions/notifications-weekly-digest/index.ts");
    const appUpdate = read("supabase/functions/notify-app-update/index.ts");
    const adminTest = read("supabase/functions/send-test-notification/index.ts");
    const sendPush = read("supabase/functions/send-push-notification/index.ts");
    const eatsConfirmed = read("supabase/functions/notify-eats-order-confirmed/index.ts");
    const lodgingConfirmed = read("supabase/functions/notify-lodging-booking-confirmed/index.ts");
    const marketingTick = read("supabase/functions/marketing-automations-tick/index.ts");
    const webPushHook = read("src/hooks/useWebPush.ts");

    for (const source of [dispatch, cron, weeklyDigest, appUpdate, adminTest, sendPush, eatsConfirmed, lodgingConfirmed]) {
      expect(source).toContain("withSecurity(");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
    for (const source of [cron, weeklyDigest, appUpdate, eatsConfirmed, lodgingConfirmed]) {
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("blockNetworkRiskAt: 80");
    }
    for (const source of [cron, weeklyDigest]) {
      expect(source).toContain("skipBotDetection: true");
      expect(source).toContain("x-cron-secret");
      expect(source).toContain("cronOk");
      expect(source).toContain("notify-dispatch");
    }
    expect(adminTest).toContain("blockNetworkRiskAt: 85");
    expect(dispatch).toContain("blockNetworkRiskAt: 80");
    expect(sendPush).toContain("blockNetworkRiskAt: 80");
    expect(sendPush).toContain(".from(\"notification_preferences\")");
    expect(sendPush).toContain("push_enabled");
    expect(sendPush).toContain("marketing_enabled");
    expect(sendPush).toContain("operational_enabled");
    expect(sendPush).toContain("automated_messages_enabled");
    expect(sendPush).toContain("push_disabled");
    expect(sendPush).toContain("marketing_disabled");
    expect(sendPush).toContain("recipient_preferences_disabled");

    expect(dispatch).toContain("payload.category !== \"marketing\"");
    expect(dispatch).toContain("marketing_enabled");
    expect(dispatch).toContain("const deliveryAllowed = eventFlagAllowed && marketingAllowed");
    expect(dispatch).toContain("marketing_disabled");
    expect(dispatch).toMatch(/requested\.has\("push"\) && pushEnabled && deliveryAllowed/);
    expect(dispatch).toMatch(/requested\.has\("email"\) && emailEnabled && deliveryAllowed/);
    expect(dispatch).toMatch(/requested\.has\("sms"\) && smsEnabled && deliveryAllowed/);

    expect(weeklyDigest).toContain("notify-dispatch");
    expect(weeklyDigest).toContain('category: "marketing"');
    expect(weeklyDigest).toContain('channels: ["inbox", "email"]');

    expect(appUpdate).toContain("is_admin");
    expect(appUpdate).toContain("app_version_releases");
    expect(appUpdate).toContain("send-push-notification");

    expect(eatsConfirmed).toContain("customer_id !== user.id");
    expect(eatsConfirmed).toContain('payment_status !== "paid"');
    expect(eatsConfirmed).toContain("notifyEatsOrderConfirmed");
    expect(lodgingConfirmed).toContain("guest_id !== user.id");
    expect(lodgingConfirmed).toContain("notifyLodgingBookingConfirmed");

    expect(adminTest).toContain("notify-dispatch");
    expect(adminTest).toContain("channels");
    expect(adminTest).toContain('category: "transactional"');

    expect(marketingTick).toContain('notification_type: "marketing_automation"');
    expect(marketingTick).toContain('category: "marketing"');
    expect(marketingTick).toContain("notify-dispatch");
    expect(marketingTick).toContain("automation_id: auto.id");

    expect(webPushHook).toContain('supabase.functions.invoke("notify-dispatch"');
    expect(webPushHook).toContain('event_type: "push_test"');
    expect(webPushHook).toContain('channels: ["push"]');
    expect(webPushHook).not.toContain('supabase.functions.invoke("send-push-notification"');
  });

  it("keeps the service worker able to receive and route push notifications", () => {
    const serviceWorker = read("src/sw.js");

    expect(serviceWorker).toContain("self.addEventListener('push'");
    expect(serviceWorker).toContain("showNotification");
    expect(serviceWorker).toContain("self.addEventListener('notificationclick'");
    expect(serviceWorker).toContain("notification_type");
    expect(serviceWorker).toContain("Incoming ZIVO call");
  });
});

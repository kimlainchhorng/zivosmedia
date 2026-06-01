import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("push token lifecycle guard", () => {
  it("requires explicit permission, authenticated registration, and backend cleanup", () => {
    const webPushHook = read("src/hooks/useWebPush.ts");
    const nativePushHook = read("src/hooks/usePushNotifications.ts");
    const webRegister = read("supabase/functions/register-web-push/index.ts");
    const webUnregister = read("supabase/functions/unregister-web-push/index.ts");
    const nativeRegister = read("supabase/functions/register-push-token/index.ts");

    for (const browserGuard of [
      '"PushManager" in window',
      '"serviceWorker" in navigator',
      "Notification.requestPermission()",
      "navigator.serviceWorker.ready",
      "pushManager.subscribe",
      "urlBase64ToUint8Array(VAPID_PUBLIC_KEY)",
      "subscription.unsubscribe()",
    ]) {
      expect(webPushHook).toContain(browserGuard);
    }

    expect(webPushHook).toContain('"register-web-push"');
    expect(webPushHook).toContain('"unregister-web-push"');

    expect(nativePushHook).toContain("if (!user?.id) return;");
    expect(nativePushHook).toContain("pendingNativeTokenRef");
    expect(nativePushHook).toContain("setTimeout(() => {");
    expect(nativePushHook).toContain('"register-push-token"');
    expect(nativePushHook).toContain("Authorization: `Bearer ${activeSession.access_token}`");
    expect(nativePushHook).toContain("urlBase64ToUint8Array(vapidPublicKey)");

    for (const edgeFunction of [webRegister, webUnregister, nativeRegister]) {
      expect(edgeFunction).toContain("Missing authorization header");
      expect(edgeFunction).toContain("Invalid or expired token");
      expect(edgeFunction).toContain("withSecurity(");
      expect(edgeFunction).toContain("strictCors: true");
      expect(edgeFunction).toContain('trackNetwork: "suspicious"');
    }

    expect(webRegister).toContain(".from(\"push_subscriptions\")");
    expect(webRegister).toContain("user_id: user.id");
    expect(webUnregister).toContain(".eq(\"user_id\", user.id)");
    expect(webUnregister).toContain(".eq(\"endpoint\", endpoint)");

    expect(nativeRegister).toContain(".from(\"device_tokens\")");
    expect(nativeRegister).toContain(".eq(\"user_id\", user.id)");
    expect(nativeRegister).toContain(".neq(\"id\", data.id)");
    expect(nativeRegister).toContain("deactivate");
    expect(nativeRegister).toContain("is_active: false");
  });

  it("keeps push delivery preference-aware and outcome-logged before iOS, Android, or web send", () => {
    const sendPush = read("supabase/functions/send-push-notification/index.ts");
    const dispatch = read("supabase/functions/notify-dispatch/index.ts");
    const webPushHook = read("src/hooks/useWebPush.ts");

    for (const preferenceGuard of [
      ".from(\"notification_preferences\")",
      "push_enabled",
      "marketing_enabled",
      "operational_enabled",
      "automated_messages_enabled",
      "push_disabled",
      "marketing_disabled",
      "recipient_preferences_disabled",
    ]) {
      expect(sendPush).toContain(preferenceGuard);
    }

    for (const deliveryPath of [
      "sendVAPIDWebPush",
      "sendAPNS",
      "sendFCM",
      "VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "VAPID_SUBJECT",
      ".from(\"push_notification_logs\")",
      "updateNotificationLog",
    ]) {
      expect(sendPush).toContain(deliveryPath);
    }

    expect(dispatch).toContain("payload.category !== \"marketing\"");
    expect(dispatch).toContain("const deliveryAllowed = eventFlagAllowed && marketingAllowed");
    expect(dispatch).toContain("quiet_hours_start");
    expect(dispatch).toContain("quiet_hours_end");

    expect(webPushHook).toContain('supabase.functions.invoke("notify-dispatch"');
    expect(webPushHook).toContain('category: "transactional"');
    expect(webPushHook).not.toContain('supabase.functions.invoke("send-push-notification"');
  });

  it("routes notification clicks across core business domains in the service worker", () => {
    const serviceWorker = read("src/sw.js");

    for (const serviceWorkerGuard of [
      "self.addEventListener('push'",
      "showNotification",
      "self.addEventListener('notificationclick'",
      "notification_type",
      "incoming_call",
      "chat_message",
      "order_status_update",
      "order_delivered",
      "price_drop",
      "flight_status_update",
      "booking_update",
      "reservation_confirmed",
      "wallet_credited",
      "delivery_completed",
      "support_reply",
      "clients.openWindow",
    ]) {
      expect(serviceWorker).toContain(serviceWorkerGuard);
    }
  });

  it("keeps push lifecycle coverage visible in the platform readiness lane", () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const workflow = read("src/test/workflows/push-notifications-workflow.test.ts");
    const contractScript = read("scripts/qa/push-notification-contracts.mjs");

    expect(matrix).toContain("src/test/pushTokenLifecycle.test.ts");

    for (const contractId of [
      "authenticated-token-registration",
      "database-push-preferences",
      "opt-out-aware-dispatch",
      "service-worker-push-routing",
    ]) {
      expect(workflow).toContain(contractId);
      expect(contractScript).toContain(contractId);
    }
  });
});

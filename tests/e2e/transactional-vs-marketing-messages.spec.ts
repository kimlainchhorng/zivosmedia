import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test.describe("transactional versus marketing message contracts", () => {
  test("marketing sends enter notify-dispatch as opt-out-aware marketing", async () => {
    const campaign = read("supabase/functions/send-marketing-campaign/index.ts");
    const weeklyDigest = read("supabase/functions/notifications-weekly-digest/index.ts");
    const notificationsCron = read("supabase/functions/notifications-cron/index.ts");
    const marketingTick = read("supabase/functions/marketing-automations-tick/index.ts");
    const dispatch = read("supabase/functions/notify-dispatch/index.ts");

    for (const marketingSource of [campaign, weeklyDigest, notificationsCron, marketingTick]) {
      expect(marketingSource).toContain("notify-dispatch");
      expect(marketingSource).toContain('category: "marketing"');
    }

    expect(campaign).toContain('const DISPATCH_FUNCTION = "notify-dispatch"');
    expect(campaign).toContain('event_type: "marketing"');
    expect(campaign).toContain("dispatchResultForChannel");
    expect(campaign).toContain('event_type: "skipped"');
    expect(campaign).toContain('event_type: "sent"');
    expect(campaign).toContain('event_type: "failed"');

    expect(dispatch).toContain('payload.category !== "marketing"');
    expect(dispatch).toContain("marketing_enabled !== false");
    expect(dispatch).toContain("marketing_disabled");
    expect(dispatch).toContain("deliveryAllowed = eventFlagAllowed && marketingAllowed");
    expect(dispatch).toMatch(/requested\.has\("push"\) && pushEnabled && deliveryAllowed/);
    expect(dispatch).toMatch(/requested\.has\("email"\) && emailEnabled && deliveryAllowed/);
    expect(dispatch).toMatch(/requested\.has\("sms"\) && smsEnabled && deliveryAllowed/);
  });

  test("transactional receipts, refunds, security, and booking messages avoid marketing consent gates", async () => {
    const transactionalEmail = read("supabase/functions/send-transactional-email/index.ts");
    const dispatch = read("supabase/functions/notify-dispatch/index.ts");
    const refund = read("supabase/functions/process-refund/index.ts");
    const tripReceipt = read("supabase/functions/generate-trip-receipt/index.ts");
    const securityNotifications = read("supabase/functions/process-security-notifications/index.ts");
    const eatsNotifications = read("supabase/functions/_shared/eats-notifications.ts");
    const lodgingNotifications = read("supabase/functions/_shared/lodging-notifications.ts");

    expect(transactionalEmail).toContain('withSecurity("send-transactional-email"');
    expect(transactionalEmail).toContain("TEMPLATES_WITH_FALLBACK");
    expect(transactionalEmail).toContain("email_send_log");
    expect(transactionalEmail).toContain("suppressed_emails");
    expect(transactionalEmail).not.toContain("notification_preferences");
    expect(transactionalEmail).not.toContain("marketing_enabled");

    expect(dispatch).toContain('send-transactional-email');
    expect(dispatch).toContain('category?: "transactional" | "marketing" | "social" | "chat"');
    expect(dispatch).toContain("return null; // transactional");

    for (const transactionalCaller of [
      refund,
      tripReceipt,
      securityNotifications,
      eatsNotifications,
      lodgingNotifications,
    ]) {
      expect(transactionalCaller).toContain("send-transactional-email");
      expect(transactionalCaller).not.toContain('category: "marketing"');
    }
  });

  test("user settings and suppression tools make marketing opt-out visible and enforceable", async () => {
    const preferencesHook = read("src/hooks/useNotificationPreferences.ts");
    const settingsPage = read("src/pages/account/NotificationSettings.tsx");
    const unsubscribe = read("supabase/functions/handle-email-unsubscribe/index.ts");
    const suppression = read("supabase/functions/handle-email-suppression/index.ts");
    const consentWorkflow = read("src/test/workflows/email-marketing-consent.test.ts");

    expect(preferencesHook).toContain("marketingEnabled");
    expect(preferencesHook).toContain("marketing_enabled");
    expect(preferencesHook).toContain('supabase.functions.invoke("notification-preferences-update"');

    expect(settingsPage).toContain("Marketing & Promotions");
    expect(settingsPage).toContain("handleToggleMarketing");
    expect(settingsPage).toContain("marketingEnabled");

    expect(unsubscribe).toContain("List-Unsubscribe=One-Click");
    expect(unsubscribe).toContain('allowedMethods: ["GET", "POST"]');
    expect(unsubscribe).toContain(".from('suppressed_emails')");
    expect(unsubscribe).toContain("reason: 'unsubscribe'");
    expect(suppression).toContain("verifyWebhookRequest");
    expect(suppression).toContain('allowedMethods: ["POST"]');
    expect(suppression).toContain("invalid_signature");
    expect(suppression).toContain(".from('email_send_log')");

    expect(consentWorkflow).toContain("keeps transactional email separate from marketing campaign dispatch");
    expect(consentWorkflow).toContain("keeps consent basis and user-visible preference evidence");
  });

  test("platform readiness tracks this end-to-end regression as the marketing next step", async () => {
    const matrixScript = read("scripts/qa/platform-readiness-matrix.mjs");
    const workflowCoverage = read("scripts/qa/workflow-coverage.mjs");
    const packageJson = read("package.json");

    expect(matrixScript).toContain("npm run qa:email-marketing-contracts");
    expect(matrixScript).toContain("npm run qa:push-notification-contracts");
    expect(matrixScript).toContain("src/test/marketingConsentSuppression.test.ts");
    expect(matrixScript).toContain("src/test/pushTokenLifecycle.test.ts");
    expect(matrixScript).toContain("tests/e2e/transactional-vs-marketing-messages.spec.ts");
    expect(matrixScript).toContain("Keep transactional-vs-marketing separation");
    expect(matrixScript).toContain("campaign event logging green");
    expect(workflowCoverage).toContain("transactional-vs-marketing separation");
    expect(packageJson).toContain('"qa:email-marketing-contracts"');
    expect(packageJson).toContain('"qa:push-notification-contracts"');
  });
});

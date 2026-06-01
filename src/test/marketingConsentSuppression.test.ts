import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("marketing consent and suppression contracts", () => {
  it("keeps marketing opt-out scoped to marketing notifications only", () => {
    const dispatch = source("supabase/functions/notify-dispatch/index.ts");
    const campaign = source("supabase/functions/send-marketing-campaign/index.ts");
    const transactional = source("supabase/functions/send-transactional-email/index.ts");

    expect(dispatch).toContain('category?: "transactional" | "marketing" | "social" | "chat"');
    expect(dispatch).toContain("payload.category !== \"marketing\"");
    expect(dispatch).toContain("marketing_enabled !== false");
    expect(dispatch).toContain("marketing_disabled");
    expect(dispatch).toContain("deliveryAllowed = eventFlagAllowed && marketingAllowed");

    expect(campaign).toContain('category: "marketing" as const');
    expect(campaign).toContain('event_type: "marketing"');
    expect(campaign).toContain('const DISPATCH_FUNCTION = "notify-dispatch"');

    expect(transactional).toContain('withSecurity("send-transactional-email"');
    expect(transactional).toContain("TEMPLATES_WITH_FALLBACK");
    expect(transactional).not.toContain("notification_preferences");
    expect(transactional).not.toContain("marketing_enabled");
  });

  it("keeps provider suppression and one-click unsubscribe fail-closed before email send", () => {
    const transactional = source("supabase/functions/send-transactional-email/index.ts");
    const unsubscribe = source("supabase/functions/handle-email-unsubscribe/index.ts");
    const suppression = source("supabase/functions/handle-email-suppression/index.ts");

    expect(transactional).toContain(".from('suppressed_emails')");
    expect(transactional).toContain("Suppression check failed — refusing to send");
    expect(transactional).toContain("status: 'suppressed'");
    expect(transactional).toContain("reason: 'email_suppressed'");
    expect(transactional).toContain("Token exists but is already used");
    expect(transactional).toContain("email_send_log");

    expect(unsubscribe).toContain("List-Unsubscribe=One-Click");
    expect(unsubscribe).toContain(".from('suppressed_emails')");
    expect(unsubscribe).toContain("reason: 'unsubscribe'");
    expect(unsubscribe).toContain("onConflict: 'email'");
    expect(unsubscribe).toContain("skipBotDetection: true");

    expect(suppression).toContain("verifyWebhookRequest");
    expect(suppression).toContain("invalid_signature");
    expect(suppression).toContain("mapReasonToStatus");
    expect(suppression).toContain(".from('email_send_log')");
  });

  it("keeps the generated readiness matrix pointed at this focused consent guard", () => {
    const matrixScript = source("scripts/qa/platform-readiness-matrix.mjs");
    const workflow = source("src/test/workflows/email-marketing-consent.test.ts");

    expect(matrixScript).toContain("src/test/marketingConsentSuppression.test.ts");
    expect(workflow).toContain("transactional email separate from marketing campaign dispatch");
    expect(workflow).toContain("blocks unsubscribe and provider suppression before sending email");
  });
});

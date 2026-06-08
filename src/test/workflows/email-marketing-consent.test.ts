import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("email marketing, consent, and suppression workflow", () => {
  it("keeps the standalone email marketing contract gate wired into platform audit", () => {
    const contractScript = read("scripts/qa/email-marketing-contracts.mjs");
    const coverageScript = read("scripts/qa/workflow-coverage.mjs");
    const packageJson = read("package.json");

    for (const contractId of [
      "transactional-email-separated-from-marketing",
      "unsubscribe-and-provider-suppression",
      "campaign-delivery-events",
      "salon-campaign-consent",
      "consent-preferences-and-audit",
    ]) {
      expect(contractScript).toContain(contractId);
    }

    expect(coverageScript).toContain("qa:email-marketing-contracts");
    expect(packageJson).toContain('"qa:email-marketing-contracts"');
    expect(packageJson).toContain("npm run qa:email-marketing-contracts");
  });

  it("keeps transactional email separate from marketing campaign dispatch", () => {
    const transactional = read("supabase/functions/send-transactional-email/index.ts");
    const sms = read("supabase/functions/send-sms/index.ts");
    const campaign = read("supabase/functions/send-marketing-campaign/index.ts");
    const notifyDispatch = read("supabase/functions/notify-dispatch/index.ts");

    for (const source of [transactional, sms]) {
      expect(source).toContain("withSecurity(");
      expect(source).toContain("const corsHeaders = ctx.corsHeaders");
      expect(source).toContain("strictCors: true");
      expect(source).toContain('trackNetwork: "suspicious"');
      expect(source).toContain("blockNetworkRiskAt: 80");
      expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(transactional).toContain("TEMPLATES_WITH_FALLBACK");
    expect(transactional).toContain("templateName");
    expect(transactional).toContain("recipientEmail");
    expect(transactional).toContain("email_send_log");
    expect(transactional).toContain("suppressed_emails");
    expect(transactional).toContain("email_unsubscribe_tokens");

    expect(campaign).toContain('const DISPATCH_FUNCTION = "notify-dispatch"');
    expect(campaign).toContain('event_type: "marketing"');
    expect(campaign).toContain('category: "marketing"');
    expect(campaign).toContain("GENERIC_EMAIL_TEMPLATE");

    expect(notifyDispatch).toContain("payload.category !== \"marketing\"");
    expect(notifyDispatch).toContain("marketing_enabled");
    expect(notifyDispatch).toContain("marketing_disabled");
  });

  it("blocks unsubscribe and provider suppression before sending email", () => {
    const transactional = read("supabase/functions/send-transactional-email/index.ts");
    const unsubscribe = read("supabase/functions/handle-email-unsubscribe/index.ts");
    const suppression = read("supabase/functions/handle-email-suppression/index.ts");
    const suppressionMigration = read(
      "supabase/migrations/20260408020512_e2ebf67c-18ef-49c7-a06d-96e6b36791a9.sql",
    );

    expect(transactional).toContain(".from('suppressed_emails')");
    expect(transactional).toContain("reason: 'email_suppressed'");
    expect(transactional).toContain("Token exists but is already used");
    expect(transactional).toContain("status: 'suppressed'");

    expect(unsubscribe).toContain("List-Unsubscribe=One-Click");
    expect(unsubscribe).toContain(".from('email_unsubscribe_tokens')");
    expect(unsubscribe).toContain(".from('suppressed_emails')");
    expect(unsubscribe).toContain("reason: 'unsubscribe'");
    expect(unsubscribe).toContain("onConflict: 'email'");
    expect(unsubscribe).toContain('withSecurity("handle-email-unsubscribe"');
    expect(unsubscribe).toContain("const corsHeaders = ctx.corsHeaders");
    expect(unsubscribe).toContain("strictCors: true");
    expect(unsubscribe).toContain('trackNetwork: "suspicious"');
    expect(unsubscribe).toContain("skipBotDetection: true");
    expect(unsubscribe).not.toContain("'Access-Control-Allow-Origin': '*'");

    expect(suppression).toContain("verifyWebhookRequest");
    expect(suppression).toContain("invalid_signature");
    expect(suppression).toContain(".from('suppressed_emails')");
    expect(suppression).toContain(".from('email_send_log')");
    expect(suppression).toContain("mapReasonToStatus");

    expect(suppressionMigration).toContain("CREATE TABLE IF NOT EXISTS public.suppressed_emails");
    expect(suppressionMigration).toContain("CONSTRAINT suppressed_emails_email_key UNIQUE (email)");
    expect(suppressionMigration).toContain("CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens");
    expect(suppressionMigration).toContain("CREATE TABLE IF NOT EXISTS public.email_send_log");
  });

  it("records marketing campaign delivery as sent, skipped, or failed after dispatch", () => {
    const campaign = read("supabase/functions/send-marketing-campaign/index.ts");
    const eventsMigration = read(
      "supabase/migrations/20260422000026_a0b9eee0-ef04-481f-9474-f2db18a65a77.sql",
    );

    expect(campaign).toContain("dispatchResultForChannel");
    expect(campaign).toContain('withSecurity("send-marketing-campaign"');
    expect(campaign).toContain("const corsHeaders = ctx.corsHeaders");
    expect(campaign).toContain("strictCors: true");
    expect(campaign).toContain('trackNetwork: "suspicious"');
    expect(campaign).toContain("blockNetworkRiskAt: 85");
    expect(campaign).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(campaign).toContain("channelResult?.skipped");
    expect(campaign).toContain('event_type: "skipped"');
    expect(campaign).toContain('event_type: "sent"');
    expect(campaign).toContain('event_type: "failed"');
    expect(campaign).toContain("Promise.allSettled");
    expect(campaign).toContain("dispatchResults.filter");
    expect(campaign).not.toContain('event_type: "sent",\n        }))');

    expect(eventsMigration).toContain("CREATE TABLE public.marketing_campaign_events");
    expect(eventsMigration).toContain("event_type TEXT NOT NULL");
    expect(eventsMigration).toContain("metadata JSONB NOT NULL DEFAULT '{}'::jsonb");
    expect(eventsMigration).toContain("ALTER TABLE public.marketing_campaign_events ENABLE ROW LEVEL SECURITY");
  });

  it("requires explicit marketing consent for salon campaign cohorts and channels", () => {
    const salonCampaign = read("supabase/functions/salon-send-campaign/index.ts");
    const salonMigration = read("supabase/migrations/20260524390000_salon_campaigns.sql");
    const salonReminderMigration = read("supabase/migrations/20260524360000_salon_reminders.sql");

    expect(salonMigration).toContain("salon_campaign_resolve_cohort");
    expect(salonMigration).toContain("c.marketing_opt_in = true");
    expect(salonMigration).toContain("c.is_blocked = false");
    expect(salonMigration).toContain("salon_campaign_recipients");
    expect(salonMigration).toContain("idempotency_key TEXT NOT NULL UNIQUE");

    expect(salonCampaign).toContain("marketing_opt_in");
    expect(salonCampaign).toContain('withSecurity("salon-send-campaign"');
    expect(salonCampaign).toContain("const corsHeaders = ctx.corsHeaders");
    expect(salonCampaign).toContain("strictCors: true");
    expect(salonCampaign).toContain('trackNetwork: "suspicious"');
    expect(salonCampaign).toContain("blockNetworkRiskAt: 85");
    expect(salonCampaign).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(salonCampaign).toContain("r.sms_opt_in");
    expect(salonCampaign).toContain("r.email_opt_in");
    expect(salonCampaign).toContain("skipped_opt_out");
    expect(salonCampaign).toContain("Reply STOP to opt out.");
    expect(salonCampaign).toContain("salon-campaign-passthrough");

    expect(salonReminderMigration).toContain("marketing_opt_in");
    expect(salonReminderMigration).toContain("DEFAULT false");
  });

  it("keeps consent basis and user-visible preference evidence in the database/UI", () => {
    const emailConsentMigration = read(
      "supabase/migrations/20260202051526_be8b4e54-ffc7-4534-aaa6-abec65adfef1.sql",
    );
    const consentPolicyMigration = read(
      "supabase/migrations/20260203174741_708fcb48-34e2-4a51-9985-de4631f402dd.sql",
    );
    const notificationPrefs = read("src/hooks/useNotificationPreferences.ts");
    const notificationSettings = read("src/pages/account/NotificationSettings.tsx");
    const consentLogPage = read("src/pages/ConsentLogPage.tsx");

    expect(emailConsentMigration).toContain("CREATE TABLE public.email_consents");
    expect(emailConsentMigration).toContain("consent_type");
    expect(emailConsentMigration).toContain("consent_text");
    expect(emailConsentMigration).toContain("search_session_id");
    expect(emailConsentMigration).toContain("user_agent");
    expect(emailConsentMigration).toContain("metadata JSONB");
    expect(emailConsentMigration).toContain("ALTER TABLE public.email_consents ENABLE ROW LEVEL SECURITY");

    expect(consentPolicyMigration).toContain("Anyone can record their own consent");
    expect(consentPolicyMigration).toContain("SELECT restricted to admins only to protect PII");

    expect(notificationPrefs).toContain("marketingEnabled");
    expect(notificationPrefs).toContain("marketing_enabled");
    expect(notificationSettings).toContain("Marketing & Promotions");
    expect(notificationSettings).toContain("handleToggleMarketing");
    expect(consentLogPage).toContain("user_consent_logs");
  });
});

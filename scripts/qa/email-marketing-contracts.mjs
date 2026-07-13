#!/usr/bin/env node
/**
 * Email marketing, consent, and suppression contract check.
 *
 * Verifies that transactional email, marketing campaigns, suppression,
 * unsubscribe, consent evidence, and salon campaign opt-ins stay connected
 * across Edge Functions, migrations, and account preference UI.
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
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requirePostRoute(id, text, relativePath, risk = "blockNetworkRiskAt: 80") {
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, 'allowedMethods: ["POST"]', relativePath);
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
  requireContains(id, text, risk, relativePath);
}

const contracts = [
  {
    id: "transactional-email-separated-from-marketing",
    category: "dispatch",
    check() {
      const transactionalPath = "supabase/functions/send-transactional-email/index.ts";
      const smsPath = "supabase/functions/send-sms/index.ts";
      const campaignPath = "supabase/functions/send-marketing-campaign/index.ts";
      const notifyPath = "supabase/functions/notify-dispatch/index.ts";
      const transactional = source(transactionalPath);
      const sms = source(smsPath);
      const campaign = source(campaignPath);
      const notifyDispatch = source(notifyPath);

      for (const [relativePath, text] of [
        [transactionalPath, transactional],
        [smsPath, sms],
      ]) {
        requireContains(this.id, text, "withSecurity(", relativePath);
        requireContains(this.id, text, "const corsHeaders = ctx.corsHeaders", relativePath);
        requirePostRoute(this.id, text, relativePath);
        if (text.includes('"Access-Control-Allow-Origin": "*"')) {
          failures.push(`${this.id}: ${relativePath} must not use wildcard CORS`);
        }
      }

      for (const needle of [
        "TEMPLATES_WITH_FALLBACK",
        "templateName",
        "recipientEmail",
        "email_send_log",
        "suppressed_emails",
        "email_unsubscribe_tokens",
      ]) {
        requireContains(this.id, transactional, needle, transactionalPath);
      }
      for (const needle of [
        'const DISPATCH_FUNCTION = "notify-dispatch"',
        'event_type: "marketing"',
        'category: "marketing"',
        "GENERIC_EMAIL_TEMPLATE",
      ]) {
        requireContains(this.id, campaign, needle, campaignPath);
      }
      for (const needle of [
        'payload.category !== "marketing"',
        "marketing_enabled",
        "marketing_disabled",
      ]) {
        requireContains(this.id, notifyDispatch, needle, notifyPath);
      }
    },
  },
  {
    id: "unsubscribe-and-provider-suppression",
    category: "suppression",
    check() {
      const transactionalPath = "supabase/functions/send-transactional-email/index.ts";
      const unsubscribePath = "supabase/functions/handle-email-unsubscribe/index.ts";
      const suppressionPath = "supabase/functions/handle-email-suppression/index.ts";
      const migrationPath = "supabase/migrations/20260408020512_e2ebf67c-18ef-49c7-a06d-96e6b36791a9.sql";
      const transactional = source(transactionalPath);
      const unsubscribe = source(unsubscribePath);
      const suppression = source(suppressionPath);
      const migration = source(migrationPath);

      for (const needle of [
        ".from('suppressed_emails')",
        "reason: 'email_suppressed'",
        "Token exists but is already used",
        "status: 'suppressed'",
      ]) {
        requireContains(this.id, transactional, needle, transactionalPath);
      }
      for (const needle of [
        "List-Unsubscribe=One-Click",
        ".from('email_unsubscribe_tokens')",
        ".from('suppressed_emails')",
        "reason: 'unsubscribe'",
        "onConflict: 'email'",
        'withSecurity("handle-email-unsubscribe"',
        "strictCors: true",
        "skipBotDetection: true",
      ]) {
        requireContains(this.id, unsubscribe, needle, unsubscribePath);
      }
      requireContains(this.id, unsubscribe, 'allowedMethods: ["GET", "POST"]', unsubscribePath);
      requirePostRoute(this.id, suppression, suppressionPath);
      for (const needle of [
        "verifyWebhookRequest",
        "invalid_signature",
        ".from('suppressed_emails')",
        ".from('email_send_log')",
        "mapReasonToStatus",
      ]) {
        requireContains(this.id, suppression, needle, suppressionPath);
      }
      for (const needle of [
        "CREATE TABLE IF NOT EXISTS public.suppressed_emails",
        "CONSTRAINT suppressed_emails_email_key UNIQUE (email)",
        "CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens",
        "CREATE TABLE IF NOT EXISTS public.email_send_log",
      ]) {
        requireContains(this.id, migration, needle, migrationPath);
      }
    },
  },
  {
    id: "campaign-delivery-events",
    category: "events",
    check() {
      const campaignPath = "supabase/functions/send-marketing-campaign/index.ts";
      const migrationPath = "supabase/migrations/20260422000026_a0b9eee0-ef04-481f-9474-f2db18a65a77.sql";
      const campaign = source(campaignPath);
      const migration = source(migrationPath);

      for (const needle of [
        "dispatchResultForChannel",
        'withSecurity("send-marketing-campaign"',
        'allowedMethods: ["POST"]',
        "strictCors: true",
        "blockNetworkRiskAt: 85",
        "channelResult?.skipped",
        'event_type: "skipped"',
        'event_type: "sent"',
        'event_type: "failed"',
        "Promise.allSettled",
        "dispatchResults.filter",
      ]) {
        requireContains(this.id, campaign, needle, campaignPath);
      }
      if (campaign.includes('event_type: "sent",\n        }))')) {
        failures.push(`${this.id}: ${campaignPath} must record sent after dispatch results`);
      }
      for (const needle of [
        "CREATE TABLE public.marketing_campaign_events",
        "event_type TEXT NOT NULL",
        "metadata JSONB NOT NULL DEFAULT '{}'::jsonb",
        "ALTER TABLE public.marketing_campaign_events ENABLE ROW LEVEL SECURITY",
      ]) {
        requireContains(this.id, migration, needle, migrationPath);
      }
    },
  },
  {
    id: "salon-campaign-consent",
    category: "vertical-marketing",
    check() {
      const functionPath = "supabase/functions/salon-send-campaign/index.ts";
      const campaignMigrationPath = "supabase/migrations/20260524390000_salon_campaigns.sql";
      const reminderMigrationPath = "supabase/migrations/20260524360000_salon_reminders.sql";
      const salonCampaign = source(functionPath);
      const campaignMigration = source(campaignMigrationPath);
      const reminderMigration = source(reminderMigrationPath);

      for (const needle of [
        "salon_campaign_resolve_cohort",
        "c.marketing_opt_in = true",
        "c.is_blocked = false",
        "salon_campaign_recipients",
        "idempotency_key TEXT NOT NULL UNIQUE",
      ]) {
        requireContains(this.id, campaignMigration, needle, campaignMigrationPath);
      }
      for (const needle of [
        "marketing_opt_in",
        'withSecurity("salon-send-campaign"',
        'allowedMethods: ["POST"]',
        "strictCors: true",
        "blockNetworkRiskAt: 85",
        "r.sms_opt_in",
        "r.email_opt_in",
        "skipped_opt_out",
        "Reply STOP to opt out.",
        "salon-campaign-passthrough",
      ]) {
        requireContains(this.id, salonCampaign, needle, functionPath);
      }
      requireContains(this.id, reminderMigration, "marketing_opt_in", reminderMigrationPath);
      requireContains(this.id, reminderMigration, "DEFAULT false", reminderMigrationPath);
    },
  },
  {
    id: "consent-preferences-and-audit",
    category: "consent",
    check() {
      const emailConsentPath = "supabase/migrations/20260202051526_be8b4e54-ffc7-4534-aaa6-abec65adfef1.sql";
      const policyPath = "supabase/migrations/20260203174741_708fcb48-34e2-4a51-9985-de4631f402dd.sql";
      const prefsPath = "src/hooks/useNotificationPreferences.ts";
      const settingsPath = "src/pages/account/NotificationSettings.tsx";
      const consentLogPath = "src/pages/ConsentLogPage.tsx";
      const emailConsent = source(emailConsentPath);
      const policy = source(policyPath);
      const prefs = source(prefsPath);
      const settings = source(settingsPath);
      const consentLog = source(consentLogPath);

      for (const needle of [
        "CREATE TABLE public.email_consents",
        "consent_type",
        "consent_text",
        "search_session_id",
        "user_agent",
        "metadata JSONB",
        "ALTER TABLE public.email_consents ENABLE ROW LEVEL SECURITY",
      ]) {
        requireContains(this.id, emailConsent, needle, emailConsentPath);
      }
      requireContains(this.id, policy, "Anyone can record their own consent", policyPath);
      requireContains(this.id, policy, "SELECT restricted to admins only to protect PII", policyPath);
      requireContains(this.id, prefs, "marketingEnabled", prefsPath);
      requireContains(this.id, prefs, "marketing_enabled", prefsPath);
      requireContains(this.id, settings, "Marketing & Promotions", settingsPath);
      requireContains(this.id, settings, "handleToggleMarketing", settingsPath);
      requireContains(this.id, consentLog, "user_consent_logs", consentLogPath);
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

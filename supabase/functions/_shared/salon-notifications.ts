/**
 * salon-notifications
 * -------------------
 * Wrapper for salon reminder sends (24h-before booking / birthday / win-back).
 * Mirrors the lodging-notifications.ts pattern: composes `send-transactional-email`
 * + an internal Twilio SMS send via the Lovable connector, writes
 * notification_audit, and updates the source salon_reminders row to 'sent' or
 * 'failed' so the activity log on the admin UI is the source of truth for what
 * actually went out.
 *
 * Public bookings have client_id=null — in that case the recipient identity
 * comes from the booking row's contact-info snapshot (client_phone/client_email)
 * and the notification_audit row records user_id=null (matches the eats/lodging
 * pattern for unauthenticated recipients).
 */
import { createClient } from "./deps.ts";

export type SalonReminderEvent =
  | "booking_reminder_24h"
  | "birthday_offer"
  | "winback_offer";

interface ReminderRow {
  id: string;
  store_id: string;
  client_id: string | null;
  booking_id: string | null;
  reminder_type: "booking_24h" | "birthday" | "winback";
  channel_sms: boolean;
  channel_email: boolean;
  idempotency_key: string;
}

interface Recipient {
  user_id: string | null;
  phone: string | null;
  email: string | null;
  first_name: string;
  full_name: string;
}

type Admin = ReturnType<typeof createClient>;

const TEMPLATE_KEY: Record<SalonReminderEvent, string> = {
  booking_reminder_24h: "salon-booking-reminder-24h",
  birthday_offer: "salon-birthday-offer",
  winback_offer: "salon-winback-offer",
};

const maskEmail = (email?: string | null) => email ? email.replace(/(^.).*(@.*$)/, "$1***$2") : null;
const maskPhone = (phone?: string | null) => phone ? `***${phone.slice(-4)}` : null;
const firstNameOf = (full: string): string => (full?.trim().split(/\s+/)[0] ?? "").trim() || "there";

async function audit(admin: Admin, row: Record<string, unknown>) {
  // Best-effort — never let an audit insert failure mask the actual outcome.
  await admin.from("notification_audit").insert(row).then(() => null);
}

async function sendSms(to: string, body: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!lovableKey || !twilioKey || !from) {
    return { skipped: true as const, reason: "sms_not_configured" };
  }
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1200) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return { skipped: false as const, provider_id: data.sid as string | undefined };
}

/**
 * Send a single scheduled reminder. The caller has already loaded the
 * salon_reminders row and confirmed it's due — this is the dispatch step.
 *
 * The function MUST set salon_reminders.status to 'sent' or 'failed' before
 * returning (even on partial channel failure) so the cron's idempotency-by-
 * status filter doesn't pick the same row up again next hour.
 */
export async function sendSalonReminder(
  admin: Admin,
  reminder: ReminderRow,
  recipient: Recipient,
  event: SalonReminderEvent,
  templateData: Record<string, unknown>,
  smsBody: string,
) {
  const templateName = TEMPLATE_KEY[event];
  const auditMeta = {
    reminder_id: reminder.id,
    booking_id: reminder.booking_id,
    client_id: reminder.client_id,
    store_id: reminder.store_id,
    template: templateName,
    reminder_type: reminder.reminder_type,
  };
  let anySent = false;
  let lastError: string | null = null;

  // ---- Email path ----
  if (reminder.channel_email && recipient.email) {
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName,
          recipientEmail: recipient.email,
          idempotencyKey: reminder.idempotency_key,
          templateData,
        },
      });
      await audit(admin, {
        user_id: recipient.user_id,
        channel: "email",
        event_type: event,
        destination_masked: maskEmail(recipient.email),
        status: "queued",
        metadata: auditMeta,
      });
      anySent = true;
    } catch (e) {
      lastError = String((e as Error).message || e);
      await audit(admin, {
        user_id: recipient.user_id,
        channel: "email",
        event_type: event,
        destination_masked: maskEmail(recipient.email),
        status: "failed",
        error: lastError,
        metadata: auditMeta,
      });
    }
  }

  // ---- SMS path ----
  if (reminder.channel_sms && recipient.phone) {
    try {
      // If the recipient has a linked user_id we still honor their global
      // notification_preferences (sms_enabled + operational/marketing-aligned).
      // Walk-ins / public bookings without a user_id skip this preference
      // gate — the salon-level opt-in on the booking/client row is authoritative.
      let smsAllowed = true;
      let phone = recipient.phone;
      let phoneVerified = true;
      if (recipient.user_id) {
        const prefs = await admin
          .from("notification_preferences")
          .select("sms_enabled, operational_enabled, marketing_enabled, phone_number, phone_verified")
          .eq("user_id", recipient.user_id)
          .maybeSingle();
        if (prefs.data) {
          const enabledCheck = event === "booking_reminder_24h"
            ? (prefs.data.sms_enabled === true && prefs.data.operational_enabled !== false)
            : (prefs.data.sms_enabled === true && prefs.data.marketing_enabled === true);
          smsAllowed = enabledCheck;
          phone = prefs.data.phone_number || recipient.phone;
          phoneVerified = prefs.data.phone_verified !== false;
        }
      }

      if (!smsAllowed) {
        await audit(admin, {
          user_id: recipient.user_id,
          channel: "sms",
          event_type: event,
          destination_masked: maskPhone(phone),
          status: "skipped",
          skip_reason: "sms_disabled",
          metadata: auditMeta,
        });
      } else if (!phoneVerified) {
        await audit(admin, {
          user_id: recipient.user_id,
          channel: "sms",
          event_type: event,
          destination_masked: maskPhone(phone),
          status: "skipped",
          skip_reason: "phone_not_verified",
          metadata: auditMeta,
        });
      } else {
        const sms = await sendSms(phone, smsBody);
        await audit(admin, {
          user_id: recipient.user_id,
          channel: "sms",
          event_type: event,
          destination_masked: maskPhone(phone),
          provider_id: sms.skipped ? null : (sms.provider_id ?? null),
          status: sms.skipped ? "skipped" : "sent",
          skip_reason: sms.skipped ? sms.reason : null,
          metadata: auditMeta,
        });
        if (!sms.skipped) anySent = true;
      }
    } catch (e) {
      lastError = String((e as Error).message || e);
      await audit(admin, {
        user_id: recipient.user_id,
        channel: "sms",
        event_type: event,
        destination_masked: maskPhone(recipient.phone),
        status: "failed",
        error: lastError,
        metadata: auditMeta,
      });
    }
  }

  // ---- Update the reminder row's status so the cron doesn't re-pick it ----
  // 'sent' if at least one channel made it out. 'failed' otherwise. Either
  // way it's a terminal state for this reminder; the unique idempotency_key
  // keeps a duplicate from being scheduled even if cron retries the scan.
  await admin
    .from("salon_reminders")
    .update({
      status: anySent ? "sent" : "failed",
      sent_at: anySent ? new Date().toISOString() : null,
      error: anySent ? null : (lastError ?? "no_channel_succeeded"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminder.id);

  return { sent: anySent, error: anySent ? null : lastError };
}

export { firstNameOf };

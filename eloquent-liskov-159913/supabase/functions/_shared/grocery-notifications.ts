/**
 * grocery-notifications
 * ---------------------
 * Customer-facing email + SMS for paid Grocery (shopping_orders) orders.
 * Idempotent — keyed on (order_id, paid_cents).
 */
import { createClient } from "./deps.ts";

export type GroceryNotificationEvent =
  | "order_confirmed"
  | "order_cancelled"
  | "refund_issued";

const maskEmail = (email?: string | null) => email ? email.replace(/(^.).*(@.*$)/, "$1***$2") : null;
const maskPhone = (phone?: string | null) => phone ? `***${phone.slice(-4)}` : null;

async function audit(admin: any, row: Record<string, unknown>) {
  await admin.from("notification_audit").insert(row).then(() => null);
}

async function sendSms(to: string, body: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twilioKey = Deno.env.get("TWILIO_API_KEY");
  const from = Deno.env.get("TWILIO_FROM_NUMBER") || Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!lovableKey || !twilioKey || !from) return { skipped: true, reason: "sms_not_configured" };
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": twilioKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1200) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return { skipped: false, provider_id: data.sid as string | undefined };
}

interface NotifyOptions {
  orderId: string;
  event: GroceryNotificationEvent;
  templateName: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  smsBody?: string;
}

async function notifyGroceryCore(admin: ReturnType<typeof createClient>, options: NotifyOptions) {
  try {
    const { data: o } = await admin
      .from("shopping_orders")
      .select("id, user_id, customer_email, customer_phone")
      .eq("id", options.orderId)
      .maybeSingle();
    if (!o) return;

    if ((o as any).customer_email) {
      try {
        await admin.functions.invoke("send-transactional-email", {
          body: {
            templateName: options.templateName,
            recipientEmail: (o as any).customer_email,
            idempotencyKey: options.idempotencyKey,
            templateData: { orderId: (o as any).id, ...options.templateData },
          },
        });
        await audit(admin, { user_id: (o as any).user_id, channel: "email", event_type: options.event, destination_masked: maskEmail((o as any).customer_email), status: "queued", metadata: { order_id: (o as any).id, template: options.templateName } });
      } catch (e) {
        await audit(admin, { user_id: (o as any).user_id, channel: "email", event_type: options.event, destination_masked: maskEmail((o as any).customer_email), status: "failed", error: String((e as Error).message || e), metadata: { order_id: (o as any).id } });
      }
    }

    if (options.smsBody) {
      try {
        const { data: prefs } = await admin.from("notification_preferences").select("sms_enabled, operational_enabled, phone_number, phone_verified").eq("user_id", (o as any).user_id).maybeSingle();
        const smsAllowed = prefs?.sms_enabled === true && prefs?.operational_enabled !== false;
        const phone = prefs?.phone_number || (o as any).customer_phone;
        if (!smsAllowed || !phone || prefs?.phone_verified === false) {
          await audit(admin, { user_id: (o as any).user_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(phone), status: "skipped", metadata: { order_id: (o as any).id } });
        } else {
          const sms = await sendSms(phone, options.smsBody);
          await audit(admin, { user_id: (o as any).user_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(phone), provider_id: sms.provider_id || null, status: sms.skipped ? "skipped" : "sent", skip_reason: sms.reason || null, metadata: { order_id: (o as any).id } });
        }
      } catch (e) {
        await audit(admin, { user_id: (o as any).user_id, channel: "sms", event_type: options.event, destination_masked: maskPhone((o as any).customer_phone), status: "failed", error: String((e as Error).message || e), metadata: { order_id: (o as any).id } });
      }
    }
  } catch (e) {
    console.warn("[grocery-notifications] skipped", e);
  }
}

export async function notifyGroceryOrderConfirmed(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  paymentMethodLabel: string,
) {
  const { data: o } = await admin
    .from("shopping_orders")
    .select("id, user_id, total_amount, final_total, store, delivery_address")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return;

  const totalCents = Math.round(Number((o as any).final_total || (o as any).total_amount || 0) * 100);
  const totalAmount = `$${(totalCents / 100).toFixed(2)}`;

  await notifyGroceryCore(admin, {
    orderId,
    event: "order_confirmed",
    templateName: "grocery-order-confirmed",
    idempotencyKey: `grocery-confirmed-${orderId}-${totalCents}`,
    templateData: {
      storeName: (o as any).store || "your store",
      deliveryAddress: (o as any).delivery_address,
      totalAmount,
      paymentMethod: paymentMethodLabel,
      trackUrl: `${Deno.env.get("PUBLIC_APP_URL") || "https://hizivo.com"}/grocery/track/${orderId}`,
    },
    smsBody: `ZIVO Grocery: Order confirmed at ${(o as any).store || "your store"}. ${totalAmount} paid via ${paymentMethodLabel}.`,
  });
}

/**
 * eats-notifications
 * ------------------
 * Customer-facing email + SMS for paid Eats orders. Idempotent — keyed on
 * (order_id, paid_cents) so webhook redelivery does not double-send.
 *
 * Mirrors the lodging-notifications shape but reads food_orders instead of
 * lodge_reservations.
 */
import { createClient } from "./deps.ts";

export type EatsNotificationEvent =
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
  event: EatsNotificationEvent;
  templateName: string;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
  smsBody?: string;
}

async function notifyEatsCore(admin: ReturnType<typeof createClient>, options: NotifyOptions) {
  try {
    const { data: o } = await admin
      .from("food_orders")
      .select("id, customer_id, customer_email, customer_phone, tracking_code")
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
            templateData: { trackingCode: (o as any).tracking_code, ...options.templateData },
          },
        });
        await audit(admin, {
          user_id: (o as any).customer_id,
          channel: "email",
          event_type: options.event,
          destination_masked: maskEmail((o as any).customer_email),
          status: "queued",
          metadata: { order_id: (o as any).id, template: options.templateName },
        });
      } catch (e) {
        await audit(admin, {
          user_id: (o as any).customer_id,
          channel: "email",
          event_type: options.event,
          destination_masked: maskEmail((o as any).customer_email),
          status: "failed",
          error: String((e as Error).message || e),
          metadata: { order_id: (o as any).id },
        });
      }
    }

    if (options.smsBody) {
      try {
        const { data: prefs } = await admin.from("notification_preferences").select("sms_enabled, operational_enabled, phone_number, phone_verified").eq("user_id", (o as any).customer_id).maybeSingle();
        const smsAllowed = prefs?.sms_enabled === true && prefs?.operational_enabled !== false;
        const phone = prefs?.phone_number || (o as any).customer_phone;
        if (!smsAllowed || !phone || prefs?.phone_verified === false) {
          await audit(admin, { user_id: (o as any).customer_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(phone), status: "skipped", metadata: { order_id: (o as any).id } });
        } else {
          const sms = await sendSms(phone, options.smsBody);
          await audit(admin, { user_id: (o as any).customer_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(phone), provider_id: sms.provider_id || null, status: sms.skipped ? "skipped" : "sent", skip_reason: sms.reason || null, metadata: { order_id: (o as any).id } });
        }
      } catch (e) {
        await audit(admin, { user_id: (o as any).customer_id, channel: "sms", event_type: options.event, destination_masked: maskPhone((o as any).customer_phone), status: "failed", error: String((e as Error).message || e), metadata: { order_id: (o as any).id } });
      }
    }
  } catch (e) {
    console.warn("[eats-notifications] skipped", e);
  }
}

/**
 * Send a refund-issued email + SMS for an Eats order. Idempotency key includes
 * refundCents + status so "in progress" then "complete" go through as two
 * distinct notifications.
 */
export async function notifyEatsRefundIssued(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  refundCents: number,
  paymentMethodLabel: string,
  refundStatus: "in progress" | "complete" = "in progress",
  reason?: string | null,
) {
  const { data: o } = await admin
    .from("food_orders")
    .select("id, restaurant_id, tracking_code")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return;
  const { data: restaurant } = await admin.from("restaurants").select("name").eq("id", (o as any).restaurant_id).maybeSingle();
  const refundAmount = refundCents > 0 ? `$${(refundCents / 100).toFixed(2)}` : null;

  await notifyEatsCore(admin, {
    orderId,
    event: "refund_issued",
    templateName: "eats-refund-issued",
    idempotencyKey: `refund-${orderId}-${refundCents}-${refundStatus.replace(/\s+/g, "_")}`,
    templateData: {
      restaurantName: restaurant?.name || "the restaurant",
      refundAmount,
      paymentMethod: paymentMethodLabel,
      refundStatus,
      expectedDays: "5–10 business days",
      reason: reason || null,
    },
    smsBody: refundAmount
      ? `ZIVO Eats: Refund ${refundStatus} for ${(o as any).tracking_code}. ${refundAmount} back to ${paymentMethodLabel}.`
      : `ZIVO Eats: Refund ${refundStatus} for ${(o as any).tracking_code}.`,
  });
}

/**
 * Wrapper used by every Eats payment webhook (Stripe / PayPal / Square /
 * wallet) once an order flips to payment_status='paid'. Hydrates restaurant
 * name + phone for the template.
 */
export async function notifyEatsOrderConfirmed(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  paymentMethodLabel: string,
) {
  const { data: o } = await admin
    .from("food_orders")
    .select("id, customer_id, total_amount, restaurant_id, tracking_code, delivery_address, created_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return;

  const totalCents = Math.round(Number((o as any).total_amount || 0) * 100);
  const totalAmount = `$${(totalCents / 100).toFixed(2)}`;

  const { data: restaurant } = await admin
    .from("restaurants")
    .select("name, phone")
    .eq("id", (o as any).restaurant_id)
    .maybeSingle();

  await notifyEatsCore(admin, {
    orderId,
    event: "order_confirmed",
    templateName: "eats-order-confirmed",
    idempotencyKey: `eats-confirmed-${orderId}-${totalCents}`,
    templateData: {
      restaurantName: restaurant?.name || "your restaurant",
      restaurantPhone: restaurant?.phone || null,
      trackingCode: (o as any).tracking_code,
      deliveryAddress: (o as any).delivery_address,
      totalAmount,
      paymentMethod: paymentMethodLabel,
      trackUrl: `${Deno.env.get("PUBLIC_APP_URL") || "https://hizivo.com"}/eats/track/${orderId}`,
    },
    smsBody: `ZIVO Eats: Order ${(o as any).tracking_code} confirmed at ${restaurant?.name || "the restaurant"}. ${totalAmount} paid via ${paymentMethodLabel}. Track: ${(o as any).tracking_code}`,
  });
}

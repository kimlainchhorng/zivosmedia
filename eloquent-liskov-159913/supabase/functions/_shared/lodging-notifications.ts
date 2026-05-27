import { createClient } from "./deps.ts";

export type LodgingNotificationEvent =
  | "booking_confirmed"
  | "refund_issued"
  | "receipt_ready"
  | "receipt_shared"
  | "addon_success"
  | "addon_failed"
  | "cancellation_update"
  | "reschedule_update"
  | "refund_dispute_submitted"
  | "refund_dispute_update";

type NotifyOptions = {
  reservationId: string;
  event: LodgingNotificationEvent;
  templateName: string;
  idempotencyKey: string;
  title: string;
  message: string;
  templateData?: Record<string, unknown>;
  smsBody?: string;
};

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

/**
 * Convenience wrapper used by every payment webhook (Stripe / PayPal / Square)
 * once a reservation flips to `payment_status='paid'`. Idempotent — the
 * idempotency key is derived from the reservation + paid_cents, so replays of
 * the same webhook event do not double-send.
 */
export async function notifyLodgingBookingConfirmed(
  admin: ReturnType<typeof createClient>,
  reservationId: string,
  paymentMethodLabel: string,
) {
  const { data: r } = await admin
    .from("lodge_reservations")
    .select("id, number, paid_cents, total_cents, deposit_cents, check_in, check_out, adults, children, store_id")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r) return;

  const ci = r.check_in ? new Date(r.check_in) : null;
  const co = r.check_out ? new Date(r.check_out) : null;
  const nights = ci && co ? Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000)) : null;
  const guests = (r.adults ?? 0) + (r.children ?? 0);
  const paidCents = r.paid_cents || r.deposit_cents || r.total_cents || 0;
  const paidAmount = paidCents > 0 ? `$${(paidCents / 100).toFixed(2)}` : null;

  const { data: store } = await admin.from("restaurants").select("name, phone").eq("id", r.store_id).maybeSingle();

  await notifyLodgingReservation(admin, {
    reservationId,
    event: "booking_confirmed",
    templateName: "lodging-booking-confirmed",
    idempotencyKey: `booking-confirmed-${reservationId}-${paidCents}`,
    title: `Booking confirmed at ${store?.name || "your stay"}`,
    message: "We received your payment and locked in your stay. Save this email — you may need the reservation number at check-in.",
    templateData: {
      checkIn: ci ? ci.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
      checkOut: co ? co.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
      nights,
      guestsCount: guests,
      paidAmount,
      paymentMethod: paymentMethodLabel,
      hostPhone: store?.phone || null,
      manageUrl: `${Deno.env.get("PUBLIC_APP_URL") || "https://hizivo.com"}/trips`,
    },
    smsBody: `ZIVO: Your stay at ${store?.name || "the property"} is confirmed (ref ${r.number}). ${paidAmount ? `Paid ${paidAmount}.` : ""} Check-in ${ci ? ci.toLocaleDateString() : ""}.`,
  });
}

/**
 * Send the guest a refund-issued email + SMS. Idempotency key includes
 * refundCents + status so a "pending" then "complete" sequence sends two
 * distinct notifications, but redelivery of either does not double-send.
 */
export async function notifyLodgingRefundIssued(
  admin: ReturnType<typeof createClient>,
  reservationId: string,
  refundCents: number,
  paymentMethodLabel: string,
  refundStatus: "in progress" | "complete" = "in progress",
) {
  const { data: r } = await admin
    .from("lodge_reservations")
    .select("id, number, store_id")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r) return;
  const { data: store } = await admin.from("restaurants").select("name").eq("id", (r as any).store_id).maybeSingle();
  const refundAmount = refundCents > 0 ? `$${(refundCents / 100).toFixed(2)}` : null;

  await notifyLodgingReservation(admin, {
    reservationId,
    event: "refund_issued",
    templateName: "lodging-refund-issued",
    idempotencyKey: `refund-${reservationId}-${refundCents}-${refundStatus.replace(/\s+/g, "_")}`,
    title: `Refund ${refundStatus}`,
    message: refundStatus === "complete"
      ? "The funds have been returned to your original payment method."
      : "The refund is on its way back to your original payment method.",
    templateData: {
      propertyName: store?.name || "Your stay",
      refundAmount,
      paymentMethod: paymentMethodLabel,
      refundStatus,
      expectedDays: "5–10 business days",
    },
    smsBody: refundAmount
      ? `ZIVO: Refund ${refundStatus} for ${(r as any).number}. ${refundAmount} back to ${paymentMethodLabel}.`
      : `ZIVO: Refund ${refundStatus} for ${(r as any).number}.`,
  });
}

export async function notifyLodgingReservation(admin: ReturnType<typeof createClient>, options: NotifyOptions) {
  try {
    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id, number, guest_id, guest_email, guest_phone, guest_name, check_in, check_out, payment_status, status, store_id")
      .eq("id", options.reservationId)
      .maybeSingle();
    if (!r) return;
    const { data: store } = await admin.from("restaurants").select("name").eq("id", r.store_id).maybeSingle();
    const data = { reservationNumber: r.number, propertyName: store?.name || "Your stay", guestName: r.guest_name || "Guest", checkIn: r.check_in, checkOut: r.check_out, status: r.status, paymentStatus: r.payment_status, message: options.message, title: options.title, ...options.templateData };

    if (r.guest_email) {
      try {
        await admin.functions.invoke("send-transactional-email", { body: { templateName: options.templateName, recipientEmail: r.guest_email, idempotencyKey: options.idempotencyKey, templateData: data } });
        await audit(admin, { user_id: r.guest_id, channel: "email", event_type: options.event, destination_masked: maskEmail(r.guest_email), status: "queued", metadata: { reservation_id: r.id, template: options.templateName } });
      } catch (e) {
        await audit(admin, { user_id: r.guest_id, channel: "email", event_type: options.event, destination_masked: maskEmail(r.guest_email), status: "failed", error: String((e as Error).message || e), metadata: { reservation_id: r.id } });
      }
    }

    if (options.smsBody) {
      try {
        const { data: prefs } = await admin.from("notification_preferences").select("sms_enabled, operational_enabled, phone_number, phone_verified").eq("user_id", r.guest_id).maybeSingle();
        const smsAllowed = prefs?.sms_enabled === true && prefs?.operational_enabled !== false;
        const phone = prefs?.phone_number || r.guest_phone;
        if (!smsAllowed) {
          await audit(admin, { user_id: r.guest_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(phone), status: "skipped", skip_reason: "sms_disabled", metadata: { reservation_id: r.id } });
        } else if (!phone) {
          await audit(admin, { user_id: r.guest_id, channel: "sms", event_type: options.event, destination_masked: null, status: "skipped", skip_reason: "phone_missing", metadata: { reservation_id: r.id } });
        } else if (prefs?.phone_verified === false) {
          await audit(admin, { user_id: r.guest_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(phone), status: "skipped", skip_reason: "phone_not_verified", metadata: { reservation_id: r.id } });
        } else {
          const sms = await sendSms(phone, options.smsBody);
          await audit(admin, { user_id: r.guest_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(phone), provider_id: sms.provider_id || null, status: sms.skipped ? "skipped" : "sent", skip_reason: sms.reason || null, metadata: { reservation_id: r.id } });
        }
      } catch (e) {
        await audit(admin, { user_id: r.guest_id, channel: "sms", event_type: options.event, destination_masked: maskPhone(r.guest_phone), status: "failed", error: String((e as Error).message || e), metadata: { reservation_id: r.id } });
      }
    }
  } catch (e) {
    console.warn("[lodging-notifications] skipped", e);
  }
}

/**
 * paypal-lodging-webhook
 * ----------------------
 * Idempotent receiver for PayPal Webhooks. Verifies signature via PayPal's
 * `/v1/notifications/verify-webhook-signature` endpoint, persists every event
 * to `lodging_paypal_webhook_events` (UNIQUE on paypal_event_id), and updates
 * `lodge_reservations.payment_status` for the events we care about.
 *
 * Required env:
 *   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID
 *   PAYPAL_MODE (live | sandbox; defaults to live)
 *
 * Configure the webhook in PayPal Dashboard to deliver these events:
 *   PAYMENT.AUTHORIZATION.CREATED
 *   PAYMENT.AUTHORIZATION.VOIDED
 *   PAYMENT.CAPTURE.COMPLETED
 *   PAYMENT.CAPTURE.DENIED
 *   PAYMENT.CAPTURE.REFUNDED
 *   PAYMENT.CAPTURE.REVERSED
 *   CHECKOUT.ORDER.APPROVED
 *   CHECKOUT.ORDER.COMPLETED
 */
import { createClient } from "../_shared/deps.ts";
import { notifyLodgingBookingConfirmed } from "../_shared/lodging-notifications.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") ?? "live";
const PAYPAL_BASE = PAYPAL_MODE === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) {
    console.error("[paypal-lodging-webhook] PAYPAL_WEBHOOK_ID not set; refusing to process");
    return false;
  }
  const transmissionId = req.headers.get("paypal-transmission-id") ?? "";
  const transmissionTime = req.headers.get("paypal-transmission-time") ?? "";
  const certUrl = req.headers.get("paypal-cert-url") ?? "";
  const authAlgo = req.headers.get("paypal-auth-algo") ?? "";
  const transmissionSig = req.headers.get("paypal-transmission-sig") ?? "";
  if (!transmissionId || !transmissionSig) return false;

  const token = await getAccessToken();
  const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  if (!verifyRes.ok) return false;
  const j = await verifyRes.json();
  return j.verification_status === "SUCCESS";
}

Deno.serve(withSecurity("paypal-lodging-webhook", async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rawBody = await req.text();
  let event: any;
  try { event = JSON.parse(rawBody); } catch { return new Response("invalid json", { status: 400 }); }

  // Signature verification — fail closed.
  let verified = false;
  try { verified = await verifySignature(req, rawBody); } catch (e) { console.error("[paypal-lodging-webhook] verify err", e); }
  if (!verified) {
    console.warn("[paypal-lodging-webhook] signature verification failed", { id: event?.id, type: event?.event_type });
    return new Response(JSON.stringify({ error: "signature_invalid" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const eventId = event.id as string;
  const eventType = event.event_type as string;
  const eventStamp = new Date().toISOString();
  const resource = event.resource ?? {};

  // Pull common ids off the event.
  const orderId =
    resource?.id && resource?.intent ? resource.id :
    resource?.supplementary_data?.related_ids?.order_id ??
    null;
  const captureId =
    resource?.id && eventType.startsWith("PAYMENT.CAPTURE") ? resource.id :
    resource?.id && eventType.startsWith("PAYMENT.AUTHORIZATION") ? resource.id :
    null;

  // Resolve reservation by order or capture id.
  let resolvedReservationId: string | null = null;
  if (orderId) {
    const { data } = await admin
      .from("lodge_reservations")
      .select("id")
      .eq("paypal_order_id", orderId)
      .maybeSingle();
    resolvedReservationId = (data as any)?.id ?? null;
  }
  if (!resolvedReservationId && captureId) {
    const { data } = await admin
      .from("lodge_reservations")
      .select("id")
      .eq("paypal_capture_id", captureId)
      .maybeSingle();
    resolvedReservationId = (data as any)?.id ?? null;
  }
  // Fallback — purchase_units[0].custom_id is the reservation_id we set on order create.
  if (!resolvedReservationId) {
    const customId =
      resource?.purchase_units?.[0]?.custom_id ??
      resource?.custom_id ??
      null;
    if (customId) {
      const { data } = await admin
        .from("lodge_reservations")
        .select("id")
        .eq("id", customId)
        .maybeSingle();
      resolvedReservationId = (data as any)?.id ?? null;
    }
  }

  // Idempotent insert.
  const { data: inserted, error: insertErr } = await admin
    .from("lodging_paypal_webhook_events")
    .upsert(
      {
        paypal_event_id: eventId,
        event_type: eventType,
        event_created_at: event.create_time ?? null,
        reservation_id: resolvedReservationId,
        paypal_order_id: orderId,
        paypal_capture_id: captureId,
        processing_status: "received",
        payload: event,
      },
      { onConflict: "paypal_event_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (insertErr) console.error("[paypal-lodging-webhook] log insert failed", insertErr);
  if (!inserted) {
    return new Response(JSON.stringify({ received: true, dedup: true }), { headers: { "Content-Type": "application/json" } });
  }
  const logRowId = inserted.id;

  const updateReservation = async (
    where: { col: string; value: string },
    payment_status: string,
    extra: Record<string, any> = {},
  ) => {
    const { error } = await admin
      .from("lodge_reservations")
      .update({
        payment_status,
        paypal_last_event_at: eventStamp,
        paypal_last_event_type: eventType,
        ...extra,
      })
      .eq(where.col as any, where.value);
    if (error) console.error("[paypal-lodging-webhook] update failed", error);
  };

  let processingStatus: "applied" | "skipped" | "error" = "skipped";
  let processingError: string | null = null;

  try {
    switch (eventType) {
      case "PAYMENT.AUTHORIZATION.CREATED": {
        if (orderId) {
          await updateReservation(
            { col: "paypal_order_id", value: orderId },
            "authorized",
            { paypal_capture_id: captureId, last_payment_error: null },
          );
          processingStatus = "applied";
        }
        break;
      }
      case "PAYMENT.AUTHORIZATION.VOIDED": {
        if (orderId) {
          await updateReservation({ col: "paypal_order_id", value: orderId }, "unpaid");
          processingStatus = "applied";
        }
        break;
      }
      case "PAYMENT.CAPTURE.COMPLETED":
      case "CHECKOUT.ORDER.COMPLETED": {
        const paid = Math.round(parseFloat(resource?.amount?.value ?? "0") * 100);
        if (orderId) {
          await updateReservation(
            { col: "paypal_order_id", value: orderId },
            "paid",
            {
              paypal_capture_id: captureId,
              paid_cents: paid || undefined,
              status: "confirmed",
              last_payment_error: null,
            },
          );
          processingStatus = "applied";
        } else if (captureId) {
          await updateReservation(
            { col: "paypal_capture_id", value: captureId },
            "paid",
            { paid_cents: paid || undefined, status: "confirmed", last_payment_error: null },
          );
          processingStatus = "applied";
        }
        if (resolvedReservationId) {
          try {
            await notifyLodgingBookingConfirmed(admin, resolvedReservationId, "PayPal");
          } catch (e) {
            console.warn("[paypal-lodging-webhook] confirmation email skipped", e);
          }
        }
        break;
      }
      case "PAYMENT.CAPTURE.DENIED": {
        const reason = resource?.status_details?.reason ?? "PayPal denied the capture";
        if (orderId) {
          await updateReservation(
            { col: "paypal_order_id", value: orderId },
            "failed",
            { last_payment_error: reason },
          );
          processingStatus = "applied";
        }
        break;
      }
      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED": {
        // resource here is the refund/reversal — capture id sits in links.
        const links: any[] = resource?.links ?? [];
        const upLink = links.find((l) => l.rel === "up")?.href ?? "";
        const sourceCaptureId = upLink.split("/").pop() ?? captureId;
        if (sourceCaptureId) {
          await updateReservation(
            { col: "paypal_capture_id", value: sourceCaptureId },
            "refunded",
          );
          processingStatus = "applied";
        }
        break;
      }
      case "CHECKOUT.ORDER.APPROVED": {
        // Buyer approved, capture is pending. Just stamp the event.
        if (orderId) {
          await updateReservation({ col: "paypal_order_id", value: orderId }, "processing");
          processingStatus = "applied";
        }
        break;
      }
      default:
        processingStatus = "skipped";
        break;
    }
  } catch (e: any) {
    processingStatus = "error";
    processingError = String(e?.message || e);
    console.error("[paypal-lodging-webhook] handler error", e);
  }

  await admin
    .from("lodging_paypal_webhook_events")
    .update({
      processing_status: processingStatus,
      error_message: processingError,
      reservation_id: resolvedReservationId,
    })
    .eq("id", logRowId);

  return new Response(JSON.stringify({ received: true, status: processingStatus }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}, { rateLimit: "payment", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));

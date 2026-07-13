/**
 * square-lodging-webhook
 * ----------------------
 * Idempotent receiver for Square Webhooks. Verifies the HMAC-SHA256 signature
 * against the registered webhook URL, persists every event to
 * `lodging_square_webhook_events` (UNIQUE on square_event_id), and updates
 * `lodge_reservations.payment_status` for events we care about.
 *
 * Required env:
 *   SQUARE_WEBHOOK_SIGNATURE_KEY  (from Square Dashboard → Developer → Webhooks)
 *   SQUARE_WEBHOOK_NOTIFICATION_URL  (the public URL Square posts to — used in HMAC)
 *
 * Configure in Square Dashboard to deliver:
 *   payment.updated
 *   payment.created
 *   refund.updated
 *
 * Square's Quick Pay payment links don't carry our reservation_id directly,
 * so we resolve via the order's `note` (we set it to "Reservation <uuid>" in
 * create-lodging-square-checkout) or via square_payment_id once stamped.
 */
import { createClient } from "../_shared/deps.ts";
import { notifyLodgingBookingConfirmed } from "../_shared/lodging-notifications.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SIGNATURE_HEADER = "x-square-hmacsha256-signature";

async function hmacSha256Base64(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  // base64 of raw bytes
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  const key = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const notificationUrl = Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL");
  if (!key || !notificationUrl) {
    console.error("[square-lodging-webhook] signature key or notification url missing");
    return false;
  }
  const provided = req.headers.get(SIGNATURE_HEADER);
  if (!provided) return false;
  const expected = await hmacSha256Base64(key, notificationUrl + rawBody);
  // Constant-time-ish compare
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

const RESERVATION_RE = /Reservation\s+([0-9a-f-]{36})/i;

Deno.serve(withSecurity("square-lodging-webhook", async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rawBody = await req.text();
  let event: any;
  try { event = JSON.parse(rawBody); } catch { return new Response("invalid json", { status: 400 }); }

  let verified = false;
  try { verified = await verifySignature(req, rawBody); } catch (e) { console.error("[square-lodging-webhook] verify err", e); }
  if (!verified) {
    console.warn("[square-lodging-webhook] signature verification failed", { id: event?.event_id, type: event?.type });
    return new Response(JSON.stringify({ error: "signature_invalid" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const eventId = event.event_id as string;
  const eventType = event.type as string;
  const eventStamp = new Date().toISOString();
  const data = event.data?.object ?? {};

  const payment = data.payment ?? null;
  const refund = data.refund ?? null;
  const paymentId: string | null = payment?.id ?? refund?.payment_id ?? null;
  const orderId: string | null = payment?.order_id ?? null;
  const note: string | null = payment?.note ?? refund?.reason ?? null;

  // Resolve reservation: by stamped square_payment_id first, otherwise parse
  // the note we set in create-lodging-square-checkout.
  let resolvedReservationId: string | null = null;
  if (paymentId) {
    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id")
      .eq("square_payment_id", paymentId)
      .maybeSingle();
    resolvedReservationId = (r as any)?.id ?? null;
  }
  if (!resolvedReservationId && note) {
    const m = note.match(RESERVATION_RE);
    if (m) {
      const { data: r } = await admin
        .from("lodge_reservations")
        .select("id")
        .eq("id", m[1])
        .maybeSingle();
      resolvedReservationId = (r as any)?.id ?? null;
    }
  }

  // Idempotent insert.
  const { data: inserted, error: insertErr } = await admin
    .from("lodging_square_webhook_events")
    .upsert(
      {
        square_event_id: eventId,
        event_type: eventType,
        event_created_at: event.created_at ?? null,
        reservation_id: resolvedReservationId,
        square_payment_id: paymentId,
        square_checkout_id: orderId,
        processing_status: "received",
        payload: event,
      },
      { onConflict: "square_event_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (insertErr) console.error("[square-lodging-webhook] log insert failed", insertErr);
  if (!inserted) {
    return new Response(JSON.stringify({ received: true, dedup: true }), { headers: { "Content-Type": "application/json" } });
  }
  const logRowId = inserted.id;

  let processingStatus: "applied" | "skipped" | "error" = "skipped";
  let processingError: string | null = null;

  try {
    if (!resolvedReservationId) {
      processingStatus = "skipped";
    } else if (eventType === "payment.created" || eventType === "payment.updated") {
      const status: string | undefined = payment?.status; // APPROVED | COMPLETED | CANCELED | FAILED | PENDING
      const paid = Math.round(((payment?.amount_money?.amount ?? 0) as number));
      let next: string | null = null;
      const extra: Record<string, any> = {
        square_payment_id: paymentId,
        square_last_event_at: eventStamp,
        square_last_event_type: eventType,
      };

      if (status === "COMPLETED") {
        next = "paid";
        extra.paid_cents = paid || undefined;
        extra.status = "confirmed";
        extra.last_payment_error = null;
      } else if (status === "APPROVED") {
        next = "authorized";
      } else if (status === "PENDING") {
        next = "processing";
      } else if (status === "CANCELED") {
        next = "unpaid";
      } else if (status === "FAILED") {
        next = "failed";
        extra.last_payment_error = payment?.failure_reason ?? "Square reported a failure";
      }

      if (next) {
        const { error } = await admin
          .from("lodge_reservations")
          .update({ payment_status: next, ...extra })
          .eq("id", resolvedReservationId);
        if (error) throw error;
        if (next === "paid") {
          try {
            await notifyLodgingBookingConfirmed(admin, resolvedReservationId, "Square");
          } catch (e) {
            console.warn("[square-lodging-webhook] confirmation email skipped", e);
          }
        }
        processingStatus = "applied";
      }
    } else if (eventType === "refund.updated" || eventType === "refund.created") {
      const status: string | undefined = refund?.status; // PENDING | COMPLETED | REJECTED | FAILED
      let next: string | null = null;
      if (status === "PENDING") next = "refund_pending";
      else if (status === "COMPLETED") next = "refunded";
      else if (status === "REJECTED" || status === "FAILED") next = "paid";
      if (next) {
        const { error } = await admin
          .from("lodge_reservations")
          .update({
            payment_status: next,
            square_last_event_at: eventStamp,
            square_last_event_type: eventType,
          })
          .eq("id", resolvedReservationId);
        if (error) throw error;
        processingStatus = "applied";
      }
    }
  } catch (e: any) {
    processingStatus = "error";
    processingError = String(e?.message || e);
    console.error("[square-lodging-webhook] handler error", e);
  }

  await admin
    .from("lodging_square_webhook_events")
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

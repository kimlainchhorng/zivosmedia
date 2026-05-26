/**
 * paypal-grocery-webhook
 * -----------------------
 * Idempotent receiver for PayPal Webhooks targeting Grocery orders.
 * Verifies signature, persists every event to grocery_paypal_webhook_events,
 * updates shopping_orders.payment_status on the events we care about.
 */
import { createClient } from "../_shared/deps.ts";
import { notifyGroceryOrderConfirmed } from "../_shared/grocery-notifications.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PAYPAL_BASE = (Deno.env.get("PAYPAL_MODE") ?? "live") === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function token() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

async function verify(req: Request, raw: string): Promise<boolean> {
  const webhookId = Deno.env.get("PAYPAL_GROCERY_WEBHOOK_ID") ?? Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) return false;
  const transmissionId = req.headers.get("paypal-transmission-id") ?? "";
  if (!transmissionId) return false;
  const accessToken = await token();
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: req.headers.get("paypal-auth-algo") ?? "",
      cert_url: req.headers.get("paypal-cert-url") ?? "",
      transmission_id: transmissionId,
      transmission_sig: req.headers.get("paypal-transmission-sig") ?? "",
      transmission_time: req.headers.get("paypal-transmission-time") ?? "",
      webhook_id: webhookId,
      webhook_event: JSON.parse(raw),
    }),
  });
  if (!res.ok) return false;
  return (await res.json()).verification_status === "SUCCESS";
}

Deno.serve(withSecurity("paypal-grocery-webhook", async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const raw = await req.text();
  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("invalid json", { status: 400 }); }

  let verified = false;
  try { verified = await verify(req, raw); } catch (e) { console.error("[paypal-grocery-webhook] verify err", e); }
  if (!verified) {
    return new Response(JSON.stringify({ error: "signature_invalid" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const eventId = event.id as string;
  const eventType = event.event_type as string;
  const resource = event.resource ?? {};
  const orderId = resource?.id && resource?.intent ? resource.id : resource?.supplementary_data?.related_ids?.order_id ?? null;
  const captureId = (eventType.startsWith("PAYMENT.CAPTURE") || eventType.startsWith("PAYMENT.AUTHORIZATION")) ? resource?.id : null;

  let resolvedOrderId: string | null = null;
  if (orderId) {
    const { data } = await admin.from("shopping_orders").select("id").eq("paypal_order_id", orderId).maybeSingle();
    resolvedOrderId = (data as any)?.id ?? null;
  }
  if (!resolvedOrderId && captureId) {
    const { data } = await admin.from("shopping_orders").select("id").eq("paypal_capture_id", captureId).maybeSingle();
    resolvedOrderId = (data as any)?.id ?? null;
  }
  if (!resolvedOrderId) {
    const customId = resource?.purchase_units?.[0]?.custom_id ?? resource?.custom_id ?? null;
    if (customId) {
      const { data } = await admin.from("shopping_orders").select("id").eq("id", customId).maybeSingle();
      resolvedOrderId = (data as any)?.id ?? null;
    }
  }

  const { data: inserted } = await admin
    .from("grocery_paypal_webhook_events")
    .upsert(
      { paypal_event_id: eventId, event_type: eventType, event_created_at: event.create_time ?? null, order_id: resolvedOrderId, paypal_order_id: orderId, paypal_capture_id: captureId, processing_status: "received", payload: event },
      { onConflict: "paypal_event_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (!inserted) {
    return new Response(JSON.stringify({ received: true, dedup: true }), { headers: { "Content-Type": "application/json" } });
  }
  const logRowId = (inserted as any).id;

  let processingStatus: "applied" | "skipped" | "error" = "skipped";
  let processingError: string | null = null;

  try {
    if (resolvedOrderId) {
      if (eventType === "PAYMENT.CAPTURE.COMPLETED" || eventType === "CHECKOUT.ORDER.COMPLETED") {
        await admin.from("shopping_orders").update({ payment_status: "paid", paypal_capture_id: captureId, last_payment_error: null } as any).eq("id", resolvedOrderId);
        try { await notifyGroceryOrderConfirmed(admin, resolvedOrderId, "PayPal"); } catch (e) { console.warn("[paypal-grocery-webhook] confirmation email skipped", e); }
        processingStatus = "applied";
      } else if (eventType === "PAYMENT.CAPTURE.DENIED") {
        const reason = resource?.status_details?.reason ?? "PayPal denied the capture";
        await admin.from("shopping_orders").update({ payment_status: "failed", last_payment_error: reason } as any).eq("id", resolvedOrderId);
        processingStatus = "applied";
      } else if (eventType === "PAYMENT.CAPTURE.REFUNDED" || eventType === "PAYMENT.CAPTURE.REVERSED") {
        await admin.from("shopping_orders").update({ payment_status: "refunded" } as any).eq("id", resolvedOrderId);
        processingStatus = "applied";
      } else if (eventType === "CHECKOUT.ORDER.APPROVED") {
        await admin.from("shopping_orders").update({ payment_status: "processing" } as any).eq("id", resolvedOrderId);
        processingStatus = "applied";
      }
    }
  } catch (e: any) {
    processingStatus = "error";
    processingError = String(e?.message || e);
    console.error("[paypal-grocery-webhook] handler error", e);
  }

  await admin
    .from("grocery_paypal_webhook_events")
    .update({ processing_status: processingStatus, error_message: processingError, order_id: resolvedOrderId })
    .eq("id", logRowId);

  return new Response(JSON.stringify({ received: true, status: processingStatus }), { status: 200, headers: { "Content-Type": "application/json" } });
}, { rateLimit: "payment", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));

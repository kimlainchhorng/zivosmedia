/**
 * square-tip-webhook
 * -------------------
 * Idempotent receiver for Square Webhooks targeting Creator Tips.
 */
import { createClient } from "../_shared/deps.ts";
import { creditCreatorTipToWallet } from "../_shared/tipWalletCredit.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

async function hmacSha256Base64(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(req: Request, raw: string): Promise<boolean> {
  const key = Deno.env.get("SQUARE_TIP_WEBHOOK_SIGNATURE_KEY") ?? Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const url = Deno.env.get("SQUARE_TIP_WEBHOOK_NOTIFICATION_URL") ?? Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL");
  if (!key || !url) return false;
  const provided = req.headers.get("x-square-hmacsha256-signature");
  if (!provided) return false;
  const expected = await hmacSha256Base64(key, url + raw);
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

const TIP_RE = /Tip\s+([0-9a-f-]{36})/i;

Deno.serve(withSecurity("square-tip-webhook", async (req) => {
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
  try { verified = await verify(req, raw); } catch (e) { console.error("[square-tip-webhook] verify err", e); }
  if (!verified) {
    return new Response(JSON.stringify({ error: "signature_invalid" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const eventId = event.event_id as string;
  const eventType = event.type as string;
  const data = event.data?.object ?? {};
  const payment = data.payment ?? null;
  const refund = data.refund ?? null;
  const paymentId: string | null = payment?.id ?? refund?.payment_id ?? null;
  const checkoutId: string | null = payment?.order_id ?? null;
  const note: string | null = payment?.note ?? refund?.reason ?? null;

  let resolvedTipId: string | null = null;
  if (paymentId) {
    const { data: t } = await admin.from("creator_tips").select("id").eq("square_payment_id", paymentId).maybeSingle();
    resolvedTipId = (t as any)?.id ?? null;
  }
  if (!resolvedTipId && note) {
    const m = note.match(TIP_RE);
    if (m) {
      const { data: t } = await admin.from("creator_tips").select("id").eq("id", m[1]).maybeSingle();
      resolvedTipId = (t as any)?.id ?? null;
    }
  }

  const { data: inserted } = await admin
    .from("tip_square_webhook_events")
    .upsert(
      { square_event_id: eventId, event_type: eventType, event_created_at: event.created_at ?? null, tip_id: resolvedTipId, square_payment_id: paymentId, square_checkout_id: checkoutId, processing_status: "received", payload: event },
      { onConflict: "square_event_id", ignoreDuplicates: true },
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
    if (resolvedTipId) {
      if (eventType === "payment.created" || eventType === "payment.updated") {
        const status: string | undefined = payment?.status;
        let next: string | null = null;
        const extra: Record<string, any> = { square_payment_id: paymentId };
        if (status === "COMPLETED") { next = "succeeded"; extra.last_payment_error = null; }
        else if (status === "PENDING") next = "processing";
        else if (status === "CANCELED") next = "cancelled";
        else if (status === "FAILED") { next = "failed"; extra.last_payment_error = payment?.failure_reason ?? "Square reported a failure"; }
        if (next) {
          await admin.from("creator_tips").update({ status: next, ...extra } as any).eq("id", resolvedTipId);
          // On successful capture, credit the creator's wallet (idempotent on tip id).
          if (next === "succeeded") {
            const { data: tipFull } = await admin
              .from("creator_tips")
              .select("id, creator_id, amount_cents, tipper_id, message, is_anonymous")
              .eq("id", resolvedTipId)
              .maybeSingle();
            if (tipFull) await creditCreatorTipToWallet(admin, tipFull as any);
          }
          processingStatus = "applied";
        }
      } else if (eventType === "refund.updated" || eventType === "refund.created") {
        const status: string | undefined = refund?.status;
        if (status === "COMPLETED") {
          await admin.from("creator_tips").update({ status: "refunded" } as any).eq("id", resolvedTipId);
          processingStatus = "applied";
        }
      }
    }
  } catch (e: any) {
    processingStatus = "error";
    processingError = String(e?.message || e);
  }

  await admin.from("tip_square_webhook_events").update({ processing_status: processingStatus, error_message: processingError, tip_id: resolvedTipId }).eq("id", logRowId);
  return new Response(JSON.stringify({ received: true, status: processingStatus }), { status: 200, headers: { "Content-Type": "application/json" } });
}, { rateLimit: "payment", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));

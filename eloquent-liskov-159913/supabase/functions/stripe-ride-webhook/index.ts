import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Stripe webhook for ride PaymentIntent events.
// verify_jwt=false; signature is verified via STRIPE_WEBHOOK_SECRET.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

Deno.serve(withSecurity("stripe-ride-webhook", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: any;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (err) {
    console.error("[stripe-ride-webhook] sig verify failed", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const pi = event.data?.object;
  const rideId = pi?.metadata?.ride_request_id ?? null;
  const piType = pi?.metadata?.type ?? null; // "ride_tip" for tip PIs created by capture-ride-tip
  const isTipPI = piType === "ride_tip";

  // Idempotency: insert into webhook_events; skip if duplicate
  const { error: insertErr } = await admin.from("webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    source: "stripe",
    ride_request_id: rideId,
    status: pi?.status ?? null,
    raw_payload: event as any,
  } as any);

  if (insertErr && (insertErr as any).code === "23505") {
    // Duplicate event — already processed
    console.log(`[stripe-ride-webhook] duplicate event ${event.id} skipped`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (!rideId) {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const capturedCents = pi.amount_received ?? pi.amount;

        if (isTipPI) {
          // Tip PI created by capture-ride-tip — do NOT touch ride payment_status
          // (the trip itself was captured earlier with its own PI). Just write a
          // tip-specific ledger entry. Driver credit is handled by capture-ride-tip
          // via creator_earnings; this is purely buyer-side reconciliation.
          try {
            const { data: ride } = await admin.from("ride_requests").select("user_id").eq("id", rideId).maybeSingle();
            if (ride?.user_id) {
              await admin.from("financial_ledger").insert({
                user_id: ride.user_id,
                ride_request_id: rideId,
                entry_type: "charge",
                amount_cents: capturedCents,
                currency: pi.currency ?? "usd",
                stripe_reference: pi.id,
                description: `Ride tip ${rideId.slice(0, 8)}`,
              } as any);
            }
          } catch (e) { console.warn("[stripe-ride-webhook] tip ledger failed", e); }
          break;
        }

        await admin.from("ride_requests").update({
          payment_status: "captured",
          captured_amount_cents: capturedCents,
        } as any).eq("id", rideId);

        // Append charge ledger entry (best-effort)
        try {
          const { data: ride } = await admin.from("ride_requests").select("user_id").eq("id", rideId).maybeSingle();
          if (ride?.user_id) {
            await admin.from("financial_ledger").insert({
              user_id: ride.user_id,
              ride_request_id: rideId,
              entry_type: "charge",
              amount_cents: capturedCents,
              currency: pi.currency ?? "usd",
              stripe_reference: pi.id,
              description: `Ride charge ${rideId.slice(0, 8)}`,
            } as any);
          }
        } catch (e) { console.warn("[stripe-ride-webhook] ledger failed", e); }

        // Generate receipt non-blocking
        admin.functions.invoke("generate-trip-receipt", { body: { ride_request_id: rideId } })
          .catch((e) => console.warn("[stripe-ride-webhook] receipt invoke failed", e));
        break;
      }
      case "payment_intent.payment_failed":
        if (isTipPI) break; // tip failure must not flip trip's payment_status
        await admin.from("ride_requests").update({ payment_status: "failed" } as any).eq("id", rideId);
        break;
      case "payment_intent.canceled":
        if (isTipPI) break;
        await admin.from("ride_requests").update({ payment_status: "canceled" } as any).eq("id", rideId);
        break;
      case "payment_intent.amount_capturable_updated":
        if (isTipPI) break;
        await admin.from("ride_requests").update({ payment_status: "authorized" } as any).eq("id", rideId);
        break;
    }

    console.log(`[stripe-ride-webhook] ${event.type} → ride ${rideId}`);
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[stripe-ride-webhook]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
}, { rateLimit: "payment", strictCors: true, skipBotDetection: true, skipWaf: true, trackNetwork: "suspicious" }));

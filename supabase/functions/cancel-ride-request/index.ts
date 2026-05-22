/**
 * cancel-ride-request
 * --------------------
 * Rider-initiated cancellation. The previous UI-only flow was a money bug:
 *   - if the ride was paid, the rider got NO REFUND (fee was applied to a column,
 *     no Stripe call)
 *   - the toast said "$X cancellation fee applied" but nothing charged them
 *
 * This edge function fixes the refund half. Fee-collection on unpaid rides
 * needs a saved-card-on-file flow that doesn't exist yet — flagged below.
 *
 * Refund math: refund = max(0, captured_amount - cancel_fee_cents)
 */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("cancel-ride-request", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY missing");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { ride_request_id, reason, cancel_fee_cents } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: ride } = await admin
      .from("ride_requests")
      .select("id, user_id, status, payment_status, captured_amount_cents, payment_amount, stripe_payment_intent_id")
      .eq("id", ride_request_id)
      .maybeSingle();
    if (!ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if ((ride as any).user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const status = String((ride as any).status || "").toLowerCase();
    if (["cancelled", "completed"].includes(status)) {
      return new Response(JSON.stringify({ error: "already_inactive", current_status: status }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const feeCents = Math.max(0, Math.floor(Number(cancel_fee_cents || 0)));
    const wasPaid = (ride as any).payment_status === "paid";
    const piId = (ride as any).stripe_payment_intent_id as string | null;
    const captured = Number((ride as any).captured_amount_cents || Math.round(Number((ride as any).payment_amount || 0) * 100));

    let stripeRefundId: string | null = null;
    let refundCents = 0;
    let providerError: string | null = null;
    let nextPaymentStatus = (ride as any).payment_status as string;

    if (wasPaid && piId && captured > 0) {
      refundCents = Math.max(0, captured - feeCents);
      if (refundCents > 0) {
        try {
          const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2025-08-27.basil" });
          const refund = await stripe.refunds.create({
            payment_intent: piId,
            amount: refundCents,
            metadata: { ride_request_id, type: "ride_cancel", cancel_fee_cents: String(feeCents) },
          });
          stripeRefundId = refund.id;
          nextPaymentStatus = refund.status === "succeeded" ? "refunded" : "refund_pending";
        } catch (e: any) {
          providerError = String(e?.message || e);
          console.error("[cancel-ride-request] refund failed", providerError);
          nextPaymentStatus = "refund_pending";
        }
      } else {
        // Fee >= captured — keep all funds; no refund issued.
        nextPaymentStatus = "captured";
      }
    }

    await admin
      .from("ride_requests")
      .update({
        status: "cancelled",
        cancel_reason: reason ?? null,
        cancel_fee_cents: feeCents,
        payment_status: nextPaymentStatus,
        cancelled_at: new Date().toISOString(),
      } as any)
      .eq("id", ride_request_id);

    // Cascade to service_orders + jobs + notify the assigned driver so they
    // know to abort the trip.
    try {
      await cascadeCancellationToDriver(admin, ride_request_id, "ride");
    } catch (e) {
      console.warn("[cancel-ride-request] driver cascade skipped", e);
    }

    return new Response(JSON.stringify({
      ok: true,
      status: "cancelled",
      refund_cents: refundCents,
      cancel_fee_cents: feeCents,
      payment_status: nextPaymentStatus,
      stripe_refund_id: stripeRefundId,
      provider_error: providerError,
      // Honest flag for the unpaid-ride-with-fee case until we wire saved-card charge.
      fee_charge_skipped: !wasPaid && feeCents > 0
        ? "Cancellation fee was recorded but cannot be charged without a saved payment method on file."
        : null,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-ride-request]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));

/**
 * capture-ride-tip
 * -----------------
 * Charges the rider's saved card for a post-ride tip, records it on the
 * ride_requests row, and credits the driver via creator_earnings.tips_cents
 * (the existing earnings table — drivers are the recipients here).
 *
 * Without this, the rate-and-tip UI was theatre: it accepted a tip number,
 * wrote it as plain text into a feedback_submissions row, and never charged
 * the rider or paid the driver.
 *
 * Idempotent: if ride_requests.tip_payment_intent_id is already stamped,
 * skips re-charging.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

Deno.serve(withSecurity("capture-ride-tip", async (req, ctx) => {
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
    if (!user?.email) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { ride_request_id, tip_cents, rating, feedback } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const tipAmount = Math.max(0, Math.floor(Number(tip_cents || 0)));
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: ride } = await admin
      .from("ride_requests")
      .select("id, user_id, status, assigned_driver_id, stripe_payment_intent_id, tip_cents, tip_payment_intent_id")
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

    // Always record the rating + feedback even if there's no tip.
    const ratingUpdate: Record<string, unknown> = { rated_at: new Date().toISOString() };
    if (Number.isFinite(Number(rating))) ratingUpdate.rating = Math.max(1, Math.min(5, Math.round(Number(rating))));
    if (typeof feedback === "string") ratingUpdate.rating_feedback = feedback.slice(0, 2000);
    await admin.from("ride_requests").update(ratingUpdate as any).eq("id", ride_request_id);

    if (tipAmount === 0) {
      return new Response(JSON.stringify({ ok: true, tip_cents: 0, charged: false }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Idempotency: already charged for this ride.
    if ((ride as any).tip_payment_intent_id) {
      return new Response(JSON.stringify({
        ok: true,
        already_charged: true,
        tip_payment_intent_id: (ride as any).tip_payment_intent_id,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find the customer + the payment method used for the trip so we can
    // charge the tip off-session to the same card.
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    if (!customerId) {
      return new Response(JSON.stringify({ error: "No Stripe customer on file — can't charge tip" }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let paymentMethodId: string | null = null;
    if ((ride as any).stripe_payment_intent_id) {
      try {
        const originalPi = await stripe.paymentIntents.retrieve((ride as any).stripe_payment_intent_id);
        paymentMethodId = (typeof originalPi.payment_method === "string" ? originalPi.payment_method : originalPi.payment_method?.id) ?? null;
      } catch (e) {
        console.warn("[capture-ride-tip] couldn't retrieve original PI", e);
      }
    }

    const piParams: Record<string, unknown> = {
      amount: tipAmount,
      currency: "usd",
      customer: customerId,
      description: `ZIVO ride tip · ride ${ride_request_id}`,
      metadata: {
        type: "ride_tip",
        ride_request_id,
        rider_id: user.id,
        driver_id: (ride as any).assigned_driver_id ?? "",
      },
      confirm: true,
      off_session: true,
    };
    if (paymentMethodId) piParams.payment_method = paymentMethodId;

    let pi: any;
    try {
      pi = await stripe.paymentIntents.create(piParams, { idempotencyKey: `ride-tip-${ride_request_id}-${tipAmount}` });
    } catch (e: any) {
      const msg = e?.message || "Stripe charge failed";
      console.error("[capture-ride-tip] charge failed", msg);
      return new Response(JSON.stringify({
        error: msg,
        // Surfaced to the UI so it can prompt for a new payment method.
        requires_action: e?.code === "authentication_required",
      }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (pi.status !== "succeeded") {
      return new Response(JSON.stringify({
        error: `Tip charge ${pi.status}`,
        payment_intent_id: pi.id,
      }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Record the tip on the ride row.
    await admin.from("ride_requests").update({
      tip_cents: tipAmount,
      tip_payment_intent_id: pi.id,
      tip_charged_at: new Date().toISOString(),
    } as any).eq("id", ride_request_id);

    // Credit the driver via creator_earnings (the existing daily-earnings
    // rollup table — drivers count as recipients there). Add to today's row
    // for the driver, creating it if needed.
    const driverId = (ride as any).assigned_driver_id;
    if (driverId) {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data: existing } = await admin
          .from("creator_earnings")
          .select("id, tips_cents, total_cents")
          .eq("creator_id", driverId)
          .eq("date", today)
          .maybeSingle();
        if (existing) {
          await admin.from("creator_earnings")
            .update({
              tips_cents: ((existing as any).tips_cents || 0) + tipAmount,
              total_cents: ((existing as any).total_cents || 0) + tipAmount,
            } as any)
            .eq("id", (existing as any).id);
        } else {
          await admin.from("creator_earnings").insert({
            creator_id: driverId,
            date: today,
            tips_cents: tipAmount,
            total_cents: tipAmount,
          } as any);
        }
      } catch (e) {
        console.warn("[capture-ride-tip] driver earnings credit failed", e);
        // Don't fail — tip was charged; ops can reconcile.
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      tip_cents: tipAmount,
      charged: true,
      payment_intent_id: pi.id,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[capture-ride-tip]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

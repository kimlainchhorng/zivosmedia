import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Transfers driver's share (fare − 2% platform fee) to their Connect account.
// Called server-side after a captured ride payment.
Deno.serve(withSecurity("driver-payout", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { ride_request_id } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: ride, error: rideErr } = await admin
      .from("ride_requests")
      .select("id, captured_amount_cents, assigned_driver_id, payment_status, surcharge_amount_cents")
      .eq("id", ride_request_id)
      .single();
    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (ride.payment_status !== "captured") {
      return new Response(JSON.stringify({ error: "Ride not captured" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!ride.assigned_driver_id) {
      return new Response(JSON.stringify({ error: "No assigned driver" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: account } = await admin
      .from("driver_stripe_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("driver_id", ride.assigned_driver_id)
      .maybeSingle();
    if (!account?.stripe_account_id || !account.payouts_enabled) {
      return new Response(JSON.stringify({ error: "Driver Stripe Connect not ready" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Driver's share: total captured minus surcharge minus 2% platform fee on the fare
    const captured = ride.captured_amount_cents ?? 0;
    const surcharge = ride.surcharge_amount_cents ?? 0;
    const fare = captured - surcharge;
    const platformFee = Math.round(fare * 0.02);
    const driverAmount = Math.max(0, fare - platformFee);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const transfer = await stripe.transfers.create({
      amount: driverAmount,
      currency: "usd",
      destination: account.stripe_account_id,
      transfer_group: `ride_${ride_request_id}`,
      metadata: { ride_request_id, driver_id: ride.assigned_driver_id, fare: String(fare), fee: String(platformFee) },
    });

    console.log(`[driver-payout] ride ${ride_request_id} → driver ${ride.assigned_driver_id} ${driverAmount}c (fee ${platformFee}c)`);
    return new Response(JSON.stringify({ ok: true, transfer_id: transfer.id, amount: driverAmount, platform_fee: platformFee }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[driver-payout]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

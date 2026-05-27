import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

// Transfers the driver's share to their Stripe Connect account.
// Bakong/KHR earnings are paid manually from the admin driver payout queue.
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
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { ride_request_id } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: ride, error: rideErr } = await admin
      .from("ride_requests")
      .select("id, captured_amount_cents, assigned_driver_id, payment_status, payment_currency, surcharge_amount_cents, bakong_reference")
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

    const { data: earning } = await admin
      .from("driver_earnings")
      .select("id, net_amount, platform_fee, base_amount, currency, payout_status, payout_reference")
      .eq("ride_request_id", ride_request_id)
      .eq("earning_type", "ride")
      .maybeSingle();

    const earningCurrency = String((earning as any)?.currency || ride.payment_currency || "USD").toUpperCase();
    if (earningCurrency === "KHR" || ride.bakong_reference) {
      return new Response(JSON.stringify({
        error: "Manual Bakong payout required",
        manual_driver_payout_required: true,
        driver_earning_id: (earning as any)?.id ?? null,
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if ((earning as any)?.payout_status === "stripe_paid" && (earning as any)?.payout_reference) {
      return new Response(JSON.stringify({
        ok: true,
        idempotent: true,
        transfer_id: (earning as any).payout_reference,
        amount: Math.max(0, Math.round(Number((earning as any).net_amount || 0) * 100)),
        platform_fee: Math.max(0, Math.round(Number((earning as any).platform_fee || 0) * 100)),
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: account } = await admin
      .from("driver_stripe_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("driver_id", ride.assigned_driver_id)
      .maybeSingle();
    if (!account?.stripe_account_id || !account.payouts_enabled) {
      return new Response(JSON.stringify({ error: "Driver Stripe Connect not ready" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const captured = ride.captured_amount_cents ?? 0;
    const surcharge = ride.surcharge_amount_cents ?? 0;
    const fare = captured - surcharge;
    const platformFee = earning ? Math.round(Number((earning as any).platform_fee || 0) * 100) : Math.round(fare * 0.02);
    const driverAmount = earning ? Math.max(0, Math.round(Number((earning as any).net_amount || 0) * 100)) : Math.max(0, fare - platformFee);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const transfer = await stripe.transfers.create({
      amount: driverAmount,
      currency: "usd",
      destination: account.stripe_account_id,
      transfer_group: `ride_${ride_request_id}`,
      metadata: { ride_request_id, driver_id: ride.assigned_driver_id, fare: String(fare), fee: String(platformFee) },
    });

    if ((earning as any)?.id) {
      await admin
        .from("driver_earnings")
        .update({ payout_status: "stripe_paid", payout_reference: transfer.id } as any)
        .eq("id", (earning as any).id)
        .then(() => null);
    }

    console.log(`[driver-payout] ride ${ride_request_id} to driver ${ride.assigned_driver_id} ${driverAmount}c (fee ${platformFee}c)`);
    return new Response(JSON.stringify({ ok: true, transfer_id: transfer.id, amount: driverAmount, platform_fee: platformFee }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[driver-payout]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

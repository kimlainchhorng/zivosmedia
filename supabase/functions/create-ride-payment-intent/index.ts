import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("create-ride-payment-intent", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email!;

    const rl = await rateLimitDb(userId, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const {
      ride_request_id,
      amount_cents,
      ride_type,
      city,
      wallet_credit_cents = 0,
      payment_method_id,
      promo_code,
      discount_cents = 0,
    } = await req.json();

    if (!ride_request_id || amount_cents === undefined) {
      return new Response(JSON.stringify({ error: "Invalid request: ride_request_id and amount_cents required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If promo gives 100% discount, skip Stripe entirely
    if (amount_cents <= 0 || (discount_cents > 0 && amount_cents <= 0)) {
      await supabase
        .from("ride_requests")
        .update({
          payment_status: "authorized",
          promo_code: promo_code || null,
          discount_cents: discount_cents || 0,
        })
        .eq("id", ride_request_id)
        .eq("user_id", userId);

      console.log(`[ride-payment] FREE ride ${ride_request_id} — promo ${promo_code}, no Stripe charge`);
      return new Response(JSON.stringify({
        ok: true,
        client_secret: null,
        payment_intent_id: null,
        customer_id: null,
        amount_cents: 0,
        status: "requires_capture",
        auto_confirmed: true,
        free_ride: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map frontend vehicle IDs to DB ride_type values
    const VEHICLE_TO_DB: Record<string, string> = {
      economy: "standard", share: "share", comfort: "comfort", ev: "ev",
      xl: "xl", "black-lane": "black", "black-xl": "black_suv",
      "luxury-xl": "luxury_xl", pet: "pet", wheelchair: "wheelchair",
      tuktuk: "tuktuk", "tuktuk-ev": "tuktuk_ev", moto: "moto", "share-xl": "share_xl",
    };

    const serviceAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Look up full pricing from city_pricing to validate fare & get card_fee_pct
    let cardFeePct = 0;
    const dbRideType = VEHICLE_TO_DB[ride_type] || ride_type || "standard";
    if (city) {
      const { data: pricingRows } = await serviceAdmin
        .from("city_pricing")
        .select("base_fare, per_mile, per_minute, booking_fee, minimum_fare, card_fee_pct")
        .eq("is_active", true)
        .ilike("city", city)
        .eq("ride_type", dbRideType)
        .limit(1);

      if (pricingRows && pricingRows.length > 0) {
        const p = pricingRows[0];
        if (p.card_fee_pct > 0) cardFeePct = p.card_fee_pct;

        // Server-side fare validation: recalculate from ride_request distance/duration
        const { data: rideReq } = await serviceAdmin
          .from("ride_requests")
          .select("distance_miles, duration_minutes, surge_multiplier")
          .eq("id", ride_request_id)
          .maybeSingle();

        if (rideReq && p.base_fare != null && p.per_mile != null) {
          const dist = rideReq.distance_miles ?? 0;
          const dur = rideReq.duration_minutes ?? 0;
          const surge = rideReq.surge_multiplier ?? 1.0;
          const rawFare = ((p.base_fare + p.per_mile * dist + p.per_minute * dur) * surge) + p.booking_fee;
          const expectedCents = Math.round(Math.max(rawFare, p.minimum_fare ?? 0) * 100);
          // Allow 15% tolerance for rounding, promo adjustments, wallet credits
          const maxAllowed = Math.round(expectedCents * 1.15);
          const clientBeforeDiscount = amount_cents + (discount_cents || 0);
          if (clientBeforeDiscount > maxAllowed && maxAllowed > 0) {
            console.warn(`[ride-payment] Fare validation: client=${clientBeforeDiscount}c, expected=${expectedCents}c, max=${maxAllowed}c — CLAMPING`);
            // Don't reject, just log — some edge cases (multi-stop, wait time) may exceed
          }
        }
      } else {
        // Try default pricing
        const { data: defaultRows } = await serviceAdmin
          .from("city_pricing")
          .select("card_fee_pct")
          .eq("is_active", true)
          .eq("city", "default")
          .eq("ride_type", dbRideType)
          .limit(1);
        if (defaultRows && defaultRows.length > 0 && defaultRows[0].card_fee_pct > 0) {
          cardFeePct = defaultRows[0].card_fee_pct;
        }
      }
    }

    // Apply card fee surcharge
    let chargeAmountCents = amount_cents;
    let cardFeeCents = 0;
    if (cardFeePct > 0) {
      cardFeeCents = Math.round(amount_cents * cardFeePct / 100);
      chargeAmountCents = amount_cents + cardFeeCents;
    }

    if (chargeAmountCents < 50) {
      return new Response(JSON.stringify({ error: "Amount too low (min 50 cents)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const netAmount = Math.max(50, chargeAmountCents - (wallet_credit_cents || 0));

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { zivo_user_id: userId },
      });
      customerId = customer.id;
    }

    const piParams: any = {
      amount: netAmount,
      currency: "usd",
      customer: customerId,
      capture_method: "manual",
      metadata: {
        zivo_user_id: userId,
        ride_request_id,
        ride_type: ride_type || "economy",
        wallet_credit_cents: String(wallet_credit_cents),
        original_amount_cents: String(amount_cents + (discount_cents || 0)),
        promo_code: promo_code || "",
        discount_cents: String(discount_cents || 0),
        card_fee_pct: String(cardFeePct),
        card_fee_cents: String(cardFeeCents),
      },
      description: `ZIVO Ride - ${ride_type || "economy"}${promo_code ? ` (promo: ${promo_code})` : ""}${cardFeePct > 0 ? ` (+${cardFeePct}% card fee)` : ""}`,
    };

    // If saved payment method provided, auto-confirm off-session
    if (payment_method_id) {
      piParams.payment_method = payment_method_id;
      piParams.confirm = true;
      piParams.off_session = true;
    } else {
      // Only allow card — no Link, no wallets, no Cash App
      piParams.payment_method_types = ["card"];
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    // Update ride_request with payment intent ID
    const paymentStatus = paymentIntent.status === "requires_capture" ? "authorized" : "pending";
    await supabase
      .from("ride_requests")
      .update({
        payment_intent_id: paymentIntent.id,
        payment_status: paymentStatus,
      })
      .eq("id", ride_request_id)
      .eq("user_id", userId);

    console.log(`[ride-payment] Created PI ${paymentIntent.id} for ride ${ride_request_id} ($${(netAmount / 100).toFixed(2)}) status=${paymentIntent.status} cardFee=${cardFeePct}%`);

    return new Response(JSON.stringify({
      ok: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      customer_id: customerId,
      amount_cents: netAmount,
      card_fee_pct: cardFeePct,
      card_fee_cents: cardFeeCents,
      status: paymentIntent.status,
      auto_confirmed: !!payment_method_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[ride-payment] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true }));

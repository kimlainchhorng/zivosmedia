/**
 * Create Flight Payment Intent — Embedded Stripe Elements flow
 * Creates a booking record + Stripe PaymentIntent, returns client_secret
 */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

interface CheckoutRequest {
  userId: string;
  offerId: string;
  passengers: any[];
  totalAmount: number;
  baseFare: number;
  taxesFees: number;
  stateTax?: number;
  cardProcessingFee?: number;
  zivoBookingFee?: number;
  stateCode?: string;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabinClass: string;
}

Deno.serve(withSecurity("create-flight-payment-intent", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const DUFFEL_ENV = Deno.env.get("DUFFEL_ENV") || "sandbox";
    const isLiveMode = DUFFEL_ENV === "live";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth user
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: CheckoutRequest = await req.json();
    const {
      userId,
      offerId,
      passengers,
      totalAmount,
      baseFare,
      taxesFees,
      currency,
      origin,
      destination,
      departureDate,
      returnDate,
      cabinClass,
    } = body;

    if (!userId || !offerId || !passengers?.length || !totalAmount) {
      throw new Error("Missing required fields");
    }
    if (userId !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Check launch status
    const { data: launchSettings } = await supabase
      .from("flights_launch_settings")
      .select("status, emergency_pause, first_booking_at")
      .limit(1)
      .single();

    const { data: isAdminData } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const isUserAdmin = isAdminData === true;

    if (launchSettings?.status === "test" && !isUserAdmin) {
      throw new Error("Flight bookings are not yet available. Check back soon!");
    }
    if (launchSettings?.emergency_pause) {
      throw new Error("Flight bookings are temporarily paused.");
    }

    // Validate passengers
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.given_name || !p.family_name || !p.born_on || !p.email) {
        throw new Error(`Passenger ${i + 1}: Missing required information`);
      }
      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(p.given_name) || p.given_name.length < 2) {
        throw new Error(`Passenger ${i + 1}: Invalid first name`);
      }
      if (!nameRegex.test(p.family_name) || p.family_name.length < 2) {
        throw new Error(`Passenger ${i + 1}: Invalid last name`);
      }
      if (!p.gender || !["m", "f"].includes(p.gender)) {
        throw new Error(`Passenger ${i + 1}: Gender is required`);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) {
        throw new Error(`Passenger ${i + 1}: Invalid email address`);
      }
      if (p.phone_number && !/^\+?[0-9\s\-().]{7,20}$/.test(p.phone_number)) {
        throw new Error(`Passenger ${i + 1}: Invalid phone number format`);
      }
    }

    console.log("[FlightPI] Validation passed,", passengers.length, "passengers");

    // Verify offer in LIVE mode
    const DUFFEL_API_KEY = Deno.env.get("DUFFEL_API_KEY");
    if (DUFFEL_API_KEY && isLiveMode) {
      try {
        const offerRes = await fetch(`https://api.duffel.com/air/offers/${offerId}`, {
          headers: {
            Authorization: `Bearer ${DUFFEL_API_KEY}`,
            "Duffel-Version": "v2",
            "Content-Type": "application/json",
          },
        });
        if (!offerRes.ok) {
          throw new Error("This fare is no longer available. Please search again.");
        }
        const offerData = await offerRes.json();
        const duffelPrice = parseFloat(offerData.data.total_amount);
        const expectedPrice = totalAmount * passengers.length;
        if (Math.abs(duffelPrice - expectedPrice) > 1) {
          throw new Error("The price has changed. Please search again.");
        }
        if (new Date(offerData.data.expires_at) < new Date()) {
          throw new Error("This offer has expired. Please search again.");
        }
      } catch (e) {
        if (e instanceof Error && (e.message.includes("no longer") || e.message.includes("changed") || e.message.includes("expired"))) {
          throw e;
        }
        console.warn("[FlightPI] Offer verify error (continuing):", e);
      }
    }

    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData.user?.email;

    // Create booking
    const passengerCount = passengers.length;
    const totalBookingAmount = Number((totalAmount * passengerCount).toFixed(2));
    const totalBaseFare = Number((baseFare * passengerCount).toFixed(2));
    const totalTaxesFees = Number((taxesFees * passengerCount).toFixed(2));

    const { data: booking, error: bookingError } = await supabase
      .from("flight_bookings")
      .insert({
        customer_id: userId,
        origin,
        destination,
        departure_date: departureDate,
        return_date: returnDate || null,
        passengers: passengerCount,
        total_passengers: passengerCount,
        cabin_class: cabinClass,
        price_per_passenger: totalAmount,
        subtotal: totalBaseFare,
        total_amount: totalBookingAmount,
        base_fare: totalBaseFare,
        taxes_fees: totalTaxesFees,
        currency: currency.toUpperCase(),
        offer_id: offerId,
        payment_status: "pending",
        ticketing_status: "pending",
        ticketing_partner: "duffel",
        booking_reference: `ZV${Date.now().toString(36).toUpperCase()}`,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("[FlightPI] Booking error:", bookingError);
      throw bookingError;
    }

    console.log("[FlightPI] Booking created:", booking.id);

    // Track first booking
    if (launchSettings?.status === "live" && !launchSettings?.first_booking_at) {
      await supabase
        .from("flights_launch_settings")
        .update({ first_booking_at: new Date().toISOString() })
        .is("first_booking_at", null);
    }

    // Insert passengers
    const passengerInserts = passengers.map((p: any, i: number) => ({
      booking_id: booking.id,
      passenger_index: i,
      title: p.title,
      given_name: p.given_name,
      family_name: p.family_name,
      gender: p.gender,
      born_on: p.born_on,
      email: p.email,
      phone_number: p.phone_number || null,
      passport_number: p.passport_number || null,
      passport_expiry: p.passport_expiry || null,
      passport_country: p.passport_country || null,
      nationality: p.nationality || null,
    }));

    await supabase.from("flight_passengers").insert(passengerInserts);

    // Create Stripe PaymentIntent
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const totalCents = Math.round(totalAmount * passengers.length * 100);

    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { zivo_user_id: userId },
        });
        customerId = customer.id;
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: currency.toLowerCase(),
      capture_method: "manual",
      customer: customerId,
      metadata: {
        type: "flight",
        booking_id: booking.id,
        offer_id: offerId,
        user_id: userId,
        passengers: String(passengers.length),
      },
      description: `ZIVO Flight • ${origin} → ${destination} • ${departureDate}`,
      payment_method_types: ["card"],
    });

    // Store PI id on booking
    await supabase
      .from("flight_bookings")
      .update({ stripe_checkout_session_id: paymentIntent.id })
      .eq("id", booking.id);

    console.log(`[FlightPI] PaymentIntent ${paymentIntent.id} for booking ${booking.id}, ${totalCents}c`);

    return new Response(
      JSON.stringify({
        ok: true,
        booking_id: booking.id,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        total_cents: totalCents,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : (typeof e === "object" && e !== null && "message" in e) ? (e as any).message : String(e);
    console.error("[FlightPI] Error:", errMsg);
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
}, { rateLimit: "payment", strictCors: true }));

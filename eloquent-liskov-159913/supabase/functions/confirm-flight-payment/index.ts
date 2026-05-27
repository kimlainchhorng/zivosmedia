/**
 * Confirm Flight Payment — Authorize → Book via Duffel → Capture/Cancel
 *
 * 1. Verify PaymentIntent is authorized (requires_capture)
 * 2. Create order on Duffel
 * 3. If Duffel succeeds → capture payment, update booking
 * 4. If Duffel fails → cancel payment, update booking
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

Deno.serve(withSecurity("confirm-flight-payment", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const DUFFEL_API_KEY = Deno.env.get("DUFFEL_API_KEY");
    const DUFFEL_ENV = Deno.env.get("DUFFEL_ENV") || "sandbox";
    const isLiveMode = DUFFEL_ENV === "live";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const authHeader = req.headers.get("authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const { booking_id, payment_intent_id } = await req.json();
    if (!booking_id || !payment_intent_id) {
      throw new Error("booking_id and payment_intent_id are required");
    }

    // 1. Verify PaymentIntent
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (pi.metadata?.booking_id !== booking_id) {
      throw new Error("Payment intent does not match booking");
    }
    if (pi.status !== "requires_capture") {
      throw new Error(`Payment not authorized (status: ${pi.status})`);
    }

    console.log(`[ConfirmFlight] PI ${payment_intent_id} authorized for booking ${booking_id}`);

    // 2. Fetch booking + passengers from DB
    const { data: booking, error: bErr } = await supabase
      .from("flight_bookings")
      .select("*")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) throw new Error("Booking not found");
    if (booking.user_id !== user.id) throw new Error("Access denied");

    const { data: dbPassengers } = await supabase
      .from("flight_passengers")
      .select("*")
      .eq("booking_id", booking_id)
      .order("passenger_index");

    // 3. Attempt Duffel booking
    let duffelOrderId: string | null = null;
    let duffelBookingRef: string | null = null;
    let bookingSucceeded = false;

    if (DUFFEL_API_KEY && isLiveMode) {
      try {
        const duffelPassengers = (dbPassengers || []).map((p: any) => ({
          type: "adult",
          title: p.title || "mr",
          given_name: p.given_name,
          family_name: p.family_name,
          gender: p.gender,
          born_on: p.born_on,
          email: p.email,
          phone_number: p.phone_number || undefined,
          identity_documents: p.passport_number
            ? [{
                type: "passport",
                unique_identifier: p.passport_number,
                expires_on: p.passport_expiry || undefined,
                issuing_country_code: p.passport_country || undefined,
              }]
            : undefined,
        }));

        const orderRes = await fetch("https://api.duffel.com/air/orders", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DUFFEL_API_KEY}`,
            "Duffel-Version": "v2",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              type: "instant",
              selected_offers: [booking.offer_id],
              passengers: duffelPassengers,
              payments: [{
                type: "balance",
                amount: String(booking.total_amount * (dbPassengers?.length || 1)),
                currency: booking.currency,
              }],
            },
          }),
        });

        if (!orderRes.ok) {
          const errBody = await orderRes.text();
          console.error("[ConfirmFlight] Duffel order failed:", errBody);
          throw new Error("Airline booking failed");
        }

        const orderData = await orderRes.json();
        duffelOrderId = orderData.data?.id;
        duffelBookingRef = orderData.data?.booking_reference;
        bookingSucceeded = true;

        console.log(`[ConfirmFlight] Duffel order created: ${duffelOrderId}`);
      } catch (duffelErr) {
        console.error("[ConfirmFlight] Duffel booking error:", duffelErr);
        bookingSucceeded = false;
      }
    } else {
      // Sandbox mode — skip Duffel, treat as success
      console.log("[ConfirmFlight] Sandbox mode — skipping Duffel, auto-succeeding");
      bookingSucceeded = true;
      duffelBookingRef = booking.booking_reference;
    }

    // 4. Capture or Cancel based on booking result
    if (bookingSucceeded) {
      // Capture the authorized payment
      await stripe.paymentIntents.capture(payment_intent_id);
      console.log(`[ConfirmFlight] Payment captured for ${booking_id}`);

      // Update booking status
      await supabase
        .from("flight_bookings")
        .update({
          payment_status: "paid",
          ticketing_status: duffelOrderId ? "issued" : "processing",
          duffel_order_id: duffelOrderId || undefined,
          booking_reference: duffelBookingRef || booking.booking_reference,
        } as any)
        .eq("id", booking_id);

      return new Response(
        JSON.stringify({
          ok: true,
          booking_id,
          status: "confirmed",
          booking_reference: duffelBookingRef || booking.booking_reference,
        }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    } else {
      // Cancel the authorized payment
      await stripe.paymentIntents.cancel(payment_intent_id);
      console.log(`[ConfirmFlight] Payment cancelled for ${booking_id}`);

      // Update booking status
      await supabase
        .from("flight_bookings")
        .update({
          payment_status: "cancelled",
          ticketing_status: "failed",
        } as any)
        .eq("id", booking_id);

      return new Response(
        JSON.stringify({
          ok: false,
          booking_id,
          error: "Airline booking failed. Your card was not charged.",
        }),
        { status: 422, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
  } catch (e) {
    console.error("[ConfirmFlight] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

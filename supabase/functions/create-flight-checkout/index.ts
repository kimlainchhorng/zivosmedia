/**
 * Create Flight Checkout
 * Creates a Stripe Checkout session for flight booking
 * ZIVO is the Merchant of Record
 */

import { serve, createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

interface FlightPassenger {
  title: string;
  given_name: string;
  family_name: string;
  gender: 'm' | 'f';
  born_on: string;
  email: string;
  phone_number?: string;
  passport_number?: string;
  passport_expiry?: string;
  passport_country?: string;
  nationality?: string;
}

interface CheckoutRequest {
  userId: string;
  offerId: string;
  passengers: FlightPassenger[];
  totalAmount: number;
  baseFare: number;
  taxesFees: number;
  currency: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabinClass: string;
}

serve(withSecurity("create-flight-checkout", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    // Environment checks for LIVE safety
    const DUFFEL_ENV = Deno.env.get("DUFFEL_ENV") || "sandbox";
    const isLiveMode = DUFFEL_ENV === "live";
    
    console.log("[FlightCheckout] Environment:", DUFFEL_ENV, "Live mode:", isLiveMode);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body: CheckoutRequest = await req.json();
    const {
      userId: requestedUserId,
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

    // Validate required fields
    const userId = user.id;
    if (requestedUserId && requestedUserId !== userId) {
      throw new Error("User mismatch");
    }
    if (!offerId || !passengers?.length || !totalAmount) {
      throw new Error("Missing required fields");
    }

    // Check flights launch status
    const { data: launchSettings } = await supabase
      .from("flights_launch_settings")
      .select("status, emergency_pause, first_booking_at")
      .limit(1)
      .single();

    // Check if user is admin (can bypass test mode)
    const { data: isAdminData } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const isUserAdmin = isAdminData === true;

    // Block non-admins in TEST mode
    if (launchSettings?.status === 'test' && !isUserAdmin) {
      throw new Error("Flight bookings are not yet available. Check back soon!");
    }

    // Block all bookings if emergency paused
    if (launchSettings?.emergency_pause) {
      throw new Error("Flight bookings are temporarily paused. Please try again later.");
    }

    // Server-side passenger validation (LIVE safe)
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      
      // Required fields check
      if (!p.given_name || !p.family_name || !p.born_on || !p.email) {
        throw new Error(`Passenger ${i + 1}: Missing required information`);
      }
      
      // Name format validation (letters, spaces, hyphens, apostrophes only)
      const nameRegex = /^[a-zA-Z\s\-']+$/;
      if (!nameRegex.test(p.given_name) || p.given_name.length < 2) {
        throw new Error(`Passenger ${i + 1}: Invalid first name format`);
      }
      if (!nameRegex.test(p.family_name) || p.family_name.length < 2) {
        throw new Error(`Passenger ${i + 1}: Invalid last name format`);
      }
      
      // Gender validation (required by airlines)
      if (!p.gender || !['m', 'f'].includes(p.gender)) {
        throw new Error(`Passenger ${i + 1}: Gender is required`);
      }
      
      // Email validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(p.email)) {
        throw new Error(`Passenger ${i + 1}: Invalid email format`);
      }
      
      // Date of birth validation
      const dob = new Date(p.born_on);
      const now = new Date();
      if (isNaN(dob.getTime()) || dob >= now) {
        throw new Error(`Passenger ${i + 1}: Invalid date of birth`);
      }
    }

    console.log("[FlightCheckout] Passenger validation passed for", passengers.length, "passengers");

    // PAYMENT SAFETY: Verify offer is still valid before creating booking
    const DUFFEL_API_KEY = Deno.env.get("DUFFEL_API_KEY");
    
    if (DUFFEL_API_KEY && isLiveMode) {
      console.log("[FlightCheckout] Verifying offer validity (LIVE mode)...");
      
      try {
        const offerResponse = await fetch(`https://api.duffel.com/air/offers/${offerId}`, {
          headers: {
            "Authorization": `Bearer ${DUFFEL_API_KEY}`,
            "Duffel-Version": "v2",
            "Content-Type": "application/json",
          },
        });

        if (!offerResponse.ok) {
          const errorData = await offerResponse.json().catch(() => ({}));
          console.error("[FlightCheckout] Offer verification failed:", offerResponse.status, errorData);
          throw new Error("This fare is no longer available. Please search again.");
        }

        const offerData = await offerResponse.json();
        const duffelOffer = offerData.data;

        // Verify price matches (with $1 tolerance for rounding)
        const duffelPrice = parseFloat(duffelOffer.total_amount);
        const expectedPrice = totalAmount * passengers.length;
        const priceDiff = Math.abs(duffelPrice - expectedPrice);
        
        if (priceDiff > 1) {
          console.error("[FlightCheckout] Price mismatch:", { duffelPrice, expectedPrice, priceDiff });
          throw new Error("The price has changed. Please search again for updated fares.");
        }

        // Verify offer hasn't expired
        const expiresAt = new Date(duffelOffer.expires_at);
        if (expiresAt < new Date()) {
          console.error("[FlightCheckout] Offer expired at:", expiresAt);
          throw new Error("This offer has expired. Please search again.");
        }

        console.log("[FlightCheckout] Offer verified successfully - price:", duffelPrice, "expires:", expiresAt);
      } catch (verifyError) {
        // Re-throw user-friendly errors
        if (verifyError instanceof Error && 
            (verifyError.message.includes("no longer available") || 
             verifyError.message.includes("has changed") ||
             verifyError.message.includes("expired"))) {
          throw verifyError;
        }
        // Log unexpected errors but continue (may be network issue)
        console.warn("[FlightCheckout] Offer verification error (continuing):", verifyError);
      }
    } else if (!isLiveMode) {
      console.log("[FlightCheckout] Skipping offer verification (sandbox mode)");
    }

    console.log("[FlightCheckout] Creating booking for user:", userId, "offer:", offerId);

    // Get user email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;
    const userEmail = userData.user?.email;

    // Create flight_bookings record with pending_payment status
    const { data: booking, error: bookingError } = await supabase
      .from("flight_bookings")
      .insert({
        customer_id: userId,
        origin,
        destination,
        departure_date: departureDate,
        return_date: returnDate || null,
        passengers: passengers.length,
        cabin_class: cabinClass,
        total_amount: totalAmount,
        base_fare: baseFare,
        taxes_fees: taxesFees,
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
      console.error("[FlightCheckout] Booking creation error:", bookingError);
      throw bookingError;
    }

    console.log("[FlightCheckout] Created booking:", booking.id);

    // Track first booking if LIVE mode and not already tracked
    if (launchSettings?.status === 'live' && !launchSettings?.first_booking_at) {
      await supabase
        .from("flights_launch_settings")
        .update({ first_booking_at: new Date().toISOString() })
        .is("first_booking_at", null);
      console.log("[FlightCheckout] First LIVE booking recorded!");
    }

    // Insert passengers
    const passengerInserts = passengers.map((p, index) => ({
      booking_id: booking.id,
      passenger_index: index,
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

    const { error: passengersError } = await supabase
      .from("flight_passengers")
      .insert(passengerInserts);

    if (passengersError) {
      console.error("[FlightCheckout] Passengers insert error:", passengersError);
      // Don't fail the whole checkout, continue
    }

    // Build line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Flight: ${origin} → ${destination}`,
            description: `${passengers.length} passenger(s), ${cabinClass} class, ${departureDate}`,
          },
          unit_amount: Math.round(baseFare * 100), // Convert to cents
        },
        quantity: passengers.length,
      },
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: "Taxes & Fees",
            description: "Airport taxes and carrier fees",
          },
          unit_amount: Math.round(taxesFees * 100),
        },
        quantity: passengers.length,
      },
    ];

    // Get the base URL for redirects
    const origin_url = req.headers.get("origin") || "https://hizivo.com";

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: userEmail,
      line_items: lineItems,
      metadata: {
        type: "flight",
        booking_id: booking.id,
        offer_id: offerId,
        user_id: userId,
        passengers: String(passengers.length),
      },
      success_url: `${origin_url}/flights/confirmation/${booking.id}?success=true`,
      cancel_url: `${origin_url}/flights/checkout?offer=${offerId}&cancelled=true`,
      payment_intent_data: {
        metadata: {
          type: "flight",
          booking_id: booking.id,
        },
      },
    });

    console.log("[FlightCheckout] Stripe session created:", session.id);

    // Update booking with Stripe session ID
    await supabase
      .from("flight_bookings")
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        bookingId: booking.id,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("[FlightCheckout] Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

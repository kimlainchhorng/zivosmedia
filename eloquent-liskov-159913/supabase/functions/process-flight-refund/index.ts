/**
 * Process Flight Refund
 * Handles refund requests for flight bookings
 * Actions: 'request' (user), 'process' (admin), 'auto' (after ticketing failure)
 */

import { serve, createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const DUFFEL_API_URL = "https://api.duffel.com";

interface RefundRequest {
  bookingId: string;
  reason?: string;
  action: 'request' | 'process' | 'auto';
}

serve(withSecurity("process-flight-refund", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  // Auth: require service role key or authenticated user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (token !== supabaseServiceKey) {
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const duffelApiKey = Deno.env.get("DUFFEL_API_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const { bookingId, reason: rawReason, action }: RefundRequest = await req.json();

    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    // Sanitize reason: plain text only, max 500 chars
    const reason = typeof rawReason === "string"
      ? rawReason.replace(/[<>&"']/g, "").trim().slice(0, 500)
      : undefined;

    console.log(`[FlightRefund] Processing ${action} refund for booking:`, bookingId);

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("flight_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // For 'request' action, just mark as pending refund
    if (action === 'request') {
      const { error: updateError } = await supabase
        .from("flight_bookings")
        .update({
          refund_status: 'requested',
          refund_reason: reason || 'User requested refund',
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      console.log("[FlightRefund] Refund request recorded for:", bookingId);

      // Send refund requested email
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-flight-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'refund_requested',
            bookingId,
          }),
        });
      } catch (emailErr) {
        console.error("[FlightRefund] Email failed:", emailErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Refund request submitted. Our team will review it shortly.",
          status: 'requested',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For 'process' or 'auto' actions, actually process the refund
    if (action === 'process' || action === 'auto') {
      // Check if there's a Stripe payment to refund
      if (stripeKey && booking.stripe_payment_intent_id) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
          
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripe_payment_intent_id,
            reason: action === 'auto' ? 'requested_by_customer' : 'requested_by_customer',
          });

          console.log("[FlightRefund] Stripe refund created:", refund.id);
        } catch (stripeError) {
          console.error("[FlightRefund] Stripe refund error:", stripeError);
          // If auto-refund, we should still continue and mark as failed
          if (action === 'auto') {
            await supabase
              .from("flight_bookings")
              .update({
                refund_status: 'failed',
                refund_reason: reason || 'Auto-refund after ticketing failure',
              })
              .eq("id", bookingId);
            throw stripeError;
          }
          throw stripeError;
        }
      }

      // If Duffel order exists, cancel it
      if (duffelApiKey && booking.ticketing_partner_order_id) {
        try {
          const cancelResponse = await fetch(
            `${DUFFEL_API_URL}/air/order_cancellations`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${duffelApiKey}`,
                "Duffel-Version": "v2",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                data: {
                  order_id: booking.ticketing_partner_order_id,
                },
              }),
            }
          );

          if (cancelResponse.ok) {
            console.log("[FlightRefund] Duffel order cancellation initiated");
          } else {
            const errorData = await cancelResponse.json();
            console.warn("[FlightRefund] Duffel cancellation response:", errorData);
          }
        } catch (duffelError) {
          console.warn("[FlightRefund] Duffel cancellation error:", duffelError);
          // Don't fail the whole refund if Duffel cancellation fails
        }
      }

      // Update booking with refund info
      const { error: updateError } = await supabase
        .from("flight_bookings")
        .update({
          refund_status: 'refunded',
          refund_amount: booking.total_amount,
          refund_processed_at: new Date().toISOString(),
          refund_reason: reason || (action === 'auto' ? 'Ticketing failed - auto refund' : 'Admin processed refund'),
          ticketing_status: action === 'auto' ? 'failed' : booking.ticketing_status,
          payment_status: 'refunded',
        })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      // Log the refund
      await supabase
        .from("flight_ticketing_logs")
        .insert({
          booking_id: bookingId,
          action: 'refund',
          partner: 'stripe',
          status: 'success',
          request_payload: { action, reason },
          response_payload: { refunded: booking.total_amount },
        });

      console.log("[FlightRefund] Refund processed successfully for:", bookingId);

      // Send refund completed email
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-flight-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'refund_completed',
            bookingId,
          }),
        });
      } catch (emailErr) {
        console.error("[FlightRefund] Email failed:", emailErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Refund processed successfully",
          status: 'refunded',
          amount: booking.total_amount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("[FlightRefund] Error:", error);
    const message = error instanceof Error ? error.message : "Refund processing failed";

    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

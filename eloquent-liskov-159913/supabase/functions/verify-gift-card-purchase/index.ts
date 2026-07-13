import { serve, createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(withSecurity("verify-gift-card-purchase", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "Missing session_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const giftCardId = session.metadata?.gift_card_id;
    if (!giftCardId) {
      return new Response(
        JSON.stringify({ error: "No gift card associated with this session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Activate the gift card
    const { data: giftCard, error: updateError } = await supabase
      .from("gift_cards")
      .update({ is_active: true })
      .eq("id", giftCardId)
      .select()
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to activate gift card" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a purchase transaction record
    await supabase.from("gift_card_transactions").insert({
      gift_card_id: giftCardId,
      transaction_type: "purchase",
      amount: giftCard.initial_balance,
      balance_after: giftCard.current_balance,
      notes: `Gift card purchased${giftCard.recipient_email ? ` for ${giftCard.recipient_email}` : ""}`,
    });

    // Log email send attempt (actual email integration can be added later)
    if (giftCard.recipient_email) {
      console.log(`Gift card delivery queued for recipient`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        gift_card: {
          id: giftCard.id,
          code: giftCard.code,
          amount: giftCard.initial_balance,
          recipient_email: giftCard.recipient_email,
          recipient_name: giftCard.recipient_name,
          message: giftCard.message,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

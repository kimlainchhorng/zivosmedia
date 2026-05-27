import { serve, createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const PRESET_AMOUNTS = [1000, 2500, 5000, 10000]; // $10, $25, $50, $100 in cents

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ZIVO-${segment()}-${segment()}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount_cents, recipient_email, recipient_name, message, sender_name, success_url, cancel_url } =
      await req.json();

    if (!amount_cents || !PRESET_AMOUNTS.includes(amount_cents)) {
      return new Response(
        JSON.stringify({ error: "Invalid amount. Choose $10, $25, $50, or $100." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize string fields — strip HTML chars, enforce length limits
    const sanitize = (s: unknown, max: number) =>
      typeof s === "string" ? s.replace(/[<>&"']/g, "").trim().slice(0, max) : undefined;
    const safeRecipientEmail = sanitize(recipient_email, 254);
    const safeRecipientName = sanitize(recipient_name, 100);
    const safeMessage = sanitize(message, 500);
    const safeSenderName = sanitize(sender_name, 100);

    if (!safeRecipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeRecipientEmail)) {
      return new Response(
        JSON.stringify({ error: "A valid recipient email is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header (optional — guests can buy gift cards too)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
      }
    }

    // Generate unique code
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("gift_cards")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    // Create pending gift card record
    const { data: giftCard, error: insertError } = await supabase
      .from("gift_cards")
      .insert({
        code,
        initial_balance: amount_cents / 100, // stored as dollars in the table
        current_balance: amount_cents / 100,
        is_active: false, // activated after payment verification
        purchaser_user_id: userId,
        purchaser_email: userEmail || safeSenderName || null,
        purchaser_name: safeSenderName || null,
        recipient_email: safeRecipientEmail || null,
        recipient_name: safeRecipientName || null,
        message: safeMessage || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create gift card record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe Checkout session
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    const baseUrl = success_url?.split("?")[0] || `${supabaseUrl.replace(".supabase.co", ".lovable.app")}/account/gift-cards/success`;
    const cancelUrl = cancel_url || `${supabaseUrl.replace(".supabase.co", ".lovable.app")}/account/gift-cards`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount_cents,
            product_data: {
              name: `ZIVO Gift Card - $${amount_cents / 100}`,
              description: recipient_email
                ? `Gift card for ${recipient_name || recipient_email}`
                : "ZIVO Gift Card",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        gift_card_id: giftCard.id,
        type: "gift_card_purchase",
      },
      success_url: `${baseUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    return new Response(
      JSON.stringify({ url: session.url, gift_card_id: giftCard.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

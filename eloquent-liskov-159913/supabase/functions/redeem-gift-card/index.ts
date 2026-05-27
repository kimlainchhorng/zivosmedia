import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid gift card code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rl = await rateLimitDb(user.id, "payment");
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Normalize code (uppercase, trim)
    const normalizedCode = code.trim().toUpperCase();

    // Find the gift card
    const { data: giftCard, error: findError } = await supabase
      .from("gift_cards")
      .select("*")
      .eq("code", normalizedCode)
      .maybeSingle();

    if (findError || !giftCard) {
      return new Response(
        JSON.stringify({ error: "Gift card not found. Please check the code and try again." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!giftCard.is_active) {
      return new Response(
        JSON.stringify({ error: "This gift card is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (giftCard.current_balance <= 0) {
      return new Response(
        JSON.stringify({ error: "This gift card has already been redeemed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This gift card has expired" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert gift card balance (dollars) to cents for wallet
    const creditAmountCents = Math.round(giftCard.current_balance * 100);

    // Get or create customer wallet
    let { data: wallet } = await supabase
      .from("customer_wallets")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from("customer_wallets")
        .insert({
          user_id: user.id,
          balance_cents: 0,
          lifetime_credits_cents: 0,
          pending_credits_cents: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error("Wallet create error:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create wallet" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      wallet = newWallet;
    }

    const newBalance = wallet.balance_cents + creditAmountCents;
    const newLifetime = wallet.lifetime_credits_cents + creditAmountCents;

    // Update wallet balance
    const { error: walletUpdateError } = await supabase
      .from("customer_wallets")
      .update({
        balance_cents: newBalance,
        lifetime_credits_cents: newLifetime,
      })
      .eq("user_id", user.id);

    if (walletUpdateError) {
      console.error("Wallet update error:", walletUpdateError);
      return new Response(
        JSON.stringify({ error: "Failed to credit wallet" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create wallet transaction
    await supabase.from("customer_wallet_transactions").insert({
      user_id: user.id,
      amount_cents: creditAmountCents,
      balance_after_cents: newBalance,
      type: "gift_card",
      description: `Gift card redeemed: ${normalizedCode}`,
      is_redeemed: false,
    });

    // Set gift card balance to 0 and deactivate
    await supabase
      .from("gift_cards")
      .update({ current_balance: 0, is_active: false })
      .eq("id", giftCard.id);

    // Create gift card transaction
    await supabase.from("gift_card_transactions").insert({
      gift_card_id: giftCard.id,
      transaction_type: "redemption",
      amount: giftCard.current_balance,
      balance_after: 0,
      notes: `Redeemed by user ${user.id}`,
    });

    // Notify user: gift card redeemed and wallet credited
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({
          user_id: user.id,
          notification_type: "gift_card_redeemed",
          title: "Gift Card Redeemed! 🎁",
          body: `$${giftCard.current_balance.toFixed(2)} has been added to your wallet`,
          data: { type: "gift_card_redeemed", amount_dollars: giftCard.current_balance, action_url: "/wallet" },
        }),
      });
    } catch (e) { console.error("[redeem-gift-card] Push notify error:", e); }

    return new Response(
      JSON.stringify({
        success: true,
        credited_amount_cents: creditAmountCents,
        credited_amount_dollars: giftCard.current_balance,
        new_wallet_balance_cents: newBalance,
        new_wallet_balance_dollars: newBalance / 100,
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
});

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(withSecurity("connect-instant-payout", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    // Step-up MFA — payouts must be initiated from an AAL2 session
    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData.user;
    if (!user) throw new Error("Invalid auth");

    const { amount_cents, method = "instant" } = await req.json();
    if (!amount_cents || typeof amount_cents !== "number" || amount_cents < 100) {
      throw new Error("Minimum payout is $1.00");
    }
    if (amount_cents > 1_000_000_00) throw new Error("Amount exceeds maximum");

    // Connect account
    const { data: connect } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("payee_id", user.id)
      .eq("payee_type", "customer")
      .maybeSingle();
    if (!connect?.stripe_account_id) throw new Error("Stripe account not connected");
    if (!connect.payouts_enabled) throw new Error("Payouts not enabled. Complete onboarding first.");

    // Wallet balance check
    const { data: wallet } = await supabase
      .from("customer_wallets")
      .select("id, balance_cents")
      .eq("user_id", user.id)
      .single();
    const currentBalance = wallet?.balance_cents ?? 0;
    if (amount_cents > currentBalance) {
      throw new Error(`Insufficient balance. Available: $${(currentBalance / 100).toFixed(2)}`);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 1) Transfer funds from platform to creator's connect account
    const transfer = await stripe.transfers.create({
      amount: amount_cents,
      currency: "usd",
      destination: connect.stripe_account_id,
      description: `ZIVO wallet payout for user ${user.id}`,
      metadata: { user_id: user.id, type: "wallet_cashout" },
    });

    // 2) Trigger payout on the connected account (instant if requested)
    let payout: any = null;
    try {
      payout = await stripe.payouts.create(
        {
          amount: amount_cents,
          currency: "usd",
          method: method === "instant" ? "instant" : "standard",
          metadata: { user_id: user.id, transfer_id: transfer.id },
        },
        { stripeAccount: connect.stripe_account_id }
      );
    } catch (payoutErr) {
      // If instant fails, fallback to standard
      if (method === "instant") {
        try {
          payout = await stripe.payouts.create(
            {
              amount: amount_cents,
              currency: "usd",
              method: "standard",
              metadata: { user_id: user.id, transfer_id: transfer.id, instant_failed: "true" },
            },
            { stripeAccount: connect.stripe_account_id }
          );
        } catch (e2) {
          throw payoutErr;
        }
      } else {
        throw payoutErr;
      }
    }

    // 3) Deduct wallet balance + record transaction
    const newBalance = currentBalance - amount_cents;
    const isInstant = payout?.method === "instant";
    const desc = `${isInstant ? "Instant" : "Standard"} payout to card${payout?.id ? ` · ${payout.id}` : ""}`;

    await supabase.from("customer_wallet_transactions").insert({
      user_id: user.id,
      amount_cents: -amount_cents,
      balance_after_cents: newBalance,
      type: "withdrawal",
      description: desc,
    });
    await supabase.from("customer_wallets").update({
      balance_cents: newBalance,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Telegram notify
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (botToken && chatId) {
      const msg = `⚡ *${isInstant ? "Instant" : "Standard"} Stripe Payout*\nUser: ${user.id}\nAmount: $${(amount_cents / 100).toFixed(2)}\nPayout: ${payout?.id}\nArrival: ${payout?.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : "—"}`;
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
        });
      } catch (_) {}
    }

    return new Response(JSON.stringify({
      success: true,
      payout_id: payout?.id,
      method: payout?.method,
      arrival_date: payout?.arrival_date,
      new_balance_cents: newBalance,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payout failed";
    console.error("[CONNECT-INSTANT-PAYOUT]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

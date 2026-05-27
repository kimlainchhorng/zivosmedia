import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { rateLimitDb, rateLimitHeaders } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    // Step-up MFA — withdrawals must be initiated from an AAL2 session.
    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Invalid auth token");
    const userId = userData.user.id;

    const rl = await rateLimitDb(userId, "payment");
    if (rl && !rl.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateLimitHeaders(rl, "payment") },
      });
    }

    // Parse & validate input
    const { amount_cents, method, note, payout_method_id } = await req.json();

    if (!amount_cents || typeof amount_cents !== "number" || amount_cents < 500) {
      throw new Error("Minimum withdrawal is $5.00");
    }
    if (amount_cents > 1_000_000_00) {
      throw new Error("Amount exceeds maximum");
    }
    if (!method || !["bank_transfer", "aba"].includes(method)) {
      throw new Error("Invalid withdrawal method");
    }

    // Fetch payout method details for the notification
    let payoutDetails = "";
    if (payout_method_id) {
      const { data: pm } = await supabase
        .from("customer_payout_methods")
        .select("*")
        .eq("id", payout_method_id)
        .eq("user_id", userId)
        .single();
      if (pm) {
        const maskAcct = (s: string) => s.length > 4 ? `****${s.slice(-4)}` : "****";
        payoutDetails = pm.method_type === "aba"
          ? `\nABA ID: ${maskAcct(String(pm.aba_account_id || ""))}`
          : `\nBank: ${pm.bank_name || "—"}\nAcct: ${maskAcct(String(pm.account_number || ""))}`
      }
    }

    // Get current wallet balance (with row lock via service role)
    const { data: wallet, error: walletError } = await supabase
      .from("customer_wallets")
      .select("id, balance_cents")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found. Please contact support.");
    }

    const currentBalance = wallet.balance_cents ?? 0;
    if (amount_cents > currentBalance) {
      throw new Error(`Insufficient balance. Available: $${(currentBalance / 100).toFixed(2)}`);
    }

    const newBalance = currentBalance - amount_cents;
    const methodLabel = method === "aba" ? "ABA / KHQR" : "Bank Transfer";
    const description = `Withdrawal via ${methodLabel}${note ? ` — ${note}` : ""}`;

    // Insert transaction record
    const { data: txRow, error: txError } = await supabase
      .from("customer_wallet_transactions")
      .insert({
        user_id: userId,
        amount_cents: -amount_cents,
        balance_after_cents: newBalance,
        type: "withdrawal",
        description,
      })
      .select("id")
      .single();

    if (txError) {
      console.error("Transaction insert error:", txError);
      throw new Error("Failed to record withdrawal");
    }

    // Deduct balance — rollback the TX record if this fails
    const { error: updateError } = await supabase
      .from("customer_wallets")
      .update({
        balance_cents: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Balance update error:", updateError);
      // Clean up the orphaned transaction record
      await supabase.from("customer_wallet_transactions").delete().eq("id", (txRow as any).id);
      throw new Error("Failed to update balance");
    }

    // Send Telegram notification to admin
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (botToken && chatId) {
      const msg = `💸 *Withdrawal Request*\nUser: ${userId}\nAmount: $${(amount_cents / 100).toFixed(2)}\nMethod: ${methodLabel}${payoutDetails}\nNote: ${note || "—"}\nNew Balance: $${(newBalance / 100).toFixed(2)}`;
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: msg,
            parse_mode: "Markdown",
          }),
        });
      } catch (e) {
        console.error("Telegram notification failed:", e);
      }
    }

    // Notify user their withdrawal was submitted
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceKey}` },
        body: JSON.stringify({
          user_id: userId,
          notification_type: "withdrawal_submitted",
          title: "Withdrawal Submitted 💸",
          body: `Your $${(amount_cents / 100).toFixed(2)} ${methodLabel} withdrawal is being processed`,
          data: { type: "withdrawal_submitted", amount_cents, method, action_url: "/wallet" },
        }),
      });
    } catch (e) { console.error("[WITHDRAWAL] Push notify error:", e); }

    // Estimate arrival: ABA same-business-day, bank 1–3 business days
    const estimatedDays = method === "aba" ? 1 : 3;
    const arrivalDate = new Date();
    let added = 0;
    while (added < estimatedDays) {
      arrivalDate.setDate(arrivalDate.getDate() + 1);
      const day = arrivalDate.getDay();
      if (day !== 0 && day !== 6) added++; // skip weekends
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: (txRow as any).id,
        new_balance_cents: newBalance,
        amount_cents,
        method: methodLabel,
        method_type: method,
        estimated_arrival: arrivalDate.toISOString(),
        estimated_business_days: estimatedDays,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Withdrawal failed";
    console.error("[WITHDRAWAL ERROR]", message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

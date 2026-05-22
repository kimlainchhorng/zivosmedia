import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PAYPAL_MODE = Deno.env.get("PAYPAL_MODE") ?? "live"; // "live" | "sandbox"
const PAYPAL_BASE = PAYPAL_MODE === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function getPayPalAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");

  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal auth failed: ${t}`);
  }
  const json = await res.json();
  return json.access_token;
}

serve(withSecurity("paypal-payout", async (req, ctx) => {
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    // Step-up MFA — PayPal payouts must be initiated from an AAL2 session
    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData.user;
    if (!user) throw new Error("Invalid auth");

    const { amount_cents, paypal_email } = await req.json();
    if (!amount_cents || typeof amount_cents !== "number" || amount_cents < 100) {
      throw new Error("Minimum payout is $1.00");
    }
    if (amount_cents > 1_000_000_00) throw new Error("Amount exceeds maximum");
    if (!paypal_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypal_email)) {
      throw new Error("Valid PayPal email required");
    }

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

    // Send PayPal payout
    const accessToken = await getPayPalAccessToken();
    const senderBatchId = `zivo_${user.id.substring(0, 8)}_${Date.now()}`;
    const amountStr = (amount_cents / 100).toFixed(2);

    const payoutRes = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: "You have a payout from ZIVO!",
          email_message: "Your ZIVO wallet payout has been sent. Thank you for being a creator!",
        },
        items: [{
          recipient_type: "EMAIL",
          amount: { value: amountStr, currency: "USD" },
          receiver: paypal_email,
          note: "ZIVO creator wallet payout",
          sender_item_id: `zivo_${user.id.substring(0, 8)}_${Date.now()}`,
        }],
      }),
    });

    const payoutJson = await payoutRes.json();
    if (!payoutRes.ok) {
      console.error("[PAYPAL-PAYOUT] error", payoutJson);
      const msg = payoutJson?.message || payoutJson?.name || "PayPal payout failed";
      throw new Error(msg);
    }

    const payoutBatchId = payoutJson?.batch_header?.payout_batch_id;
    const status = payoutJson?.batch_header?.batch_status;

    // Deduct wallet balance + log transaction
    const newBalance = currentBalance - amount_cents;
    await supabase.from("customer_wallet_transactions").insert({
      user_id: user.id,
      amount_cents: -amount_cents,
      balance_after_cents: newBalance,
      type: "withdrawal",
      description: `PayPal payout to ${paypal_email}${payoutBatchId ? ` · ${payoutBatchId}` : ""}`,
    });
    await supabase.from("customer_wallets").update({
      balance_cents: newBalance,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    // Telegram notify
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (botToken && chatId) {
      const maskedEmail = paypal_email.includes("@")
        ? `${paypal_email[0]}****@${paypal_email.split("@")[1]}`
        : "****";
      const msg = `💸 *PayPal Payout*\nAmount: $${amountStr}\nTo: ${maskedEmail}\nBatch: ${payoutBatchId}\nStatus: ${status}`;
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
      payout_batch_id: payoutBatchId,
      status,
      new_balance_cents: newBalance,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Payout failed";
    console.error("[PAYPAL-PAYOUT]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

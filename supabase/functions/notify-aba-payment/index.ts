/**
 * notify-aba-payment — Sends a Telegram message to the business owner
 * when a customer confirms ABA KHQR payment.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("notify-aba-payment", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!chatId) throw new Error("TELEGRAM_CHAT_ID is not configured");

    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      ride_request_id,
      amount,
      amount_khr,
      reference,
      verified_by,
      customer_name,
      pickup,
      dropoff,
      vehicle_type,
    } = body;

    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Telegram message
    const message = [
      `💰 *ABA Payment Confirmation*`,
      ``,
      `🆔 Ride: \`${ride_request_id.substring(0, 8)}\``,
      reference ? `🔖 Reference: \`${reference}\`` : "",
      verified_by ? `✅ Verified by: ${verified_by}` : "",
      customer_name ? `👤 Customer: ${customer_name}` : "",
      amount ? `💵 Amount: $${Number(amount).toFixed(2)}` : "",
      amount_khr ? `៛ KHR: ${Number(amount_khr).toLocaleString("en-US")}` : "",
      vehicle_type ? `🚗 Vehicle: ${vehicle_type}` : "",
      pickup ? `📍 From: ${pickup}` : "",
      dropoff ? `📍 To: ${dropoff}` : "",
      ``,
      `⏰ ${new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" })}`,
      ``,
      `_Customer confirmed payment via KHQR scan._`,
    ].filter(Boolean).join("\n");

    // Send Telegram notification
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const telegramData = await telegramRes.json();
    console.log("[Telegram] Response:", JSON.stringify(telegramData));

    if (!telegramRes.ok) {
      console.error("[Telegram] Error:", telegramData);
      // Don't fail the payment flow if Telegram fails
    }

    return new Response(
      JSON.stringify({ success: true, notified: telegramRes.ok }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Notify ABA payment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

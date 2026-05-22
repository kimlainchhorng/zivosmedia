/**
 * creator-payout-request
 * -----------------------
 * Wraps the existing `request_live_earnings_payout` RPC (which validates +
 * inserts into creator_payouts) and adds the missing pieces:
 *   - Telegram notification to ZIVO finance (so ops actually processes it)
 *   - Hooks for future automated rails (Stripe Connect / PayPal Payouts)
 *
 * Without this, creators request withdrawals → row sits in `creator_payouts`
 * with status='pending' forever and nobody sees it.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

serve(withSecurity("creator-payout-request", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) => jsonResponse(body, status, corsHeaders);

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Not authenticated" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: ud } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
    const user = ud?.user;
    if (!user) return json({ error: "Invalid auth" }, 401);

    const body = await req.json().catch(() => ({}));
    const amount_cents = Math.floor(Number(body.amount_cents || 0));
    const method = String(body.method || "bank_transfer").trim();
    const reference_id = body.reference_id ? String(body.reference_id).slice(0, 200) : null;

    if (!amount_cents || amount_cents < 1000) {
      return json({ error: "Minimum withdrawal is $10.00" }, 400);
    }

    // Call the existing validated RPC under the user's session. It enforces
    // amount, available balance, and inserts the creator_payouts row.
    const { data: payoutId, error: rpcErr } = await userClient.rpc(
      "request_live_earnings_payout",
      { p_amount_cents: amount_cents, p_method: method, p_reference_id: reference_id },
    );
    if (rpcErr) {
      const msg = rpcErr.message || "Withdrawal failed";
      console.error("[creator-payout-request] RPC error:", msg);
      return json({ error: msg }, 400);
    }

    // Hydrate creator info for the alert.
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: creator } = await admin
      .from("creator_profiles")
      .select("display_name, payout_method, payout_details")
      .eq("user_id", user.id)
      .maybeSingle();

    const displayName = (creator as any)?.display_name || (profile as any)?.full_name || user.email || user.id;
    const payoutMethod = (creator as any)?.payout_method || method;
    const payoutDetails = (creator as any)?.payout_details ?? null;

    // Notify finance via Telegram so the request actually gets processed.
    try {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
      if (token && chat) {
        const detailsLine = payoutDetails
          ? `Details: ${JSON.stringify(payoutDetails).slice(0, 200)}`
          : "Details: none on file";
        const text = [
          "🎬 *New creator payout request*",
          `Creator: ${displayName}`,
          `User ID: ${user.id}`,
          `Amount: $${(amount_cents / 100).toFixed(2)}`,
          `Method: ${method}`,
          `Saved payout method: ${payoutMethod ?? "—"}`,
          detailsLine,
          reference_id ? `Reference: ${reference_id}` : "",
          `Payout ID: ${payoutId}`,
        ].filter(Boolean).join("\n");
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
        });
      } else {
        console.warn("[creator-payout-request] Telegram not configured — manual processing only");
      }
    } catch (e) {
      console.warn("[creator-payout-request] Telegram alert failed:", e);
      // Don't fail the request — ops can still see the row in the dashboard.
    }

    return json({
      ok: true,
      payout_id: payoutId,
      status: "pending",
      message: "Withdrawal requested",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed";
    console.error("[creator-payout-request]", msg);
    return json({ error: msg }, 500);
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

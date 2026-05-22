/**
 * square-payout
 * -------------
 * Initiates a Square Payouts API call (or queues for manual processing if
 * Square credentials are not configured). Used as one of the rails in the
 * lodge_payout_requests pipeline.
 *
 * When SQUARE_ACCESS_TOKEN + SQUARE_LOCATION_ID env vars are present, the
 * function calls the Square Payouts endpoint directly. Otherwise it marks
 * the request as `queued_manual` and pings finance via Telegram so it can
 * be processed by hand from the Square Dashboard.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SQUARE_MODE = Deno.env.get("SQUARE_MODE") ?? "production"; // "production" | "sandbox"
const SQUARE_BASE = SQUARE_MODE === "sandbox"
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

serve(withSecurity("square-payout", async (req, ctx) => {
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
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userData.user;
    if (!user) throw new Error("Invalid auth");

    const { amount_cents, square_destination, payout_request_id, note } = await req.json();
    if (!amount_cents || typeof amount_cents !== "number" || amount_cents < 100) {
      throw new Error("Minimum payout is $1.00");
    }
    if (!square_destination) {
      throw new Error("Square destination (cash app handle, email, or seller account) required");
    }

    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const locationId = Deno.env.get("SQUARE_LOCATION_ID");

    let mode: "live" | "queued_manual" = "queued_manual";
    let providerRef: string | null = null;

    if (accessToken && locationId) {
      // Square Payouts API. Idempotency key derived from payout_request_id when
      // provided so a retry does not double-pay.
      const idemKey = payout_request_id || crypto.randomUUID();
      const res = await fetch(`${SQUARE_BASE}/v2/payouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "Square-Version": "2025-01-22",
        },
        body: JSON.stringify({
          idempotency_key: idemKey,
          location_id: locationId,
          amount_money: { amount: amount_cents, currency: "USD" },
          destination: { type: "EXTERNAL", id: square_destination },
          note: note || `ZIVO lodging payout ${payout_request_id ?? ""}`.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const msg = body?.errors?.[0]?.detail || body?.message || `Square API error ${res.status}`;
        throw new Error(msg);
      }
      mode = "live";
      providerRef = body?.payout?.id ?? null;
    } else {
      // No credentials wired — queue for manual processing and ping admin.
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
      if (token && chat) {
        const text = [
          "🟦 *Square payout — manual queue*",
          `User: ${user.id}`,
          `Destination: ${square_destination}`,
          `Amount: $${(amount_cents / 100).toFixed(2)}`,
          payout_request_id ? `Request: ${payout_request_id}` : "",
          note ? `Note: ${note}` : "",
        ].filter(Boolean).join("\n");
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, mode, provider_ref: providerRef }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Square payout failed";
    console.error("[square-payout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

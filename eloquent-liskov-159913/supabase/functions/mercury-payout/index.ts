/**
 * mercury-payout
 * --------------
 * Initiates a Mercury ACH transfer (or queues for manual processing if Mercury
 * credentials are not configured). US bank accounts only.
 *
 * When MERCURY_API_TOKEN + MERCURY_ACCOUNT_ID env vars are present, the
 * function calls Mercury's Treasury API directly. Otherwise it queues the
 * request for manual processing in the Mercury Dashboard and notifies admin.
 *
 * Reference: https://docs.mercury.com/reference (Treasury API).
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MERCURY_BASE = Deno.env.get("MERCURY_API_BASE") ?? "https://api.mercury.com/api/v1";

serve(withSecurity("mercury-payout", async (req, ctx) => {
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

    const { amount_cents, recipient_id, payout_request_id, note } = await req.json();
    if (!amount_cents || typeof amount_cents !== "number" || amount_cents < 100) {
      throw new Error("Minimum payout is $1.00");
    }
    if (!recipient_id) {
      throw new Error("Mercury recipient_id required (configure recipient in Mercury Dashboard first)");
    }

    const apiToken = Deno.env.get("MERCURY_API_TOKEN");
    const accountId = Deno.env.get("MERCURY_ACCOUNT_ID");

    let mode: "live" | "queued_manual" = "queued_manual";
    let providerRef: string | null = null;

    if (apiToken && accountId) {
      const idemKey = payout_request_id || crypto.randomUUID();
      const res = await fetch(`${MERCURY_BASE}/account/${accountId}/transactions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idemKey,
        },
        body: JSON.stringify({
          recipientId: recipient_id,
          amount: amount_cents / 100,
          paymentMethod: "ach",
          note: note || `ZIVO lodging payout ${payout_request_id ?? ""}`.trim(),
          idempotencyKey: idemKey,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        const msg = body?.error?.message || body?.message || `Mercury API error ${res.status}`;
        throw new Error(msg);
      }
      mode = "live";
      providerRef = body?.id ?? body?.transactionId ?? null;
    } else {
      const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
      if (token && chat) {
        const text = [
          "🏦 *Mercury ACH — manual queue*",
          `User: ${user.id}`,
          `Recipient: ${recipient_id}`,
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
    const msg = err instanceof Error ? err.message : "Mercury payout failed";
    console.error("[mercury-payout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

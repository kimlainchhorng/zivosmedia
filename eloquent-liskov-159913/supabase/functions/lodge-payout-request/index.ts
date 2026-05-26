/**
 * lodge-payout-request
 * --------------------
 * Validates a host's payout request and inserts it into `lodge_payout_requests`.
 * Defence-in-depth: re-checks rail eligibility against the store country so a
 * client cannot request a Stripe payout from an unsupported country.
 *
 * Sends a Telegram alert to the ZIVO finance team for manual rails.
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const STRIPE_COUNTRIES = new Set([
  "US","CA","MX","BR",
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","CH","GB",
  "AU","NZ","HK","JP","SG","MY","TH","ID","PH","IN","AE",
]);

// Square Payouts (Cash App / seller deposit) supported countries.
const SQUARE_COUNTRIES = new Set(["US","CA","GB","AU","JP","IE","ES","FR"]);

// Mercury disburses to US bank accounts only (ACH / wire).
const MERCURY_COUNTRIES = new Set(["US"]);

const ALLOWED_RAILS = new Set(["stripe","aba","bank_wire","paypal","square","mercury"]);

serve(withSecurity("lodge-payout-request", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) => jsonResponse(body, status, corsHeaders);

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Not authenticated");

    // Step-up MFA — host payout requests must be initiated from an AAL2 session
    const mfaErr = enforceAal2(auth, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: ud, error: ue } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (ue || !ud.user) throw new Error("Invalid auth");
    const user = ud.user;

    const body = await req.json().catch(() => ({}));
    const store_id = String(body.store_id || "").trim();
    const payout_method_id = String(body.payout_method_id || "").trim();
    const amount_cents = Math.floor(Number(body.amount_cents || 0));
    const note = body.note ? String(body.note).slice(0, 500) : null;

    if (!store_id || !payout_method_id || !amount_cents || amount_cents <= 0) {
      return json({ error: "Missing required fields" }, 400);
    }

    // Verify store ownership
    const { data: store, error: se } = await supabase
      .from("store_profiles")
      .select("id, owner_id, market, name")
      .eq("id", store_id)
      .maybeSingle();
    if (se || !store) throw new Error("Store not found");
    if (store.owner_id !== user.id) throw new Error("Not authorized for this store");

    // Verify payout method belongs to this user + store
    const { data: method, error: me } = await supabase
      .from("customer_payout_methods")
      .select("id, user_id, store_id, rail, method_type, country_code, label")
      .eq("id", payout_method_id)
      .maybeSingle();
    if (me || !method) throw new Error("Payout method not found");
    if (method.user_id !== user.id || method.store_id !== store_id) {
      throw new Error("Payout method does not belong to this store");
    }

    const country = String(store.market || method.country_code || "US").toUpperCase().slice(0, 2);
    const rail = (method.rail || method.method_type || "bank_wire") as string;

    // Defence-in-depth: validate rail name + country eligibility.
    if (!ALLOWED_RAILS.has(rail)) {
      return json({ error: `Unsupported payout rail "${rail}".` }, 400);
    }
    if (rail === "stripe" && !STRIPE_COUNTRIES.has(country)) {
      return json({ error: `Stripe Connect is not available in ${country}. Please use ABA, bank wire, PayPal, Square, or Mercury.` }, 400);
    }
    if (rail === "square" && !SQUARE_COUNTRIES.has(country)) {
      return json({ error: `Square Payouts are not available in ${country}. Please use Stripe, PayPal, ABA, or bank wire.` }, 400);
    }
    if (rail === "mercury" && !MERCURY_COUNTRIES.has(country)) {
      return json({ error: `Mercury (US ACH) requires a US bank account. Please use a different rail.` }, 400);
    }

    // Insert request
    const { data: inserted, error: ie } = await supabase
      .from("lodge_payout_requests")
      .insert({
        store_id,
        requested_by: user.id,
        amount_cents,
        currency: "USD",
        rail,
        payout_method_id,
        note,
        status: "pending",
      })
      .select("id")
      .single();
    if (ie) throw ie;

    // Notify admin via Telegram (manual rails only — Stripe is automated)
    if (rail !== "stripe") {
      try {
        const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
        const chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
        if (token && chat) {
          const text = [
            "🏨 *New lodging payout request*",
            `Store: ${store.name || store.id}`,
            `Country: ${country}`,
            `Rail: ${rail.toUpperCase()}`,
            `Amount: $${(amount_cents / 100).toFixed(2)}`,
            `Method: ${method.label || method.method_type}`,
            note ? `Note: ${note}` : "",
            `ID: ${inserted.id}`,
          ].filter(Boolean).join("\n");
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
          });
        }
      } catch (e) {
        console.warn("[lodge-payout-request] telegram alert failed:", e);
      }
    }

    return json({ id: inserted.id, status: "pending", rail });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed";
    console.error("[lodge-payout-request]", msg);
    return json({ error: msg }, 400);
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

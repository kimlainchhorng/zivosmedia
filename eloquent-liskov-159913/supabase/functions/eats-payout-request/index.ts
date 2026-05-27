/**
 * eats-payout-request
 * --------------------
 * Validates a restaurant's payout request and inserts it into
 * `eats_payout_requests`. Mirrors lodge-payout-request: enforces AAL2 step-up,
 * validates rail eligibility against the restaurant's market country, and
 * pings finance via Telegram for manual rails.
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
const SQUARE_COUNTRIES = new Set(["US","CA","GB","AU","JP","IE","ES","FR"]);
const MERCURY_COUNTRIES = new Set(["US"]);
const ALLOWED_RAILS = new Set(["stripe","aba","bank_wire","paypal","square","mercury"]);

serve(withSecurity("eats-payout-request", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) => jsonResponse(body, status, corsHeaders);

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Not authenticated");

    const mfaErr = enforceAal2(auth, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: ud, error: ue } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (ue || !ud.user) throw new Error("Invalid auth");
    const user = ud.user;

    const body = await req.json().catch(() => ({}));
    const restaurant_id = String(body.restaurant_id || "").trim();
    const payout_method_id = String(body.payout_method_id || "").trim();
    const amount_cents = Math.floor(Number(body.amount_cents || 0));
    const note = body.note ? String(body.note).slice(0, 500) : null;

    if (!restaurant_id || !payout_method_id || !amount_cents || amount_cents <= 0) {
      return json({ error: "Missing required fields" }, 400);
    }

    const { data: restaurant, error: re } = await supabase
      .from("restaurants")
      .select("id, owner_id, market, name")
      .eq("id", restaurant_id)
      .maybeSingle();
    if (re || !restaurant) throw new Error("Restaurant not found");
    if ((restaurant as any).owner_id !== user.id) throw new Error("Not authorized for this restaurant");

    const { data: method, error: me } = await supabase
      .from("customer_payout_methods")
      .select("id, user_id, store_id, rail, method_type, country_code, label")
      .eq("id", payout_method_id)
      .maybeSingle();
    if (me || !method) throw new Error("Payout method not found");
    // For Eats we accept payout methods saved against the restaurant id (stored as store_id) or against the user.
    if ((method as any).user_id !== user.id) {
      throw new Error("Payout method does not belong to this user");
    }

    const country = String((restaurant as any).market || (method as any).country_code || "US").toUpperCase().slice(0, 2);
    const rail = ((method as any).rail || (method as any).method_type || "bank_wire") as string;

    if (!ALLOWED_RAILS.has(rail)) return json({ error: `Unsupported payout rail "${rail}".` }, 400);
    if (rail === "stripe" && !STRIPE_COUNTRIES.has(country)) {
      return json({ error: `Stripe Connect is not available in ${country}. Please use ABA, bank wire, PayPal, Square, or Mercury.` }, 400);
    }
    if (rail === "square" && !SQUARE_COUNTRIES.has(country)) {
      return json({ error: `Square Payouts are not available in ${country}.` }, 400);
    }
    if (rail === "mercury" && !MERCURY_COUNTRIES.has(country)) {
      return json({ error: `Mercury (US ACH) requires a US bank account.` }, 400);
    }

    const { data: inserted, error: ie } = await supabase
      .from("eats_payout_requests")
      .insert({
        restaurant_id,
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

    if (rail !== "stripe") {
      try {
        const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
        const chat = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");
        if (token && chat) {
          const text = [
            "🍔 *New Eats payout request*",
            `Restaurant: ${(restaurant as any).name || (restaurant as any).id}`,
            `Country: ${country}`,
            `Rail: ${rail.toUpperCase()}`,
            `Amount: $${(amount_cents / 100).toFixed(2)}`,
            `Method: ${(method as any).label || (method as any).method_type}`,
            note ? `Note: ${note}` : "",
            `ID: ${(inserted as any).id}`,
          ].filter(Boolean).join("\n");
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chat, text, parse_mode: "Markdown" }),
          });
        }
      } catch (e) {
        console.warn("[eats-payout-request] telegram alert failed:", e);
      }
    }

    return json({ id: (inserted as any).id, status: "pending", rail });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Request failed";
    console.error("[eats-payout-request]", msg);
    return json({ error: msg }, 400);
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "../_shared/stripe.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");
    const { data: userData, error: uErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (uErr || !userData.user) throw new Error("Invalid auth");
    const user = userData.user;

    const { country: rawCountry = "US", return_url } = await req.json().catch(() => ({}));
    const country = String(rawCountry || "US").trim().toUpperCase();

    // Stripe Connect Express only supports a fixed list of countries. Reject
    // unsupported markets up-front so the UI can route to a manual rail
    // (e.g. ABA / KHQR for Cambodia) instead of failing inside Stripe.
    const STRIPE_COUNTRIES = new Set([
      "US","CA","MX","BR",
      "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LI","LT","LU","MT","NL","NO","PL","PT","RO","SK","SI","ES","SE","CH","GB",
      "AU","NZ","HK","JP","SG","MY","TH","ID","PH","IN","AE",
    ]);
    if (!STRIPE_COUNTRIES.has(country)) {
      return new Response(JSON.stringify({
        error: "stripe_unsupported_country",
        country,
        message: `Stripe Connect is not available in ${country}. Use ABA, bank wire, or PayPal instead.`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const origin = req.headers.get("origin") || "https://hizivo.com";
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find existing connect account for this user
    const { data: existing } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("payee_id", user.id)
      .eq("payee_type", "customer")
      .maybeSingle();

    let accountId = existing?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: user.email ?? undefined,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: "individual",
        metadata: { user_id: user.id, source: "zivo_creator" },
      });
      accountId = account.id;

      await supabase.from("stripe_connect_accounts").insert({
        payee_id: user.id,
        payee_type: "customer",
        stripe_account_id: accountId,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        payouts_enabled: account.payouts_enabled,
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: return_url || `${origin}/wallet?connect=refresh`,
      return_url: return_url || `${origin}/wallet?connect=done`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url, account_id: accountId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onboard failed";
    console.error("[CONNECT-ONBOARD]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

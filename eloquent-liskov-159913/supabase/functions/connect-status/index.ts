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
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData.user) throw new Error("Invalid auth");

    const { data: row } = await supabase
      .from("stripe_connect_accounts")
      .select("*")
      .eq("payee_id", userData.user.id)
      .eq("payee_type", "customer")
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const account = await stripe.accounts.retrieve(row.stripe_account_id);

    // Detect instant payout eligibility (any external account with instant available)
    let instant_eligible = false;
    try {
      const externals = await stripe.accounts.listExternalAccounts(row.stripe_account_id, { object: "card", limit: 5 });
      instant_eligible = externals.data.some((c: any) => (c.available_payout_methods || []).includes("instant"));
    } catch (_) {}

    await supabase.from("stripe_connect_accounts").update({
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);

    return new Response(JSON.stringify({
      connected: true,
      account_id: row.stripe_account_id,
      country: account.country ?? null,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
      instant_eligible,
      requirements: account.requirements?.currently_due ?? [],
      requirements_past_due: account.requirements?.past_due ?? [],
      disabled_reason: account.requirements?.disabled_reason ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Status failed";
    console.error("[CONNECT-STATUS]", msg);
    return new Response(JSON.stringify({ error: msg, connected: false }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

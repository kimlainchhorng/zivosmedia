import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";

// Creates Stripe Connect Express account for a driver and returns onboarding URL.
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { country = "US", return_url } = await req.json();
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: existing } = await admin
      .from("driver_stripe_accounts")
      .select("stripe_account_id")
      .eq("driver_id", user.id)
      .maybeSingle();

    let accountId = existing?.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: user.email,
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        metadata: { driver_id: user.id },
      });
      accountId = account.id;
      await admin.from("driver_stripe_accounts").insert({
        driver_id: user.id,
        stripe_account_id: accountId,
        country,
      } as any);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: return_url ?? `${req.headers.get("origin")}/driver/payouts`,
      return_url: return_url ?? `${req.headers.get("origin")}/driver/payouts?onboarded=1`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url, account_id: accountId }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[driver-connect-onboard]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});

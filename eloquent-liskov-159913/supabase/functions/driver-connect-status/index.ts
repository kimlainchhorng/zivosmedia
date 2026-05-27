import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";

// Refreshes Stripe Connect account capabilities for the calling driver.
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

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: row } = await admin
      .from("driver_stripe_accounts")
      .select("*")
      .eq("driver_id", user.id)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ connected: false }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const account = await stripe.accounts.retrieve(row.stripe_account_id);

    const update = {
      onboarded: !!account.details_submitted,
      payouts_enabled: !!account.payouts_enabled,
      charges_enabled: !!account.charges_enabled,
      details_submitted: !!account.details_submitted,
      requirements: account.requirements ?? null,
    };
    await admin.from("driver_stripe_accounts").update(update as any).eq("driver_id", user.id);

    return new Response(JSON.stringify({
      connected: true,
      account_id: row.stripe_account_id,
      ...update,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[driver-connect-status]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});

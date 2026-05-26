/**
 * connect-onboard-stylist
 * -----------------------
 * Anonymous-callable. The owner shares the public /stylist/:stylistId URL with
 * each stylist (same unguessable-UUID trust model as the day-view page); the
 * stylist clicks "Set up Stripe payouts" on that page, which calls this
 * function with `{ stylist_id }`.
 *
 * Behaviour:
 *   1) Validates the stylist exists, is active, and belongs to an active store.
 *   2) Loads or creates a Stripe Connect Express account, persisting the
 *      `stripe_connect_account_id` onto the salon_stylists row.
 *   3) Mints a fresh AccountLink (`type: account_onboarding`) and returns the
 *      hosted onboarding URL. Refresh/return URLs come back to the same
 *      /stylist/:stylistId page so the stylist lands where they started.
 *   4) Webhook `account.updated` (see stripe-webhook) is the source of truth
 *      for status — this function only writes the account id on first create.
 *
 * Mirrors `connect-onboard` (the creator/owner flow), but keyed off
 * stylist_id rather than auth.uid — stylists do not need a hizivo user
 * account to receive Stripe payouts.
 */
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import Stripe from "../_shared/stripe.ts";

interface Body {
  stylist_id?: string;
  return_url?: string;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const body = (await req.json().catch(() => ({}))) as Body;
    const stylistId = body.stylist_id?.trim();
    if (!stylistId) {
      return new Response(JSON.stringify({ error: "stylist_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // --- Validate stylist + load existing account id, if any -----------------
    const { data: stylist, error: sErr } = await supabase
      .from("salon_stylists")
      .select("id, store_id, display_name, email, is_active, stripe_connect_account_id")
      .eq("id", stylistId)
      .maybeSingle();
    if (sErr || !stylist) {
      return new Response(JSON.stringify({ error: "Stylist not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!(stylist as { is_active: boolean }).is_active) {
      return new Response(JSON.stringify({ error: "Stylist is not active" }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: store } = await supabase
      .from("store_profiles")
      .select("id, name, is_active")
      .eq("id", (stylist as { store_id: string }).store_id)
      .maybeSingle();
    if (!store || !(store as { is_active: boolean }).is_active) {
      return new Response(JSON.stringify({ error: "Salon is not active" }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const appUrl =
      Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || req.headers.get("origin") || "https://hizivo.com";
    const returnUrl = body.return_url || `${appUrl}/stylist/${stylistId}`;

    // --- Create the Connect Express account on first call --------------------
    let accountId = (stylist as { stripe_connect_account_id: string | null }).stripe_connect_account_id;

    if (!accountId) {
      const stylistEmail = (stylist as { email: string | null }).email ?? undefined;
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: stylistEmail,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          source: "salon_stylist",
          stylist_id: stylistId,
          store_id: (stylist as { store_id: string }).store_id,
          store_name: (store as { name: string | null }).name ?? "",
        },
      });
      accountId = account.id;

      const { error: upErr } = await supabase
        .from("salon_stylists")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: "pending",
          stripe_connect_charges_enabled: account.charges_enabled ?? false,
          stripe_connect_payouts_enabled: account.payouts_enabled ?? false,
          stripe_connect_details_submitted: account.details_submitted ?? false,
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq("id", stylistId);
      if (upErr) {
        console.error("[connect-onboard-stylist] persist account_id failed", upErr);
        // Non-fatal — webhook will reconcile.
      }
    }

    // --- Mint a fresh AccountLink and return ---------------------------------
    const link = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: `${returnUrl}?connect=refresh`,
      return_url: `${returnUrl}?connect=done`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: link.url, account_id: accountId }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onboard failed";
    console.error("[connect-onboard-stylist]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

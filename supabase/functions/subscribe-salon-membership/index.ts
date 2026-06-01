/**
 * subscribe-salon-membership
 * --------------------------
 * Anon-callable. Client clicks "Subscribe" on a tier card at
 * /salon/:slug/membership; this function mints a Stripe Checkout Session in
 * `mode: 'subscription'` and returns the URL. The webhook is what actually
 * creates the salon_client_memberships row on `checkout.session.completed`
 * (subscription) — until that fires we have no Stripe subscription id to
 * persist.
 *
 * Money flow: tier Product + Price are on the platform Stripe account
 * (created by sync-salon-membership-tier). `subscription_data.transfer_data.destination`
 * routes the recurring invoices to the salon's Connect account.
 * `subscription_data.application_fee_percent` keeps the 2% platform cut.
 *
 * Trust model: the email + name are customer-supplied; we don't validate
 * them up front. The salon_clients row is created/matched in the webhook
 * using the verified Stripe Customer email + the booking opt-in pattern
 * the rest of the salon module uses.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

interface Body {
  tier_id?: string;
  client_email?: string;
  client_name?: string;
}

// Platform's % cut on every invoice — same as the deposit / no-show / tip
// flows. Kept as a constant so a future policy change is a single edit.
const PLATFORM_FEE_PERCENT = 2;

Deno.serve(withSecurity("subscribe-salon-membership", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const body = (await req.json().catch(() => ({}))) as Body;
    const tierId = body.tier_id?.trim();
    const email = body.client_email?.trim().toLowerCase();
    if (!tierId) {
      return new Response(JSON.stringify({ error: "tier_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!email || !/.+@.+\..+/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Load tier + salon Stripe account --------------------------------
    const { data: tier, error: tErr } = await supabase
      .from("salon_membership_tiers")
      .select("id, store_id, name, monthly_price_cents, billing_interval, stripe_price_id, is_active")
      .eq("id", tierId)
      .maybeSingle();
    if (tErr || !tier) {
      return new Response(JSON.stringify({ error: "Tier not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const t = tier as any;
    if (!t.is_active) {
      return new Response(JSON.stringify({ error: "This tier isn't available." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!t.stripe_price_id) {
      return new Response(JSON.stringify({ error: "This tier hasn't been synced to Stripe yet — ask the salon owner." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("store_payment_settings")
      .select("stripe_account_id, stripe_status")
      .eq("store_id", t.store_id)
      .eq("market", "us")
      .maybeSingle();
    const accountId = (settings as any)?.stripe_account_id;
    if (!accountId || (settings as any).stripe_status !== "active") {
      return new Response(JSON.stringify({ error: "This salon's Stripe account isn't active." }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: store } = await supabase
      .from("store_profiles")
      .select("name, slug")
      .eq("id", t.store_id)
      .maybeSingle();
    const slug = (store as any)?.slug ?? "";
    const storeName = (store as any)?.name ?? "the salon";
    const appUrl = Deno.env.get("PUBLIC_APP_URL") || Deno.env.get("SITE_URL") || "https://zivollc.com";

    // ---- Create the Checkout Session -------------------------------------
    // Idempotency: tied to (tier, email) so a customer who taps Subscribe
    // twice from the same tab gets the SAME session URL instead of a
    // duplicate Customer. A different email = different session.
    const idempotencyKey = `salon-membership:${t.id}:${email}`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer_email: email,
        // Match the booking-deposit flow — explicit Customer creation so the
        // subscription's Customer is reusable for future invoices + the
        // salon-side admin can find the row by email.
        customer_creation: "always",
        line_items: [{ price: t.stripe_price_id, quantity: 1 }],
        subscription_data: {
          // Recurring revenue lands on the salon's Connect account, minus the
          // platform's 2% cut.
          transfer_data: { destination: accountId },
          application_fee_percent: PLATFORM_FEE_PERCENT,
          metadata: {
            type: "salon_membership",
            tier_id: t.id,
            store_id: t.store_id,
            client_email: email,
            client_name: body.client_name?.trim().slice(0, 120) ?? "",
          },
        },
        metadata: {
          type: "salon_membership",
          tier_id: t.id,
          store_id: t.store_id,
        },
        success_url: `${appUrl}/salon/${slug}/membership?status=success`,
        cancel_url: `${appUrl}/salon/${slug}/membership?status=cancel`,
      },
      { idempotencyKey },
    );

    return new Response(JSON.stringify({
      url: session.url,
      session_id: session.id,
      store_name: storeName,
    }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[subscribe-salon-membership]", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));

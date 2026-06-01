/**
 * sync-salon-membership-tier
 * --------------------------
 * Owner-triggered: creates (or no-ops on) the Stripe Product + Price for a
 * membership tier and persists their ids on the tier row. Called from the
 * admin SalonMembershipsSection "Save tier" / "Sync to Stripe" button.
 *
 * Auth: owner-or-admin of the store. NOT anon-callable (would let anyone
 * mint Stripe Products on someone else's connected account).
 *
 * Idempotent: if the row already has stripe_product_id + stripe_price_id,
 * returns 200 with `synced: false`. The owner can change a tier's price
 * via the UI, but since Stripe Prices are immutable, that creates a NEW
 * Price and updates the row to point at it (old Price stays in Stripe so
 * existing subscribers keep their cadence — Stripe-recommended approach).
 *
 * Money flow: the Product + Price live on the platform Stripe account. When
 * a customer subscribes via subscribe-salon-membership, that function uses
 * `transfer_data.destination` to route the recurring invoices to the
 * salon's Connect Express account.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

interface Body {
  tier_id?: string;
}

Deno.serve(withSecurity("sync-salon-membership-tier", async (req, ctx) => {
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // ---- Authenticate the owner -----------------------------------------
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    const body = (await req.json().catch(() => ({}))) as Body;
    const tierId = body.tier_id?.trim();
    if (!tierId) {
      return new Response(JSON.stringify({ error: "tier_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Service-role for the mutations (the tier columns aren't user-writable
    // via RLS once Stripe ids are in play — webhook + this function are the
    // only writers).
    const supabase = createClient(supabaseUrl, serviceKey);

    // ---- Load the tier and verify caller owns the store ------------------
    const { data: tier, error: tErr } = await supabase
      .from("salon_membership_tiers")
      .select("id, store_id, name, description, monthly_price_cents, billing_interval, stripe_product_id, stripe_price_id")
      .eq("id", tierId)
      .maybeSingle();
    if (tErr || !tier) {
      return new Response(JSON.stringify({ error: "Tier not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const t = tier as any;

    const { data: membership } = await supabase
      .from("store_members")
      .select("role")
      .eq("store_id", t.store_id)
      .eq("user_id", userId)
      .maybeSingle();
    const role = (membership as any)?.role ?? null;
    if (!role || (role !== "owner" && role !== "manager" && role !== "admin")) {
      return new Response(JSON.stringify({ error: "Not authorized for this salon." }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ---- Verify the salon's Stripe Connect account is active ------------
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

    // ---- Create Product if missing --------------------------------------
    let productId: string | null = t.stripe_product_id ?? null;
    let priceId: string | null = t.stripe_price_id ?? null;
    let synced = false;

    if (!productId) {
      const product = await stripe.products.create(
        {
          name: t.name,
          description: t.description || undefined,
          metadata: {
            type: "salon_membership_tier",
            tier_id: t.id,
            store_id: t.store_id,
          },
        },
        { idempotencyKey: `salon-tier-product:${t.id}` },
      );
      productId = product.id;
      synced = true;
    }

    if (!priceId) {
      const price = await stripe.prices.create(
        {
          product: productId!,
          unit_amount: t.monthly_price_cents,
          currency: "usd",
          recurring: { interval: t.billing_interval as "month" | "year" },
          metadata: {
            type: "salon_membership_tier",
            tier_id: t.id,
            store_id: t.store_id,
          },
        },
        // Per-tier-version idempotency: incorporate price + interval so a
        // re-sync after editing the amount creates a NEW Price (Prices are
        // immutable in Stripe; new amount → new Price id).
        { idempotencyKey: `salon-tier-price:${t.id}:${t.monthly_price_cents}:${t.billing_interval}` },
      );
      priceId = price.id;
      synced = true;
    }

    if (synced) {
      await supabase
        .from("salon_membership_tiers")
        .update({
          stripe_product_id: productId,
          stripe_price_id: priceId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", t.id);
    }

    return new Response(JSON.stringify({
      synced,
      stripe_product_id: productId,
      stripe_price_id: priceId,
    }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[sync-salon-membership-tier]", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Unknown error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

// track-promo-redemption — validates a promo code use, records redemption, attributes to campaign.
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const token = auth.replace("Bearer ", "");
    const { data: claims, error: claimErr } = await userClient.auth.getClaims(token);
    if (claimErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = claims.claims.sub as string;

    const body = await req.json();
    const promoCode = String(body?.promo_code || "").trim().toUpperCase();
    const userId = callerId;
    const orderId = body?.order_id ? String(body.order_id) : null;
    const discountCents = Number(body?.discount_cents || 0);
    const orderTotalCents = Number(body?.order_total_cents || 0);

    if (!promoCode) {
      return new Response(JSON.stringify({ error: "promo_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: promo, error: promoErr } = await admin
      .from("marketing_promo_codes")
      .select("*")
      .eq("code", promoCode)
      .maybeSingle();

    if (promoErr || !promo) {
      return new Response(JSON.stringify({ error: "Promo code not found", ok: false }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate
    if (promo.status !== "active") {
      return new Response(JSON.stringify({ error: "Promo not active", ok: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Promo expired", ok: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      promo.max_redemptions &&
      (promo.redemption_count || 0) >= promo.max_redemptions
    ) {
      return new Response(JSON.stringify({ error: "Promo fully redeemed", ok: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (orderTotalCents && promo.min_order_cents && orderTotalCents < promo.min_order_cents) {
      return new Response(
        JSON.stringify({ error: "Order below minimum", ok: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Per-customer limit
    if (promo.per_customer_limit) {
      const { count } = await admin
        .from("marketing_promo_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_code_id", promo.id)
        .eq("user_id", userId);
      if ((count || 0) >= promo.per_customer_limit) {
        return new Response(
          JSON.stringify({ error: "Per-customer limit reached", ok: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert redemption
    const { data: redemption, error: redErr } = await admin
      .from("marketing_promo_redemptions")
      .insert({
        promo_code_id: promo.id,
        user_id: userId,
        order_id: orderId,
        discount_cents: discountCents,
      })
      .select("id")
      .single();
    if (redErr) throw redErr;

    // Increment redemption count + revenue
    await admin
      .from("marketing_promo_codes")
      .update({
        redemption_count: (promo.redemption_count || 0) + 1,
        revenue_cents: (promo.revenue_cents || 0) + orderTotalCents,
      })
      .eq("id", promo.id);

    // Campaign attribution
    if (promo.campaign_id) {
      const { data: campaign } = await admin
        .from("marketing_campaigns")
        .select("target_restaurant_id")
        .eq("id", promo.campaign_id)
        .maybeSingle();
      const storeId = (campaign as any)?.target_restaurant_id || promo.store_id;
      await admin.from("marketing_campaign_events" as any).insert({
        campaign_id: promo.campaign_id,
        store_id: storeId,
        user_id: userId,
        channel: "promo",
        event_type: "converted",
        revenue_cents: orderTotalCents,
        metadata: { promo_code: promoCode, redemption_id: redemption.id, order_id: orderId },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        redemption_id: redemption.id,
        discount_cents: discountCents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[track-promo-redemption] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message, ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

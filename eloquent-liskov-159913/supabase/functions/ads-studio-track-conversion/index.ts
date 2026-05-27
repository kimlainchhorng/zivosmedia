// Conversion attribution: called after a successful order to link it back to an ad click.
// Updates the food_orders row with click_id/creative_id/variant_id/platform and logs a conversion event.
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  order_id: string;
  click_id?: string;          // ad_clicks.id (preferred — exact attribution)
  creative_id?: string;       // ads_studio_creatives.id
  variant_id?: string;        // ads_studio_variants.id
  platform?: string;          // 'google'|'meta'|'tiktok'|'youtube'
  revenue_cents?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: { user }, error: authErr } = await createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  }).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!body.order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Verify caller owns the order
  const { data: orderCheck } = await admin.from("food_orders").select("user_id").eq("id", body.order_id).maybeSingle();
  if (!orderCheck || orderCheck.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Order not found or access denied" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update the order with attribution
  const update: any = {};
  if (body.click_id) update.ads_click_id = body.click_id;
  if (body.creative_id) update.ads_creative_id = body.creative_id;
  if (body.variant_id) update.ads_variant_id = body.variant_id;
  if (body.platform) update.ads_platform = body.platform;

  if (Object.keys(update).length > 0) {
    await admin.from("food_orders").update(update).eq("id", body.order_id);
  }

  // Fetch store_id from the order
  const { data: order } = await admin.from("food_orders").select("restaurant_id, total_cents").eq("id", body.order_id).maybeSingle();
  const storeId = (order as any)?.restaurant_id;
  const revenue = body.revenue_cents ?? (order as any)?.total_cents ?? 0;

  if (!storeId) {
    return new Response(JSON.stringify({ error: "order/store not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Log conversion event for ROAS analytics
  if (body.creative_id || body.click_id) {
    await admin.from("ads_studio_events").insert({
      store_id: storeId,
      creative_id: body.creative_id ?? null,
      variant_id: body.variant_id ?? null,
      event_type: "conversion",
      revenue_cents: revenue,
    });

    // Update daily spend rollup (conversions++ for ROAS calc on the dashboard)
    if (body.platform) {
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await admin.from("ads_studio_daily_spend").select("id, conversions").eq("store_id", storeId).eq("platform", body.platform).eq("spend_date", today).maybeSingle();
      if (existing) {
        await admin.from("ads_studio_daily_spend").update({ conversions: ((existing as any).conversions || 0) + 1 }).eq("id", (existing as any).id);
      } else {
        await admin.from("ads_studio_daily_spend").insert({ store_id: storeId, platform: body.platform, spend_date: today, conversions: 1 });
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, order_id: body.order_id, attributed: Object.keys(update) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

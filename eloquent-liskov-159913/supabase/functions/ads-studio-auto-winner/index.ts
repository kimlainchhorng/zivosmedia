// Cron-driven: scans creatives whose auto_winner_at has passed and promotes the best A/B variant by CTR.
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const { data: due, error } = await admin
    .from("ads_studio_creatives")
    .select("id, store_id")
    .eq("auto_winner_picked", false)
    .not("auto_winner_at", "is", null)
    .lte("auto_winner_at", new Date().toISOString())
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const results: any[] = [];
  for (const c of due ?? []) {
    // pull variant performance
    const { data: variants } = await admin
      .from("ads_studio_variants")
      .select("id, variant_label")
      .eq("creative_id", c.id);

    if (!variants || variants.length === 0) {
      await admin.from("ads_studio_creatives").update({ auto_winner_picked: true }).eq("id", c.id);
      continue;
    }

    // aggregate events per variant
    const stats: Record<string, { impressions: number; clicks: number }> = {};
    for (const v of variants) stats[v.id] = { impressions: 0, clicks: 0 };

    const { data: events } = await admin
      .from("ads_studio_events")
      .select("variant_id, event_type")
      .eq("creative_id", c.id)
      .in("event_type", ["impression", "click"]);

    for (const e of events ?? []) {
      if (!e.variant_id || !stats[e.variant_id]) continue;
      if (e.event_type === "impression") stats[e.variant_id].impressions++;
      else if (e.event_type === "click") stats[e.variant_id].clicks++;
    }

    // pick winner by CTR (min 50 impressions for confidence; else most clicks)
    let winner = variants[0].id;
    let best = -1;
    for (const v of variants) {
      const s = stats[v.id];
      const ctr = s.impressions >= 50 ? s.clicks / s.impressions : s.clicks / 1000;
      if (ctr > best) { best = ctr; winner = v.id; }
    }

    await admin.from("ads_studio_variants").update({ is_active: false, is_winner: false }).eq("creative_id", c.id);
    await admin.from("ads_studio_variants").update({ is_active: true, is_winner: true }).eq("id", winner);
    await admin.from("ads_studio_creatives").update({ auto_winner_picked: true }).eq("id", c.id);

    results.push({ creative_id: c.id, winner_variant_id: winner });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

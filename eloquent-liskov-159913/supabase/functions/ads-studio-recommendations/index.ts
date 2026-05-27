// Generates AI budget-shift / creative recommendations from the last 14d of spend rollups.
// Uses Lovable AI Gateway (LOVABLE_API_KEY). Auth required: store owner or admin.
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReqBody { store_id: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!aiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body: ReqBody = await req.json();
  if (!body.store_id) return new Response(JSON.stringify({ error: "store_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(url, serviceKey);

  // Pull last 14d of spend per platform
  const since = new Date(Date.now() - 14 * 86400_000).toISOString().slice(0, 10);
  const { data: spend } = await admin
    .from("ads_studio_daily_spend")
    .select("platform, spend_cents, impressions, clicks, conversions")
    .eq("store_id", body.store_id)
    .gte("spend_date", since);

  // Aggregate per platform
  const agg: Record<string, any> = {};
  for (const r of spend ?? []) {
    if (!agg[r.platform]) agg[r.platform] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
    agg[r.platform].spend += r.spend_cents;
    agg[r.platform].impressions += r.impressions;
    agg[r.platform].clicks += r.clicks;
    agg[r.platform].conversions += r.conversions;
  }
  const summary = Object.entries(agg).map(([platform, v]: [string, any]) => ({
    platform,
    spend_usd: (v.spend / 100).toFixed(2),
    impressions: v.impressions,
    clicks: v.clicks,
    conversions: v.conversions,
    ctr_pct: v.impressions ? ((v.clicks / v.impressions) * 100).toFixed(2) : "0",
    cpc_usd: v.clicks ? (v.spend / 100 / v.clicks).toFixed(2) : "0",
    cvr_pct: v.clicks ? ((v.conversions / v.clicks) * 100).toFixed(2) : "0",
  }));

  if (summary.length === 0) {
    return new Response(JSON.stringify({ created: 0, message: "no spend data yet" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const prompt = `You are an ads optimization analyst. Given 14-day platform performance, output 1-3 concrete budget-shift or creative recommendations as JSON.
Data: ${JSON.stringify(summary)}
Return JSON only: {"recommendations":[{"type":"budget_shift|pause_platform|creative_test","title":"<10 words>","body":"<1-2 sentences with $ amounts and platform names>","estimated_impact":"<e.g., +12% conversions>"}]}`;

  let recs: any[] = [];
  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) throw new Error(`AI gateway ${aiRes.status}: ${await aiRes.text()}`);
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    recs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "AI failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Insert recommendations (service role bypasses RLS)
  const rows = recs.slice(0, 3).map((r: any) => ({
    store_id: body.store_id,
    recommendation_type: r.type || "creative_test",
    title: String(r.title || "Recommendation").slice(0, 200),
    body: String(r.body || "").slice(0, 1000),
    estimated_impact: r.estimated_impact ? String(r.estimated_impact).slice(0, 100) : null,
    source_metrics: summary,
  }));
  const { data: inserted, error } = await admin.from("ads_studio_recommendations").insert(rows).select();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  return new Response(JSON.stringify({ created: inserted?.length ?? 0, recommendations: inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

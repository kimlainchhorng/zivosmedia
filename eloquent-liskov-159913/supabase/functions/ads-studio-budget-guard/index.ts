// Cron-driven: pauses publish jobs whose store/platform has hit daily or monthly cap.
// Also creates an admin notification once per cap-breach (deduped via pause_notified_at).
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

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const { data: budgets } = await admin
    .from("ads_studio_budgets")
    .select("*")
    .eq("is_paused", false)
    .or("daily_cap_cents.gt.0,monthly_cap_cents.gt.0");

  const paused: any[] = [];
  for (const b of budgets ?? []) {
    // Sum spend for this store+platform (or all platforms)
    const platformFilter = b.platform === "all" ? {} : { platform: b.platform };
    const { data: dailyRows } = await admin
      .from("ads_studio_daily_spend")
      .select("spend_cents")
      .eq("store_id", b.store_id)
      .eq("spend_date", today)
      .match(platformFilter);
    const { data: monthRows } = await admin
      .from("ads_studio_daily_spend")
      .select("spend_cents")
      .eq("store_id", b.store_id)
      .gte("spend_date", monthStart)
      .match(platformFilter);

    const daySpent = (dailyRows ?? []).reduce((s, r: any) => s + (r.spend_cents || 0), 0);
    const monthSpent = (monthRows ?? []).reduce((s, r: any) => s + (r.spend_cents || 0), 0);

    const dailyHit = b.daily_cap_cents > 0 && daySpent >= b.daily_cap_cents;
    const monthlyHit = b.monthly_cap_cents > 0 && monthSpent >= b.monthly_cap_cents;
    if (!dailyHit && !monthlyHit) continue;

    const reason = dailyHit ? "daily_cap_reached" : "monthly_cap_reached";
    await admin.from("ads_studio_budgets").update({
      is_paused: true,
      paused_reason: reason,
      pause_notified_at: new Date().toISOString(),
    }).eq("id", b.id);

    // Cancel queued jobs for this store/platform
    const jobUpdate: any = { status: "cancelled", error_message: `Auto-paused: ${reason}` };
    let q = admin.from("ads_studio_publish_jobs").update(jobUpdate).eq("store_id", b.store_id).eq("status", "queued");
    if (b.platform !== "all") q = q.eq("platform", b.platform);
    await q;

    // Admin notification
    await admin.from("admin_notifications").insert({
      category: "ads_studio",
      severity: "warning",
      title: `Ads ${b.platform} cap reached`,
      message: `Store ${b.store_id} hit ${reason}. Daily $${(daySpent / 100).toFixed(2)} / cap $${(b.daily_cap_cents / 100).toFixed(2)}. Publish queue auto-paused.`,
      entity_type: "ads_studio_budget",
      entity_id: b.id,
    }).select();

    paused.push({ store_id: b.store_id, platform: b.platform, reason, daySpent, monthSpent });
  }

  return new Response(JSON.stringify({ paused: paused.length, details: paused }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

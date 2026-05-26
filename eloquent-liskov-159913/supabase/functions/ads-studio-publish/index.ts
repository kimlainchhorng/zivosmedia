// Dispatcher: queues or runs publish jobs to Google/Meta/TikTok.
// Real platform APIs are stubbed — when API tokens are configured, swap the stub for real SDK calls.
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueueBody {
  creative_id: string;
  store_id: string;
  platforms: ("google" | "meta" | "tiktok" | "youtube")[];
  scheduled_at?: string;
}

async function publishToPlatform(platform: string, creative: any): Promise<{ ok: boolean; campaign_id?: string; response?: any; error?: string }> {
  // STUB: integrate real APIs once credentials are added (GOOGLE_ADS_DEVELOPER_TOKEN, META_ACCESS_TOKEN, TIKTOK_ACCESS_TOKEN).
  const tokenMap: Record<string, string | undefined> = {
    google: Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN"),
    meta: Deno.env.get("META_ACCESS_TOKEN"),
    tiktok: Deno.env.get("TIKTOK_ACCESS_TOKEN"),
    youtube: Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN"),
  };
  if (!tokenMap[platform]) {
    return { ok: false, error: `${platform.toUpperCase()} credentials not configured` };
  }
  // Simulate success path until real API wired
  return {
    ok: true,
    campaign_id: `${platform}_${creative.id.slice(0, 8)}_${Date.now()}`,
    response: { stub: true, message: "Queued in stub publisher; replace with real API call." },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // Two modes:
  //   POST  -> queue new jobs (auth required)
  //   GET   -> drain queue (cron / service)
  if (req.method === "GET") {
    const { data: jobs } = await admin
      .from("ads_studio_publish_jobs")
      .select("*, ads_studio_creatives(*)")
      .eq("status", "queued")
      .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
      .limit(20);

    const results: any[] = [];
    for (const job of jobs ?? []) {
      await admin.from("ads_studio_publish_jobs").update({
        status: "running", started_at: new Date().toISOString(), attempts: (job.attempts ?? 0) + 1,
      }).eq("id", job.id);

      const r = await publishToPlatform(job.platform, job.ads_studio_creatives);
      await admin.from("ads_studio_publish_jobs").update({
        status: r.ok ? "succeeded" : "failed",
        completed_at: new Date().toISOString(),
        platform_campaign_id: r.campaign_id ?? null,
        platform_response: r.response ?? null,
        error_message: r.error ?? null,
      }).eq("id", job.id);

      results.push({ job_id: job.id, ...r });
    }
    return new Response(JSON.stringify({ drained: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST: queue
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body: QueueBody = await req.json();
  if (!body.creative_id || !body.store_id || !Array.isArray(body.platforms) || body.platforms.length === 0) {
    return new Response(JSON.stringify({ error: "creative_id, store_id, and platforms[] required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const rows = body.platforms.map((p) => ({
    creative_id: body.creative_id,
    store_id: body.store_id,
    platform: p,
    scheduled_at: body.scheduled_at ?? null,
    created_by: user.id,
    status: "queued",
  }));
  const { data, error } = await admin.from("ads_studio_publish_jobs").insert(rows).select();
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  return new Response(JSON.stringify({ queued: data?.length ?? 0, jobs: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

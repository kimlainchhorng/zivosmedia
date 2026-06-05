// Queue store post distribution jobs across social and ad platforms.
import { createClient } from "npm:@supabase/supabase-js@2.106.0";
import { withSecurity } from "../_shared/withSecurity.ts";

type Platform = "facebook" | "tiktok" | "google_ads" | "x";
type Action = "organic_post" | "boost_ad";

const PLATFORM_TO_CONNECTION = {
  facebook: "meta",
  tiktok: "tiktok",
  google_ads: "google",
  x: "x",
} satisfies Record<Platform, string>;

const json = (data: unknown, status = 200, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function cleanPlatforms(input: unknown): Platform[] {
  const allowed = new Set<Platform>(["facebook", "tiktok", "google_ads", "x"]);
  const values = Array.isArray(input) ? input : [];
  return Array.from(new Set(values.filter((value): value is Platform => allowed.has(value))));
}

function cleanActions(input: unknown): Action[] {
  const allowed = new Set<Action>(["organic_post", "boost_ad"]);
  const values = Array.isArray(input) ? input : [];
  return Array.from(new Set(values.filter((value): value is Action => allowed.has(value))));
}

Deno.serve(withSecurity("store-post-distribute", async (req, ctx) => {
  const headers = ctx.corsHeaders;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401, headers);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });

    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401, headers);

    const body = await req.json().catch(() => ({}));
    const postId = String(body?.post_id || "");
    const platforms = cleanPlatforms(body?.platforms);
    const actions = cleanActions(body?.actions);
    const boost = body?.boost || {};
    const dailyBudgetCents = Math.max(0, Math.round(Number(boost.daily_budget_usd || 0) * 100));
    const days = Math.min(90, Math.max(1, Math.round(Number(boost.days || 1))));
    const totalBudgetCents = dailyBudgetCents * days;
    const objective = String(boost.objective || "reach").slice(0, 64);
    const audience = String(boost.audience || "broad").slice(0, 64);
    const scheduledAt = body?.scheduled_at ? new Date(body.scheduled_at) : new Date();

    if (!postId) return json({ error: "post_id required" }, 400, headers);
    if (!platforms.length) return json({ error: "Choose at least one platform" }, 400, headers);
    if (!actions.length) return json({ error: "Choose post, boost, or both" }, 400, headers);
    if (actions.includes("boost_ad") && dailyBudgetCents <= 0) {
      return json({ error: "Boost daily budget must be greater than 0" }, 400, headers);
    }
    if (Number.isNaN(scheduledAt.getTime())) {
      return json({ error: "Invalid scheduled_at" }, 400, headers);
    }

    const { data: post, error: postErr } = await admin
      .from("store_posts")
      .select("id, store_id, caption, media_urls, media_type")
      .eq("id", postId)
      .maybeSingle();
    if (postErr) throw postErr;
    if (!post) return json({ error: "Post not found" }, 404, headers);

    const { data: ownerAllowed } = await admin.rpc("is_store_owner", {
      _store_id: post.store_id,
      _user_id: user.id,
    });
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = ((roles as any[]) || []).some((role) => role.role === "admin" || role.role === "super_admin");
    if (!ownerAllowed && !isAdmin) return json({ error: "Forbidden" }, 403, headers);

    const [{ data: pageRows }, { data: accountRows }] = await Promise.all([
      admin
        .from("store_ad_pages")
        .select("platform, external_id, name, is_default")
        .eq("store_id", post.store_id),
      admin
        .from("store_ad_accounts")
        .select("platform, status, external_account_id, display_name, connected_at")
        .eq("store_id", post.store_id),
    ]);
    const connected = new Set([
      ...(((pageRows as any[]) || []).map((row) => String(row.platform))),
      ...(((accountRows as any[]) || [])
        .filter((row) => row.status === "connected" || row.status === "active")
        .map((row) => String(row.platform))),
    ]);

    const rows = platforms.flatMap((platform) => {
      const connectionPlatform = PLATFORM_TO_CONNECTION[platform];
      const isConnected = connected.has(connectionPlatform);
      return actions.map((action) => ({
        store_id: post.store_id,
        post_id: post.id,
        platform,
        action,
        status: isConnected ? "queued" : "needs_connection",
        daily_budget_cents: action === "boost_ad" ? dailyBudgetCents : 0,
        total_budget_cents: action === "boost_ad" ? totalBudgetCents : 0,
        objective,
        audience,
        scheduled_at: scheduledAt.toISOString(),
        request_payload: {
          post_caption: post.caption,
          media_urls: post.media_urls || [],
          media_type: post.media_type,
          days,
          connection_platform: connectionPlatform,
          platform_connected: isConnected,
        },
        platform_response: isConnected
          ? { queued_by: "store-post-distribute" }
          : { reason: "platform_not_connected", connection_platform: connectionPlatform },
        error_message: isConnected ? null : "Connect this platform before publishing or boosting.",
        created_by: user.id,
      }));
    });

    const { data: jobs, error: jobsErr } = await admin
      .from("store_post_distribution_jobs")
      .upsert(rows, { onConflict: "post_id,platform,action" })
      .select("*");
    if (jobsErr) throw jobsErr;

    const boostRows = rows.filter((row) => row.action === "boost_ad");
    if (boostRows.length) {
      await admin.from("store_ad_campaigns").insert(
        boostRows.map((row) => ({
          store_id: post.store_id,
          name: `Boost post ${post.id.slice(0, 8)} on ${row.platform}`,
          objective,
          platforms: [PLATFORM_TO_CONNECTION[row.platform as Platform]],
          status: row.status === "queued" ? "pending_review" : "draft",
          daily_budget_cents: row.daily_budget_cents,
          total_budget_cents: row.total_budget_cents,
          currency: "USD",
          start_date: scheduledAt.toISOString(),
          end_date: new Date(scheduledAt.getTime() + days * 86_400_000).toISOString(),
          headline: post.caption?.slice(0, 80) || "Store post boost",
          body: post.caption || "",
          cta: "Learn More",
          destination_url: body?.destination_url || null,
          creative_url: Array.isArray(post.media_urls) ? post.media_urls[0] || null : null,
          targeting: { audience, source_post_id: post.id },
          external_ids: { distribution_job_platform: row.platform },
          created_by: user.id,
        }))
      );
    }

    return json({
      ok: true,
      queued: ((jobs as any[]) || []).filter((job) => job.status === "queued").length,
      needs_connection: ((jobs as any[]) || []).filter((job) => job.status === "needs_connection").length,
      jobs,
    }, 200, headers);
  } catch (e) {
    console.error("[store-post-distribute] error:", e);
    return json({ error: (e as Error).message }, 500, headers);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

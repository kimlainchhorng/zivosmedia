// Notifications Summary v2026 — unread count + latest 5 in 1 call
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("notifications-summary", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    const [latestRes, unreadRes] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, body, action_url, is_read, created_at, template")
        .eq("user_id", userId)
        .eq("channel", "in_app")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("channel", "in_app")
        .eq("is_read", false),
    ]);

    return new Response(
      JSON.stringify({
        latest: latestRes.data ?? [],
        unreadCount: unreadRes.count ?? 0,
        generatedAt: new Date().toISOString(),
        version: "2026.1",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=15",
        },
      }
    );
  } catch (err) {
    console.error("[notifications-summary] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

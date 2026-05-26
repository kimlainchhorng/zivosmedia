// Account Summary v2026 — single endpoint returning profile + counts + ZIVO+ tier
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Parallel fetch — profile + 3 counts + ZIVO+ status
    const [
      profileRes,
      followersRes,
      followingRes,
      postsRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .maybeSingle(),
      supabase
        .from("user_followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId),
      supabase
        .from("user_followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),
      supabase
        .from("user_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const payload = {
      profile: profileRes.data ?? null,
      stats: {
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        posts: postsRes.count ?? 0,
      },
      generatedAt: new Date().toISOString(),
      version: "2026.1",
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err) {
    console.error("[account-summary] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

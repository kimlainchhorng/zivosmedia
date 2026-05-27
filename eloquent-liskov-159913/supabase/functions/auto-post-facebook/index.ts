// Auto-post scheduled Facebook posts.
// Reads page config + scheduled posts from feedback_submissions, posts due ones to Graph API.
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const { post_row_id } = body as { post_row_id?: string };

    // Load FB page config from server
    const { data: cfgRow } = await admin
      .from("feedback_submissions")
      .select("message")
      .eq("category", "admin_fb_config")
      .eq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfgRow?.message) return json({ error: "Facebook page not configured on server. Enable Auto-Post in Meta Ads settings." }, 400);

    let cfg: any = {};
    try { cfg = JSON.parse(cfgRow.message); } catch { return json({ error: "Invalid FB config" }, 400); }

    const pageToken = cfg.token ? atob(cfg.token) : cfg.page_token;
    const pageId = cfg.page_id;
    const pageName = cfg.page_name || "Facebook Page";
    if (!pageToken || !pageId) return json({ error: "Incomplete FB config" }, 400);

    // Find due scheduled posts
    let q = admin
      .from("feedback_submissions")
      .select("*")
      .eq("category", "fb_scheduled_post")
      .eq("status", "pending");
    if (post_row_id) q = q.eq("id", post_row_id);

    const { data: scheduled } = await q;
    const now = new Date();
    const due = (scheduled ?? []).filter((row: any) => {
      try {
        const p = JSON.parse(row.message);
        return new Date(p.scheduled_at) <= now;
      } catch { return false; }
    });

    if (due.length === 0) return json({ posted: 0, message: "No posts due" });

    const results: any[] = [];
    for (const row of due) {
      let parsed: any = {};
      try { parsed = JSON.parse(row.message); } catch { continue; }

      let fbRes: Response;
      if (parsed.image_url) {
        fbRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: parsed.message_text, url: parsed.image_url, access_token: pageToken }),
        });
      } else {
        const payload: Record<string, string> = { message: parsed.message_text, access_token: pageToken };
        if (parsed.link) payload.link = parsed.link;
        fbRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const fbData = await fbRes.json();
      const success = fbRes.ok && !fbData.error;
      const postId = success ? (fbData.id || fbData.post_id || null) : null;
      const parts = (postId || "").split("_");
      const postUrl = parts.length === 2 ? `https://www.facebook.com/${parts[0]}/posts/${parts[1]}` : null;

      // Mark scheduled post as published or failed
      await admin.from("feedback_submissions").update({
        status: success ? "resolved" : "dismissed",
        response: success ? `Posted: ${postId}` : (fbData.error?.message || "Unknown error"),
        responded_at: new Date().toISOString(),
      } as any).eq("id", row.id);

      // Log in published history
      if (success) {
        await admin.from("feedback_submissions").insert({
          category: "fb_page_post",
          message: JSON.stringify({ page_id: pageId, page_name: pageName, message: parsed.message_text, link: parsed.link || null, image_url: parsed.image_url || null, post_id: postId, post_url: postUrl }),
          status: "resolved",
          user_id: userRes.user.id,
        });
      }

      results.push({ id: row.id, success, post_id: postId, error: fbData.error?.message });
    }

    return json({ posted: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length, results });
  } catch (e) {
    console.error("auto-post-facebook error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

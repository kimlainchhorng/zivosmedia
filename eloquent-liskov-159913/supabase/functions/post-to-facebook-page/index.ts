// Post a message/photo to a Facebook Page.
// Accepts page_access_token directly in the request body (no OAuth required),
// or falls back to the stored token in store_ad_pages.
import { createClient } from "../_shared/deps.ts";
import { decryptToken } from "../_shared/tokenCrypto.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

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
    if (isLikelyMaliciousBot(req.headers)) return json({ error: "forbidden" }, 403);

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

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
      return json({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }, 429);
    }
    if (await isAbuseThresholdExceeded(admin, userRes.user.id)) {
      return json({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }, 429);
    }

    const body = await req.json();
    const { page_id, page_name, page_access_token, message, link, image_url } = body as {
      page_id: string;
      page_name?: string;
      page_access_token?: string;
      message: string;
      link?: string;
      image_url?: string;
    };

    if (!page_id || !message?.trim()) {
      return json({ error: "page_id and message are required" }, 400);
    }
    const linkScan = scanContentForLinks(message);
    if (!linkScan.ok) {
      logBlockedAttempt(admin, { endpoint: "post-to-facebook-page", userId: userRes?.user?.id ?? null, urls: linkScan.blocked, text: message, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
      return json({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }, 422);
    }

    // Use token from request body if provided, otherwise look up from store_ad_pages
    let pageToken = page_access_token?.trim() || "";
    let resolvedPageName = page_name || "Facebook Page";

    if (!pageToken) {
      const { data: pageRow, error: pageErr } = await admin
        .from("store_ad_pages")
        .select("access_token, name")
        .eq("external_id", page_id)
        .eq("page_type", "fb_page")
        .maybeSingle();
      if (pageErr) throw pageErr;
      if (!pageRow?.access_token) {
        return json({ error: "No Page Access Token provided or stored. Enter your token in the Facebook Page settings." }, 400);
      }
      pageToken = await decryptToken(pageRow.access_token);
      resolvedPageName = pageRow.name || resolvedPageName;
    }

    let fbRes: Response;
    if (image_url) {
      fbRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: message, url: image_url, access_token: pageToken }),
      });
    } else {
      const payload: Record<string, string> = { message, access_token: pageToken };
      if (link) payload.link = link;
      fbRes = await fetch(`https://graph.facebook.com/v21.0/${page_id}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const fbData = await fbRes.json();
    if (!fbRes.ok || fbData.error) {
      return json({ error: fbData.error?.message || `Graph API error ${fbRes.status}` }, 400);
    }

    const postId: string | null = fbData.id || fbData.post_id || null;
    const parts = (postId || "").split("_");
    const postUrl = parts.length === 2
      ? `https://www.facebook.com/${parts[0]}/posts/${parts[1]}`
      : null;

    await admin.from("feedback_submissions").insert({
      category: "fb_page_post",
      message: JSON.stringify({
        page_id,
        page_name: resolvedPageName,
        message,
        link: link || null,
        image_url: image_url || null,
        post_id: postId,
        post_url: postUrl,
      }),
      status: "resolved",
      user_id: userRes.user.id,
    });

    return json({ post_id: postId, post_url: postUrl });
  } catch (e) {
    console.error("post-to-facebook-page error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

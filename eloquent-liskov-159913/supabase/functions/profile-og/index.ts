import { createClient } from "../_shared/deps.ts";

const APP_ORIGIN = "https://zivollc.com";
const SOCIAL_CRAWLER_UA = /facebookexternalhit|facebot|twitterbot|xbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|skypeuripreview|pinterest|redditbot|embedly|meta-externalagent|meta-externalfetcher/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const postId = url.searchParams.get("post");
    const resolveOnly = url.searchParams.get("resolve") === "1";
    const userAgent = req.headers.get("user-agent") ?? "";

    if (!code) {
      return new Response(JSON.stringify({ error: "code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, avatar_url, cover_url, share_code")
      .eq("share_code", code)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = profile.full_name || "ZIVO User";
    // Preserve share code (and optional post id) so the profile page can fallback-resolve and deep-link media.
    const shareParams = new URLSearchParams({ sc: profile.share_code || code });
    if (postId) shareParams.set("post", postId);
    const shareLandingUrl = `${APP_ORIGIN}/user/${encodeURIComponent(profile.id)}?${shareParams.toString()}`;
    const avatar = profile.avatar_url || `${APP_ORIGIN}/og-image.png`;
    const cover = profile.cover_url || avatar;
    const ogImage = cover;
    const description = `${name} - View my profile on ZIVO. One app for every journey.`;

    if (resolveOnly) {
      return new Response(JSON.stringify({
        profile: {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          cover_url: profile.cover_url,
          share_code: profile.share_code,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SOCIAL_CRAWLER_UA.test(userAgent)) {
      return Response.redirect(shareLandingUrl, 302);
    }

    // Serve crawlable HTML for social previews; real users are redirected with JS only.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(name)} on ZIVO</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(name)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:alt" content="${escapeHtml(name)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(shareLandingUrl)}" />
  <meta property="og:site_name" content="ZIVO" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(name)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:url" content="${escapeHtml(shareLandingUrl)}" />
  <link rel="canonical" href="${escapeHtml(shareLandingUrl)}" />
</head>
<body>
  <script>window.location.replace("${escapeHtml(shareLandingUrl)}");</script>
  <p>Redirecting to <a href="${escapeHtml(shareLandingUrl)}">${escapeHtml(name)}'s profile</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: new Headers({
        ...corsHeaders,
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=300",
        "vary": "User-Agent, Accept-Encoding",
      }),
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

import { createClient } from "../_shared/deps.ts";

const APP_ORIGIN = "https://zivollc.com";

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
    const handle = url.searchParams.get("handle");

    if (!handle) {
      return new Response(JSON.stringify({ error: "handle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: channel } = await supabase
      .from("channels")
      .select("id, handle, name, description, avatar_url, banner_url, subscriber_count, is_public")
      .eq("handle", handle)
      .single();

    if (!channel || channel.is_public === false) {
      return new Response(JSON.stringify({ error: "Channel not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = channel.name || `@${channel.handle}`;
    const description =
      channel.description?.trim() ||
      `Join @${channel.handle} on ZIVO — ${Number(channel.subscriber_count || 0).toLocaleString()} subscribers.`;
    const shareLandingUrl = `${APP_ORIGIN}/c/${encodeURIComponent(channel.handle)}`;
    const ogImage = channel.banner_url || channel.avatar_url || `${APP_ORIGIN}/og-image.png`;

    // Always return OG HTML. Browsers get bounced to the SPA by the inline
    // <script>; link-preview crawlers (iOS LPMetadataProvider, Slack, iMessage,
    // Facebook, etc.) read the meta tags without following any redirect.
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(name)} on ZIVO</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:title" content="${escapeHtml(name)} on ZIVO" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:alt" content="${escapeHtml(name)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(shareLandingUrl)}" />
  <meta property="og:site_name" content="ZIVO" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(name)} on ZIVO" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:url" content="${escapeHtml(shareLandingUrl)}" />
  <link rel="canonical" href="${escapeHtml(shareLandingUrl)}" />
</head>
<body>
  <script>window.location.replace("${escapeHtml(shareLandingUrl)}");</script>
  <p>Redirecting to <a href="${escapeHtml(shareLandingUrl)}">${escapeHtml(name)}</a>...</p>
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

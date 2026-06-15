// channel-resolve-x-video — resolves an X/Twitter status URL into native MP4
// media metadata for channel posts. The X bearer token stays server-side.
import { withSecurity } from "../_shared/withSecurity.ts";
import { createClient } from "../_shared/deps.ts";

type XMediaVariant = {
  bit_rate?: number;
  content_type?: string;
  url?: string;
};

type XMedia = {
  duration_ms?: number;
  height?: number;
  media_key?: string;
  preview_image_url?: string;
  type?: string;
  url?: string;
  variants?: XMediaVariant[];
  width?: number;
};

const STATUS_URL_RE = /https?:\/\/(?:www\.|mobile\.)?(?:x\.com|twitter\.com)\/([^/\s?#]+)\/status(?:es)?\/(\d{5,30})(?:[/?#][^\s]*)?/i;

function extractStatus(rawUrl: string): { id: string; username: string; canonicalUrl: string } | null {
  const match = rawUrl.match(STATUS_URL_RE);
  if (!match) return null;
  const username = match[1] || "i";
  const id = match[2];
  return {
    id,
    username,
    canonicalUrl: `https://x.com/${encodeURIComponent(username)}/status/${encodeURIComponent(id)}`,
  };
}

function bestMp4Variant(media: XMedia): XMediaVariant | null {
  const variants = Array.isArray(media.variants) ? media.variants : [];
  return variants
    .filter((variant) => variant?.url && variant.content_type === "video/mp4")
    .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0))[0] ?? null;
}

function json(payload: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(withSecurity("channel-resolve-x-video", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "unauthorized", message: "Sign in required" }, 401, corsHeaders);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) {
    return json({ error: "unauthorized", message: "Sign in required" }, 401, corsHeaders);
  }

  const payload = await req.json().catch(() => ({}));
  const rawUrl = typeof payload?.url === "string" ? payload.url.trim() : "";
  const status = extractStatus(rawUrl);
  if (!status) {
    return json({ error: "invalid_x_url", message: "Paste an X post URL that contains a video." }, 400, corsHeaders);
  }

  const bearerToken = Deno.env.get("X_BEARER_TOKEN") || Deno.env.get("TWITTER_BEARER_TOKEN");
  if (!bearerToken) {
    return json({
      error: "x_not_configured",
      message: "X video import needs X_BEARER_TOKEN configured on Supabase.",
    }, 501, corsHeaders);
  }

  const endpoint = new URL(`https://api.x.com/2/tweets/${status.id}`);
  endpoint.searchParams.set("expansions", "attachments.media_keys");
  endpoint.searchParams.set("tweet.fields", "attachments,author_id,created_at,text");
  endpoint.searchParams.set("media.fields", "duration_ms,height,media_key,preview_image_url,type,url,variants,width");

  const xResponse = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  const xPayload = await xResponse.json().catch(() => ({}));

  if (!xResponse.ok) {
    const xMessage =
      xPayload?.detail ||
      xPayload?.title ||
      xPayload?.errors?.[0]?.detail ||
      "X could not resolve this video right now.";
    return json({
      error: "x_api_error",
      message: xMessage,
      status: xResponse.status,
    }, xResponse.status === 429 ? 429 : 502, corsHeaders);
  }

  const mediaRows: XMedia[] = Array.isArray(xPayload?.includes?.media) ? xPayload.includes.media : [];
  const videos = mediaRows
    .filter((media) => media.type === "video" || media.type === "animated_gif")
    .map((media) => {
      const variant = bestMp4Variant(media);
      if (!variant?.url) return null;
      return {
        url: variant.url,
        type: "video",
        name: `x-${status.id}.mp4`,
        mime_type: "video/mp4",
        duration_ms: media.duration_ms,
        width: media.width,
        height: media.height,
        preview_image_url: media.preview_image_url,
        source: "x",
        source_url: status.canonicalUrl,
        source_id: status.id,
      };
    })
    .filter(Boolean);

  if (videos.length === 0) {
    return json({ error: "no_video", message: "No downloadable video was found in that X post." }, 404, corsHeaders);
  }

  return json({ videos, source_url: status.canonicalUrl }, 200, corsHeaders);
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

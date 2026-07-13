const getEnv = (name) => globalThis.Netlify?.env?.get(name);

const getChannelOgBaseUrl = () => {
  const explicitUrl = getEnv("CHANNEL_OG_FUNCTION_URL");
  if (explicitUrl) return explicitUrl;

  const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  return supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/channel-og` : "";
};

export default async (request) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const requestUrl = new URL(request.url);
  const handle = decodeURIComponent(requestUrl.pathname.split("/").filter(Boolean).pop() || "");
  if (!handle) {
    return new Response("Missing channel handle", { status: 400 });
  }

  const baseUrl = getChannelOgBaseUrl();
  if (!baseUrl) {
    return new Response("Channel preview backend is not configured", { status: 503 });
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL(baseUrl);
  } catch {
    return new Response("Channel preview backend is invalid", { status: 500 });
  }

  upstreamUrl.searchParams.set("handle", handle);

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      Accept: request.headers.get("accept") || "text/html",
      "User-Agent": request.headers.get("user-agent") || "ZIVO-Netlify-Share-Preview",
    },
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
};

export const config = {
  path: "/share/c/:handle",
};

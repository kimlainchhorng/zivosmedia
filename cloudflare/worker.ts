type R2PutOptions = {
  httpMetadata?: Headers | Record<string, string>;
  customMetadata?: Record<string, string>;
};

type R2Object = {
  body?: ReadableStream;
  httpEtag: string;
  size: number;
  uploaded: Date;
  range?: { offset: number; length: number };
  writeHttpMetadata(headers: Headers): void;
};

type R2Bucket = {
  get(key: string, options?: { range?: Headers }): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string | null, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
};

type Fetcher = {
  fetch(request: Request): Promise<Response>;
};

type Env = {
  ASSETS?: Fetcher;
  ZIVO_MEDIA: R2Bucket;
  ALLOWED_ORIGINS?: string;
  MEDIA_WRITE_TOKEN?: string;
  DEEPSEEK_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  CHANNEL_OG_FUNCTION_URL?: string;
  SUPABASE_URL?: string;
};

const WINDOW_MS = 10 * 60 * 1000;
const AUTH_LIMIT = 80;
const GENERAL_LIMIT = 600;
const AI_LIMIT = 40;
const buckets = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_ALLOWED_ORIGINS = [
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://zivoschat.com",
  "https://www.zivoschat.com",
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
  "https://zivobusiness.com",
  "https://www.zivobusiness.com",
  "https://zivodriver.com",
  "https://www.zivodriver.com",
  "https://zivoemployee.com",
  "https://www.zivoemployee.com",
  "https://zivostravel.com",
  "https://www.zivostravel.com",
  "https://app.zivosmedia.com",
  "https://preview.zivosmedia.com",
  "https://myzivo.com",
  "https://www.myzivo.com",
  "https://app.myzivo.com",
  "https://preview.myzivo.com",
  "https://zivo-web.myzivo.workers.dev",
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:5174",
];

const CHAT_HOSTS = new Set([
  "zivoschat.com",
  "www.zivoschat.com",
]);

const SOFTWARE_HOSTS = new Set([
  "zivosoftware.com",
  "www.zivosoftware.com",
]);

const AUTO_REPAIR_STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";
const AUTO_REPAIR_DASHBOARD_PATH =
  `/admin/stores/${AUTO_REPAIR_STORE_ID}?tab=ar-dashboard&category=auto-repair`;

const TRAVEL_HOSTS = new Set([
  "zivostravel.com",
  "www.zivostravel.com",
]);

const TRAVEL_ORIGIN = "https://zivostravel.com";

// zivostravel.com is served by the same build as zivosmedia.com, so the static
// public/robots.txt and public/sitemap.xml carry zivosmedia URLs. Serve a
// host-specific robots + sitemap for the travel domain instead.
const TRAVEL_ROBOTS = `# Zivo Travel (zivostravel.com)
User-agent: *
Allow: /
Disallow: /account/
Disallow: /wallet
Disallow: /payment-methods
Disallow: /checkout
Disallow: /booking
Disallow: /confirmation
Disallow: /auth/
Disallow: /admin/
Disallow: /login
Disallow: /signup
Disallow: /flights/results
Disallow: /rent-car/results

Sitemap: ${TRAVEL_ORIGIN}/sitemap.xml
`;

const TRAVEL_SITEMAP_ENTRIES: { path: string; priority: string; freq: string }[] = [
  { path: "/", priority: "1.0", freq: "daily" },
  { path: "/flights", priority: "0.9", freq: "daily" },
  { path: "/hotels", priority: "0.9", freq: "daily" },
  { path: "/cars", priority: "0.9", freq: "daily" },
  { path: "/bus", priority: "0.9", freq: "daily" },
  { path: "/things-to-do", priority: "0.6", freq: "weekly" },
  { path: "/destinations", priority: "0.6", freq: "weekly" },
  { path: "/travel-insurance", priority: "0.5", freq: "weekly" },
  { path: "/guides/cheap-flights", priority: "0.6", freq: "weekly" },
];

function travelSeoResponse(request: Request, url: URL): Response | null {
  if (!TRAVEL_HOSTS.has(url.hostname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const head = request.method === "HEAD";

  if (url.pathname === "/robots.txt") {
    return new Response(head ? null : TRAVEL_ROBOTS, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  if (url.pathname === "/sitemap.xml") {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = TRAVEL_SITEMAP_ENTRIES.map(
      ({ path, priority, freq }) =>
        `  <url>\n    <loc>${TRAVEL_ORIGIN}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    ).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    return new Response(head ? null : xml, {
      status: 200,
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  return null;
}

const CSP_BASE =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://js.stripe.com https://*.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://pagead2.googlesyndication.com https://*.googlesyndication.com https://partner.googleadservices.com https://www.googleadservices.com https://adservice.google.com https://analytics.tiktok.com https://static.ads-twitter.com https://static.cloudflareinsights.com https://*.lovable.app https://*.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: blob: data:; media-src 'self' blob: data: https:; frame-src 'self' https://js.stripe.com https://*.stripe.com https://www.google.com https://*.duffel.com https://googleads.g.doubleclick.net https://*.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://*.stripe.com https://*.duffel.com; frame-ancestors 'self'; upgrade-insecure-requests";

const CSP_REPORT_BY_HOST = new Map([
  ["zivosoftware.com", "https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/csp-report"],
  ["www.zivosoftware.com", "https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/csp-report"],
  ["zivoschat.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
  ["www.zivoschat.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
  ["zivosmedia.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
  ["www.zivosmedia.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
  ["zivostravel.com", "https://xbllvmpomorawkcrtbcq.supabase.co/functions/v1/csp-report"],
  ["www.zivostravel.com", "https://xbllvmpomorawkcrtbcq.supabase.co/functions/v1/csp-report"],
]);

const immutableCache = "public, max-age=31536000, immutable";
const authPathPattern = /^\/(?:login|signup|auth(?:\/|$)|admin(?:\/|$))/i;
const aiPathPattern = /^\/api\/(?:ai|deepseek)(?:\/|$)/i;
const blockedPathPattern =
  /(?:^|\/)(?:\.env|\.git|\.svn|\.hg|wp-admin|wp-login\.php|xmlrpc\.php|phpmyadmin|adminer|\.DS_Store|composer\.json|package-lock\.json)(?:\/|$)|(?:\.\.\/|\/etc\/passwd|\/proc\/self|%2e%2e|%5c)/i;

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function noStoreJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return json(data, { ...init, headers });
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
}

function isRateLimited(request: Request, url: URL) {
  const now = Date.now();
  const isAuthPath = authPathPattern.test(url.pathname);
  const isAiPath = aiPathPattern.test(url.pathname);
  const bucket = isAuthPath ? "auth" : isAiPath ? "ai" : "site";
  const key = `${bucket}:${clientIp(request)}`;
  const limit = isAuthPath ? AUTH_LIMIT : isAiPath ? AI_LIMIT : GENERAL_LIMIT;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

function allowedOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env) {
  const requestOrigin = request.headers.get("origin");
  const origins = allowedOrigins(env);
  const allowOrigin = origins.includes("*")
    ? "*"
    : requestOrigin && origins.includes(requestOrigin)
      ? requestOrigin
      : "";

  const headers = new Headers();
  if (allowOrigin) {
    headers.set("access-control-allow-origin", allowOrigin);
    headers.set("vary", "Origin");
  }
  headers.set("access-control-allow-methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
  headers.set("access-control-allow-headers", "authorization, content-type, x-zivo-media-token");
  headers.set("access-control-max-age", "86400");
  return headers;
}

function withCors(response: Response, request: Request, env: Env) {
  const headers = new Headers(response.headers);
  corsHeaders(request, env).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function allowedOriginForRequest(request: Request, url: URL, env: Env) {
  const requestOrigin = request.headers.get("origin");
  const origins = allowedOrigins(env);

  if (origins.includes("*")) return "*";
  if (requestOrigin && origins.includes(requestOrigin)) return requestOrigin;
  if (origins.includes(url.origin)) return url.origin;
  return "";
}

function securityHeaders(request: Request, url: URL, env: Env) {
  const headers = new Headers();
  const allowOrigin = allowedOriginForRequest(request, url, env);
  const cspReportUri =
    CSP_REPORT_BY_HOST.get(url.hostname) ?? "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report";

  if (allowOrigin) {
    headers.set("access-control-allow-origin", allowOrigin);
    if (request.headers.get("origin")) {
      headers.set("vary", "Origin");
    }
  }

  headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("x-permitted-cross-domain-policies", "none");
  headers.set("x-dns-prefetch-control", "on");
  headers.set("content-security-policy", `${CSP_BASE}; report-uri ${cspReportUri}`);
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set(
    "permissions-policy",
    "camera=(self), microphone=(self), geolocation=(self), payment=(self), accelerometer=(), gyroscope=(self), magnetometer=(), usb=(), bluetooth=(), midi=(), serial=(), interest-cohort=(), display-capture=(), document-domain=()",
  );
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("cross-origin-resource-policy", "same-site");
  return headers;
}

function withSecurityHeaders(response: Response, request: Request, env: Env) {
  const url = new URL(request.url);
  const headers = new Headers(response.headers);
  securityHeaders(request, url, env).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function chatHomeRedirect(request: Request, url: URL) {
  if ((request.method !== "GET" && request.method !== "HEAD") || !CHAT_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.pathname !== "/") {
    return null;
  }

  const target = new URL(url.toString());
  target.pathname = "/chat";
  return new Response(null, {
    status: 302,
    headers: {
      "cache-control": "no-store",
      "location": target.toString(),
    },
  });
}

function softwareDashboardRedirect(request: Request, url: URL) {
  if ((request.method !== "GET" && request.method !== "HEAD") || !SOFTWARE_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.pathname === "/login" || url.pathname === "/signup") {
    const redirect = url.searchParams.get("redirect");
    if (redirect !== "/business" && redirect !== "/business/dashboard") {
      return null;
    }

    const target = new URL(url.toString());
    target.searchParams.set("redirect", AUTO_REPAIR_DASHBOARD_PATH);
    return new Response(null, {
      status: 302,
      headers: {
        "cache-control": "no-store",
        "location": target.toString(),
      },
    });
  }

  if (url.pathname !== "/business/dashboard") {
    return null;
  }

  const target = new URL(url.toString());
  const dashboard = new URL(AUTO_REPAIR_DASHBOARD_PATH, url.origin);
  target.pathname = dashboard.pathname;
  target.search = dashboard.search;
  return new Response(null, {
    status: 302,
    headers: {
      "cache-control": "no-store",
      "location": target.toString(),
    },
  });
}

function safeObjectKey(raw: string) {
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded || decoded.startsWith("/") || decoded.includes("..") || decoded.includes("\\")) {
      return "";
    }
    return decoded;
  } catch {
    return "";
  }
}

function mediaKey(pathname: string) {
  return safeObjectKey(pathname.replace(/^\/media\/?/, ""));
}

function downloadKey(pathname: string) {
  return safeObjectKey(pathname.replace(/^\//, ""));
}

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return request.headers.get("x-zivo-media-token") || "";
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function authorizeWrite(request: Request, env: Env) {
  if (!env.MEDIA_WRITE_TOKEN) {
    return false;
  }
  return constantTimeEqual(bearerToken(request), env.MEDIA_WRITE_TOKEN);
}

async function handleR2Object(request: Request, env: Env, key: string, publicUrlPrefix: string) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (!key) {
    return withCors(json({ error: "Invalid object key" }, { status: 400 }), request, env);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    const rangeHeader = request.headers.get("range");
    const object = await env.ZIVO_MEDIA.get(key, rangeHeader ? { range: request.headers } : undefined);
    if (!object) {
      return withCors(json({ error: "Object not found" }, { status: 404 }), request, env);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", headers.get("cache-control") || immutableCache);

    let status = 200;
    if (rangeHeader && object.range) {
      status = 206;
      const end = object.range.offset + object.range.length - 1;
      headers.set("content-range", `bytes ${object.range.offset}-${end}/${object.size}`);
      headers.set("content-length", String(object.range.length));
    } else {
      headers.set("content-length", String(object.size));
    }

    return withCors(new Response(request.method === "HEAD" ? null : object.body, { status, headers }), request, env);
  }

  if (request.method === "PUT") {
    if (!authorizeWrite(request, env)) {
      return withCors(json({ error: "Unauthorized" }, { status: 401 }), request, env);
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const cacheControl = request.headers.get("cache-control") || immutableCache;
    await env.ZIVO_MEDIA.put(key, request.body, {
      httpMetadata: {
        "content-type": contentType,
        "cache-control": cacheControl,
      },
      customMetadata: {
        uploaded_by: "zivo-cloudflare-worker",
      },
    });

    return withCors(
      json({ ok: true, key, url: `${publicUrlPrefix}${encodeURI(key)}` }, { status: 201 }),
      request,
      env,
    );
  }

  if (request.method === "DELETE") {
    if (!authorizeWrite(request, env)) {
      return withCors(json({ error: "Unauthorized" }, { status: 401 }), request, env);
    }
    await env.ZIVO_MEDIA.delete(key);
    return withCors(new Response(null, { status: 204 }), request, env);
  }

  return withCors(json({ error: "Method not allowed" }, { status: 405 }), request, env);
}

async function handleMedia(request: Request, env: Env) {
  const url = new URL(request.url);
  return handleR2Object(request, env, mediaKey(url.pathname), "/media/");
}

async function handleDownload(request: Request, env: Env) {
  const url = new URL(request.url);
  return handleR2Object(request, env, downloadKey(url.pathname), "/");
}

async function handleChannelSharePreview(request: Request, env: Env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const handle = safeObjectKey(url.pathname.replace(/^\/share\/c\/?/, ""));
  if (!handle || handle.includes("/")) {
    return json({ error: "Invalid channel handle" }, { status: 400 });
  }

  const upstreamBase =
    env.CHANNEL_OG_FUNCTION_URL ||
    (env.SUPABASE_URL ? `${env.SUPABASE_URL}/functions/v1/channel-og` : "");
  if (!upstreamBase) {
    return new Response("channel OG upstream not configured", { status: 503 });
  }

  const upstreamUrl = new URL(upstreamBase);
  upstreamUrl.searchParams.set("handle", handle);

  const headers = new Headers();
  for (const header of ["accept", "accept-language", "user-agent"]) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  const response = await fetch(upstreamUrl.toString(), { headers });
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

type AiProvider = "deepseek" | "claude";
type AiProviderRequest = AiProvider | "auto";
type AiChatMode = "support" | "travel" | "site-builder";
type AiChatRole = "user" | "assistant";
type AiChatMessage = {
  role?: string;
  content?: unknown;
};

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEEPSEEK_MODELS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
const CLAUDE_MODELS = new Set([
  "claude-sonnet-4-6",
  "claude-opus-4-8",
  "claude-haiku-4-5",
  "claude-fable-5",
]);
const DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash";
const CLAUDE_DEFAULT_MODEL = "claude-sonnet-4-6";
const AI_MAX_MESSAGES = 20;
const AI_MAX_MESSAGE_CHARS = 3000;
const AI_MAX_TOTAL_CHARS = 12000;
const AI_MAX_TOKENS = 1200;

const AI_SYSTEM_PROMPTS: Record<AiChatMode, string> = {
  support:
    "You are ZIVO AI Assistant, a friendly and concise support helper for ZIVO travel, delivery, chat, and marketplace products. Keep answers under 150 words unless the user asks for detail. Never invent order numbers, booking status, account details, prices, refunds, or policies. For payments, safety, account lockouts, charge disputes, or anything uncertain, recommend creating a human support ticket.",
  travel:
    "You are Zivo Travel Assistant. Help users plan trips, compare destinations, and understand flight, hotel, car, and bus booking options. Keep guidance practical, safety-minded, and concise. Do not claim live inventory, live prices, booking confirmation, refunds, or payment status unless the app provides that data.",
  "site-builder":
    "You are ZIVO Website Builder Assistant. Help draft website copy, page sections, SEO titles, UX ideas, and implementation notes for ZIVO-owned sites. Keep suggestions specific to ZIVO, avoid fake claims, and never ask users to paste API keys, payment secrets, or private credentials.",
};

function isAiMode(value: unknown): value is AiChatMode {
  return value === "support" || value === "travel" || value === "site-builder";
}

function isAiProviderRequest(value: unknown): value is AiProviderRequest {
  return value === "deepseek" || value === "claude" || value === "auto";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sanitizeAiMessages(rawMessages: unknown) {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  let totalChars = 0;
  const messages: { role: AiChatRole; content: string }[] = [];
  const recent = rawMessages.slice(-AI_MAX_MESSAGES);

  for (const raw of recent) {
    const message = raw as AiChatMessage;
    const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
    if (!role || typeof message.content !== "string") continue;

    const content = message.content.trim().slice(0, AI_MAX_MESSAGE_CHARS);
    if (!content) continue;

    totalChars += content.length;
    if (totalChars > AI_MAX_TOTAL_CHARS) break;
    messages.push({ role, content });
  }

  return messages;
}

function isAiProviderConfigured(provider: AiProvider, env: Env) {
  if (provider === "claude") {
    return Boolean((env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY)?.trim());
  }
  return Boolean(env.DEEPSEEK_API_KEY?.trim());
}

function aiProviderOrder(requestedProvider: AiProviderRequest, mode: AiChatMode): AiProvider[] {
  if (requestedProvider === "claude") return ["claude", "deepseek"];
  if (requestedProvider === "deepseek") return ["deepseek", "claude"];
  return mode === "support" || mode === "site-builder"
    ? ["claude", "deepseek"]
    : ["deepseek", "claude"];
}

function modelForProvider(provider: AiProvider, requestedModel: string) {
  if (provider === "claude") {
    return CLAUDE_MODELS.has(requestedModel) ? requestedModel : CLAUDE_DEFAULT_MODEL;
  }
  return DEEPSEEK_MODELS.has(requestedModel) ? requestedModel : DEEPSEEK_DEFAULT_MODEL;
}

function withAiProviderHeaders(response: Response, provider: AiProvider, isFallback: boolean) {
  const headers = new Headers(response.headers);
  headers.set("x-zivo-ai-provider", provider);
  headers.set("x-zivo-ai-fallback", isFallback ? "true" : "false");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function deepSeekChat(
  request: Request,
  env: Env,
  options: {
    messages: { role: AiChatRole; content: string }[];
    mode: AiChatMode;
    model: string;
    stream: boolean;
    temperature: number;
    maxTokens: number;
  },
) {
  const deepSeekApiKey = env.DEEPSEEK_API_KEY?.trim();
  if (!deepSeekApiKey) {
    return withCors(noStoreJson({ error: "DeepSeek is not configured" }, { status: 503 }), request, env);
  }

  const upstream = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${deepSeekApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPTS[options.mode] },
        ...options.messages,
      ],
      stream: options.stream,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      thinking: { type: "disabled" },
    }),
  });

  if (!upstream.ok) {
    console.error("DeepSeek API error", { status: upstream.status, mode: options.mode, model: options.model });
    const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 503 : 502;
    const message = status === 429 ? "DeepSeek is busy. Please try again shortly." : "DeepSeek request failed";
    return withCors(noStoreJson({ error: message }, { status }), request, env);
  }

  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex");
  headers.set("content-type", options.stream ? "text/event-stream; charset=utf-8" : "application/json; charset=utf-8");
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-ratelimit-")) {
      headers.set(key, value);
    }
  });

  return withCors(new Response(upstream.body, { status: upstream.status, headers }), request, env);
}

function anthropicStreamToOpenAiStream(body: ReadableStream | null) {
  if (!body) return null;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      let separatorIndex: number;

      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const eventBlock = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const dataLine = eventBlock
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line.startsWith("data: "));
        if (!dataLine) continue;

        try {
          const payload = JSON.parse(dataLine.slice(6));
          if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
            const text = payload.delta.text;
            if (typeof text === "string" && text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            }
          } else if (payload.type === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } else if (payload.type === "error") {
            const message = payload.error?.message || "Claude stream error";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } catch {
          // Ignore malformed or partial SSE events; buffering handles partial chunks.
        }
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }
    },
  }));
}

async function claudeChat(
  request: Request,
  env: Env,
  options: {
    messages: { role: AiChatRole; content: string }[];
    mode: AiChatMode;
    model: string;
    stream: boolean;
    temperature: number;
    maxTokens: number;
  },
) {
  const anthropicApiKey = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY)?.trim();
  if (!anthropicApiKey) {
    return withCors(noStoreJson({ error: "Claude is not configured" }, { status: 503 }), request, env);
  }

  const upstream = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      system: AI_SYSTEM_PROMPTS[options.mode],
      messages: options.messages,
      max_tokens: options.maxTokens,
      stream: options.stream,
      temperature: options.temperature,
    }),
  });

  if (!upstream.ok) {
    console.error("Claude API error", { status: upstream.status, mode: options.mode, model: options.model });
    const status = upstream.status === 429 || upstream.status === 529
      ? 429
      : upstream.status === 401 || upstream.status === 403
        ? 503
        : 502;
    const message = status === 429 ? "Claude is busy. Please try again shortly." : "Claude request failed";
    return withCors(noStoreJson({ error: message }, { status }), request, env);
  }

  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex");

  if (options.stream) {
    headers.set("content-type", "text/event-stream; charset=utf-8");
    return withCors(new Response(anthropicStreamToOpenAiStream(upstream.body), { status: 200, headers }), request, env);
  }

  const data = await upstream.json() as { content?: { type?: string; text?: string }[] };
  const content = (data.content || [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");

  headers.set("content-type", "application/json; charset=utf-8");
  return withCors(
    new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), { status: 200, headers }),
    request,
    env,
  );
}

async function handleAiChat(request: Request, env: Env, url: URL) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (request.method !== "POST") {
    return withCors(noStoreJson({ error: "Method not allowed" }, { status: 405 }), request, env);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 48_000) {
    return withCors(noStoreJson({ error: "Request is too large" }, { status: 413 }), request, env);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return withCors(noStoreJson({ error: "Invalid JSON body" }, { status: 400 }), request, env);
  }

  const messages = sanitizeAiMessages(body.messages);
  if (messages.length === 0 && typeof body.message === "string" && body.message.trim()) {
    messages.push({ role: "user", content: body.message.trim().slice(0, AI_MAX_MESSAGE_CHARS) });
  }

  if (messages.length === 0) {
    return withCors(noStoreJson({ error: "Message is required" }, { status: 400 }), request, env);
  }

  const requestedProvider = url.pathname.startsWith("/api/deepseek/")
    ? "deepseek"
    : isAiProviderRequest(body.provider)
      ? body.provider
      : "auto";
  const mode = isAiMode(body.mode) ? body.mode : "travel";
  const stream = body.stream !== false;
  const temperature = clampNumber(body.temperature, 0, 1, 0.4);
  const maxTokens = Math.round(clampNumber(body.max_tokens ?? body.maxTokens, 128, AI_MAX_TOKENS, 700));
  const requestedModel = typeof body.model === "string" ? body.model : "";
  const preferredProviders = aiProviderOrder(requestedProvider, mode);
  const configuredProviders = preferredProviders.filter((provider) => isAiProviderConfigured(provider, env));

  if (configuredProviders.length === 0) {
    return withCors(noStoreJson({ error: "AI is not configured" }, { status: 503 }), request, env);
  }

  let lastResponse: Response | null = null;
  for (const provider of configuredProviders) {
    const options = {
      messages,
      mode,
      model: modelForProvider(provider, requestedModel),
      stream,
      temperature,
      maxTokens,
    };
    const response = provider === "claude"
      ? await claudeChat(request, env, options)
      : await deepSeekChat(request, env, options);
    const isFallback = provider !== preferredProviders[0];
    const canFallback = response.status === 429 || response.status >= 500;

    if (!canFallback || provider === configuredProviders[configuredProviders.length - 1]) {
      return withAiProviderHeaders(response, provider, isFallback);
    }

    lastResponse = response;
  }

  return lastResponse
    ? withAiProviderHeaders(lastResponse, configuredProviders[configuredProviders.length - 1], true)
    : withCors(noStoreJson({ error: "AI request failed" }, { status: 502 }), request, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return json({ ok: true, service: "zivo-web", media: Boolean(env.ZIVO_MEDIA) });
    }

    if (request.method !== "OPTIONS") {
      if (blockedPathPattern.test(url.pathname)) {
        return withSecurityHeaders(noStoreJson({ error: "Forbidden" }, { status: 403 }), request, env);
      }

      if (isRateLimited(request, url)) {
        return withSecurityHeaders(noStoreJson({ error: "Too many requests" }, { status: 429 }), request, env);
      }
    }

    const chatRedirect = chatHomeRedirect(request, url);
    if (chatRedirect) {
      return withSecurityHeaders(chatRedirect, request, env);
    }

    const softwareRedirect = softwareDashboardRedirect(request, url);
    if (softwareRedirect) {
      return withSecurityHeaders(softwareRedirect, request, env);
    }

    if (url.pathname === "/media" || url.pathname.startsWith("/media/")) {
      return handleMedia(request, env);
    }

    if (url.pathname.startsWith("/downloads/")) {
      return handleDownload(request, env);
    }

    if (url.pathname.startsWith("/share/c/")) {
      return handleChannelSharePreview(request, env);
    }

    if (url.pathname === "/api/ai/chat" || url.pathname === "/api/deepseek/chat") {
      return withSecurityHeaders(await handleAiChat(request, env, url), request, env);
    }

    const travelSeo = travelSeoResponse(request, url);
    if (travelSeo) {
      return withSecurityHeaders(travelSeo, request, env);
    }

    if (env.ASSETS) {
      return withSecurityHeaders(await env.ASSETS.fetch(request), request, env);
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};

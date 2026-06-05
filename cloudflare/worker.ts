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
  CHANNEL_OG_FUNCTION_URL?: string;
  SUPABASE_URL?: string;
};

const WINDOW_MS = 10 * 60 * 1000;
const AUTH_LIMIT = 80;
const GENERAL_LIMIT = 600;
const buckets = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_ALLOWED_ORIGINS = [
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://zivoschat.com",
  "https://www.zivoschat.com",
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
  "https://zivollc.com",
  "https://www.zivollc.com",
  "https://app.zivollc.com",
  "https://preview.zivollc.com",
  "https://app.zivosmedia.com",
  "https://preview.zivosmedia.com",
  "https://myzivo.com",
  "https://www.myzivo.com",
  "https://app.myzivo.com",
  "https://preview.myzivo.com",
  "https://zivo-web.myzivo.workers.dev",
  "http://localhost:8081",
  "http://localhost:5173",
];

const CHAT_HOSTS = new Set([
  "zivoschat.com",
  "www.zivoschat.com",
]);

const CSP_BASE =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://js.stripe.com https://*.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://pagead2.googlesyndication.com https://*.googlesyndication.com https://partner.googleadservices.com https://www.googleadservices.com https://adservice.google.com https://analytics.tiktok.com https://static.ads-twitter.com https://static.cloudflareinsights.com https://*.lovable.app https://*.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: blob: data:; media-src 'self' blob: data: https:; frame-src 'self' https://js.stripe.com https://*.stripe.com https://www.google.com https://*.duffel.com https://googleads.g.doubleclick.net https://*.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://*.stripe.com https://*.duffel.com; frame-ancestors 'self'; upgrade-insecure-requests";

const CSP_REPORT_BY_HOST = new Map([
  ["zivosoftware.com", "https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/csp-report"],
  ["www.zivosoftware.com", "https://ydxztoresbdeoeijhxww.supabase.co/functions/v1/csp-report"],
  ["zivoschat.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
  ["www.zivoschat.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
  ["zivosmedia.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
  ["www.zivosmedia.com", "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report"],
]);

const immutableCache = "public, max-age=31536000, immutable";
const authPathPattern = /^\/(?:login|signup|auth(?:\/|$)|admin(?:\/|$))/i;
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
  const key = `${isAuthPath ? "auth" : "site"}:${clientIp(request)}`;
  const limit = isAuthPath ? AUTH_LIMIT : GENERAL_LIMIT;
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
  headers.set("access-control-allow-methods", "GET, HEAD, PUT, DELETE, OPTIONS");
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

    if (url.pathname === "/media" || url.pathname.startsWith("/media/")) {
      return handleMedia(request, env);
    }

    if (url.pathname.startsWith("/downloads/")) {
      return handleDownload(request, env);
    }

    if (url.pathname.startsWith("/share/c/")) {
      return handleChannelSharePreview(request, env);
    }

    if (env.ASSETS) {
      return withSecurityHeaders(await env.ASSETS.fetch(request), request, env);
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};

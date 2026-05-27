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
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://zivollc.com",
  "https://www.zivollc.com",
  "https://app.zivollc.com",
  "https://preview.zivollc.com",
  "https://myzivo.com",
  "https://www.myzivo.com",
  "https://app.myzivo.com",
  "https://preview.myzivo.com",
  "https://zivo-web.myzivo.workers.dev",
  "http://localhost:8081",
  "http://localhost:5173",
];

const CHANNEL_OG_FUNCTION_URL = "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/channel-og";
const immutableCache = "public, max-age=31536000, immutable";

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
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

async function handleChannelSharePreview(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const handle = safeObjectKey(url.pathname.replace(/^\/share\/c\/?/, ""));
  if (!handle || handle.includes("/")) {
    return json({ error: "Invalid channel handle" }, { status: 400 });
  }

  const upstreamUrl = new URL(CHANNEL_OG_FUNCTION_URL);
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

    if (url.pathname === "/media" || url.pathname.startsWith("/media/")) {
      return handleMedia(request, env);
    }

    if (url.pathname.startsWith("/downloads/")) {
      return handleDownload(request, env);
    }

    if (url.pathname.startsWith("/share/c/")) {
      return handleChannelSharePreview(request);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};

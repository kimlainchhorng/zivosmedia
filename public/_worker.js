const WINDOW_MS = 10 * 60 * 1000;
const AUTH_LIMIT = 80;
const GENERAL_LIMIT = 600;
const buckets = new Map();

const allowedOrigins = new Set([
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://zivoschat.com",
  "https://www.zivoschat.com",
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
]);

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

const authPathPattern = /^\/(?:login|signup|auth(?:\/|$)|admin(?:\/|$))/i;
const blockedPathPattern =
  /(?:^|\/)(?:\.env|\.git|\.svn|\.hg|wp-admin|wp-login\.php|xmlrpc\.php|phpmyadmin|adminer|\.DS_Store|composer\.json|package-lock\.json)(?:\/|$)|(?:\.\.\/|\/etc\/passwd|\/proc\/self|%2e%2e|%5c)/i;

function clientIp(request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
}

function rateKey(request, url) {
  const prefix = authPathPattern.test(url.pathname) ? "auth" : "site";
  return `${prefix}:${clientIp(request)}`;
}

function isRateLimited(request, url) {
  const now = Date.now();
  const key = rateKey(request, url);
  const limit = authPathPattern.test(url.pathname) ? AUTH_LIMIT : GENERAL_LIMIT;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

function chatHomeRedirect(request, url) {
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

function softwareDashboardRedirect(request, url) {
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

function securityHeaders(request, url) {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  const cspReportUri =
    CSP_REPORT_BY_HOST.get(url.hostname) ?? "https://slirphzzwcogdbkeicff.supabase.co/functions/v1/csp-report";
  if (origin && allowedOrigins.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  } else if (allowedOrigins.has(url.origin)) {
    headers.set("access-control-allow-origin", url.origin);
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

function withSecurityHeaders(response, request, url) {
  const headers = new Headers(response.headers);
  securityHeaders(request, url).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(data, status, request, url) {
  const headers = securityHeaders(request, url);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: securityHeaders(request, url) });
    }

    if (blockedPathPattern.test(url.pathname)) {
      return json({ error: "Forbidden" }, 403, request, url);
    }

    if (isRateLimited(request, url)) {
      return json({ error: "Too many requests" }, 429, request, url);
    }

    const chatRedirect = chatHomeRedirect(request, url);
    if (chatRedirect) {
      return withSecurityHeaders(chatRedirect, request, url);
    }

    const softwareRedirect = softwareDashboardRedirect(request, url);
    if (softwareRedirect) {
      return withSecurityHeaders(softwareRedirect, request, url);
    }

    const response = await env.ASSETS.fetch(request);
    return withSecurityHeaders(response, request, url);
  },
};

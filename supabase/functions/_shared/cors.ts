// Shared CORS helpers for Supabase Edge Functions.
//
// Three modes:
//  1. corsHeaders        — static compatibility headers without an ACAO grant
//  2. getCorsHeaders()   — per-request allowlist headers for legacy callers
//  3. strictCorsHeaders() — validates Origin against allowlist; 403 for unknown origins

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, stripe-signature, x-lovable-signature, x-lovable-timestamp, idempotency-key, x-application-name, x-device-fingerprint, x-request-id, x-cron-secret, x-pair-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

declare const Deno:
  | {
      env: {
        get(name: string): string | undefined;
      };
    }
  | undefined;

function readEnv(name: string): string {
  try {
    return typeof Deno !== "undefined" ? Deno.env.get(name) ?? "" : "";
  } catch {
    return "";
  }
}

function parseCsvEnv(name: string): string[] {
  return readEnv(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

// Production origins. Add staging / preview domains through CORS_ALLOWED_ORIGINS.
const ALLOWED_ORIGINS = new Set<string>([
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://app.zivosmedia.com",
  "https://preview.zivosmedia.com",
  "https://zivoschat.com",
  "https://www.zivoschat.com",
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
  "https://zivostravel.com",
  "https://www.zivostravel.com",
  "https://zivodriver.com",
  "https://www.zivodriver.com",
  "https://zivo-web.myzivo.workers.dev",
  // Supabase Studio (used by edge-function test runner)
  "https://supabase.com",
  ...parseCsvEnv("CORS_ALLOWED_ORIGINS"),
]);

// Domains whose origin prefixes are allowed (e.g. branch previews).
const ALLOWED_ORIGIN_SUFFIXES = [
  ".zivosmedia.com",
  ".zivoschat.com",
  ".zivosoftware.com",
  ".zivostravel.com",
  ".zivodriver.com",
  ...parseCsvEnv("CORS_ALLOWED_ORIGIN_SUFFIXES"),
];

// Native WebView origins for our own Capacitor shells. iOS WKWebView serves the
// app from capacitor://localhost; Ionic's older scheme is ionic://localhost.
// (Android uses https://localhost, already covered by isLocalDevelopmentOrigin.)
// Strict-CORS routes still enforce a bearer JWT + app_integrations checks, so
// this only opens the browser preflight gate to our own native apps.
const NATIVE_APP_ORIGINS = new Set<string>([
  "capacitor://localhost",
  "ionic://localhost",
]);

function isPrivateLanHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") return true;
  if (hostname.startsWith("192.168.")) return true;
  if (hostname.startsWith("10.")) return true;
  const parts = hostname.split(".").map((part) => Number(part));
  return parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
}

function isLocalDevelopmentOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return isPrivateLanHost(url.hostname);
  } catch {
    return false;
  }
}

export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (NATIVE_APP_ORIGINS.has(origin)) return true;
  if (isLocalDevelopmentOrigin(origin)) return true;
  try {
    const url = new URL(origin);
    return ALLOWED_ORIGIN_SUFFIXES.some(s => url.hostname.endsWith(s));
  } catch {
    return false;
  }
}

// ── Legacy / public-route exports (backward-compatible) ────────────────────────
export const corsHeaders = {
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, PATCH, OPTIONS",
  "Vary": "Origin",
};

export const publicCorsHeaders = corsHeaders;

// Per-request legacy variant. It is deliberately fail-closed: unknown origins
// receive no ACAO header, and server-to-server requests with no Origin do not
// need one. This prevents older handlers from reflecting attacker-controlled
// origins while they migrate to strictCorsHeaders()/withSecurity({ strictCors }).
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, PATCH, OPTIONS",
    "Vary": "Origin",
  };
  if (isOriginAllowed(origin)) headers["Access-Control-Allow-Origin"] = origin!;
  return headers;
}

// ── Strict origin-validated headers (use on authenticated routes) ──────────────
export function strictCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("origin");
  if (!isOriginAllowed(origin)) return null; // caller should return 403
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

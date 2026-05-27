// Shared CORS helpers for Supabase Edge Functions.
//
// Three modes:
//  1. corsHeaders        — wildcard "*" (backward-compat, kept for public/webhook routes)
//  2. getCorsHeaders()   — echoes caller Origin (legacy; use strictCorsHeaders on new routes)
//  3. strictCorsHeaders() — validates Origin against allowlist; 403 for unknown origins

const ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-application-name, x-request-id";

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
  "https://zivollc.com",
  "https://www.zivollc.com",
  "https://app.zivollc.com",
  "https://preview.zivollc.com",
  "https://zivo-web.myzivo.workers.dev",
  "https://myzivo.com",
  "https://www.myzivo.com",
  "https://app.myzivo.com",
  // Supabase Studio (used by edge-function test runner)
  "https://supabase.com",
  ...parseCsvEnv("CORS_ALLOWED_ORIGINS"),
]);

// Domains whose origin prefixes are allowed (e.g. branch previews).
const ALLOWED_ORIGIN_SUFFIXES = [
  ".zivollc.com",
  ".myzivo.com",
  ...parseCsvEnv("CORS_ALLOWED_ORIGIN_SUFFIXES"),
];

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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, PATCH, OPTIONS",
};

export const publicCorsHeaders = corsHeaders;

// Per-request variant (legacy): echoes Origin, falls back to "*".
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, PATCH, OPTIONS",
    "Vary": "Origin",
  };
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

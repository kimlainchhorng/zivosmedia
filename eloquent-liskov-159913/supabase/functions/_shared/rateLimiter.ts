/**
 * Server-side rate limiter for edge functions.
 *
 * Two layers:
 *   1. In-memory Map (sync, per-isolate, free) — synchronous fast path
 *   2. DB-backed via `rate_limit_check` RPC (async, cross-isolate, authoritative)
 *
 * Synchronous `rateLimit()` uses the in-memory store. For cross-isolate
 * accuracy on critical endpoints (auth, payments), call `rateLimitDb()` instead.
 *
 * Usage:
 *   // Per-isolate (best-effort)
 *   const r = rateLimit(ip, 'auth_login');
 *
 *   // Authoritative (DB round trip)
 *   const r = await rateLimitDb(ip, 'auth_login');
 */
import { createClient } from "./deps.ts";

export interface RateLimitOptions {
  max: number;         // max requests in window
  windowSec: number;   // window size in seconds
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;     // epoch ms
  retryAfter?: number; // seconds until retry (only when not allowed)
}

// ── Preset limits by endpoint category ────────────────────────────────────────
export const LIMITS = {
  auth_login:         { max: 5,   windowSec: 60  },
  auth_register:      { max: 3,   windowSec: 60  },
  auth_otp:           { max: 5,   windowSec: 300 },
  auth_password_reset:{ max: 3,   windowSec: 300 },
  payment:            { max: 10,  windowSec: 60  },
  search:             { max: 30,  windowSec: 60  },
  upload:             { max: 20,  windowSec: 60  },
  admin_action:       { max: 30,  windowSec: 60  },
  api_general:        { max: 120, windowSec: 60  },
} as const;

export type LimitCategory = keyof typeof LIMITS;

// ── In-memory store ────────────────────────────────────────────────────────────
interface Bucket {
  timestamps: number[];
  resetAt: number;
}

const memStore = new Map<string, Bucket>();

// Periodic cleanup every 5 minutes
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setTimeout(() => {
    const now = Date.now();
    for (const [key, bucket] of memStore) {
      if (now > bucket.resetAt + 60_000) memStore.delete(key);
    }
    cleanupScheduled = false;
  }, 300_000);
}

// ── Core check function ────────────────────────────────────────────────────────
export function rateLimit(
  identifier: string,
  category: LimitCategory | string,
  opts?: RateLimitOptions,
): RateLimitResult {
  const config = opts ?? (LIMITS[category as LimitCategory] ?? { max: 120, windowSec: 60 });
  const windowMs = config.windowSec * 1000;
  const now = Date.now();
  const key = `${category}:${identifier}`;

  scheduleCleanup();

  let bucket = memStore.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { timestamps: [], resetAt: now + windowMs };
    memStore.set(key, bucket);
  }

  // Prune timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);

  if (bucket.timestamps.length >= config.max) {
    const oldest = bucket.timestamps[0];
    const resetAt = oldest + windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil((resetAt - now) / 1000),
    };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.max - bucket.timestamps.length,
    resetAt: bucket.resetAt,
  };
}

// ── DB-backed cross-isolate limiter ────────────────────────────────────────────
let _serviceClient: ReturnType<typeof createClient> | null = null;
function serviceClient() {
  if (_serviceClient) return _serviceClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Service role credentials not configured");
  _serviceClient = createClient(url, key, { auth: { persistSession: false } });
  return _serviceClient;
}

/**
 * Authoritative cross-isolate rate-limit check via Postgres.
 * Use for high-stakes endpoints (auth, payments, account changes) where
 * per-isolate accuracy isn't enough.
 */
export async function rateLimitDb(
  identifier: string,
  category: LimitCategory | string,
  opts?: RateLimitOptions,
): Promise<RateLimitResult> {
  const config = opts ?? (LIMITS[category as LimitCategory] ?? { max: 120, windowSec: 60 });
  try {
    const sb = serviceClient();
    const { data, error } = await sb.rpc("rate_limit_check", {
      _category:   String(category),
      _identifier: identifier,
      _max:        config.max,
      _window_sec: config.windowSec,
    });
    if (error || !data || !Array.isArray(data) || data.length === 0) {
      // Fail-open with in-memory fallback so a DB hiccup doesn't break auth
      return rateLimit(identifier, category, opts);
    }
    const row = data[0] as { allowed: boolean; remaining: number; reset_at: string };
    const resetAt = new Date(row.reset_at).getTime();
    return {
      allowed:    row.allowed,
      remaining:  row.remaining,
      resetAt,
      retryAfter: row.allowed ? undefined : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
    };
  } catch {
    return rateLimit(identifier, category, opts);
  }
}

// ── Response helpers ───────────────────────────────────────────────────────────
export function rateLimitHeaders(result: RateLimitResult, category: LimitCategory | string): Record<string, string> {
  const config = LIMITS[category as LimitCategory] ?? { max: 120, windowSec: 60 };
  const headers: Record<string, string> = {
    'X-RateLimit-Limit':     String(config.max),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed && result.retryAfter != null) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  return headers;
}

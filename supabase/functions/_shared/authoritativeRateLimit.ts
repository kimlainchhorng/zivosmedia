export type AuthoritativeRateLimitResult = {
  available: boolean;
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
};

type RateLimitRpcResult = {
  data: unknown;
  error: unknown;
};

/**
 * Parse the database RPC response without ever substituting an isolate-local
 * decision. Paid supplier routes must fail closed when the authoritative
 * cross-isolate state cannot be proven.
 */
export function parseAuthoritativeRateLimit(
  result: RateLimitRpcResult,
  now = Date.now(),
): AuthoritativeRateLimitResult {
  const rows = Array.isArray(result.data)
    ? (result.data as Array<{
        allowed?: unknown;
        remaining?: unknown;
        reset_at?: unknown;
      }>)
    : [];
  const row = rows[0];
  const resetAt =
    typeof row?.reset_at === "string"
      ? new Date(row.reset_at).getTime()
      : Number.NaN;

  if (
    result.error ||
    !row ||
    typeof row.allowed !== "boolean" ||
    typeof row.remaining !== "number" ||
    !Number.isFinite(row.remaining) ||
    row.remaining < 0 ||
    !Number.isFinite(resetAt) ||
    resetAt <= now
  ) {
    return {
      available: false,
      allowed: false,
      remaining: 0,
      resetAt: now + 30_000,
      retryAfter: 30,
    };
  }

  return {
    available: true,
    allowed: row.allowed,
    remaining: Math.max(0, Math.floor(row.remaining)),
    resetAt,
    retryAfter: row.allowed
      ? undefined
      : Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

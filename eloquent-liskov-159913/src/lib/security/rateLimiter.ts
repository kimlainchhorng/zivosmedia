/**
 * Client-side rate limiter using sliding window
 * Acts as defense-in-depth; primary rate limiting is server-side (Supabase).
 * 
 * Features:
 * - Sliding window per key
 * - Progressive lockout for auth attempts (5→30s, 10→2min, 15→10min, 20+→30min)
 * - Persistent lockout state via sessionStorage (survives page refresh)
 */

export class RateLimitError extends Error {
  retryAfter?: number;
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  search: { maxRequests: 30, windowMs: 60_000 },
  auth: { maxRequests: 5, windowMs: 300_000 },
  api: { maxRequests: 60, windowMs: 60_000 },
  default: { maxRequests: 100, windowMs: 60_000 },
};

export async function checkRateLimit(
  key: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  // Check progressive lockout first (for auth keys)
  const lockout = getProgressiveLockout(key);
  if (lockout > 0) {
    return { allowed: false, retryAfter: lockout };
  }

  const category = key.split(":")[0] || "default";
  const config = LIMITS[category] || LIMITS.default;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfter = Math.ceil((oldest + config.windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfter: 0 };
}

// ── Progressive lockout for failed auth attempts ──────────────────

const LOCKOUT_KEY = "zivo_auth_lockout";

interface LockoutState {
  failedAttempts: number;
  lockedUntil: number | null;
  firstFailure: number;
}

const LOCKOUT_TIERS = [
  { threshold: 5, lockoutMs: 30_000 },
  { threshold: 10, lockoutMs: 120_000 },
  { threshold: 15, lockoutMs: 600_000 },
  { threshold: 20, lockoutMs: 1_800_000 },
];

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getLockoutState(action: string): LockoutState {
  try {
    const raw = sessionStorage.getItem(`${LOCKOUT_KEY}_${action}`);
    if (!raw) return { failedAttempts: 0, lockedUntil: null, firstFailure: 0 };
    const state = JSON.parse(raw) as LockoutState;
    // Reset if window expired
    if (state.firstFailure && Date.now() - state.firstFailure > LOCKOUT_WINDOW_MS) {
      sessionStorage.removeItem(`${LOCKOUT_KEY}_${action}`);
      return { failedAttempts: 0, lockedUntil: null, firstFailure: 0 };
    }
    return state;
  } catch {
    return { failedAttempts: 0, lockedUntil: null, firstFailure: 0 };
  }
}

function saveLockoutState(action: string, state: LockoutState) {
  try {
    sessionStorage.setItem(`${LOCKOUT_KEY}_${action}`, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get remaining lockout seconds for an action. Returns 0 if not locked.
 */
function getProgressiveLockout(key: string): number {
  const action = key.split(":")[1] || key;
  const state = getLockoutState(action);
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    return Math.ceil((state.lockedUntil - Date.now()) / 1000);
  }
  return 0;
}

/**
 * Record a failed auth attempt. Returns lockout seconds if now locked, else null.
 */
export function recordAuthFailure(action: string): number | null {
  const now = Date.now();
  const state = getLockoutState(action);

  state.failedAttempts += 1;
  if (!state.firstFailure) state.firstFailure = now;

  // Apply lockout tier
  const tier = [...LOCKOUT_TIERS].reverse().find((t) => state.failedAttempts >= t.threshold);
  if (tier) {
    state.lockedUntil = now + tier.lockoutMs;
    saveLockoutState(action, state);
    return Math.ceil(tier.lockoutMs / 1000);
  }

  saveLockoutState(action, state);
  return null;
}

/**
 * Clear lockout state on successful auth.
 */
export function clearAuthLockout(action: string): void {
  sessionStorage.removeItem(`${LOCKOUT_KEY}_${action}`);
}

/**
 * Format lockout seconds into human-readable string.
 */
export function formatLockout(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.ceil(seconds / 60);
    return `${mins} minute${mins > 1 ? "s" : ""}`;
  }
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
}

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 300_000);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 120_000);

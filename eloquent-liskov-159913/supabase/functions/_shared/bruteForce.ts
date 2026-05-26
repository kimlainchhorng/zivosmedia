/**
 * Brute-force / credential-stuffing protection for authentication edge functions.
 *
 * Tracks failed attempts per IP and per account (email) independently.
 * On threshold breach: returns a lockout duration the caller should enforce and
 * fires a security event to the audit log.
 *
 * Thresholds (configurable per call site):
 *   IP:      10 failures in 15 min → 5 min lockout, 20 → 30 min, 30 → 1 hr
 *   Account: 5 failures in 10 min  → 10 min lockout, 10 → 1 hr, 15 → 24 hr
 */

import { recordSecurityEvent } from './audit.ts';

export interface BruteForceResult {
  blocked: boolean;
  lockoutSeconds?: number;
  reason?: string;
}

// ── In-memory store (best-effort; supplement with DB for cross-isolate) ────────
interface FailRecord {
  count: number;
  windowStart: number;
  lockedUntil: number | null;
}

const ipStore   = new Map<string, FailRecord>();
const acctStore = new Map<string, FailRecord>();

const IP_TIERS = [
  { threshold: 10, lockoutMs: 5 * 60 * 1000    },
  { threshold: 20, lockoutMs: 30 * 60 * 1000   },
  { threshold: 30, lockoutMs: 60 * 60 * 1000   },
];

const ACCOUNT_TIERS = [
  { threshold: 5,  lockoutMs: 10 * 60 * 1000   },
  { threshold: 10, lockoutMs: 60 * 60 * 1000   },
  { threshold: 15, lockoutMs: 24 * 60 * 60 * 1000 },
];

const IP_WINDOW_MS   = 15 * 60 * 1000;
const ACCT_WINDOW_MS = 10 * 60 * 1000;

function getOrCreate(store: Map<string, FailRecord>, key: string, windowMs: number): FailRecord {
  const now = Date.now();
  let rec = store.get(key);
  if (!rec || now - rec.windowStart > windowMs) {
    rec = { count: 0, windowStart: now, lockedUntil: null };
    store.set(key, rec);
  }
  return rec;
}

function applyTiers(rec: FailRecord, tiers: typeof IP_TIERS): number | null {
  const tier = [...tiers].reverse().find(t => rec.count >= t.threshold);
  if (!tier) return null;
  rec.lockedUntil = Date.now() + tier.lockoutMs;
  return Math.ceil(tier.lockoutMs / 1000);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Check if an IP or account is currently locked before attempting auth. */
export function isLocked(ip: string | null, accountKey: string | null): BruteForceResult {
  const now = Date.now();
  if (ip) {
    const rec = ipStore.get(ip);
    if (rec?.lockedUntil && now < rec.lockedUntil) {
      return { blocked: true, lockoutSeconds: Math.ceil((rec.lockedUntil - now) / 1000), reason: 'ip_locked' };
    }
  }
  if (accountKey) {
    const rec = acctStore.get(accountKey);
    if (rec?.lockedUntil && now < rec.lockedUntil) {
      return { blocked: true, lockoutSeconds: Math.ceil((rec.lockedUntil - now) / 1000), reason: 'account_locked' };
    }
  }
  return { blocked: false };
}

/** Record a failed auth attempt. Returns lockout info if threshold crossed. */
export function recordFailure(
  ip: string | null,
  accountKey: string | null,
  route: string,
  userAgent?: string | null,
): BruteForceResult {
  let lockoutSeconds: number | null = null;
  let reason: string | undefined;

  if (ip) {
    const rec = getOrCreate(ipStore, ip, IP_WINDOW_MS);
    rec.count += 1;
    const secs = applyTiers(rec, IP_TIERS);
    if (secs) { lockoutSeconds = secs; reason = 'ip_locked'; }
  }

  if (accountKey) {
    const rec = getOrCreate(acctStore, accountKey, ACCT_WINDOW_MS);
    rec.count += 1;
    const secs = applyTiers(rec, ACCOUNT_TIERS);
    if (secs && (!lockoutSeconds || secs > lockoutSeconds)) {
      lockoutSeconds = secs;
      reason = 'account_locked';
    }
  }

  if (lockoutSeconds) {
    // Fire-and-forget audit
    recordSecurityEvent({
      eventType: `brute_force.${reason}`,
      severity: 'warn',
      ip,
      userAgent,
      route,
      blocked: true,
      data: { accountKey, lockoutSeconds },
    }).catch(() => {});

    return { blocked: true, lockoutSeconds, reason };
  }

  return { blocked: false };
}

/** Clear failure state on successful authentication. */
export function clearFailures(ip: string | null, accountKey: string | null): void {
  if (ip) ipStore.delete(ip);
  if (accountKey) acctStore.delete(accountKey);
}

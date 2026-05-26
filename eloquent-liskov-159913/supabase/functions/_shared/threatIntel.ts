/**
 * Threat-intelligence helpers for edge functions.
 *
 * Companion to migration 20260501100000_threat_intel.sql.
 *
 *   hashIp(ip)               → SHA-256 hex (matches the format used by
 *                              blocked_link_attempts.ip_hash and ip_blocklist.ip_hash)
 *   isIpBlocked(ip)          → boolean, with 60s in-isolate cache
 *   enforceIpBlocklist(req)  → Response | null, drop-in for withSecurity callers
 *   lookupThreatHistory()    → admin/service-role aggregated history
 *
 * The blocklist check is intentionally cheap: one PostgREST RPC call cached for
 * 60 seconds per isolate. A confirmed bad IP returns 403 *before* any handler
 * work — no DB writes, no rate-limit slot consumed, no audit-log noise beyond
 * a single `ip_blocked` event.
 */

import { createClient } from './deps.ts';
import { recordSecurityEvent } from './audit.ts';
import { clientIp } from './waf.ts';
import { err } from './respond.ts';

// ── IP hashing (SHA-256, hex) ───────────────────────────────────────────────
// Must match the unsalted format used by `_shared/contentLinkValidation.ts`'s
// `hashIp` so that ip_blocklist entries correlate with blocked_link_attempts
// rows already keyed by the same hash.
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── In-isolate cache for blocklist lookups ──────────────────────────────────
interface CacheEntry { blocked: boolean; expiresAt: number; }
const blocklistCache     = new Map<string, CacheEntry>();
const userBlocklistCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export async function isIpBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const ipHash = await hashIp(ip);
  const now = Date.now();

  const cached = blocklistCache.get(ipHash);
  if (cached && cached.expiresAt > now) return cached.blocked;

  try {
    const sb = adminClient();
    const { data, error } = await sb.rpc('is_ip_blocked', { _ip_hash: ipHash });
    if (error) {
      // Fail-open on lookup error — better to let a request through than to
      // 500 the whole edge function on a transient DB blip. The WAF / rate
      // limiter still apply.
      console.error(JSON.stringify({
        level: 'error', msg: 'is_ip_blocked_failed', error: String(error),
      }));
      return false;
    }
    const blocked = data === true;
    blocklistCache.set(ipHash, { blocked, expiresAt: now + CACHE_TTL_MS });
    return blocked;
  } catch (e) {
    console.error(JSON.stringify({
      level: 'error', msg: 'is_ip_blocked_threw', error: String(e),
    }));
    return false;
  }
}

export async function isUserBlocked(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const now = Date.now();

  const cached = userBlocklistCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.blocked;

  try {
    const sb = adminClient();
    const { data, error } = await sb.rpc('is_user_blocked', { _user_id: userId });
    if (error) {
      console.error(JSON.stringify({
        level: 'error', msg: 'is_user_blocked_failed', error: String(error),
      }));
      return false;
    }
    const blocked = data === true;
    userBlocklistCache.set(userId, { blocked, expiresAt: now + CACHE_TTL_MS });
    return blocked;
  } catch (e) {
    console.error(JSON.stringify({
      level: 'error', msg: 'is_user_blocked_threw', error: String(e),
    }));
    return false;
  }
}

/**
 * Drop-in for auth-aware handlers. After resolving the JWT/user, call this
 * with the resolved user_id. Returns a 403 Response if the account is
 * blocklisted, null otherwise. Layer this *after* `withSecurity` (which
 * handles the IP-side check) inside any handler that has authenticated state.
 *
 * Usage:
 *   const userBlock = await enforceUserBlocklist(req, userId);
 *   if (userBlock) return userBlock;
 */
export async function enforceUserBlocklist(
  req: Request,
  userId: string | null,
): Promise<Response | null> {
  if (!userId) return null;
  const blocked = await isUserBlocked(userId);
  if (!blocked) return null;

  recordSecurityEvent({
    eventType: 'user_blocklist.hit',
    severity: 'warn',
    userId,
    ip: clientIp(req),
    userAgent: req.headers.get('user-agent'),
    blocked: true,
  }).catch(() => {});

  return err(req, 'Account suspended', 403);
}

/**
 * Drop-in for security middlewares. If the request comes from a blocklisted
 * IP, returns a 403 Response with no body work performed. Returns null to
 * indicate the caller should continue normal processing.
 */
export async function enforceIpBlocklist(
  req: Request,
  route: string,
): Promise<Response | null> {
  const ip = clientIp(req);
  if (!ip) return null;
  const blocked = await isIpBlocked(ip);
  if (!blocked) return null;

  recordSecurityEvent({
    eventType: 'ip_blocklist.hit',
    severity: 'warn',
    ip,
    userAgent: req.headers.get('user-agent'),
    route,
    blocked: true,
  }).catch(() => {});

  return err(req, 'Forbidden', 403);
}

// ── Threat history (admin/service-role consumers) ───────────────────────────
export interface ThreatHistoryRow {
  source: string;
  total_count: number;
  blocked_count: number;
  max_severity: string | null;
  last_seen: string;
  sample: unknown[];
}

export interface ThreatHistoryQuery {
  ip?: string | null;
  userId?: string | null;
  hours?: number;
}

export async function lookupThreatHistory(
  q: ThreatHistoryQuery,
): Promise<ThreatHistoryRow[]> {
  const sb = adminClient();
  const ipHash = q.ip ? await hashIp(q.ip) : null;
  const { data, error } = await sb.rpc('get_threat_history', {
    _ip_address: q.ip ?? null,
    _ip_hash: ipHash,
    _user_id: q.userId ?? null,
    _hours: q.hours ?? 168,
  });
  if (error) throw error;
  return (data ?? []) as ThreatHistoryRow[];
}

/**
 * Convenience: compute a 0-100 risk score from threat history rows.
 *  - Each `blocked_link_attempts` row contributes 8 pts
 *  - Each blocked `security_event` contributes 4 pts
 *  - Each unacknowledged `security_incident` of severity≥high contributes 25
 *  - Any `ip_blocklist` row caps at 100
 */
export function scoreThreatHistory(rows: ThreatHistoryRow[]): number {
  let score = 0;
  for (const r of rows) {
    if (r.source === 'ip_blocklist' && r.total_count > 0) return 100;
    if (r.source === 'blocked_link_attempts') score += r.total_count * 8;
    if (r.source === 'security_events')        score += r.blocked_count * 4;
    if (r.source === 'security_incidents'
        && (r.max_severity === 'high' || r.max_severity === 'critical')) {
      score += r.blocked_count * 25;
    }
    if (r.source === 'chat_security_events')   score += r.blocked_count * 6;
  }
  return Math.min(score, 100);
}

// ── Auto-block ──────────────────────────────────────────────────────────────
export interface AutoBlockResult {
  score: number;
  blocked: boolean;
  blockId: string | null;
}

/**
 * Atomically checks aggregated threat history and adds the IP to the blocklist
 * if score >= threshold. Idempotent: returns the existing block_id if the IP is
 * already blocked. Fire-and-forget safe — exceptions are swallowed and logged.
 *
 * Wire from any place that detects a hostile signal (WAF block, scanner UA,
 * brute-force lockout, blocked-link rejection). Calling repeatedly is cheap:
 * the DB does the threshold check in a single statement.
 */
export async function autoBlockIfHighThreat(opts: {
  ip: string | null;
  userId?: string | null;
  reason: string;
  /** lookback window in hours; default 24 */
  hours?: number;
  /** score threshold (0-100); default 75 */
  threshold?: number;
  /** how long to block, in hours; default 24 */
  blockHours?: number;
}): Promise<AutoBlockResult | null> {
  if (!opts.ip) return null;
  try {
    const sb = adminClient();
    const ipHash = await hashIp(opts.ip);
    const { data, error } = await sb.rpc('auto_block_if_high_threat', {
      _ip_hash:    ipHash,
      _ip_address: opts.ip,
      _user_id:    opts.userId ?? null,
      _hours:      opts.hours ?? 24,
      _threshold:  opts.threshold ?? 75,
      _block_hours: opts.blockHours ?? 24,
      _reason:     opts.reason,
    });
    if (error) {
      console.error(JSON.stringify({
        level: 'error', msg: 'auto_block_failed', error: String(error),
      }));
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    // Invalidate the in-isolate blocklist cache for this IP so the next
    // request from this IP picks up the new block within the same isolate.
    if (row.blocked) blocklistCache.delete(ipHash);

    return {
      score: row.score ?? 0,
      blocked: row.blocked === true,
      blockId: row.block_id ?? null,
    };
  } catch (e) {
    console.error(JSON.stringify({
      level: 'error', msg: 'auto_block_threw', error: String(e),
    }));
    return null;
  }
}

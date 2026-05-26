/**
 * Server-side mirror of src/lib/security/contentLinkValidation.ts
 *
 * Use this from any edge function that accepts free-form user text
 * (post captions, comments, bios, reviews, support tickets, refund
 * disputes, lost-item reports, community descriptions, etc.) so that
 * a malicious client calling Supabase REST directly cannot bypass the
 * JS gate.
 *
 * Keep the rule set in sync with the client copy. The two should
 * agree, but the server is authoritative.
 *
 * Usage in an edge function:
 *
 *   import { scanContentForLinks } from "../_shared/contentLinkValidation.ts";
 *   const scan = scanContentForLinks(body.caption);
 *   if (!scan.ok) {
 *     return new Response(JSON.stringify({ error: "blocked_link", urls: scan.blocked }), { status: 422 });
 *   }
 */

const URL_REGEX = /(https?:\/\/[^\s<>"']+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"']*)/gi;

const SUSPICIOUS_TLDS = new Set([
  ".zip", ".mov", ".country", ".kim", ".cricket", ".science", ".work",
  ".party", ".gq", ".cf", ".tk", ".ml", ".ga", ".top", ".xin", ".loan",
]);

const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "ow.ly", "goo.gl", "is.gd", "buff.ly",
  "rebrand.ly", "cutt.ly", "lnkd.in", "shorturl.at", "t.ly", "rb.gy",
  "tiny.cc", "soo.gd", "clck.ru", "shorte.st", "adf.ly", "bc.vc",
  "short.io", "qr.ae", "s.id", "v.gd",
]);

const ZIVO_OWNED_HOSTS = ["hizivo.com", "myzivo.lovable.app"];

const ALLOWED_PARTNER_DOMAINS = new Set([
  "aviasales.com", "tp.media", "tpo.li", "hotellook.com", "economybookings.com",
  "qeeq.com", "getrentacar.com", "kiwitaxi.com", "gettransfer.com", "intui.travel",
  "tiqets.com", "wegotrip.com", "ticketnetwork.com", "airalo.com", "drimsim.com",
  "yesim.app", "radicalstorage.com", "airhelp.com", "compensair.com",
  "booking.com", "expedia.com", "hotels.com", "duffel.com", "links.duffel.com",
  "skyscanner.com", "skyscanner.net", "rentalcover.com",
  "hizivo.com", "myzivo.lovable.app",
]);

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a.charCodeAt(i - 1) === b.charCodeAt(j - 1)
        ? prev
        : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function assess(url: string): "trusted" | "neutral" | "suspicious" | "blocked" {
  let host = "";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    const proto = u.protocol.toLowerCase();
    if (proto !== "http:" && proto !== "https:") return "blocked";
    if (u.username || u.password) return "blocked";
    if (host.split(".").some((p) => p.startsWith("xn--"))) return "suspicious";
  } catch {
    return "blocked";
  }

  for (const own of ZIVO_OWNED_HOSTS) {
    if (host === own || host.endsWith(`.${own}`)) {
      return "trusted";
    }
    const dist = levenshtein(host, own);
    if (dist > 0 && dist <= 2) return "blocked";
  }

  if (URL_SHORTENERS.has(host)) return "suspicious";
  for (const tld of SUSPICIOUS_TLDS) if (host.endsWith(tld)) return "suspicious";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return "suspicious";
  if (url.length > 250) return "suspicious";

  for (const partner of ALLOWED_PARTNER_DOMAINS) {
    if (host === partner || host.endsWith(`.${partner}`)) return "trusted";
  }

  return "neutral";
}

export interface ContentLinkScan {
  blocked: string[];
  suspicious: string[];
  ok: boolean;
}

/**
 * Fire-and-forget log of a blocked attempt to public.blocked_link_attempts.
 *
 * Never throws, never awaits the actual request — the caller should always
 * return its 422 response immediately and let the log write happen in the
 * background. If the insert fails (DB down, table missing, etc.) we just
 * console.error so the user-facing rejection still works.
 *
 * Usage:
 *   const scan = scanContentForLinks(body.message);
 *   if (!scan.ok) {
 *     logBlockedAttempt(adminClient, {
 *       endpoint: "channel-broadcast",
 *       userId: user.id,
 *       urls: scan.blocked,
 *       text: body.message,
 *       ip: req.headers.get("cf-connecting-ip"),
 *     });
 *     return new Response(JSON.stringify({ error: "blocked_link", ... }), { status: 422 });
 *   }
 */
export function logBlockedAttempt(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  opts: {
    endpoint: string;
    userId?: string | null;
    urls: string[];
    text?: string | null;
    ip?: string | null;
  },
): void {
  try {
    const ipHash = opts.ip
      ? hashIp(opts.ip).catch(() => null)
      : Promise.resolve(null);

    void ipHash.then((hash) => {
      supabase
        .from("blocked_link_attempts")
        .insert({
          user_id: opts.userId ?? null,
          endpoint: opts.endpoint,
          urls: opts.urls,
          content_preview: opts.text ? opts.text.slice(0, 200) : null,
          ip_hash: hash,
        })
        .then((r: { error: { message?: string } | null }) => {
          if (r.error) console.error("[contentLinkValidation] log insert failed", r.error.message);
        });
    });
  } catch (err) {
    console.error("[contentLinkValidation] log error", err);
  }
}

/**
 * Count how many times this user has been blocked in the last `hours`.
 * Returns 0 on any DB error — abuse detection must never break user flow.
 */
export async function getRecentBlockedCount(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string | null | undefined,
  hours = 24,
): Promise<number> {
  if (!userId) return 0;
  try {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { count, error } = await supabase
      .from("blocked_link_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", cutoff);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Auto-flag policy: returns true when a user has hit the threshold
 * (default 5 blocks in 24h). Callers can short-circuit with a 429 instead
 * of running expensive checks on a clearly-malicious caller.
 */
export async function isAbuseThresholdExceeded(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string | null | undefined,
  threshold = 5,
  hours = 24,
): Promise<boolean> {
  const count = await getRecentBlockedCount(supabase, userId, hours);
  return count >= threshold;
}

/**
 * SHA-256 of the source IP so we never store raw PII. Exported so endpoints
 * can pass the same hashed value to both `isIpAbuseThresholdExceeded` (gate)
 * and `logBlockedAttempt` (record) — must match for the IP-level threshold
 * to count consistently.
 */
export async function hashIp(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  try {
    const data = new TextEncoder().encode(ip);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/**
 * Pull the best client IP available from common proxy headers, then hash.
 * Returns null if no usable header found.
 */
export async function getRequestIpHash(req: Request): Promise<string | null> {
  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip");
  return hashIp(ip);
}

/**
 * Count blocked attempts from this IP hash in the last `hours`.
 * Threshold should be HIGHER than per-user (default 10) since corporate
 * NATs and household routers share an IP across many real users.
 */
export async function getRecentBlockedCountByIp(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  ipHash: string | null | undefined,
  hours = 24,
): Promise<number> {
  if (!ipHash) return 0;
  try {
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { count, error } = await supabase
      .from("blocked_link_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", cutoff);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * IP-level auto-flag: returns true when this IP has hit the threshold.
 * Catches attackers cycling through multiple accounts from one IP.
 */
export async function isIpAbuseThresholdExceeded(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  ipHash: string | null | undefined,
  threshold = 10,
  hours = 24,
): Promise<boolean> {
  const count = await getRecentBlockedCountByIp(supabase, ipHash, hours);
  return count >= threshold;
}

export function scanContentForLinks(text: string | null | undefined): ContentLinkScan {
  const result: ContentLinkScan = { blocked: [], suspicious: [], ok: true };
  if (!text) return result;

  const seen = new Set<string>();
  const matches = text.match(URL_REGEX) || [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?)"']+$/g, "");
    const href = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    if (seen.has(href)) continue;
    seen.add(href);
    const level = assess(href);
    if (level === "blocked") result.blocked.push(href);
    else if (level === "suspicious") result.suspicious.push(href);
  }
  result.ok = result.blocked.length === 0;
  return result;
}

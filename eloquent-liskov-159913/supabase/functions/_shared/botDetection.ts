/**
 * Server-side bot / scraper detection.
 *
 * These are fast heuristics — they will not catch a determined attacker
 * with a forged Chrome user-agent. They WILL catch:
 *  - Default scripting tools (curl, wget, python-requests, scrapy, etc.)
 *  - Known scanner UAs (sqlmap, nikto, nuclei, ZAP, Burp, etc.)
 *  - Empty / missing User-Agent (most automated scripts forget this)
 *  - Browsers in headless mode that ALSO lack `Accept` / `Accept-Language`
 *    (real browsers always send these; headless puppeteer often doesn't)
 *
 * Use as a defense-in-depth gate alongside rate-limiting + content scanning.
 * Prefer false-positives that frustrate scrapers over false-negatives that
 * let bot abuse through.
 */

const SCRAPER_UA_PATTERNS: RegExp[] = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /python-requests/i,
  /python-urllib/i,
  /\bscrapy\b/i,
  /\bphantomjs\b/i,
  /\bheadlesschrome\b/i,
  /\bpuppeteer\b/i,
  /\bplaywright\b/i,
  /\baxios\b/i,
  /\bgo-http-client\b/i,
  /java\/[0-9]/i,
  /\bjava-http-client\b/i,
  /\bnode-fetch\b/i,
  /\bokhttp\b/i,
  /apache-httpclient/i,
  /\blibwww-perl\b/i,
];

const SCANNER_UA_PATTERNS: RegExp[] = [
  /sqlmap/i,
  /\bnikto\b/i,
  /\bnuclei\b/i,
  /\bzap\b/i,
  /\bburp\b/i,
  /\bdirbuster\b/i,
  /\bgobuster\b/i,
  /\bwfuzz\b/i,
  /\bmasscan\b/i,
  /\bnmap\b/i,
  /\bskipfish\b/i,
  /\bw3af\b/i,
  /acunetix/i,
  /\bnessus\b/i,
  /\bopenvas\b/i,
];

export interface BotCheckResult {
  isBot: boolean;
  /** "scanner" = security scanner, hard block. "scraper" = scripting tool, soft block. "missing_ua" / "missing_accept" = weak signal. */
  reason: "scanner" | "scraper" | "missing_ua" | "missing_accept" | null;
  ua: string;
}

/**
 * Inspect a request's headers and decide whether it looks automated.
 * `headers` should be the request Headers object or a plain record.
 */
export function detectBot(headers: Headers | Record<string, string | null | undefined>): BotCheckResult {
  const get = (name: string): string =>
    (headers instanceof Headers ? headers.get(name) : headers[name] ?? headers[name.toLowerCase()]) ?? "";

  const ua = get("user-agent").trim();

  if (!ua) {
    return { isBot: true, reason: "missing_ua", ua };
  }

  for (const pattern of SCANNER_UA_PATTERNS) {
    if (pattern.test(ua)) return { isBot: true, reason: "scanner", ua };
  }

  for (const pattern of SCRAPER_UA_PATTERNS) {
    if (pattern.test(ua)) return { isBot: true, reason: "scraper", ua };
  }

  // Real browsers always send Accept. Many scripted clients don't.
  // This is a weak signal — only fire when combined with other anomalies.
  const accept = get("accept");
  if (!accept || accept === "*/*") {
    return { isBot: true, reason: "missing_accept", ua };
  }

  return { isBot: false, reason: null, ua };
}

/**
 * Strict variant: returns true only for scanner / scraper hits, ignores
 * the weaker missing-accept signal. Use this as a hard server-side gate.
 */
export function isLikelyMaliciousBot(headers: Headers | Record<string, string | null | undefined>): boolean {
  const r = detectBot(headers);
  return r.isBot && (r.reason === "scanner" || r.reason === "scraper" || r.reason === "missing_ua");
}

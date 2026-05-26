// withSecurity — composes WAF inspection, rate limiting, correlation ID,
// structured logging, security response headers, and CORS preflight handling.
// Drop-in wrapper for edge handlers.
//
// Usage:
//   serve(withSecurity('my-route', async (req, ctx) => { ... }));
//   serve(withSecurity('auth-login', handler, { rateLimit: 'auth_login' }));

import { preflight, err } from './respond.ts';
import { getCorsHeaders, strictCorsHeaders } from './cors.ts';
import { inspectRequest, clientIp } from './waf.ts';
import { newCorrelationId, makeLogger, type Logger } from './logger.ts';
import { recordSecurityEvent } from './audit.ts';
import { recordNetworkEvent } from './audit.ts';
import { rateLimit, rateLimitHeaders, type LimitCategory } from './rateLimiter.ts';
import { isIpBlocked, autoBlockIfHighThreat } from './threatIntel.ts';
import { hashIp } from './threatIntel.ts';
import { detectBot } from './botDetection.ts';
import { assessNetwork, type NetworkSignals } from './networkSignals.ts';

export interface SecurityContext {
  log: Logger;
  correlationId: string;
  ip: string | null;
  userAgent: string | null;
  route: string;
  startedAt: number;
  corsHeaders: Record<string, string>;
  network: NetworkSignals;
}

export interface SecurityOptions {
  /** Rate-limit category key (from LIMITS in rateLimiter.ts) */
  rateLimit?: LimitCategory | string;
  /** Skip WAF for specific trusted routes (e.g. internal cron) */
  skipWaf?: boolean;
  /** Validate browser Origins against the shared allowlist. Server/native callers with no Origin are allowed. */
  strictCors?: boolean;
  /** Persist suspicious network/VPN/proxy signals to network_security_events. */
  trackNetwork?: boolean | 'suspicious';
  /** Block requests whose header-derived network risk reaches this score. */
  blockNetworkRiskAt?: number;
  /** Skip browser-oriented bot detection for provider webhooks/internal callers. */
  skipBotDetection?: boolean;
}

export type SecuredHandler = (req: Request, ctx: SecurityContext) => Promise<Response>;

// Security headers added to every response (defence-in-depth at the edge layer).
const SECURITY_RESPONSE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options':            'nosniff',
  'X-Frame-Options':                   'DENY',
  'Referrer-Policy':                   'strict-origin-when-cross-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Resource-Policy':      'same-site',
  // Prevent caching of API responses
  'Cache-Control':                     'no-store, max-age=0',
  'Pragma':                            'no-cache',
};

function applySecurityHeaders(res: Response): void {
  for (const [k, v] of Object.entries(SECURITY_RESPONSE_HEADERS)) {
    if (!res.headers.has(k)) res.headers.set(k, v);
  }
}

// Bot detection now delegates to _shared/botDetection.ts (`detectBot`), which
// covers 17 scrapers + 15 scanner UAs and missing-UA. The richer ruleset
// supersedes the legacy SCANNER_UA regex that lived here.

export function withSecurity(
  route: string,
  handler: SecuredHandler,
  opts: SecurityOptions = {},
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const corsHeaders = resolveCorsHeaders(req, opts.strictCors);
    if (!corsHeaders) {
      const res = new Response(JSON.stringify({ error: 'Forbidden origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' },
      });
      applySecurityHeaders(res);
      return res;
    }
    if (req.method === 'OPTIONS') {
      if (opts.strictCors) return new Response(null, { status: 204, headers: corsHeaders });
      return preflight(req);
    }

    const correlationId = newCorrelationId(req);
    const ip = clientIp(req);
    const userAgent = req.headers.get('user-agent');
    const log = makeLogger({ correlationId, route, ip, method: req.method });
    const network = assessNetwork(req);
    const ctx: SecurityContext = { log, correlationId, ip, userAgent, route, startedAt: Date.now(), corsHeaders, network };

    // Header-derived VPN/proxy/datacenter signals. This intentionally does not
    // claim perfect VPN detection; it records useful edge metadata and can
    // optionally block very risky requests on sensitive endpoints.
    if (opts.trackNetwork && (opts.trackNetwork === true || network.riskScore > 0)) {
      const ipHash = ip ? await hashIp(ip) : null;
      recordNetworkEvent({
        route,
        ipHash,
        country: network.country,
        region: network.region,
        city: network.city,
        asn: network.asn,
        colo: network.colo,
        userAgent,
        requestId: correlationId,
        riskScore: network.riskScore,
        signals: network.signals,
        blocked: Boolean(opts.blockNetworkRiskAt && network.riskScore >= opts.blockNetworkRiskAt),
      }).catch(() => {});
    }

    if (opts.blockNetworkRiskAt && network.riskScore >= opts.blockNetworkRiskAt) {
      log.warn('network_risk_block', { score: network.riskScore, signals: network.signals });
      recordSecurityEvent({
        eventType: 'network.risk_block',
        severity: 'warn',
        ip,
        userAgent,
        route,
        blocked: true,
        data: { correlationId, riskScore: network.riskScore, signals: network.signals },
      }).catch(() => {});
      const res = err(req, 'Network risk too high', 403, { correlationId });
      applyCorsHeaders(res, corsHeaders);
      res.headers.set('x-request-id', correlationId);
      applySecurityHeaders(res);
      return res;
    }

    // 0) Hard-blocklist (admin-curated). One cached RPC, no body work on hit.
    if (ip && await isIpBlocked(ip)) {
      log.warn('ip_blocklist_hit', { ip });
      recordSecurityEvent({
        eventType: 'ip_blocklist.hit',
        severity: 'warn',
        ip,
        userAgent,
        route,
        blocked: true,
        data: { correlationId },
      }).catch(() => {});
      const res = err(req, 'Forbidden', 403, { correlationId });
      applyCorsHeaders(res, corsHeaders);
      res.headers.set('x-request-id', correlationId);
      applySecurityHeaders(res);
      return res;
    }

    // 1) Block scanner / scraper / missing-UA bots. We hard-block "scanner"
    //    (security tools) and "scraper" (curl/wget/python-requests/etc).
    //    "missing_accept" is a softer signal we let through here — it would
    //    false-positive on legitimate fetch() callers.
    if (!opts.skipBotDetection) {
      const bot = detectBot(req.headers);
      if (bot.isBot && (bot.reason === 'scanner' || bot.reason === 'scraper' || bot.reason === 'missing_ua')) {
        log.warn('bot_blocked', { reason: bot.reason, ua: bot.ua.slice(0, 80) });
        recordSecurityEvent({
          eventType: `bot.${bot.reason}`,
          severity: 'warn',
          ip,
          userAgent,
          route,
          blocked: true,
          data: { correlationId },
        }).catch(() => {});
        autoBlockIfHighThreat({ ip, reason: `bot_${bot.reason}_repeat` }).catch(() => {});
        const res = err(req, 'Forbidden', 403, { correlationId });
        applyCorsHeaders(res, corsHeaders);
        res.headers.set('x-request-id', correlationId);
        applySecurityHeaders(res);
        return res;
      }
    }

    // 2) WAF
    if (!opts.skipWaf) {
      const waf = await inspectRequest(req);
      if (!waf.ok) {
        log.warn('waf_block', { reason: waf.reason });
        recordSecurityEvent({
          eventType: `waf.${waf.reason}`,
          severity: 'warn',
          ip,
          userAgent,
          route,
          blocked: true,
          data: { method: req.method, url: req.url, correlationId },
        }).catch(() => {});
        autoBlockIfHighThreat({ ip, reason: `waf_${waf.reason}` }).catch(() => {});
        const res = err(req, 'Request blocked', 400, { correlationId });
        applyCorsHeaders(res, corsHeaders);
        res.headers.set('x-request-id', correlationId);
        applySecurityHeaders(res);
        return res;
      }
    }

    // 3) Rate limiting (per IP)
    if (opts.rateLimit && ip) {
      const rl = rateLimit(ip, opts.rateLimit);
      const rlHeaders = rateLimitHeaders(rl, opts.rateLimit);
      if (!rl.allowed) {
        log.warn('rate_limited', { category: opts.rateLimit, ip, retryAfter: rl.retryAfter });
        recordSecurityEvent({
          eventType: 'rate_limit.exceeded',
          severity: 'warn',
          ip,
          userAgent,
          route,
          blocked: true,
          data: { category: opts.rateLimit, correlationId },
        }).catch(() => {});
        const res = err(req, 'Too many requests', 429, { correlationId, retryAfter: rl.retryAfter });
        applyCorsHeaders(res, corsHeaders);
        res.headers.set('x-request-id', correlationId);
        for (const [k, v] of Object.entries(rlHeaders)) res.headers.set(k, v);
        applySecurityHeaders(res);
        return res;
      }
      // Attach rate-limit headers to the success path via ctx for handler use
      // (handlers can read ctx.log for details)
    }

    // 4) Run handler with timing + error capture
    try {
      const res = await handler(req, ctx);
      res.headers.set('x-request-id', correlationId);
      applySecurityHeaders(res);
      log.info('request_completed', { status: res.status, ms: Date.now() - ctx.startedAt });
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.error('request_failed', { error: message, ms: Date.now() - ctx.startedAt });
      const res = err(req, 'Internal error', 500, { correlationId });
      applyCorsHeaders(res, corsHeaders);
      res.headers.set('x-request-id', correlationId);
      applySecurityHeaders(res);
      return res;
    }
  };
}

function applyCorsHeaders(res: Response, corsHeaders: Record<string, string>): void {
  for (const [k, v] of Object.entries(corsHeaders)) {
    res.headers.set(k, v);
  }
}

function resolveCorsHeaders(req: Request, strict = false): Record<string, string> | null {
  if (!strict) return getCorsHeaders(req);
  const origin = req.headers.get('origin');
  if (!origin) {
    return {
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-request-id',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Vary': 'Origin',
    };
  }
  return strictCorsHeaders(req);
}

/**
 * URL Safety — domain allowlisting, link validation, and path sanitization
 * 
 * Prevents:
 * - Open redirect attacks via crafted partner links
 * - Path traversal via injected IDs in push notifications
 * - Phishing via unvalidated social/payment URLs from DB
 * - Protocol injection (javascript:, data:, vbscript:)
 */

/** 
 * Allowed partner domains for outbound redirects.
 * Add new partner domains here when onboarding new affiliates.
 */
const ALLOWED_PARTNER_DOMAINS: string[] = [
  // Travelpayouts network
  'aviasales.com',
  'tp.media',
  'tpo.li',
  'hotellook.com',
  'economybookings.com',
  'qeeq.com',
  'getrentacar.com',
  'kiwitaxi.com',
  'gettransfer.com',
  'intui.travel',
  'tiqets.com',
  'wegotrip.com',
  'ticketnetwork.com',
  'airalo.com',
  'drimsim.com',
  'yesim.app',
  'radicalstorage.com',
  'airhelp.com',
  'compensair.com',
  // Booking platforms
  'booking.com',
  'expedia.com',
  'hotels.com',
  // Duffel
  'duffel.com',
  'links.duffel.com',
  // Skyscanner
  'skyscanner.com',
  'skyscanner.net',
  // Insurance / extras
  'rentalcover.com',
  // ZIVO's own domains
  'zivosmedia.com',
  'myzivo.lovable.app',
];

/** Domains allowed for Stripe checkout redirects */
const ALLOWED_CHECKOUT_DOMAINS: string[] = [
  'checkout.stripe.com',
  'pay.stripe.com',
  'billing.stripe.com',
];

const ALLOWED_PAYPAL_CHECKOUT_DOMAINS: string[] = ['paypal.com'];
const ALLOWED_SQUARE_CHECKOUT_DOMAINS: string[] = ['square.link', 'squareup.com', 'squareupsandbox.com'];

/** Domains allowed for social media links from DB */
const ALLOWED_SOCIAL_DOMAINS: string[] = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'telegram.org',
  't.me',
  'telegram.me',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'linkedin.com',
  'wa.me',
  'whatsapp.com',
];

/** Domains allowed for payment links in chat */
const ALLOWED_PAYMENT_DOMAINS: string[] = [
  'checkout.stripe.com',
  'pay.stripe.com',
  'checkout.payway.com.kh',
  'bakong.nbc.gov.kh',
  'paypal.com',
  'paypal.me',
];

/** TLDs frequently abused for phishing — block by default */
const SUSPICIOUS_TLDS = new Set([
  '.zip', '.mov', '.country', '.kim', '.cricket', '.science', '.work',
  '.party', '.gq', '.cf', '.tk', '.ml', '.ga', '.top', '.xin', '.loan',
]);

/**
 * URL shorteners hide the real destination — heavily used in phishing.
 * We don't block them outright (legit uses exist), but surface them as suspicious.
 */
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'ow.ly', 'goo.gl', 'is.gd', 'buff.ly',
  'rebrand.ly', 'cutt.ly', 'lnkd.in', 'shorturl.at', 't.ly', 'rb.gy',
  'tiny.cc', 'soo.gd', 'clck.ru', 'shorte.st', 'adf.ly', 'bc.vc',
  'short.io', 'qr.ae', 's.id', 'v.gd',
]);

/**
 * ZIVO-owned hostnames — exact matches (and their subdomains) are trusted.
 */
const ZIVO_OWNED_HOSTS = ['zivosmedia.com', 'myzivo.lovable.app'];

/**
 * Hostnames protected against typosquatting — anything that's *similar but
 * not identical* to one of these is treated as an impersonation attempt and
 * blocked. Includes ZIVO-owned hosts plus brand-lookalike hosts ZIVO does
 * NOT own (e.g. hizivo.com from the dropped rebrand): those are never
 * trusted themselves, but near-matches of them (h1zivo.com, hiz1vo.com, …)
 * are unambiguous phishing.
 */
const ZIVO_PROTECTED_HOSTS = [...ZIVO_OWNED_HOSTS, 'hizivo.com'];

/**
 * Check if a URL uses a safe protocol (http/https only).
 * Blocks javascript:, data:, vbscript:, file:, etc.
 */
export function isSafeProtocol(url: string): boolean {
  // Browsers strip ASCII tabs/newlines and leading C0 control chars from a URL
  // before resolving its scheme, so "java\tscript:" and "\x01javascript:" still
  // execute. Strip those same characters before the prefix check — matching on
  // the raw string alone is trivially bypassed.
  // Intentional C0-control stripping before scheme validation.
  // eslint-disable-next-line no-control-regex
  const trimmed = url.replace(/[\u0000-\u001F\u007F]/g, '').trim().toLowerCase();
  const scheme = trimmed.match(/^([a-z][a-z\d+.-]*):/i)?.[1];
  if (scheme && !['http', 'https', 'mailto', 'tel', 'sms'].includes(scheme)) {
    return false;
  }
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('about:') ||
    trimmed.startsWith('chrome:') ||
    trimmed.startsWith('chrome-extension:')
  ) {
    return false;
  }
  return true;
}

/**
 * Detect punycode/IDN homograph attacks (e.g. xn--pple-43d.com mimicking apple.com).
 * Returns true if the hostname uses punycode encoding.
 */
export function isPunycodeHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().split('.').some(part => part.startsWith('xn--'));
  } catch {
    return false;
  }
}

/**
 * Detect URLs ending in suspicious TLDs commonly used for phishing.
 */
export function hasSuspiciousTld(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return Array.from(SUSPICIOUS_TLDS).some(tld => host.endsWith(tld));
  } catch {
    return false;
  }
}

/**
 * Detect URL shortener domains (bit.ly, tinyurl, t.co, etc.).
 * These hide the real destination and are heavily used in phishing.
 */
export function isUrlShortener(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return URL_SHORTENERS.has(host);
  } catch {
    return false;
  }
}

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

/**
 * Detect impersonation attempts of ZIVO-owned domains (e.g. h1zivo.com,
 * zivosrnedia.com, zivosmedia-login.example). Returns true if hostname is *close to* but not
 * equal to a known ZIVO host.
 */
export function isZivoTyposquat(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (ZIVO_OWNED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return false;
    return ZIVO_PROTECTED_HOSTS.some((own) => {
      const dist = levenshtein(host, own);
      return dist > 0 && dist <= 2;
    });
  } catch {
    return false;
  }
}

/**
 * Detect URLs that embed credentials (https://user:pass@host) — common phishing vector.
 */
export function hasEmbeddedCredentials(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.username.length > 0 || parsed.password.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validate a URL against an allowed domain list.
 */
function isAllowedDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    return allowedDomains.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Check if a URL points to an allowed partner domain.
 */
export function isAllowedPartnerUrl(url: string): boolean {
  return isAllowedDomain(url, ALLOWED_PARTNER_DOMAINS);
}

/**
 * Check if a URL is a valid Stripe checkout URL.
 * Used to validate server-returned checkout URLs before redirecting.
 */
export function isAllowedCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && !parsed.username
      && !parsed.password
      && isAllowedDomain(url, ALLOWED_CHECKOUT_DOMAINS);
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a Stripe-hosted URL (any *.stripe.com host, https only).
 * Used for server-returned Stripe Connect onboarding (account-link) URLs, which
 * resolve to connect.stripe.com — not the checkout hosts — so they're validated
 * before redirecting the owner. Accepts any Stripe-owned subdomain so a future
 * Stripe host change can't block a legitimate onboarding redirect.
 */
export function isAllowedStripeConnectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false;
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'stripe.com' || hostname.endsWith('.stripe.com');
  } catch {
    return false;
  }
}

function isAllowedHostedPaymentUrl(url: string, allowedDomains: string[]): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:'
      && !parsed.username
      && !parsed.password
      && isAllowedDomain(url, allowedDomains);
  } catch {
    return false;
  }
}

/** Check a server-returned PayPal approval URL before browser navigation. */
export function isAllowedPayPalCheckoutUrl(url: string): boolean {
  return isAllowedHostedPaymentUrl(url, ALLOWED_PAYPAL_CHECKOUT_DOMAINS);
}

/** Check a server-returned Square hosted payment link before browser navigation. */
export function isAllowedSquareCheckoutUrl(url: string): boolean {
  return isAllowedHostedPaymentUrl(url, ALLOWED_SQUARE_CHECKOUT_DOMAINS);
}

/**
 * Check if a URL is a valid social media link.
 * Used to validate DB-stored social URLs before rendering as <a href>.
 */
export function isAllowedSocialUrl(url: string): boolean {
  return isAllowedDomain(url, ALLOWED_SOCIAL_DOMAINS);
}

/**
 * Check if a URL is a valid payment link for chat.
 * Used to validate payment URLs before rendering QR codes or links.
 */
export function isAllowedPaymentUrl(url: string): boolean {
  return isAllowedDomain(url, ALLOWED_PAYMENT_DOMAINS);
}

/**
 * Sanitize a dynamic path segment (e.g. IDs from push notifications).
 * Only allows UUID-like strings and simple alphanumeric IDs.
 * Prevents path traversal (../../admin) and injection.
 */
export function sanitizePathSegment(value: string | undefined | null): string | null {
  if (!value) return null;
  
  const trimmed = value.trim();
  
  // Only allow: alphanumeric, hyphens, underscores (covers UUIDs and simple IDs)
  // Block: ../ ./ / \ and any special chars
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    console.warn('[urlSafety] Blocked suspicious path segment:', trimmed);
    return null;
  }
  
  // Max 128 chars for an ID
  if (trimmed.length > 128) return null;
  
  return trimmed;
}

/**
 * Build a safe internal navigation path from a base path and an ID.
 * Returns the fallback path if the ID is invalid.
 */
export function safeInternalPath(basePath: string, id: string | undefined | null, fallback: string): string {
  const safeId = sanitizePathSegment(id);
  if (!safeId) return fallback;
  return `${basePath}/${safeId}`;
}

/**
 * Sanitize partner name displayed in UI.
 * Prevents social engineering (e.g. name="Your Bank - Login Required")
 */
export function sanitizePartnerName(name: string): string {
  const cleaned = name
    .replace(/[<>"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
  
  return cleaned || 'Partner';
}

/**
 * Validate a URL from an external/untrusted source before rendering.
 * Returns the URL if safe, or null if blocked.
 */
export function validateExternalUrl(url: string | null | undefined, allowedDomains?: string[]): string | null {
  if (!url) return null;
  
  const trimmed = url.trim();
  if (!trimmed) return null;
  
  if (!isSafeProtocol(trimmed)) {
    console.warn('[urlSafety] Blocked unsafe protocol:', trimmed.slice(0, 30));
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.username || parsed.password) {
      return null;
    }
  } catch {
    return null;
  }
  
  // If domain allowlist provided, validate against it
  if (allowedDomains && !isAllowedDomain(trimmed, allowedDomains)) {
    console.warn('[urlSafety] Blocked URL not in allowlist:', trimmed.slice(0, 60));
    return null;
  }
  
  return trimmed;
}

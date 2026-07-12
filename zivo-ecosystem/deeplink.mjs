// @ts-check
/**
 * ZIVO Ecosystem — Allowlisted Deep-Link Contract (v1)
 *
 * Reference implementation of docs/ecosystem/ZIVO_ECOSYSTEM_DEEP_LINK_MATRIX.md §3.
 * Dependency-free, pure.
 *
 * Invariants (proven in tests):
 *  - Only allowlisted routes parse; everything else is rejected.
 *  - Every route has an action class: 'read-entity' | 'auth-callback' | 'capability-token'.
 *    There is NO 'financial'/'mutating' class — a link can never auto-pay, refund,
 *    transfer, approve a payout, change a role, open an unauthorized admin screen,
 *    or expose a secret.
 *  - read-entity links require authentication AND server-side ownership.
 *  - auth-callback requires a state/nonce; capability-token requires a token that a
 *    server verifier must accept (short-TTL, single-use).
 */

/** @typedef {'wallet'|'driver'|'travel'|'software'|'chat'|'media'|'admin'} Product */
/** @typedef {'read-entity'|'auth-callback'|'capability-token'} ActionClass */

/**
 * Allowlist: product -> [{ pattern, class }]. Patterns use :param segments.
 * @type {Record<Product, {pattern: string, class: ActionClass}[]>}
 */
export const ALLOWLIST = Object.freeze({
  wallet: [
    { pattern: '/app/wallet/transactions/:id', class: 'read-entity' },
    { pattern: '/auth/callback', class: 'auth-callback' },
  ],
  driver: [
    { pattern: '/trips/:id', class: 'read-entity' },
    { pattern: '/deliveries/:id', class: 'read-entity' },
    { pattern: '/auth/callback', class: 'auth-callback' },
  ],
  travel: [
    { pattern: '/bookings/:id', class: 'read-entity' },
    { pattern: '/auth/handoff', class: 'auth-callback' },
  ],
  software: [
    { pattern: '/orders/:id', class: 'read-entity' },
    { pattern: '/invoices/:id', class: 'read-entity' },
    { pattern: '/pay/:token', class: 'capability-token' },
  ],
  chat: [
    { pattern: '/conversations/:id', class: 'read-entity' },
    { pattern: '/media/:id', class: 'read-entity' },
    { pattern: '/connect/zivo', class: 'auth-callback' },
  ],
  media: [
    { pattern: '/p/:id', class: 'read-entity' },
    { pattern: '/u/:id', class: 'read-entity' },
    { pattern: '/reels/:id', class: 'read-entity' },
  ],
  admin: [
    { pattern: '/incidents/:id', class: 'read-entity' },
  ],
});

/** Intents a deep link may NEVER carry, regardless of allowlist match. */
export const FORBIDDEN_INTENTS = Object.freeze([
  'pay', 'autopay', 'charge', 'topup', 'refund', 'transfer', 'payout',
  'approve', 'release', 'role', 'grant', 'admin_write', 'reveal', 'secret',
]);

/**
 * @typedef {Object} ParsedLink
 * @property {Product} product
 * @property {string} pattern
 * @property {ActionClass} class
 * @property {Record<string,string>} params
 * @property {Record<string,string>} query
 */

/**
 * Parse a link "<product>:<path>?<query>". Rejects non-allowlisted routes and
 * any link whose path or query expresses a forbidden intent.
 * @param {Product} product
 * @param {string} path e.g. "/app/wallet/transactions/tx_123?ref=push"
 * @returns {ParsedLink}
 */
export function parseDeepLink(product, path) {
  const routes = ALLOWLIST[product];
  if (!routes) throw new Error(`unknown product: ${product}`);
  const [rawPath, rawQuery = ''] = String(path).split('?');
  const query = parseQuery(rawQuery);

  // The allowlist is the primary path gate (a route like /transfer/execute is
  // simply not present and is rejected below). The forbidden-intent scan is
  // defense-in-depth against an *injected action* in the query string
  // (e.g. ?intent=pay) — it must NOT inspect the path, or legitimate
  // allowlisted routes such as /pay/:token would false-positive.
  assertNoForbiddenIntent(query);

  for (const route of routes) {
    const params = matchPattern(route.pattern, rawPath);
    if (params) return { product, pattern: route.pattern, class: route.class, params, query };
  }
  throw new Error(`link not on allowlist: ${product}${rawPath}`);
}

/**
 * Authorize a parsed link for navigation. Returns true only when the class'
 * preconditions hold. A financial/mutating action can never reach here because
 * no such class exists in the allowlist.
 * @param {ParsedLink} link
 * @param {{authenticated: boolean, ownsEntity?: boolean, stateValid?: boolean, tokenVerified?: boolean}} ctx
 * @returns {boolean}
 */
export function authorizeDeepLink(link, ctx) {
  switch (link.class) {
    case 'read-entity':
      // must be logged in AND the server confirmed the caller owns/may read it
      return ctx.authenticated === true && ctx.ownsEntity === true;
    case 'auth-callback':
      // OAuth/SSO return: state/nonce must validate; PKCE handled by caller
      return ctx.stateValid === true;
    case 'capability-token':
      // opaque token must be accepted by a server verifier (short-TTL/single-use)
      return ctx.tokenVerified === true;
    default:
      return false;
  }
}

/** Scan only the query (keys + values) for an injected action intent. */
/** @param {Record<string,string>} query */
function assertNoForbiddenIntent(query) {
  const hay = (Object.keys(query).join(' ') + ' ' + Object.values(query).join(' ')).toLowerCase();
  for (const intent of FORBIDDEN_INTENTS) {
    if (hay.includes(intent)) {
      throw new Error(`deep link expresses a forbidden intent: ${intent}`);
    }
  }
}

/** @param {string} pattern @param {string} path @returns {Record<string,string>|null} */
function matchPattern(pattern, path) {
  const pp = pattern.split('/').filter(Boolean);
  const xp = path.split('/').filter(Boolean);
  if (pp.length !== xp.length) return null;
  /** @type {Record<string,string>} */
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      if (!xp[i]) return null;
      params[pp[i].slice(1)] = decodeURIComponent(xp[i]);
    } else if (pp[i] !== xp[i]) {
      return null;
    }
  }
  return params;
}

/** @param {string} raw @returns {Record<string,string>} */
function parseQuery(raw) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return out;
}

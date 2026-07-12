// @ts-check
/**
 * ZIVO Ecosystem — Canonical Identity & Account-Linking Contract (v1)
 *
 * Reference implementation of the shared identity contract from
 * docs/ecosystem/ZIVO_ECOSYSTEM_IDENTITY_CONTRACT.md. Dependency-free ESM so it
 * runs identically under Next (Wallet), Vite (Driver/Media/Software/Travel/Chat),
 * and Deno edge functions. Pure — no I/O, no live auth calls.
 *
 * Invariants encoded here (proven in zivo-ecosystem.test.mjs):
 *  - A person's canonical subject is NEVER derived from email alone.
 *  - Cross-app resolution requires an explicit VERIFIED, non-revoked link.
 *  - No silent merge: linking is an explicit state machine with consent.
 *  - Product-local UUIDs are never treated as the canonical subject.
 */

/** @typedef {'wallet'|'driver'|'travel'|'software'|'chat'|'media'|'admin'} Product */
/** @typedef {'unlinked'|'pending'|'verified'|'revoked'} LinkState */
/** @typedef {'admin'|'staff'|'merchant'|'driver'|'customer'|'user'|'moderator'} ZivoRole */

export const PRODUCTS = /** @type {Product[]} */ ([
  'wallet', 'driver', 'travel', 'software', 'chat', 'media', 'admin',
]);

/** The canonical subject key. Never a product-local auth.users.id. */
export const CANONICAL_SUBJECT_KEY = 'zivo_user_id';

/** Supabase project ref per product (from the Run 5 environment matrix). */
export const PRODUCT_PROJECT_REF = Object.freeze({
  wallet: 'kcflqpfiuwcclkcctuji',
  driver: 'yiedlgoxwjmansszdypf',
  media: 'slirphzzwcogdbkeicff',
  software: 'ydxztoresbdeoeijhxww',
  travel: 'xbllvmpomorawkcrtbcq',
  chat: 'slirphzzwcogdbkeicff',
  admin: 'wtdlbzgryuelpylijnkd',
});

/**
 * Product-local role -> canonical ZivoRole. Encodes the "same word, different
 * authority" reconciliation from the identity contract (§3, §5).
 * @type {Record<Product, Record<string, ZivoRole>>}
 */
export const ROLE_MAP = Object.freeze({
  wallet:   { admin: 'admin', merchant: 'merchant', driver: 'driver', customer: 'customer' },
  driver:   { admin: 'admin', moderator: 'moderator', user: 'user', driver: 'driver', merchant: 'merchant', customer: 'customer' },
  media:    { admin: 'admin', moderator: 'moderator', user: 'user' },
  software: { admin: 'admin', owner: 'merchant', staff: 'staff' },
  chat:     { admin: 'admin', user: 'user' },
  travel:   { user: 'user' },
  admin:    { admin: 'admin', staff: 'staff' },
});

/** Only Software has a real tenant boundary today (store); others are single-tenant. */
export const TENANT_MODEL = Object.freeze({
  wallet: 'single', driver: 'per-user', media: 'per-user', software: 'store',
  travel: 'none', chat: 'per-user', admin: 'platform',
});

/**
 * @param {Product} product
 * @param {string} productLocalRole
 * @returns {ZivoRole|null}
 */
export function mapProductRole(product, productLocalRole) {
  const table = ROLE_MAP[product] || {};
  return table[productLocalRole] || null;
}

/**
 * A verified account link between a canonical subject and a product-local user.
 * @typedef {Object} AccountLink
 * @property {string} zivo_user_id      canonical subject (IdP sub)
 * @property {Product} product
 * @property {string} product_user_id   product-local auth.users.id
 * @property {LinkState} state
 * @property {'sso_pkce'|'otp'|'admin_grant'|null} verified_by  non-email proof
 * @property {number} updated_at
 */

const LINK_TRANSITIONS = Object.freeze({
  unlinked: ['pending'],
  pending: ['verified', 'revoked', 'unlinked'],
  verified: ['revoked'],
  revoked: ['pending'], // re-linking must start over with a fresh challenge
});

/** Proof methods that count as verification. Email membership is NOT here. */
export const VERIFICATION_METHODS = Object.freeze(['sso_pkce', 'otp', 'admin_grant']);

/**
 * Begin a link (explicit user-initiated). Produces a pending link that carries
 * no authority until verified. Never merges accounts.
 * @param {string} zivo_user_id
 * @param {Product} product
 * @param {string} product_user_id
 * @param {number} now
 * @returns {AccountLink}
 */
export function beginLink(zivo_user_id, product, product_user_id, now) {
  if (!zivo_user_id || !product_user_id) throw new Error('link requires both subjects');
  return { zivo_user_id, product, product_user_id, state: 'pending', verified_by: null, updated_at: now };
}

/**
 * Verify a pending link with a NON-EMAIL proof. Rejects email-only proofs and
 * any transition that is not allowed by the state machine (no silent merge).
 * @param {AccountLink} link
 * @param {{method: string, matchesEmailOnly?: boolean}} proof
 * @param {number} now
 * @returns {AccountLink}
 */
export function verifyLink(link, proof, now) {
  assertTransition(link.state, 'verified');
  if (proof.matchesEmailOnly === true || !VERIFICATION_METHODS.includes(proof.method)) {
    throw new Error('email/heuristic match is not sufficient to verify a link');
  }
  return { ...link, state: 'verified', verified_by: /** @type {any} */ (proof.method), updated_at: now };
}

/** @param {AccountLink} link @param {number} now @returns {AccountLink} */
export function revokeLink(link, now) {
  assertTransition(link.state, 'revoked');
  return { ...link, state: 'revoked', verified_by: null, updated_at: now };
}

/**
 * Resolve the canonical subject a product may act on for a given product-local
 * user — ONLY through a verified, non-revoked link. Returns null otherwise.
 * This is the single gate every cross-app handoff must pass.
 * @param {AccountLink[]} links
 * @param {Product} product
 * @param {string} product_user_id
 * @returns {string|null}
 */
export function resolveCanonicalSubject(links, product, product_user_id) {
  const hit = links.find(
    (l) => l.product === product && l.product_user_id === product_user_id && l.state === 'verified'
  );
  return hit ? hit.zivo_user_id : null;
}

/**
 * Guard: email alone is never sufficient to establish identity. Always throws.
 * Present so callers cannot accidentally take an email shortcut.
 * @returns {never}
 */
export function canonicalFromEmail() {
  throw new Error('email is not an identity: use a verified AccountLink');
}

/** @param {LinkState} from @param {LinkState} to */
function assertTransition(from, to) {
  const allowed = LINK_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) throw new Error(`illegal link transition ${from} -> ${to}`);
}

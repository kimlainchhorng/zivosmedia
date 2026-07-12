// @ts-check
/**
 * ZIVO Ecosystem — Versioned Event & Correlation Contract (v1)
 *
 * Reference implementation of the envelope from
 * docs/ecosystem/ZIVO_ECOSYSTEM_EVENT_CATALOG.md §3. Dependency-free, pure.
 *
 * Invariants (proven in tests):
 *  - Every cross-app event carries id/type/version/producer/subject/actor/
 *    tenant/correlation/causation/safe_metadata.
 *  - Financial events MUST carry a correlation_id and an idempotency key
 *    (event_id doubles as it).
 *  - safe_metadata may never contain secrets, card/bank data, session tokens,
 *    raw identity docs, or a full provider payload.
 *  - Financial finalization stays provider-verified in Wallet — this contract
 *    transports only SAFE, already-finalized facts, never a charge instruction.
 */

/** @typedef {'wallet'|'driver'|'travel'|'software'|'chat'|'media'|'admin'} Producer */

export const EVENT_VERSION = 1;

/** Event types that carry money semantics and require correlation + idempotency. */
export const FINANCIAL_EVENT_PREFIXES = Object.freeze([
  'payment.', 'refund.', 'transfer.', 'payout.', 'wallet.', 'invoice.', 'ledger.',
]);

/** Keys that must never appear in safe_metadata (case-insensitive substring). */
const FORBIDDEN_META_KEYS = Object.freeze([
  'secret', 'password', 'token', 'authorization', 'apikey', 'api_key',
  'service_role', 'client_secret', 'pan', 'card', 'cardnumber', 'cvv', 'cvc',
  'iban', 'account_number', 'routing', 'ssn', 'passport', 'session', 'cookie',
  'raw_payload', 'provider_payload', 'stripe_object', 'private_key',
]);

/** Values matching these shapes are rejected wherever they appear in metadata. */
const FORBIDDEN_VALUE_PATTERNS = Object.freeze([
  /\bsk_(live|test)_[A-Za-z0-9]+/,      // Stripe secret key
  /\bwhsec_[A-Za-z0-9]+/,               // Stripe webhook secret
  /\beyJ[A-Za-z0-9_-]{10,}\./,          // JWT
  /\b(?:\d[ -]?){13,19}\b/,             // PAN-like
  /\bservice_role\b/,
]);

/**
 * @typedef {Object} ZivoEvent
 * @property {string} event_id
 * @property {string} event_type
 * @property {number} event_version
 * @property {string} occurred_at    RFC3339
 * @property {Producer} producer
 * @property {string} subject_type
 * @property {string} subject_id
 * @property {string} actor_id       canonical zivo_user_id
 * @property {string|null} tenant_id
 * @property {string} correlation_id
 * @property {string|null} causation_id
 * @property {Record<string, unknown>} safe_metadata
 */

/** @param {string} type */
export function isFinancialEvent(type) {
  return FINANCIAL_EVENT_PREFIXES.some((p) => String(type).startsWith(p));
}

/**
 * Build a validated event envelope. Throws if any invariant is violated.
 * @param {Omit<ZivoEvent,'event_version'> & {event_version?: number}} input
 * @returns {ZivoEvent}
 */
export function makeEvent(input) {
  /** @type {ZivoEvent} */
  const ev = { event_version: EVENT_VERSION, ...input };
  const errors = validateEvent(ev);
  if (errors.length) throw new Error('invalid event: ' + errors.join('; '));
  return ev;
}

/**
 * @param {ZivoEvent} ev
 * @returns {string[]} list of validation errors (empty = valid)
 */
export function validateEvent(ev) {
  const errors = [];
  const required = [
    'event_id', 'event_type', 'event_version', 'occurred_at', 'producer',
    'subject_type', 'subject_id', 'actor_id', 'correlation_id', 'safe_metadata',
  ];
  for (const k of required) {
    if (ev[k] === undefined || ev[k] === null || ev[k] === '') errors.push(`missing ${k}`);
  }
  if (!('tenant_id' in ev)) errors.push('missing tenant_id (may be null)');
  if (!('causation_id' in ev)) errors.push('missing causation_id (may be null)');
  if (ev.event_version !== EVENT_VERSION) errors.push('unsupported event_version');
  if (isFinancialEvent(ev.event_type)) {
    if (!ev.correlation_id) errors.push('financial event requires correlation_id');
    if (!ev.event_id) errors.push('financial event requires event_id (idempotency key)');
  }
  const unsafe = findUnsafe(ev.safe_metadata || {});
  if (unsafe) errors.push(`unsafe metadata: ${unsafe}`);
  return errors;
}

/**
 * Return a copy of metadata with any forbidden keys/values removed.
 * @param {Record<string, unknown>} meta
 * @returns {Record<string, unknown>}
 */
export function redactMetadata(meta) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(meta || {})) {
    if (keyForbidden(k)) continue;
    if (typeof v === 'string' && valueForbidden(v)) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v)
      ? redactMetadata(/** @type {any} */ (v))
      : v;
  }
  return out;
}

/** @param {Record<string, unknown>} meta @returns {string|null} first offending path or null */
function findUnsafe(meta, prefix = '') {
  for (const [k, v] of Object.entries(meta || {})) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (keyForbidden(k)) return path;
    if (typeof v === 'string' && valueForbidden(v)) return path;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = findUnsafe(/** @type {any} */ (v), path);
      if (nested) return nested;
    }
  }
  return null;
}

/** @param {string} k */
function keyForbidden(k) {
  const low = String(k).toLowerCase();
  return FORBIDDEN_META_KEYS.some((f) => low.includes(f));
}
/** @param {string} v */
function valueForbidden(v) {
  return FORBIDDEN_VALUE_PATTERNS.some((re) => re.test(v));
}

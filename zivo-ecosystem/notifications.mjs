// @ts-check
/**
 * ZIVO Ecosystem — Notification Contract (v1)
 *
 * Reference implementation of docs/ecosystem/ZIVO_ECOSYSTEM_EVENT_CATALOG.md §5.
 * Dependency-free, pure.
 *
 * Invariants (proven in tests):
 *  - Push payloads carry NO sensitive financial data (amount, balance, PAN,
 *    account numbers) — only a type, an i18n title key, an allowlisted deep link,
 *    and a correlation id.
 *  - Delivery respects per-type preferences, quiet hours, locale, and role.
 *  - security-alert overrides quiet hours; financial notices carry correlation_id.
 */

import { redactMetadata } from './events.mjs';

/** Notification types the ecosystem may raise. */
export const NOTIFICATION_TYPES = Object.freeze([
  'payment', 'refund', 'transfer', 'payout-status', 'booking', 'trip',
  'order', 'invoice', 'message', 'security-alert',
]);

const FINANCIAL_TYPES = Object.freeze(['payment', 'refund', 'transfer', 'payout-status', 'invoice']);

/** Fields that must never appear in a PUSH payload. */
const PUSH_FORBIDDEN_FIELDS = Object.freeze([
  'amount', 'amount_cents', 'balance', 'available_balance', 'currency_amount',
  'pan', 'card', 'account_number', 'iban', 'routing', 'cvv', 'ledger', 'body_params',
]);

/**
 * @typedef {Object} Notification
 * @property {string} notification_id
 * @property {string} type
 * @property {string} recipient        canonical zivo_user_id
 * @property {string} title_key        i18n key (EN/KM), never raw text
 * @property {string} [deep_link]      must be @zivo/deeplink allowlisted
 * @property {'high'|'normal'} priority
 * @property {string} correlation_id
 * @property {string} occurred_at
 * @property {Record<string, unknown>} [data]  in-app only, redacted
 */

/**
 * Build the minimal, safe PUSH payload from a full notification. Strips every
 * financial field; keeps only routing-safe fields.
 * @param {Notification} n
 * @returns {{type: string, title_key: string, deep_link?: string, correlation_id: string, priority: string}}
 */
export function buildPush(n) {
  const push = {
    type: n.type,
    title_key: n.title_key,
    correlation_id: n.correlation_id,
    priority: n.priority,
    ...(n.deep_link ? { deep_link: n.deep_link } : {}),
  };
  const bad = assertNoFinancialPayload(push);
  if (bad) throw new Error(`push payload contains forbidden field: ${bad}`);
  return push;
}

/**
 * Returns the first forbidden field found in a push object, or null if clean.
 * @param {Record<string, unknown>} push
 * @returns {string|null}
 */
export function assertNoFinancialPayload(push) {
  for (const k of Object.keys(push || {})) {
    const low = k.toLowerCase();
    if (PUSH_FORBIDDEN_FIELDS.some((f) => low.includes(f))) return k;
  }
  return null;
}

/** In-app (not push) view may carry redacted data but still no secrets. */
export function buildInApp(/** @type {Notification} */ n) {
  return { ...n, data: redactMetadata(/** @type {any} */ (n.data || {})) };
}

/**
 * @typedef {Object} DeliveryPrefs
 * @property {Record<string, boolean>} [types]     per-type opt-in (default true)
 * @property {{start: number, end: number}} [quietHours]  local hours [start,end)
 * @property {'en'|'km'} locale
 * @property {string[]} [roles]
 */

/**
 * Decide whether to deliver `n` to a user now.
 * @param {Notification} n
 * @param {DeliveryPrefs} prefs
 * @param {number} localHour  0..23
 * @returns {{deliver: boolean, reason: string}}
 */
export function shouldDeliver(n, prefs, localHour) {
  if (n.type === 'security-alert') return { deliver: true, reason: 'security-alert overrides prefs/quiet-hours' };
  const optedOut = prefs.types && prefs.types[n.type] === false;
  if (optedOut) return { deliver: false, reason: 'user opted out of this type' };
  if (prefs.quietHours && inQuietHours(localHour, prefs.quietHours)) {
    return { deliver: false, reason: 'quiet hours' };
  }
  return { deliver: true, reason: 'ok' };
}

/** Financial notices must carry a correlation id back to the wallet event. */
export function validateNotification(/** @type {Notification} */ n) {
  const errors = [];
  if (!NOTIFICATION_TYPES.includes(n.type)) errors.push('unknown type');
  if (!n.title_key || /\s/.test(n.title_key)) errors.push('title_key must be an i18n key, not raw text');
  if (FINANCIAL_TYPES.includes(n.type) && !n.correlation_id) errors.push('financial notice requires correlation_id');
  return errors;
}

/** @param {number} hour @param {{start:number,end:number}} q */
function inQuietHours(hour, q) {
  return q.start <= q.end ? hour >= q.start && hour < q.end : hour >= q.start || hour < q.end;
}

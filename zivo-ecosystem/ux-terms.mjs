// @ts-check
/**
 * ZIVO Ecosystem — Shared UX States & EN/KM Financial Terminology (v1)
 *
 * Standardizes the cross-app UX state vocabulary and the bilingual financial
 * glossary, including the load-bearing transfer vs. payout distinction.
 * Dependency-free, pure. English/Khmer parity is enforced in tests.
 */

/** Canonical UX states every product surface must implement consistently. */
export const UX_STATES = Object.freeze([
  'loading', 'empty', 'error', 'offline', 'permission_denied', 'maintenance',
]);

/**
 * Bilingual financial glossary. `distinct` marks terms that MUST NOT be
 * conflated in copy or code.
 * @type {Record<string, {en: string, km: string, note?: string, distinct?: string}>}
 */
export const FINANCIAL_TERMS = Object.freeze({
  // Internal, wallet-to-wallet movement of ZIVO balance — never leaves ZIVO.
  transfer: {
    en: 'Transfer',
    km: 'ផ្ទេរប្រាក់',
    note: 'wallet-to-wallet movement inside ZIVO; not a bank disbursement',
    distinct: 'payout',
  },
  // Money leaving ZIVO to an external bank / card / Stripe Connect account.
  payout: {
    en: 'Payout',
    km: 'ការទូទាត់ចេញ',
    note: 'disbursement of funds OUT of ZIVO to an external account',
    distinct: 'transfer',
  },
  topup: { en: 'Top up', km: 'បញ្ចូលប្រាក់' },
  payment: { en: 'Payment', km: 'ការទូទាត់' },
  refund: { en: 'Refund', km: 'ការសងប្រាក់វិញ' },
  balance: { en: 'Balance', km: 'សមតុល្យ' },
  available_balance: { en: 'Available balance', km: 'សមតុល្យអាចប្រើបាន' },
  pending_balance: { en: 'Pending balance', km: 'សមតុល្យកំពុងរង់ចាំ' },
  ledger: { en: 'Ledger', km: 'បញ្ជីគណនេយ្យ' },
  fee: { en: 'Fee', km: 'កម្រៃ' },
  invoice: { en: 'Invoice', km: 'វិក្កយបត្រ' },
  dispute: { en: 'Dispute', km: 'ការជំទាស់' },
});

/** UX-state copy in both languages. */
export const UX_STATE_COPY = Object.freeze({
  loading:           { en: 'Loading…', km: 'កំពុងផ្ទុក…' },
  empty:             { en: 'Nothing here yet', km: 'មិនទាន់មានអ្វីនៅឡើយ' },
  error:             { en: 'Something went wrong', km: 'មានបញ្ហាកើតឡើង' },
  offline:           { en: "You're offline", km: 'អ្នកកំពុងនៅក្រៅបណ្ដាញ' },
  permission_denied: { en: 'You do not have access', km: 'អ្នកមិនមានសិទ្ធិចូលប្រើ' },
  maintenance:       { en: 'Under maintenance', km: 'កំពុងផ្អាកដើម្បីថែទាំ' },
});

/**
 * True iff `a` and `b` are terms that must be kept distinct (transfer/payout).
 * @param {string} a @param {string} b
 */
export function areDistinct(a, b) {
  const ta = FINANCIAL_TERMS[a];
  return !!ta && ta.distinct === b;
}

/** @param {'en'|'km'} locale @param {string} termKey */
export function term(locale, termKey) {
  const t = FINANCIAL_TERMS[termKey];
  if (!t) throw new Error(`unknown financial term: ${termKey}`);
  return t[locale];
}

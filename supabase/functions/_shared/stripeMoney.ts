/**
 * Stripe minor units for Edge Functions.
 *
 * Stripe amounts are integers in the currency's smallest unit, and the number
 * of decimals is a property of the currency, not a display choice. Most are
 * 2-decimal ($1.00 -> 100), zero-decimal currencies take the amount unscaled
 * (¥5,000 -> 5000), and a few are three-decimal.
 *
 * Multiplying by 100 unconditionally overcharges a zero-decimal customer by
 * 100x. Keep this aligned with the browser copy in `src/lib/currency.ts`.
 *
 * Source: https://docs.stripe.com/currencies#zero-decimal
 */

export const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KHR", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export const STRIPE_THREE_DECIMAL_CURRENCIES = new Set([
  "BHD", "JOD", "KWD", "OMR", "TND",
]);

/** Decimal exponent Stripe uses: minorUnits = amount * 10^exponent. */
export function getStripeCurrencyExponent(currencyCode: string): number {
  const code = normalizeCurrencyCode(currencyCode);
  if (STRIPE_ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (STRIPE_THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

/** Human amount -> the integer to send as Stripe's `amount`. */
export function toStripeMinorUnits(amount: number, currencyCode: string): number {
  const safe = Number.isFinite(amount) ? amount : 0;
  return Math.round(safe * 10 ** getStripeCurrencyExponent(currencyCode));
}

/** Stripe `amount` integer -> human amount. */
export function fromStripeMinorUnits(minorUnits: number, currencyCode: string): number {
  const safe = Number.isFinite(minorUnits) ? minorUnits : 0;
  return safe / 10 ** getStripeCurrencyExponent(currencyCode);
}

export function normalizeCurrencyCode(currencyCode: string): string {
  return String(currencyCode ?? "").trim().toUpperCase();
}

/** True for a well-formed ISO 4217 alpha code. */
export function isValidCurrencyCode(currencyCode: string): boolean {
  return /^[A-Z]{3}$/.test(normalizeCurrencyCode(currencyCode));
}

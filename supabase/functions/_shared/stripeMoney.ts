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

/**
 * Format a Stripe minor-unit integer for a customer-facing string, honouring
 * the currency's own decimals.
 *
 * Notifications used to interpolate `$${(amount / 100).toFixed(2)}`, which
 * prints a dollar sign on a non-USD charge and shows a zero-decimal amount as
 * a hundredth of itself. Pass the amount exactly as Stripe holds it, together
 * with the object's own `currency` field.
 */
export function formatStripeAmount(minorUnits: number, currencyCode: string): string {
  const code = normalizeCurrencyCode(currencyCode) || "USD";
  const value = fromStripeMinorUnits(minorUnits, code);

  // Default currencyDisplay, never "narrowSymbol": the narrow form renders
  // CAD, SGD, HKD, AUD and NZD as a bare "$" in en-US.
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(value);
  } catch {
    const digits = getStripeCurrencyExponent(code) === 0 ? 0 : 2;
    return `${code} ${value.toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })}`;
  }
}

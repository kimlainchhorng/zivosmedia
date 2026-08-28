/**
 * ZIVO Currency Utilities
 * Formatting and conversion functions for global currency support
 */

import { getCurrencyConfig, FALLBACK_RATES, type CurrencyConfig } from "@/config/currencies";

export type ExchangeRates = Record<string, number>;

/**
 * Riel per USD for ZIVO's own Cambodia pricing.
 *
 * Distinct from `FALLBACK_RATES.KHR`, which is the generic multi-currency
 * display fallback for the storefront. This constant is the rate at which
 * operator-set Riel prices become the USD figure ZIVO actually charges, so it
 * has to match what the rest of the ecosystem uses.
 *
 * It did not. `useCityPricing` and the lodging deposit field each carried
 * 4062.5 while the rest of the ecosystem was pinned to 4100.
 * Grocery delivery is priced from Riel figures an operator sets (1000៛ base,
 * 900៛/km, 3000៛ minimum), so a stale divisor meant the USD charged did not
 * represent the Riel price that was set: a 3000៛ minimum was billed as $0.74
 * rather than $0.73.
 *
 * Cross-repo constraint: `Zivo-Admin/scripts/check-ride-ecosystem-contracts.mjs`
 * asserts this equals the rate in the rider, driver, and admin apps.
 */
export const KHR_PER_USD = 4100;

/**
 * Format a price with proper locale-aware formatting
 * @param amount - The amount to format
 * @param currencyCode - Currency code (e.g., 'USD', 'EUR')
 * @returns Formatted price string (e.g., "$1,234.56", "€1.234,56", "¥12,345")
 */
export function formatPrice(amount: number, currencyCode: string = "USD"): string {
  const config = getCurrencyConfig(currencyCode);
  
  try {
    // Use Intl.NumberFormat for locale-aware formatting
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  } catch {
    // Fallback formatting
    const formatted = amount.toFixed(config.decimals);
    return `${config.symbol}${formatted}`;
  }
}

/**
 * Format price with explicit symbol placement (for custom layouts)
 * @returns Object with symbol and formatted number separately
 */
export function formatPriceParts(amount: number, currencyCode: string = "USD"): {
  symbol: string;
  amount: string;
  formatted: string;
} {
  const config = getCurrencyConfig(currencyCode);
  
  try {
    const parts = new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.code,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).formatToParts(amount);
    
    const symbol = parts.find(p => p.type === "currency")?.value || config.symbol;
    const amountPart = parts
      .filter(p => !["currency", "literal"].includes(p.type))
      .map(p => p.value)
      .join("");
    
    return {
      symbol,
      amount: amountPart,
      formatted: formatPrice(amount, currencyCode),
    };
  } catch {
    return {
      symbol: config.symbol,
      amount: amount.toFixed(config.decimals),
      formatted: `${config.symbol}${amount.toFixed(config.decimals)}`,
    };
  }
}

/**
 * Convert a price from one currency to another
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code (usually USD)
 * @param toCurrency - Target currency code
 * @param rates - Exchange rates object (relative to USD)
 * @returns Converted amount
 */
export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates = FALLBACK_RATES
): number {
  if (fromCurrency === toCurrency) return amount;
  
  // Get rates (relative to USD)
  const fromRate = rates[fromCurrency] || 1;
  const toRate = rates[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Convert and format a price in one call
 */
export function formatConvertedPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates = FALLBACK_RATES
): string {
  const converted = convertPrice(amount, fromCurrency, toCurrency, rates);
  return formatPrice(converted, toCurrency);
}

/**
 * Get formatted price with conversion note if applicable
 */
export function getPriceDisplay(
  amount: number,
  baseCurrency: string,
  displayCurrency: string,
  rates: ExchangeRates = FALLBACK_RATES
): {
  formatted: string;
  wasConverted: boolean;
  originalCurrency: string;
} {
  const wasConverted = baseCurrency !== displayCurrency;
  const displayAmount = wasConverted
    ? convertPrice(amount, baseCurrency, displayCurrency, rates)
    : amount;

  return {
    formatted: formatPrice(displayAmount, displayCurrency),
    wasConverted,
    originalCurrency: baseCurrency,
  };
}

/**
 * Parse a formatted price string back to number
 * Useful for input fields
 */
export function parsePrice(formattedPrice: string): number {
  // Remove everything except digits, dots, and commas
  const cleaned = formattedPrice.replace(/[^\d.,]/g, "");
  
  // Handle European format (1.234,56) vs US format (1,234.56)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Check which comes last
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    
    if (lastComma > lastDot) {
      // European format: 1.234,56
      return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    } else {
      // US format: 1,234.56
      return parseFloat(cleaned.replace(/,/g, ""));
    }
  } else if (cleaned.includes(",")) {
    // Could be European decimal or US thousands
    // If comma is in last 3 positions and has 2 digits after, treat as decimal
    const parts = cleaned.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(cleaned.replace(",", "."));
    }
    return parseFloat(cleaned.replace(/,/g, ""));
  }
  
  return parseFloat(cleaned) || 0;
}

/* ------------------------------------------------------------------ *
 * Stripe minor units
 *
 * Stripe amounts are integers in the currency's *smallest unit*, and the
 * number of decimals is a wire-format fact about the currency, not a display
 * preference. Most currencies are 2-decimal ($1.00 -> 100), but zero-decimal
 * currencies take the amount unscaled (¥5,000 -> 5000) and a handful are
 * three-decimal.
 *
 * Deliberately independent of `SUPPORTED_CURRENCIES[].decimals`, which is a
 * *display* convention for the storefront and covers only the ~45 currencies
 * ZIVO lists. Supplier-priced flows (Duffel offers, partner car rental
 * sessions) can hand us a currency outside that list, and
 * `getCurrencyConfig()` silently falls back to USD — which would print "$" on
 * a non-USD fare. These helpers never fall back to a different currency.
 *
 * Source: https://docs.stripe.com/currencies#zero-decimal
 * ------------------------------------------------------------------ */

/** Currencies Stripe treats as having no minor unit. */
export const STRIPE_ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KHR", "KMF", "KRW", "MGA",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

/** Currencies Stripe charges in thousandths (amounts must be a multiple of 10). */
export const STRIPE_THREE_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  "BHD", "JOD", "KWD", "OMR", "TND",
]);

/**
 * Decimal exponent Stripe uses for a currency: minorUnits = amount * 10^exponent.
 */
export function getStripeCurrencyExponent(currencyCode: string): number {
  const code = (currencyCode || "USD").toUpperCase();
  if (STRIPE_ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (STRIPE_THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

/**
 * Convert a Stripe minor-unit integer to the human amount.
 * `fromStripeMinorUnits(5000, "JPY")` is 5000, not 50.
 */
export function fromStripeMinorUnits(minorUnits: number, currencyCode: string): number {
  const safe = Number.isFinite(minorUnits) ? minorUnits : 0;
  return safe / 10 ** getStripeCurrencyExponent(currencyCode);
}

/**
 * Convert a human amount to the Stripe minor-unit integer to charge.
 * `toStripeMinorUnits(5000, "JPY")` is 5000, not 500000.
 */
export function toStripeMinorUnits(amount: number, currencyCode: string): number {
  const safe = Number.isFinite(amount) ? amount : 0;
  return Math.round(safe * 10 ** getStripeCurrencyExponent(currencyCode));
}

/**
 * Format a Stripe minor-unit integer for display, honouring the currency's own
 * decimals. Unknown/invalid codes fall back to `CODE 1,234.56` rather than
 * borrowing another currency's symbol.
 */
export function formatStripeAmount(minorUnits: number, currencyCode: string): string {
  const code = (currencyCode || "USD").toUpperCase();
  const value = fromStripeMinorUnits(minorUnits, code);

  // Deliberately the default `currencyDisplay`, not "narrowSymbol": the narrow
  // form renders CAD, SGD, HKD, AUD and NZD as a bare "$" in en-US, which is
  // the ambiguity these helpers exist to remove. The default disambiguates
  // them as CA$, SGD, HK$, A$, NZ$.
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

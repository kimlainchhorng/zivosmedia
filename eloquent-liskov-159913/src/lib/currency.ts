/**
 * ZIVO Currency Utilities
 * Formatting and conversion functions for global currency support
 */

import { getCurrencyConfig, FALLBACK_RATES, type CurrencyConfig } from "@/config/currencies";

export type ExchangeRates = Record<string, number>;

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

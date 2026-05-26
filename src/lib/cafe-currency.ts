/**
 * Cafe currency formatting. The DB stores per-store currency_code (ISO 4217)
 * and amounts in the smallest unit ("cents"). For currencies with zero
 * decimals (JPY, KHR, VND, etc) we treat the smallest unit as 1 of the
 * currency, so 4500 stored = 4500 KHR, not 45.00.
 *
 * Use formatCafeMoney(cents, code) anywhere the public-facing pages render
 * a price. Admin views stay USD-default for now; sweep separately.
 */

interface CurrencyInfo {
  symbol: string;
  // Number of decimal places this currency uses (the "minor unit" exponent).
  decimals: number;
  // If true, render symbol after the amount with a thin space (e.g. "25 €").
  // We default to "symbol-before" which is the dominant western convention.
  symbolAfter?: boolean;
}

const CURRENCY_INFO: Record<string, CurrencyInfo> = {
  USD: { symbol: "$", decimals: 2 },
  EUR: { symbol: "€", decimals: 2 },
  GBP: { symbol: "£", decimals: 2 },
  JPY: { symbol: "¥", decimals: 0 },
  CNY: { symbol: "¥", decimals: 2 },
  KHR: { symbol: "៛", decimals: 0, symbolAfter: true },
  THB: { symbol: "฿", decimals: 2 },
  VND: { symbol: "₫", decimals: 0, symbolAfter: true },
  PHP: { symbol: "₱", decimals: 2 },
  MYR: { symbol: "RM", decimals: 2 },
  SGD: { symbol: "S$", decimals: 2 },
  IDR: { symbol: "Rp", decimals: 0 },
  CAD: { symbol: "CA$", decimals: 2 },
  AUD: { symbol: "A$", decimals: 2 },
  HKD: { symbol: "HK$", decimals: 2 },
  KRW: { symbol: "₩", decimals: 0 },
  INR: { symbol: "₹", decimals: 2 },
  MXN: { symbol: "MX$", decimals: 2 },
  BRL: { symbol: "R$", decimals: 2 },
  ZAR: { symbol: "R", decimals: 2 },
};

// Currencies the owner can pick from in the settings card.
export const SUPPORTED_CURRENCY_CODES = [
  "USD", "EUR", "GBP", "JPY", "CNY",
  "KHR", "THB", "VND", "PHP", "MYR", "SGD", "IDR",
  "CAD", "AUD", "HKD", "KRW", "INR", "MXN", "BRL", "ZAR",
] as const;

export type CafeCurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number];

export function getCurrencyInfo(code: string): CurrencyInfo {
  return CURRENCY_INFO[code.toUpperCase()] ?? { symbol: code.toUpperCase() + " ", decimals: 2 };
}

/**
 * Convert smallest-unit integer to display string with the right symbol +
 * decimal count. Falls back to "<CODE> <amount>" for unknown codes.
 */
export function formatCafeMoney(smallestUnits: number, code: string = "USD"): string {
  const info = getCurrencyInfo(code);
  const value = info.decimals === 0
    ? Math.round(smallestUnits).toString()
    : (smallestUnits / Math.pow(10, info.decimals)).toFixed(info.decimals);
  // Thousands separator for the integer part. We don't localize the
  // separator — using "," is the most globally understood option for a
  // multi-region cafe POS.
  const [intPart, decPart] = value.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const display = decPart ? `${grouped}.${decPart}` : grouped;
  return info.symbolAfter ? `${display} ${info.symbol}` : `${info.symbol}${display}`;
}

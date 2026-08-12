/**
 * ZIVO Currency Configuration
 * Supported currencies with metadata for formatting and display
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "USD", symbol: "$", name: "US Dollar", decimals: 2, locale: "en-US", flag: "US" },
  { code: "EUR", symbol: "€", name: "Euro", decimals: 2, locale: "de-DE", flag: "EU" },
  { code: "GBP", symbol: "£", name: "British Pound", decimals: 2, locale: "en-GB", flag: "GB" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", decimals: 2, locale: "en-CA", flag: "CA" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", decimals: 2, locale: "en-AU", flag: "AU" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", decimals: 0, locale: "ja-JP", flag: "JP" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", decimals: 0, locale: "ko-KR", flag: "KR" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimals: 2, locale: "en-SG", flag: "SG" },
  { code: "THB", symbol: "฿", name: "Thai Baht", decimals: 2, locale: "th-TH", flag: "TH" },
  { code: "KHR", symbol: "៛", name: "Cambodian Riel", decimals: 0, locale: "km-KH", flag: "KH" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", decimals: 2, locale: "zh-CN", flag: "CN" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", decimals: 2, locale: "en-IN", flag: "IN" },
  { code: "MXN", symbol: "MX$", name: "Mexican Peso", decimals: 2, locale: "es-MX", flag: "MX" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", decimals: 2, locale: "pt-BR", flag: "BR" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", decimals: 2, locale: "de-CH", flag: "CH" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", decimals: 2, locale: "sv-SE", flag: "SE" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", decimals: 2, locale: "nb-NO", flag: "NO" },
  { code: "DKK", symbol: "kr", name: "Danish Krone", decimals: 2, locale: "da-DK", flag: "DK" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty", decimals: 2, locale: "pl-PL", flag: "PL" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna", decimals: 2, locale: "cs-CZ", flag: "CZ" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint", decimals: 0, locale: "hu-HU", flag: "HU" },
  { code: "RON", symbol: "lei", name: "Romanian Leu", decimals: 2, locale: "ro-RO", flag: "RO" },
  { code: "BGN", symbol: "лв", name: "Bulgarian Lev", decimals: 2, locale: "bg-BG", flag: "BG" },
  { code: "HRK", symbol: "kn", name: "Croatian Kuna", decimals: 2, locale: "hr-HR", flag: "HR" },
  { code: "ISK", symbol: "kr", name: "Icelandic Krona", decimals: 0, locale: "is-IS", flag: "IS" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", decimals: 2, locale: "tr-TR", flag: "TR" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble", decimals: 2, locale: "ru-RU", flag: "RU" },
  { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", decimals: 2, locale: "uk-UA", flag: "UA" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel", decimals: 2, locale: "he-IL", flag: "IL" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", decimals: 2, locale: "ar-SA", flag: "SA" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", decimals: 2, locale: "ar-AE", flag: "AE" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", decimals: 0, locale: "vi-VN", flag: "VN" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", decimals: 0, locale: "id-ID", flag: "ID" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", decimals: 2, locale: "ms-MY", flag: "MY" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", decimals: 2, locale: "en-PH", flag: "PH" },
  { code: "TWD", symbol: "NT$", name: "Taiwan Dollar", decimals: 0, locale: "zh-TW", flag: "TW" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", decimals: 2, locale: "zh-HK", flag: "HK" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", decimals: 2, locale: "en-NZ", flag: "NZ" },
  { code: "ZAR", symbol: "R", name: "South African Rand", decimals: 2, locale: "en-ZA", flag: "ZA" },
  { code: "EGP", symbol: "E£", name: "Egyptian Pound", decimals: 2, locale: "ar-EG", flag: "EG" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", decimals: 2, locale: "en-NG", flag: "NG" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", decimals: 2, locale: "en-KE", flag: "KE" },
  { code: "COP", symbol: "COL$", name: "Colombian Peso", decimals: 0, locale: "es-CO", flag: "CO" },
  { code: "ARS", symbol: "AR$", name: "Argentine Peso", decimals: 2, locale: "es-AR", flag: "AR" },
  { code: "CLP", symbol: "CL$", name: "Chilean Peso", decimals: 0, locale: "es-CL", flag: "CL" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol", decimals: 2, locale: "es-PE", flag: "PE" },
];

export const DEFAULT_CURRENCY = "USD";

export const CURRENCY_MAP: Record<string, CurrencyConfig> = SUPPORTED_CURRENCIES.reduce(
  (acc, currency) => ({ ...acc, [currency.code]: currency }),
  {}
);

export function getCurrencyConfig(code: string): CurrencyConfig {
  return CURRENCY_MAP[code] || CURRENCY_MAP[DEFAULT_CURRENCY];
}

// Static fallback rates (USD as base = 1.0)
// These are used when API rates fail or are stale
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.36,
  AUD: 1.53,
  JPY: 149.5,
  KRW: 1320.0,
  SGD: 1.34,
  THB: 35.5,
  KHR: 4100.0,
  CNY: 7.24,
  INR: 83.5,
  MXN: 17.15,
  BRL: 4.97,
  CHF: 0.88,
  SEK: 10.45,
  NOK: 10.55,
  DKK: 6.87,
  PLN: 3.98,
  CZK: 22.85,
  HUF: 355.0,
  RON: 4.57,
  BGN: 1.80,
  HRK: 6.93,
  ISK: 137.0,
  TRY: 30.5,
  RUB: 92.0,
  UAH: 37.5,
  ILS: 3.65,
  SAR: 3.75,
  AED: 3.67,
  VND: 24500.0,
  IDR: 15600.0,
  MYR: 4.65,
  PHP: 55.8,
  TWD: 31.5,
  HKD: 7.82,
  NZD: 1.63,
  ZAR: 18.5,
  EGP: 30.9,
  NGN: 780.0,
  KES: 153.0,
  COP: 3950.0,
  ARS: 830.0,
  CLP: 880.0,
  PEN: 3.72,
};

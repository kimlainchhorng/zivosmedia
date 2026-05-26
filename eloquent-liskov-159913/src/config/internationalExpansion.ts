/** International expansion config stub */

export interface GeoDetectionResult {
  countryCode: string;
  currency: string;
  language: string;
  timezone: string;
  nearestAirport: string;
}

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  language: string;
  timezone: string;
  primaryAirport: string;
  flag?: string;
  isLaunched?: boolean;
  popularRoutes?: string[];
}

export const COUNTRIES: CountryConfig[] = [
  { code: "US", name: "United States", currency: "USD", language: "en", timezone: "America/New_York", primaryAirport: "JFK", flag: "US", isLaunched: true, popularRoutes: [] },
  { code: "KH", name: "Cambodia", currency: "KHR", language: "km", timezone: "Asia/Phnom_Penh", primaryAirport: "KTI", flag: "KH", isLaunched: true, popularRoutes: ["KTI-REP", "KTI-KOS", "KTI-BKK", "REP-BKK"] },
];

export function getCountryByCode(code: string): CountryConfig | undefined {
  return COUNTRIES.find(c => c.code === code);
}

export function getCountryFromSlug(_slug: string): CountryConfig | undefined {
  return COUNTRIES[0];
}

export const INTERNATIONAL_COMPLIANCE = {
  disclaimer: "Prices shown in local currency. Terms and conditions apply.",
  taxDisclaimer: "Tax rates vary by jurisdiction.",
  globalDisclaimer: "International booking terms apply.",
};

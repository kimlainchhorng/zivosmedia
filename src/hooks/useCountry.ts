/**
 * useCountry — manages the user's selected country/location independently from language.
 * Stored in localStorage as "zivo_country" (e.g. "US" or "KH").
 */
import { useSyncExternalStore, useCallback } from "react";

export type CountryCode = "US" | "KH";

export interface CountryOption {
  code: CountryCode;
  name: string;
  flag: string;
  currency: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "KH", name: "Cambodia", flag: "🇰🇭", currency: "KHR" },
];

const STORAGE_KEY = "zivo_country";
const DEFAULT_COUNTRY: CountryCode = "US";

let listeners: (() => void)[] = [];

function getSnapshot(): CountryCode {
  return (localStorage.getItem(STORAGE_KEY) as CountryCode) || DEFAULT_COUNTRY;
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  // Also listen for cross-component geo-detect events
  const handler = () => listener();
  window.addEventListener("zivo-country-change", handler);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener("zivo-country-change", handler);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

export function useCountry() {
  const country = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_COUNTRY);

  const setCountry = useCallback((code: CountryCode) => {
    localStorage.setItem(STORAGE_KEY, code);
    notify();
  }, []);

  const isCambodia = country === "KH";

  return { country, setCountry, isCambodia, countries: COUNTRY_OPTIONS };
}

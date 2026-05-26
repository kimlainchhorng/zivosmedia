/**
 * ZIVO Global Currency Context
 * Manages user currency preference with persistence and exchange rates
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrencyConfig,
  FALLBACK_RATES,
  type CurrencyConfig,
} from "@/config/currencies";
import {
  formatPrice,
  formatPriceParts,
  convertPrice,
  formatConvertedPrice,
  getPriceDisplay,
  type ExchangeRates,
} from "@/lib/currency";

const STORAGE_KEY = "zivo_currency";
const RATES_CACHE_KEY = "zivo_fx_rates";
const RATES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface RatesCache {
  rates: ExchangeRates;
  fetchedAt: number;
}

interface CurrencyContextValue {
  // Current currency
  currency: string;
  currencyConfig: CurrencyConfig;
  setCurrency: (code: string) => void;
  
  // Exchange rates
  rates: ExchangeRates;
  ratesLoading: boolean;
  
  // Formatting utilities (bound to current currency)
  format: (amount: number, baseCurrency?: string) => string;
  formatParts: (amount: number, baseCurrency?: string) => {
    symbol: string;
    amount: string;
    formatted: string;
  };
  convert: (amount: number, fromCurrency?: string) => number;
  
  // Display helper
  getDisplay: (amount: number, baseCurrency?: string) => {
    formatted: string;
    wasConverted: boolean;
    originalCurrency: string;
  };
  
  // All currencies
  currencies: CurrencyConfig[];
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function detectBrowserCurrency(): string {
  try {
    const locale = navigator.language || "en-US";
    const parts = locale.split("-");
    const region = parts[parts.length - 1].toUpperCase();
    
    // Map common regions to currencies
    const regionCurrencyMap: Record<string, string> = {
      US: "USD",
      GB: "GBP",
      UK: "GBP",
      EU: "EUR",
      DE: "EUR",
      FR: "EUR",
      IT: "EUR",
      ES: "EUR",
      CA: "CAD",
      AU: "AUD",
      JP: "JPY",
      KR: "KRW",
      SG: "SGD",
      TH: "THB",
      KH: "KHR",
      KM: "KHR",
    };
    
    const detected = regionCurrencyMap[region];
    if (detected && SUPPORTED_CURRENCIES.some(c => c.code === detected)) {
      return detected;
    }
  } catch {
    // Ignore detection errors
  }
  return DEFAULT_CURRENCY;
}

function loadCachedRates(): RatesCache | null {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (cached) {
      const parsed: RatesCache = JSON.parse(cached);
      // Check if cache is still valid
      if (Date.now() - parsed.fetchedAt < RATES_CACHE_TTL) {
        return parsed;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function saveCachedRates(rates: ExchangeRates) {
  try {
    const cache: RatesCache = {
      rates,
      fetchedAt: Date.now(),
    };
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage errors
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize currency from URL > localStorage > browser locale > default
  const [currency, setCurrencyState] = useState<string>(() => {
    // 1. Check URL param
    const urlCurrency = searchParams.get("currency")?.toUpperCase();
    if (urlCurrency && SUPPORTED_CURRENCIES.some(c => c.code === urlCurrency)) {
      return urlCurrency;
    }
    
    // 2. Check localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_CURRENCIES.some(c => c.code === stored)) {
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
    
    // 3. Detect from browser
    return detectBrowserCurrency();
  });
  
  const [rates, setRates] = useState<ExchangeRates>(() => {
    const cached = loadCachedRates();
    return cached?.rates || FALLBACK_RATES;
  });
  
  const [ratesLoading, setRatesLoading] = useState(false);
  
  // Fetch exchange rates
  useEffect(() => {
    const cached = loadCachedRates();
    if (cached) {
      setRates(cached.rates);
      return;
    }
    
    // Fetch fresh rates
    const fetchRates = async () => {
      setRatesLoading(true);
      try {
        const response = await fetch(
          `https://slirphzzwcogdbkeicff.supabase.co/functions/v1/exchange-rates`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.rates) {
            setRates(data.rates);
            saveCachedRates(data.rates);
          }
        }
      } catch {
        // Use fallback rates silently
        console.debug("Using fallback exchange rates");
      } finally {
        setRatesLoading(false);
      }
    };
    
    fetchRates();
  }, []);
  
  // Persist currency selection
  const setCurrency = useCallback((code: string) => {
    if (!SUPPORTED_CURRENCIES.some(c => c.code === code)) return;
    
    setCurrencyState(code);
    
    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Ignore storage errors
    }
    
    // Update URL param (preserve other params)
    const newParams = new URLSearchParams(searchParams);
    newParams.set("currency", code);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Bound formatting functions
  const format = useCallback(
    (amount: number, baseCurrency: string = "USD") => {
      if (baseCurrency === currency) {
        return formatPrice(amount, currency);
      }
      return formatConvertedPrice(amount, baseCurrency, currency, rates);
    },
    [currency, rates]
  );
  
  const formatParts = useCallback(
    (amount: number, baseCurrency: string = "USD") => {
      const displayAmount = baseCurrency === currency
        ? amount
        : convertPrice(amount, baseCurrency, currency, rates);
      return formatPriceParts(displayAmount, currency);
    },
    [currency, rates]
  );
  
  const convert = useCallback(
    (amount: number, fromCurrency: string = "USD") => {
      return convertPrice(amount, fromCurrency, currency, rates);
    },
    [currency, rates]
  );
  
  const getDisplay = useCallback(
    (amount: number, baseCurrency: string = "USD") => {
      return getPriceDisplay(amount, baseCurrency, currency, rates);
    },
    [currency, rates]
  );
  
  const value = useMemo(
    () => ({
      currency,
      currencyConfig: getCurrencyConfig(currency),
      setCurrency,
      rates,
      ratesLoading,
      format,
      formatParts,
      convert,
      getDisplay,
      currencies: SUPPORTED_CURRENCIES,
    }),
    [currency, setCurrency, rates, ratesLoading, format, formatParts, convert, getDisplay]
  );
  
  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

/**
 * Standalone hook for formatting a specific price
 * Useful for components that just need to display one price
 */
export function useFormattedPrice(amount: number, baseCurrency: string = "USD") {
  const { format, getDisplay } = useCurrency();
  
  return useMemo(() => {
    const display = getDisplay(amount, baseCurrency);
    return {
      ...display,
      price: format(amount, baseCurrency),
    };
  }, [amount, baseCurrency, format, getDisplay]);
}

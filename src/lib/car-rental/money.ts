/**
 * Currency-aware money formatting for the car-rental module.
 *
 * - `formatMoney(cents)` — quick default ($X.XX in USD).
 * - `formatMoneyWith(cents, currency)` — explicit currency code.
 * - `useStoreCurrency(storeId)` — React hook that subscribes to
 *   `car_rental_store_settings.currency_code`, falling back to USD.
 *
 * Uses Intl.NumberFormat under the hood, so symbols, separators and
 * placement (e.g. £ vs €) all come for free.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Format cents to a currency string. Defaults to USD if `currency` omitted. */
export function formatMoneyWith(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    // Bad currency code — fall back to a plain dollar style.
    return `$${(cents / 100).toFixed(2)}`;
  }
}

/** Legacy formatter — defaults to USD. New code should prefer `formatMoneyWith` or `useStoreCurrency`. */
export const formatMoney = (cents: number): string => formatMoneyWith(cents, "USD");

/** Cache so multiple components asking for the same store share one fetch. */
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

async function loadCurrency(storeId: string): Promise<string> {
  const cached = cache.get(storeId);
  if (cached) return cached;
  const inflight = pending.get(storeId);
  if (inflight) return inflight;

  const p = (async () => {
    const { data } = await supabase
      .from("car_rental_store_settings")
      .select("currency_code")
      .eq("store_id", storeId)
      .maybeSingle();
    const code = ((data as any)?.currency_code ?? "USD").trim().toUpperCase() as string;
    cache.set(storeId, code);
    pending.delete(storeId);
    return code;
  })();
  pending.set(storeId, p);
  return p;
}

export function useStoreCurrency(storeId: string | undefined): {
  currency: string;
  format: (cents: number) => string;
} {
  const [currency, setCurrency] = useState<string>(() =>
    storeId ? cache.get(storeId) ?? "USD" : "USD"
  );
  useEffect(() => {
    if (!storeId) { setCurrency("USD"); return; }
    let cancelled = false;
    void loadCurrency(storeId).then((c) => {
      if (!cancelled) setCurrency(c);
    });
    return () => { cancelled = true; };
  }, [storeId]);
  return {
    currency,
    format: (cents: number) => formatMoneyWith(cents, currency),
  };
}

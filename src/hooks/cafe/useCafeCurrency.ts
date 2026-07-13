/**
 * Single-column lookup of a cafe store's currency_code. Admin sections that
 * previously hardcoded "$" use this + formatCafeMoney(cents, code) so the
 * owner's views match the customer-facing currency.
 *
 * Falls back to "USD" when the row hasn't materialized yet or while loading,
 * which means the worst-case wrong-render is one frame of "$" before the
 * actual code arrives — acceptable for an admin view.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCafeCurrency(storeId: string | undefined) {
  const [code, setCode] = useState<string>("USD");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("cafe_settings" as never)
        .select("currency_code")
        .eq("store_id", storeId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[useCafeCurrency]", error);
      } else if (data && (data as { currency_code?: string }).currency_code) {
        setCode((data as { currency_code: string }).currency_code);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  return { code, loading };
}

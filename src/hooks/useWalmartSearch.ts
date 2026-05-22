/**
 * useWalmartSearch - Search Walmart products via edge function
 */
import { useState, useCallback } from "react";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

export interface WalmartProduct {
  productId: string;
  name: string;
  price: number;
  image: string;
  brand: string;
  rating: number | null;
  inStock: boolean;
  store: string;
}

export function useWalmartSearch() {
  const [products, setProducts] = useState<WalmartProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `${SUPABASE_URL}/functions/v1/walmart-search?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const mapped = data.products || [];
      if (import.meta.env.DEV) console.log("[WalmartSearch] Raw response:", data);
      if (import.meta.env.DEV) console.log("[WalmartSearch] Mapped products:", mapped);
      if (import.meta.env.DEV) console.log("[WalmartSearch] Result count:", mapped.length);
      setProducts(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed";
      setError(msg);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setProducts([]);
    setError(null);
  }, []);

  return { products, isLoading, error, search, clearResults };
}

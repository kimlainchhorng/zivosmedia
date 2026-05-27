/**
 * useStoreSearch - Generic product search hook with multi-keyword parallel fetching
 * The Walmart API returns ~2 products per query, so we split multi-word queries
 * into individual keyword searches and merge results for density.
 */
import { useState, useCallback, useRef } from "react";
import type { StoreName } from "@/config/groceryStores";
import { getStoreConfig } from "@/config/groceryStores";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

export interface StoreProduct {
  productId: string;
  name: string;
  price: number;
  image: string;
  brand: string;
  rating: number | null;
  inStock: boolean;
  store: string;
}

export function useStoreSearch(store: StoreName) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const lastQueryRef = useRef("");
  const keywordIndexRef = useRef(0);
  const allKeywordsRef = useRef<string[]>([]);

  const fetchSingle = useCallback(
    async (query: string, page: number): Promise<StoreProduct[]> => {
      const cfg = getStoreConfig(store);
      const url = `${SUPABASE_URL}/functions/v1/${cfg.edgeFunction}?q=${encodeURIComponent(query)}&page=${page}`;

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
      return (data.products || []).map((p: any) => ({ ...p, store }));
    },
    [store]
  );

  // Build expanded keyword list from a multi-word query
  const buildKeywords = (query: string): string[] => {
    const words = query.split(/\s+/).filter((w) => w.length >= 2);
    const searches: string[] = [query]; // full query first
    // Add individual words
    for (const w of words) {
      if (!searches.includes(w)) searches.push(w);
    }
    // Add 2-word pairs
    for (let i = 0; i < words.length - 1; i++) {
      const pair = `${words[i]} ${words[i + 1]}`;
      if (!searches.includes(pair)) searches.push(pair);
    }
    // Add 3-word combos for even more variety
    for (let i = 0; i < words.length - 2; i++) {
      const triple = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (!searches.includes(triple)) searches.push(triple);
    }
    return searches;
  };

  const search = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < 2) {
        setProducts([]);
        setHasMore(false);
        return;
      }

      lastQueryRef.current = query;
      setIsLoading(true);
      setError(null);

      try {
        const keywords = buildKeywords(query);
        allKeywordsRef.current = keywords;
        
        // Fetch first batch of keywords in parallel (up to 12 at a time)
        const batch = keywords.slice(0, 12);
        keywordIndexRef.current = batch.length;
        
        const results = await Promise.all(
          batch.map((kw) => fetchSingle(kw, 1).catch(() => [] as StoreProduct[]))
        );

        const all = results.flat();
        const seen = new Set<string>();
        const deduped = all.filter((p) => {
          const key = p.productId || p.name;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setProducts(deduped);
        pageRef.current = 1;
        setHasMore(keywordIndexRef.current < keywords.length || deduped.length >= 5);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Search failed";
        setError(msg);
        setProducts([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchSingle]
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !lastQueryRef.current) return;

    setIsLoadingMore(true);

    try {
      const keywords = allKeywordsRef.current;
      const startIdx = keywordIndexRef.current;

      if (startIdx < keywords.length) {
        // Fetch next batch of keywords
        const batch = keywords.slice(startIdx, startIdx + 10);
        keywordIndexRef.current = startIdx + batch.length;

        const results = await Promise.all(
          batch.map((kw) => fetchSingle(kw, 1).catch(() => [] as StoreProduct[]))
        );

        const newItems = results.flat();
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.productId));
          const unique = newItems.filter((p) => !existingIds.has(p.productId));
          return [...prev, ...unique];
        });

        setHasMore(keywordIndexRef.current < keywords.length);
      } else {
        // Try paginating the original query
        pageRef.current += 1;
        const newItems = await fetchSingle(lastQueryRef.current, pageRef.current);
        
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.productId));
          const unique = newItems.filter((p) => !existingIds.has(p.productId));
          return [...prev, ...unique];
        });

        setHasMore(newItems.length >= 2);
      }
    } catch (e) {
      console.error("[StoreSearch] loadMore error:", e);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchSingle, isLoadingMore]);

  const clearResults = useCallback(() => {
    setProducts([]);
    setError(null);
    setHasMore(false);
    pageRef.current = 1;
    keywordIndexRef.current = 0;
    allKeywordsRef.current = [];
    lastQueryRef.current = "";
  }, []);

  return { products, isLoading, isLoadingMore, hasMore, error, search, loadMore, clearResults };
}
